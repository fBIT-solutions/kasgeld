import { auth } from "@/auth";
import { getCommunityContainer, setActiveCommunityCookie } from "@/lib/communities";

export async function POST(req) {
  try {
    const { communityId } = await req.json();
    if (!communityId) {
      return Response.json({ error: "Community ID is required" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const container = await getCommunityContainer();
    const { resource: community } = await container.item(communityId, communityId).read();
    if (!community?.memberUserIds?.includes(session.user.id)) {
      return Response.json({ error: "You are not a member of this community" }, { status: 403 });
    }

    return setActiveCommunityCookie(
      Response.json({ activeCommunityId: community.id }),
      community.id,
    );
  } catch (error) {
    if (error.code === 404) {
      return Response.json({ error: "Community not found" }, { status: 404 });
    }
    console.error("Error switching community:", error);
    return Response.json({ error: "Failed to switch community" }, { status: 500 });
  }
}
