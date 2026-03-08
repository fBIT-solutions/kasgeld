import { getContainer } from "../../../lib/cosmosdb";
import { sendUnitPaidEmail } from "../../../lib/email-service";

const paymentsContainerId = "payments";
const runsContainerId = "runs";
const usersContainerId = "users";

async function getUserById(userId) {
  try {
    const container = await getContainer(usersContainerId);
    const { resource } = await container.item(userId, userId).read();
    return resource;
  } catch (error) {
    console.error(`Failed to get user ${userId}:`, error);
    return null;
  }
}

async function getRunById(runId) {
  try {
    const container = await getContainer(runsContainerId);
    const { resource } = await container.item(runId, runId).read();
    return resource;
  } catch (error) {
    console.error(`Failed to get run ${runId}:`, error);
    return null;
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    
    const container = await getContainer(paymentsContainerId);

    // Create or update payment record
    const { id, runId, userId, email, month, amount, handCount, paid, paidDate } = data;

    if (id) {
      // Update existing payment
      try {
        const { resource: existingPayment } = await container.item(id, id).read();
        const updatedPayment = {
          ...existingPayment,
          amount,
          handCount,
          paid,
          email: email || existingPayment.email, // Preserve or update email
          paidDate: paid ? (paidDate || new Date().toISOString()) : null,
        };
        const { resource } = await container.item(id, id).replace(updatedPayment);

        // Send notification if payment was just marked as paid
        if (paid && !existingPayment.paid) {
          console.log(`Payment ${id} marked as paid, attempting to send email...`);
          console.log(`User ID: ${userId}, Email: ${email}, ExistingPayment.paid: ${existingPayment.paid}`);
          
          try {
            if (!userId) {
              console.error("No userId provided in payment update request");
            } else {
              const user = await getUserById(userId);
              console.log(`User lookup result:`, user);
              
              if (!user) {
                console.error(`User ${userId} not found in database`);
              } else if (!user.email) {
                console.error(`User ${userId} has no email address`);
              } else {
                const run = await getRunById(runId);
                console.log(`Run lookup result:`, run);
                
                // Extract hand number from month string (e.g., "Hand 2" from "04-2026")
                const monthParts = month?.split('-') || [];
                const monthName = monthParts[0] ? `${monthParts[0]}-${monthParts[1]}` : month;
                
                // Calculate total pot: sum of all hands in run × monthly amount per hand
                const totalHands = run?.units?.reduce((sum, u) => sum + (u.hand || 1), 0) || 0;
                const totalPot = (totalHands * (run?.monthlyAmount || 0));
                
                console.log(`Sending unit paid email to ${user.email}, total pot: €${totalPot} (${totalHands} hands × €${run?.monthlyAmount})`);
                await sendUnitPaidEmail({
                  recipientEmail: user.email,
                  recipientName: user.firstname || user.displayname || "Deelnemer",
                  handNumber: handCount || "N/A",
                  month: monthParts[0] || monthName,
                  year: monthParts[1] || run.year || "2026",
                  amount: totalPot
                });
                console.log(`Email sent successfully for payment ${id}`);
              }
            }
          } catch (emailError) {
            console.error("Failed to send unit paid notification:", emailError);
            // Don't fail the request if email fails
          }
        }

        return new Response(JSON.stringify(resource), { status: 200 });
      } catch (readError) {
        console.error("Error reading payment:", readError);
        return new Response(JSON.stringify({ error: "Betaling niet gevonden" }), { status: 404 });
      }
    } else {
      // Create new payment - linked to user for specific month
      const newPayment = {
        id: crypto.randomUUID(),
        runId,
        userId,
        email: email || "", // Store email for easy lookup
        month,
        amount: amount || 0,
        handCount: handCount || 0,
        paid: paid || false,
        paidDate: paid ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      const { resource } = await container.items.create(newPayment);
      return new Response(JSON.stringify(resource), { status: 201 });
    }
  } catch (error) {
    console.error("Error in POST /api/payments:", error);
    return new Response(JSON.stringify({ error: "Fout bij het beheren van betaling", details: error.message }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    
    const container = await getContainer(paymentsContainerId);

    if (runId) {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.runId = @runId",
        parameters: [{ name: "@runId", value: runId }],
      };
      const { resources } = await container.items.query(querySpec).fetchAll();
      
      // Sort on client side to avoid composite index requirement
      resources.sort((a, b) => {
        if (a.month !== b.month) {
          return a.month.localeCompare(b.month);
        }
        return a.userId.localeCompare(b.userId);
      });
      
      return new Response(JSON.stringify(resources), { status: 200 });
    }

    // Filter by email, userId and/or month
    if (email || userId || month) {
      // Get all payments and filter on client side
      const querySpec = {
        query: "SELECT * FROM c",
      };
      let { resources } = await container.items.query(querySpec).fetchAll();
      
      // Filter by userId if provided (highest priority - specific user)
      if (userId) {
        resources = resources.filter((p) => p.userId === userId);
      }
      
      // Filter by email if provided
      if (email) {
        resources = resources.filter((p) => p.email === email);
      }
      
      // Filter by month if provided
      if (month) {
        resources = resources.filter((p) => p.month === month);
      }
      
      return new Response(JSON.stringify(resources), { status: 200 });
    }

    // No filters - return all payments
    const querySpec = {
      query: "SELECT * FROM c",
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van betalingen", details: error.message }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("id");
    
    const container = await getContainer(paymentsContainerId);

    if (paymentId) {
      try {
        await container.item(paymentId, paymentId).delete();
        return new Response("Ok", { status: 200 });
      } catch (deleteError) {
        return new Response(JSON.stringify({ error: "Betaling niet gevonden" }), { status: 404 });
      }
    }

    return new Response(JSON.stringify({ error: "Geen betaling id opgegeven" }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij het verwijderen van betaling", details: error.message }), { status: 500 });
  }
}
