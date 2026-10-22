import { getCommunityContext } from "@/lib/communities";
import { getContainer } from "@/lib/cosmosdb";

export async function GET(req) {
  try {
    const { response, community, isOwner } = await getCommunityContext(req);
    if (response) return response;

    const users = await getContainer("users");
    const members = await Promise.all(
      community.memberUserIds.map(async (userId) => {
        try {
          const { resource: user } = await users.item(userId, userId).read();
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            displayname: user.displayname || `${user.firstname || ""} ${user.lastname || ""}`.trim(),
            isOwner: community.ownerUserIds.includes(user.id),
          };
        } catch (error) {
          if (error.code === 404) return null;
          throw error;
        }
      }),
    );

    return Response.json({ members: members.filter(Boolean), isOwner });
  } catch (error) {
    console.error("Error listing community members:", error);
    return Response.json({ error: "Failed to load community members" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response, community, container, session } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;

    const { email, action = "add" } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }
    if (!["add", "remove", "promote", "demote"].includes(action)) {
      return Response.json({ error: "Unsupported member action" }, { status: 400 });
    }

    const users = await getContainer("users");
    const { resources } = await users.items
      .query({
        query: "SELECT * FROM c WHERE LOWER(c.email) = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();
    const user = resources[0];
    if (!user) {
      return Response.json({ error: "No registered account exists for that email" }, { status: 404 });
    }

    const memberUserIds = [...community.memberUserIds];
    const ownerUserIds = [...community.ownerUserIds];
    const isMember = memberUserIds.includes(user.id);
    const isOwner = ownerUserIds.includes(user.id);

    if (action === "add") {
      if (isMember) {
        return Response.json({ error: "That user is already a community member" }, { status: 409 });
      }
      memberUserIds.push(user.id);
    } else if (action === "remove") {
      if (isOwner && ownerUserIds.length === 1) {
        return Response.json({ error: "A community must have at least one owner" }, { status: 400 });
      }
      if (user.id === session.user.id) {
        return Response.json({ error: "You cannot remove yourself from the community" }, { status: 400 });
      }
      community.memberUserIds = memberUserIds.filter((id) => id !== user.id);
      community.ownerUserIds = ownerUserIds.filter((id) => id !== user.id);
    } else if (action === "promote") {
      if (!isMember) {
        return Response.json({ error: "Add the user to the community before making them an owner" }, { status: 400 });
      }
      if (!isOwner) ownerUserIds.push(user.id);
    } else {
      if (!isOwner) {
        return Response.json({ error: "That user is not a community owner" }, { status: 400 });
      }
      if (ownerUserIds.length === 1) {
        return Response.json({ error: "A community must have at least one owner" }, { status: 400 });
      }
      community.ownerUserIds = ownerUserIds.filter((id) => id !== user.id);
    }

    if (action !== "remove" && action !== "demote") {
      community.memberUserIds = memberUserIds;
      community.ownerUserIds = ownerUserIds;
    }
    community.updatedAt = new Date().toISOString();
    const { resource } = await container.item(community.id, community.id).replace(community);
    return Response.json({
      members: resource.memberUserIds,
      message: "Community membership updated",
    });
  } catch (error) {
    console.error("Error updating community membership:", error);
    return Response.json({ error: "Failed to update community membership" }, { status: 500 });
  }
}
