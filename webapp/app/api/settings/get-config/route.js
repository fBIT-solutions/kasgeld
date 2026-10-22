import { getContainer } from "@/lib/cosmosdb";
import { getCommunityContext } from "@/lib/communities";

const settingsContainerId = "settings";

/**
 * GET /api/settings/get-config
 * Retrieves app configuration including admin email
 */
export async function GET(req) {
  try {
    const { response, communityId } = await getCommunityContext(req);
    if (response) return response;
    const container = await getContainer(settingsContainerId);
    const configId = `community-${communityId}-config`;

    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.communityId = @communityId",
        parameters: [
          { name: "@id", value: configId },
          { name: "@communityId", value: communityId },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      // Return default config if not found
      return new Response(
        JSON.stringify({ 
          adminEmail: "",
          paymentUrl: "",
          appName: "Kasgeld"
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify(resources[0]), { status: 200 });
  } catch (error) {
    console.error("Error fetching config:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch config"
      }),
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/get-config
 * Updates app configuration (admin only)
 */
export async function POST(req) {
  try {
    const { response, communityId, session } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;

    const container = await getContainer(settingsContainerId);
    const body = await req.json();

    const config = {
      id: `community-${communityId}-config`,
      communityId,
      adminEmail: body.adminEmail || "",
      paymentUrl: body.paymentUrl || "",
      appName: body.appName || "Kasgeld",
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email,
    };

    const { resource } = await container.items.upsert(config);

    return new Response(JSON.stringify(resource), { status: 200 });
  } catch (error) {
    console.error("Error updating config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update config" }),
      { status: 500 }
    );
  }
}
