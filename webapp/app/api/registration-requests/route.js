import { getContainer } from "../../../lib/cosmosdb";
import { sendRegistrationRequestEmail } from "../../../lib/email-service";
import { getActiveCommunityId, getCommunityContainer, getCommunityContext } from "@/lib/communities";

const registrationContainerId = "registration-requests";

export async function POST(req) {
  try {
    const communityId = getActiveCommunityId(req);
    if (!communityId) {
      return Response.json({ error: "Select a community before submitting a registration request" }, { status: 409 });
    }
    const communities = await getCommunityContainer();
    const { resource: community } = await communities.item(communityId, communityId).read();
    if (!community) {
      return Response.json({ error: "Community not found" }, { status: 404 });
    }
    const data = await req.json();
    const { firstName, lastName, displayName, handsCount, referrer } = data;
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    // Validation
    if (!firstName || !lastName || !displayName || !email) {
      return new Response(JSON.stringify({ error: "Voornaam, achternaam, weergavenaam en email zijn verplicht" }), { status: 400 });
    }

    const container = await getContainer(registrationContainerId);

    // Check if email already has pending/approved request
    const querySpec = {
      query: "SELECT * FROM c WHERE c.communityId = @communityId AND c.email = @email AND (c.status = @pending OR c.status = @approved)",
      parameters: [
        { name: "@communityId", value: communityId },
        { name: "@email", value: email },
        { name: "@pending", value: "pending" },
        { name: "@approved", value: "approved" }
      ]
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    if (resources.length > 0) {
      return new Response(JSON.stringify({ error: "Er is al een actief verzoek voor dit emailadres" }), { status: 400 });
    }

    // Create registration request
    const newRequest = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      displayname: displayName,
      email,
      handsCount: handsCount ? parseInt(handsCount) : 0,
      referrer: referrer || "",
      status: "pending",
      rejectionMessage: null,
      createdAt: new Date().toISOString(),
      rejectedAt: null,
      approvedAt: null,
      communityId,
    };

    // Send notification to admin
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const users = await getContainer("users");
      for (const ownerId of community.ownerUserIds) {
        const { resource: owner } = await users.item(ownerId, ownerId).read();
        if (!owner?.email) continue;
        await sendRegistrationRequestEmail({
          adminEmail: owner.email,
          applicantName: `${firstName} ${lastName}`,
          applicantEmail: email,
          reason: referrer || "Geen reden vermeld",
          baseUrl
        });
      }
    } catch (emailError) {
      console.error("Failed to send registration request notification:", emailError);
      // Don't fail the request if email fails
    }

    return new Response(JSON.stringify({ success: true, message: "Registratieverzoek ingediend. We nemen contact op zodra het is beoordeeld." }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij het indienen van registratieverzoek", details: error.message }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const container = await getContainer(registrationContainerId);

    // Get all pending and rejected requests
    const querySpec = {
      query: "SELECT * FROM c WHERE c.communityId = @communityId AND (c.status = @pending OR c.status = @rejected) ORDER BY c.createdAt DESC",
      parameters: [
        { name: "@communityId", value: communityId },
        { name: "@pending", value: "pending" },
        { name: "@rejected", value: "rejected" }
      ]
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij ophalen van registratieverzoeken", details: error.message }), { status: 500 });
  }
}
