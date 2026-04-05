import { getContainer } from "@/lib/cosmosdb";
import { auth } from "@/auth";

const settingsContainerId = "settings";

/**
 * GET /api/settings/get-config
 * Retrieves app configuration including admin email
 */
export async function GET(req) {
  try {
    const container = await getContainer(settingsContainerId);

    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: "app-config" }],
      })
      .fetchAll();

    if (resources.length === 0) {
      // Return default config if not found
      return new Response(
        JSON.stringify({ 
          adminEmail: process.env.ADMIN_EMAIL || "admin@kasgeld.nl",
          paymentUrl: process.env.PAYMENT_URL || "",
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
        error: "Failed to fetch config",
        adminEmail: process.env.ADMIN_EMAIL || "admin@kasgeld.nl"
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
    const session = await auth();

    if (!session || !session.user?.role?.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403 }
      );
    }

    const container = await getContainer(settingsContainerId);
    const body = await req.json();

    const config = {
      id: "app-config",
      adminEmail: body.adminEmail || process.env.ADMIN_EMAIL || "admin@kasgeld.nl",
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
