import { auth } from "@/auth";
import { getContainer } from "@/lib/cosmosdb";

const containerId = "users";

/**
 * Update user's display name
 * POST /api/profile/update-displayname
 * Body: { displayname }
 */
export async function POST(req) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const { displayname } = await req.json();

    if (!displayname || displayname.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Display name cannot be empty" }),
        { status: 400 }
      );
    }

    const container = await getContainer(containerId);
    const userId = session.user.id;

    // Get current user
    const { resource: user } = await container.item(userId, userId).read();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      );
    }

    // Update display name
    const updatedUser = {
      ...user,
      displayname: displayname.trim(),
    };

    await container.item(userId, userId).replace(updatedUser);

    console.log(`Display name updated for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        displayname: displayname.trim(),
        message: "Display name updated successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating display name:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update display name" }),
      { status: 500 }
    );
  }
}
