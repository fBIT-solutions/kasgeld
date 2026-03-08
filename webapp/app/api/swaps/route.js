import { getContainer } from "@/lib/cosmosdb";

const containerId = "swaps";

export async function POST(req) {
  try {
    const data = await req.json();
    const container = await getContainer(containerId);

    // Create swap request
    const swapRequest = {
      id: `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      requesterUserId: data.requesterUserId,
      requesterDisplayName: data.requesterDisplayName || "",
      targetedUserId: data.targetedUserId,
      targetedUserDisplayName: data.targetedUserDisplayName || "",
      note: data.note || "",
      runId: data.runId,
      requesterUnitName: data.requesterUnitName,
      requesterUnitHand: data.requesterUnitHand,
      targetedUnitName: data.targetedUnitName,
      targetedUnitHand: data.targetedUnitHand,
      requestedDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const { resource } = await container.items.create(swapRequest);
    return new Response(JSON.stringify(resource), { status: 201 });
  } catch (error) {
    console.error("Error creating swap request:", error);
    return new Response(JSON.stringify({ error: "Failed to create swap request" }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    
    const container = await getContainer(containerId);
    
    let querySpec = {
      query: "SELECT * FROM c WHERE 1=1",
      parameters: []
    };

    if (userId) {
      querySpec.query += " AND (c.requesterUserId = @userId OR c.targetedUserId = @userId)";
      querySpec.parameters.push({ name: "@userId", value: userId });
    }

    if (status) {
      querySpec.query += " AND c.status = @status";
      querySpec.parameters.push({ name: "@status", value: status });
    }

    querySpec.query += " ORDER BY c.requestedDate DESC";

    const { resources } = await container.items.query(querySpec).fetchAll();
    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    console.error("Error fetching swap requests:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch swap requests" }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Swap ID is required" }), { status: 400 });
    }

    const container = await getContainer(containerId);
    
    // Get the existing swap request
    const { resource: existingSwap } = await container.item(id, id).read();
    console.log("Existing Swap:", existingSwap);
    
    // Update the swap request
    const updatedSwap = {
      ...existingSwap,
      ...data,
      updatedAt: new Date().toISOString()
    };
    console.log("Updated Swap:", updatedSwap);

    const { resource } = await container.item(id, id).replace(updatedSwap);
    return new Response(JSON.stringify(resource), { status: 200 });
  } catch (error) {
    console.error("Error updating swap request:", error);
    return new Response(JSON.stringify({ error: "Failed to update swap request" }), { status: 500 });
  }
}