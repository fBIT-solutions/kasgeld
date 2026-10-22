import { getContainer } from "@/lib/cosmosdb";
import { sendContactMessage } from "@/lib/email-service";
import { getCommunityContext } from "@/lib/communities";

const messageContainerId = "contact-messages";

/**
 * POST /api/contact/send-message
 * Send a message to admin from logged-in user
 * Body: { subject, message }
 */
export async function POST(req) {
  try {
    const { response, session, community, communityId } = await getCommunityContext(req);
    if (response) return response;

    const { subject, message } = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Onderwerp en bericht zijn verplicht" }),
        { status: 400 }
      );
    }

    const settings = await getContainer("settings");
    const { resources: configRecords } = await settings.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.communityId = @communityId",
      parameters: [
        { name: "@id", value: `community-${communityId}-config` },
        { name: "@communityId", value: communityId },
      ],
    }).fetchAll();
    const ownerUsers = await Promise.all(
      community.ownerUserIds.map(async (ownerId) => {
        const users = await getContainer("users");
        const { resource: user } = await users.item(ownerId, ownerId).read();
        return user?.email;
      }),
    );
    const adminEmail = configRecords[0]?.adminEmail || ownerUsers.filter(Boolean)[0];
    if (!adminEmail) {
      return Response.json({ error: "No community contact email is configured" }, { status: 400 });
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
      communityId,
    };

    await container.items.create(messageDoc);

    // Send email to admin
    let emailSent = false;
    try {
      await sendContactMessage({
        adminEmail,
        fromEmail: session.user.email,
        fromName: messageDoc.fromName,
        subject,
        message,
      });
      emailSent = true;
      
      // Update message status to sent
      const updatedMessage = {
        ...messageDoc,
        status: "sent",
        sentAt: new Date().toISOString(),
      };
      await container.item(messageDoc.id, messageDoc.id).replace(updatedMessage);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail if email doesn't send
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Bericht opgeslagen" + (emailSent ? " en verstuurd" : ""),
        emailSent
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
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;

    const container = await getContainer(messageContainerId);
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.communityId = @communityId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@communityId", value: communityId }],
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
