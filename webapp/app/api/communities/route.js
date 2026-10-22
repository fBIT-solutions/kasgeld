import { auth } from "@/auth";
import {
  getActiveCommunityId,
  getCommunityContainer,
  setActiveCommunityCookie,
} from "@/lib/communities";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const container = await getCommunityContainer();
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.memberUserIds, @userId)",
        parameters: [{ name: "@userId", value: session.user.id }],
      })
      .fetchAll();
    const activeId = getActiveCommunityId(req);

    return Response.json({
      communities: resources.map(({ id, name, ownerUserIds }) => ({
        id,
        name,
        isOwner: ownerUserIds?.includes(session.user.id) || false,
      })),
      activeCommunityId: resources.some((community) => community.id === activeId) ? activeId : null,
    });
  } catch (error) {
    console.error("Error listing communities:", error);
    return Response.json({ error: "Failed to load communities" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName || normalizedName.length > 80) {
      return Response.json({ error: "Community name must be between 1 and 80 characters" }, { status: 400 });
    }

    const container = await getCommunityContainer();
    const community = {
      id: crypto.randomUUID(),
      name: normalizedName,
      memberUserIds: [session.user.id],
      ownerUserIds: [session.user.id],
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    };
    const { resource } = await container.items.create(community);
    const response = Response.json({
      community: { id: resource.id, name: resource.name, isOwner: true },
      communities: [{ id: resource.id, name: resource.name, isOwner: true }],
      activeCommunityId: resource.id,
    }, { status: 201 });
    return setActiveCommunityCookie(response, resource.id);
  } catch (error) {
    console.error("Error creating community:", error);
    return Response.json({ error: "Failed to create community" }, { status: 500 });
  }
}
