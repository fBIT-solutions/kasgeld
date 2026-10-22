import { getContainer } from "../../../lib/cosmosdb";
import { getCommunityContext, withCommunityId } from "@/lib/communities";

const paymentsContainerId = "payments";
const runsContainerId = "runs";
async function getRunById(runId, communityId) {
  try {
    const container = await getContainer(runsContainerId);
    const { resource } = await container.item(runId, runId).read();
    return resource?.communityId === communityId ? resource : null;
  } catch (error) {
    console.error(`Failed to get run ${runId}:`, error);
    return null;
  }
}

export async function POST(req) {
  try {
    const { response, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const data = await req.json();
    
    const container = await getContainer(paymentsContainerId);

    // Create or update payment record
    const { id, runId, userId, email, month, amount, handCount, paid, paidDate } = data;
    if (!id && runId) {
      const run = await getRunById(runId, communityId);
      if (!run) return Response.json({ error: "Run not found in this community" }, { status: 404 });
    }
    if (userId && !community.memberUserIds.includes(userId)) {
      return Response.json({ error: "User is not a member of this community" }, { status: 400 });
    }

    if (id) {
      // Update existing payment
      try {
        const { resource: existingPayment } = await container.item(id, id).read();
        if (!existingPayment || existingPayment.communityId !== communityId) {
          return Response.json({ error: "Betaling niet gevonden" }, { status: 404 });
        }
        const updatedPayment = {
          ...existingPayment,
          runId: existingPayment.runId,
          amount,
          handCount,
          paid,
          email: email || existingPayment.email, // Preserve or update email
          paidDate: paid ? (paidDate || new Date().toISOString()) : null,
        };
        const { resource } = await container.item(id, id).replace(updatedPayment);

        return new Response(JSON.stringify(resource), { status: 200 });
      } catch (readError) {
        console.error("Error reading payment:", readError);
        return new Response(JSON.stringify({ error: "Betaling niet gevonden" }), { status: 404 });
      }
    } else {
      if (!runId || !userId || !month) {
        return Response.json({ error: "runId, userId, and month are required" }, { status: 400 });
      }
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
        communityId,
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
    const { response, communityId } = await getCommunityContext(req);
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    
    const container = await getContainer(paymentsContainerId);

    if (runId) {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.communityId = @communityId AND c.runId = @runId",
        parameters: [
          { name: "@communityId", value: communityId },
          { name: "@runId", value: runId },
        ],
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
        query: "SELECT * FROM c WHERE c.communityId = @communityId",
        parameters: [{ name: "@communityId", value: communityId }],
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
      query: "SELECT * FROM c WHERE c.communityId = @communityId",
      parameters: [{ name: "@communityId", value: communityId }],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van betalingen", details: error.message }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("id");
    
    const container = await getContainer(paymentsContainerId);

    if (paymentId) {
      try {
        const { resource } = await container.item(paymentId, paymentId).read();
        if (!resource || resource.communityId !== communityId) {
          return Response.json({ error: "Betaling niet gevonden" }, { status: 404 });
        }
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
