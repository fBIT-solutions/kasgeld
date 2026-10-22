import { getCommunityContext } from "@/lib/communities";
import { getContainer } from "@/lib/cosmosdb";

const containerId = "users";

function userForCommunity(user, community) {
    const isOwner = community.ownerUserIds.includes(user.id);
    const roles = Array.isArray(user.role) ? user.role : [user.role || "member"];
    return {
        id: user.id,
        email: user.email,
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        displayname: user.displayname || "",
        preferences: user.preferences || { preferredHands: 1, preferredMonths: [] },
        expires: user.expires,
        role: [
            ...(isOwner ? ["admin"] : []),
            ...roles.filter((role) => role !== "admin" && role !== "default"),
            "member",
        ],
        communityRole: isOwner ? "owner" : "member",
    };
}

export async function GET(req) {
    try {
        const { response, community, session } = await getCommunityContext(req);
        if (response) return response;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (id && id !== session.user.id && !community.ownerUserIds.includes(session.user.id)) {
            return Response.json({ error: "Only a community owner can view another member's account" }, { status: 403 });
        }

        const container = await getContainer(containerId);
        const userIds = id ? [id] : community.memberUserIds;
        const users = await Promise.all(
            userIds.map(async (userId) => {
                if (!community.memberUserIds.includes(userId)) return null;
                try {
                    const { resource: user } = await container.item(userId, userId).read();
                    if (!user) return null;
                    if (user.expires && new Date(user.expires) < new Date()) return null;
                    return userForCommunity(user, community);
                } catch (error) {
                    if (error.code === 404) return null;
                    throw error;
                }
            }),
        );

        return Response.json(id ? users[0] || { message: "User niet gevonden" } : users.filter(Boolean));
    } catch (error) {
        console.error("Error fetching community users:", error);
        return Response.json({ error: "Fout bij het ophalen van users" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const { response, session, community, isOwner } = await getCommunityContext(req);
        if (response) return response;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return Response.json({ error: "Geen user id opgegeven" }, { status: 400 });
        if (!community.memberUserIds.includes(id)) {
            return Response.json({ error: "User niet gevonden" }, { status: 404 });
        }
        if (id !== session.user.id && !isOwner) {
            return Response.json({ error: "Community owner access required" }, { status: 403 });
        }

        const container = await getContainer(containerId);
        const { resource: user } = await container.item(id, id).read();
        if (!user) return Response.json({ error: "User niet gevonden" }, { status: 404 });
        const data = await req.json();

        const updatedUser = {
            ...user,
            ...(typeof data.firstname === "string" ? { firstname: data.firstname } : {}),
            ...(typeof data.lastname === "string" ? { lastname: data.lastname } : {}),
            ...(typeof data.displayname === "string" ? { displayname: data.displayname } : {}),
            ...(data.preferences && typeof data.preferences === "object" ? { preferences: data.preferences } : {}),
        };
        const { resource } = await container.item(id, id).replace(updatedUser);
        return Response.json(userForCommunity(resource, community));
    } catch (error) {
        console.error("Error updating user:", error);
        return Response.json({ error: "Fout bij het bijwerken van de user" }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { response, community, container: communitiesContainer, session } = await getCommunityContext(req, { ownerOnly: true });
        if (response) return response;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return Response.json({ error: "Geen user id opgegeven" }, { status: 400 });
        if (!community.memberUserIds.includes(id)) {
            return Response.json({ error: "User niet gevonden" }, { status: 404 });
        }
        if (id === session.user.id) {
            return Response.json({ error: "You cannot remove yourself from the community" }, { status: 400 });
        }
        if (community.ownerUserIds.includes(id) && community.ownerUserIds.length === 1) {
            return Response.json({ error: "A community must have at least one owner" }, { status: 400 });
        }

        community.memberUserIds = community.memberUserIds.filter((memberId) => memberId !== id);
        community.ownerUserIds = community.ownerUserIds.filter((ownerId) => ownerId !== id);
        await communitiesContainer.item(community.id, community.id).replace(community);
        return Response.json({ message: "User successfully removed from this community" });
    } catch (error) {
        console.error("Error removing community user:", error);
        return Response.json({ error: "Fout bij het verwijderen van de user" }, { status: 500 });
    }
}
