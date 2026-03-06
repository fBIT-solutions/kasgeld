import { getContainer } from "../../../lib/cosmosdb";

const paymentsContainerId = "payments";

export async function POST(req) {
  try {
    const data = await req.json();
    
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
        const { resource } = await container.item(id, id).replace(updatedPayment);
        return new Response(JSON.stringify(resource), { status: 200 });
      } catch (readError) {
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
      const { resource } = await container.items.create(newPayment);
      return new Response(JSON.stringify(resource), { status: 201 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij het beheren van betaling", details: error.message }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    
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

    return new Response(JSON.stringify([]), { status: 200 });
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
