import { getContainer } from "@/lib/cosmosdb";
import { auth } from "@/auth";

const messageContainerId = "contact-messages";

/**
 * POST /api/contact/send-message
 * Send a message to admin from logged-in user
 * Body: { subject, message }
 */
export async function POST(req) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const { subject, message } = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Onderwerp en bericht zijn verplicht" }),
        { status: 400 }
      );
    }

    // Get admin email from settings or env
    let adminEmail = process.env.ADMIN_EMAIL || "admin@kasgeld.nl";
    try {
      const settingsResponse = await fetch(
        `${process.env.NEXTAUTH_URL}/api/settings/get-config`
      );
      if (settingsResponse.ok) {
        const config = await settingsResponse.json();
        adminEmail = config.adminEmail || adminEmail;
      }
    } catch (err) {
      console.error("Error fetching admin email from settings:", err);
    }

    // Store message in database
    const container = await getContainer(messageContainerId);
    const messageDoc = {
      id: crypto.randomUUID(),
      from: session.user.email,
      fromName: session.user.displayname || `${session.user.firstname} ${session.user.lastname}`.trim(),
      subject,
      message,
      adminEmail,
      status: "new",
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    await container.items.create(messageDoc);

    // Send email to admin
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/email/send-contact-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail,
          fromEmail: session.user.email,
          fromName: messageDoc.fromName,
          subject,
          message,
        }),
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail if email doesn't send
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Bericht verzonden naar beheerder" 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Fout bij verzenden bericht" }),
      { status: 500 }
    );
  }
}

/**
 * GET /api/contact/send-message
 * Get all messages (admin only)
 */
export async function GET(req) {
  try {
    const session = await auth();

    if (!session || !session.user?.role?.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403 }
      );
    }

    const container = await getContainer(messageContainerId);
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c ORDER BY c.createdAt DESC",
      })
      .fetchAll();

    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch messages" }),
      { status: 500 }
    );
  }
}
