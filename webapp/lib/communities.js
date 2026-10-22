import { auth } from "@/auth";
import { getDatabase } from "@/lib/cosmosdb";

const communityContainerId = "communities";
const activeCommunityCookie = "activeCommunityId";

export async function getCommunityContainer() {
  const database = await getDatabase();
  const { container } = await database.containers.createIfNotExists({
    id: communityContainerId,
    partitionKey: { paths: ["/id"] },
  });
  return container;
}

function getCookieValue(req, name) {
  const cookies = req.headers.get("cookie") || "";
  const cookie = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function getActiveCommunityId(req) {
  return getCookieValue(req, activeCommunityCookie);
}

export async function getCommunityContext(req, { ownerOnly = false } = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const communityId = getActiveCommunityId(req);
  if (!communityId) {
    return { response: Response.json({ error: "Select a community first" }, { status: 409 }) };
  }

  const container = await getCommunityContainer();
  let community;

  try {
    ({ resource: community } = await container.item(communityId, communityId).read());
  } catch (error) {
    if (error.code === 404) {
      return { response: Response.json({ error: "Community not found" }, { status: 403 }) };
    }
    throw error;
  }

  if (!community?.memberUserIds?.includes(session.user.id)) {
    return { response: Response.json({ error: "You are not a member of this community" }, { status: 403 }) };
  }

  const isOwner = community.ownerUserIds?.includes(session.user.id) || false;
  if (ownerOnly && !isOwner) {
    return { response: Response.json({ error: "Community owner access required" }, { status: 403 }) };
  }

  return { session, community, communityId, isOwner, container };
}

export function withCommunityId(data, communityId) {
  return { ...data, communityId };
}

export function setActiveCommunityCookie(response, communityId) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${activeCommunityCookie}=${encodeURIComponent(communityId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
  );
  return response;
}
