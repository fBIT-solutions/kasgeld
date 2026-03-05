import { getContainer } from "../../../lib/cosmosdb";

const paymentsContainerId = "payments";

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("POST /api/payments - received data:", data);
    
    const container = await getContainer(paymentsContainerId);

    // Create or update payment record
    const { id, runId, userId, month, amount, handCount, paid, paidDate } = data;

    if (id) {
      // Update existing payment
      try {
        const { resource: existingPayment } = await container.item(id, id).read();
        const updatedPayment = {
          ...existingPayment,
          amount,
          handCount,
          paid,
          paidDate: paid ? (paidDate || new Date().toISOString()) : null,
        };
        console.log("Updating payment:", updatedPayment);
        const { resource } = await container.item(id, id).replace(updatedPayment);
        console.log("Payment updated successfully:", resource);
        return new Response(JSON.stringify(resource), { status: 200 });
      } catch (readError) {
        console.error("Error reading existing payment:", readError);
        return new Response(JSON.stringify({ error: "Betaling niet gevonden" }), { status: 404 });
      }
    } else {
      // Create new payment - linked to user for specific month
      const newPayment = {
        id: crypto.randomUUID(),
        runId,
        userId,
        month,
        amount: amount || 0,
        handCount: handCount || 0,
        paid: paid || false,
        paidDate: paid ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      console.log("Creating new payment:", newPayment);
      const { resource } = await container.items.create(newPayment);
      console.log("Payment created successfully:", resource);
      return new Response(JSON.stringify(resource), { status: 201 });
    }
  } catch (error) {
    console.error("Error managing payment:", error);
    return new Response(JSON.stringify({ error: "Fout bij het beheren van betaling", details: error.message }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    console.log("GET /api/payments - runId:", runId);
    
    const container = await getContainer(paymentsContainerId);

    if (runId) {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.runId = @runId",
        parameters: [{ name: "@runId", value: runId }],
      };
      console.log("Querying payments with spec:", querySpec);
      const { resources } = await container.items.query(querySpec).fetchAll();
      console.log("Query returned resources:", resources);
      
      // Sort on client side to avoid composite index requirement
      resources.sort((a, b) => {
        if (a.month !== b.month) {
          return a.month.localeCompare(b.month);
        }
        return a.userId.localeCompare(b.userId);
      });
      
      console.log("Returning sorted payments:", resources);
      return new Response(JSON.stringify(resources), { status: 200 });
    }

    return new Response(JSON.stringify([]), { status: 200 });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van betalingen", details: error.message }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("id");
    console.log("DELETE /api/payments - id:", paymentId);
    
    const container = await getContainer(paymentsContainerId);

    if (paymentId) {
      try {
        await container.item(paymentId, paymentId).delete();
        console.log("Payment deleted successfully:", paymentId);
        return new Response("Ok", { status: 200 });
      } catch (deleteError) {
        console.error("Error deleting payment:", deleteError);
        return new Response(JSON.stringify({ error: "Betaling niet gevonden" }), { status: 404 });
      }
    }

    return new Response(JSON.stringify({ error: "Geen betaling id opgegeven" }), { status: 400 });
  } catch (error) {
    console.error("Error in delete endpoint:", error);
    return new Response(JSON.stringify({ error: "Fout bij het verwijderen van betaling", details: error.message }), { status: 500 });
  }
}
