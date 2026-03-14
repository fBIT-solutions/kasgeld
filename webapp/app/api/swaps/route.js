import { getContainer } from "@/lib/cosmosdb";
import { sendSwapRequestReceivedEmail, sendSwapRequestReviewedEmail } from "@/lib/email-service";

const containerId = "swaps";
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

    // Send notifications
    try {
      const requesterUser = await getUserById(data.requesterUserId);
      const targetedUser = await getUserById(data.targetedUserId);

      if (requesterUser?.email && targetedUser?.email) {
        await sendSwapRequestReceivedEmail({
          requesterEmail: requesterUser.email,
          requesterName: requesterUser.firstname || requesterUser.displayname || "Deelnemer",
          recipientEmail: targetedUser.email,
          recipientName: targetedUser.firstname || targetedUser.displayname || "Deelnemer",
          swapDetails: {
            requesterUnit: data.requesterUnitName,
            recipientUnit: data.targetedUnitName,
          }
        });
      }
    } catch (emailError) {
      console.error("Failed to send swap notifications:", emailError);
      // Don't fail the request if emails fail
    }

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

    // Send notification if status changed to approved or rejected
    if (data.status && data.status !== existingSwap.status) {
      try {
        const requesterUser = await getUserById(existingSwap.requesterUserId);
        
        if (requesterUser?.email) {
          await sendSwapRequestReviewedEmail({
            requesterEmail: requesterUser.email,
            requesterName: requesterUser.firstname || requesterUser.displayname || "Deelnemer",
            recipientName: existingSwap.targetedUserDisplayName,
            status: data.status,
            message: data.note || ""
          });
        }
      } catch (emailError) {
        console.error("Failed to send swap review notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(JSON.stringify(resource), { status: 200 });
  } catch (error) {
    console.error("Error updating swap request:", error);
    return new Response(JSON.stringify({ error: "Failed to update swap request" }), { status: 500 });
  }
}