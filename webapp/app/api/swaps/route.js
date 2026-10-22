import { getContainer } from "@/lib/cosmosdb";
import { getCommunityContext, withCommunityId } from "@/lib/communities";
import { sendSwapRequestReceivedEmail, sendSwapRequestReviewedEmail } from "@/lib/email-service";

const containerId = "swaps";
const usersContainerId = "users";

async function getUserById(userId, community) {
  if (!community.memberUserIds.includes(userId)) return null;
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
    const { response, session, community, communityId } = await getCommunityContext(req);
    if (response) return response;
    const data = await req.json();
    if (!data.runId || !data.targetedUserId || !community.memberUserIds.includes(data.targetedUserId)) {
      return Response.json({ error: "The selected user is not a member of this community" }, { status: 400 });
    }
    const runs = await getContainer("runs");
    const { resource: run } = await runs.item(data.runId, data.runId).read();
    if (!run || run.communityId !== communityId) {
      return Response.json({ error: "Run not found in this community" }, { status: 404 });
    }
    const container = await getContainer(containerId);

    // Create swap request
    const swapRequest = {
      id: `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      requesterUserId: session.user.id,
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
      createdAt: new Date().toISOString(),
      communityId,
    };

    const { resource } = await container.items.create(swapRequest);

    // Send notifications
    try {
      const requesterUser = await getUserById(session.user.id, community);
      const targetedUser = await getUserById(data.targetedUserId, community);

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
    const { response, communityId } = await getCommunityContext(req);
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    
    const container = await getContainer(containerId);
    
    let querySpec = {
      query: "SELECT * FROM c WHERE c.communityId = @communityId",
      parameters: [{ name: "@communityId", value: communityId }]
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
    const { response, session, communityId, community, isOwner } = await getCommunityContext(req);
    if (response) return response;
    const data = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Swap ID is required" }), { status: 400 });
    }

    const container = await getContainer(containerId);
    
    // Get the existing swap request
    const { resource: existingSwap } = await container.item(id, id).read();
    if (!existingSwap || existingSwap.communityId !== communityId) {
      return Response.json({ error: "Swap request not found" }, { status: 404 });
    }
    if (!isOwner && existingSwap.targetedUserId !== session.user.id) {
      return Response.json({ error: "Only the targeted member or a community owner can review this request" }, { status: 403 });
    }
    if (data.status && !["pending", "accepted", "rejected"].includes(data.status)) {
      return Response.json({ error: "Invalid swap status" }, { status: 400 });
    }

    let updatedRun = null;
    if (
      data.status === "accepted" &&
      (existingSwap.status !== "accepted" || data.synchronize === true)
    ) {
      if (existingSwap.status !== "pending" && existingSwap.status !== "accepted") {
        return Response.json({ error: "Only pending swap requests can be accepted" }, { status: 409 });
      }
      const runs = await getContainer("runs");
      let run;
      try {
        ({ resource: run } = await runs.item(existingSwap.runId, existingSwap.runId).read());
      } catch (error) {
        if (error.code !== 404) throw error;
      }
      if (!run || run.communityId !== communityId) {
        return Response.json({ error: "Run not found in this community" }, { status: 404 });
      }
      if (
        !community.memberUserIds.includes(existingSwap.requesterUserId) ||
        !community.memberUserIds.includes(existingSwap.targetedUserId)
      ) {
        return Response.json({ error: "Swap participants must belong to this community" }, { status: 400 });
      }

      const requesterIndex = run.units?.findIndex(
        (unit) => unit.name === existingSwap.requesterUnitName && unit.hand === existingSwap.requesterUnitHand,
      );
      const targetedIndex = run.units?.findIndex(
        (unit) => unit.name === existingSwap.targetedUnitName && unit.hand === existingSwap.targetedUnitHand,
      );
      if (requesterIndex === undefined || requesterIndex < 0 || targetedIndex === undefined || targetedIndex < 0 || requesterIndex === targetedIndex) {
        return Response.json({ error: "The units in this swap could not be found" }, { status: 409 });
      }

      const requesterUnit = run.units[requesterIndex];
      const targetedUnit = run.units[targetedIndex];
      const isNotYetApplied =
        requesterUnit.assignedTo === existingSwap.requesterUserId &&
        targetedUnit.assignedTo === existingSwap.targetedUserId;
      const isAlreadyApplied =
        requesterUnit.assignedTo === existingSwap.targetedUserId &&
        targetedUnit.assignedTo === existingSwap.requesterUserId;

      if (!isNotYetApplied && !isAlreadyApplied) {
        return Response.json({ error: "Unit assignments have changed since this swap was requested" }, { status: 409 });
      }

      if (isNotYetApplied) {
        const units = run.units.map((unit, index) => {
          if (index === requesterIndex) return { ...unit, assignedTo: existingSwap.targetedUserId };
          if (index === targetedIndex) return { ...unit, assignedTo: existingSwap.requesterUserId };
          return unit;
        });
        const updated = withCommunityId({ ...run, units }, communityId);
        ({ resource: updatedRun } = await runs.item(run.id, run.id).replace(updated));
      } else {
        updatedRun = run;
      }
    }

    const updatedSwap = withCommunityId({
      ...existingSwap,
      status: data.status ?? existingSwap.status,
      responseNote: data.responseNote ?? existingSwap.responseNote,
      respondedAt: data.respondedAt ?? (data.status ? new Date().toISOString() : existingSwap.respondedAt),
      updatedAt: new Date().toISOString()
    }, communityId);

    const { resource } = await container.item(id, id).replace(updatedSwap);

    // Send notification if status changed to approved or rejected
    if (data.status && data.status !== existingSwap.status) {
      try {
        const requesterUser = await getUserById(existingSwap.requesterUserId, community);
        
        if (requesterUser?.email) {
          await sendSwapRequestReviewedEmail({
            requesterEmail: requesterUser.email,
            requesterName: requesterUser.firstname || requesterUser.displayname || "Deelnemer",
            recipientName: existingSwap.targetedUserDisplayName,
            status: data.status,
            message: data.responseNote || ""
          });
        }
      } catch (emailError) {
        console.error("Failed to send swap review notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return Response.json({ ...resource, updatedRun });
  } catch (error) {
    console.error("Error updating swap request:", error);
    return new Response(JSON.stringify({ error: "Failed to update swap request" }), { status: 500 });
  }
}