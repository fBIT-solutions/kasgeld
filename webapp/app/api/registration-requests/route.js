import { getContainer } from "../../../lib/cosmosdb";
import { sendRejectionEmail, sendRegistrationRequestEmail } from "../../../lib/email-service";

const registrationContainerId = "registration-requests";

export async function POST(req) {
  try {
    const data = await req.json();
    const { firstName, lastName, displayName, email, handsCount, referrer } = data;

    // Validation
    if (!firstName || !lastName || !displayName || !email) {
      return new Response(JSON.stringify({ error: "Voornaam, achternaam, weergavenaam en email zijn verplicht" }), { status: 400 });
    }

    const container = await getContainer(registrationContainerId);

    // Check if email already has pending/approved request
    const querySpec = {
      query: "SELECT * FROM c WHERE c.email = @email AND (c.status = @pending OR c.status = @approved)",
      parameters: [
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
      displayName,
      email,
      handsCount: handsCount ? parseInt(handsCount) : 0,
      referrer: referrer || "",
      status: "pending",
      rejectionMessage: null,
      createdAt: new Date().toISOString(),
      rejectedAt: null,
      approvedAt: null,
    };

    const { resource } = await container.items.create(newRequest);

    // Send notification to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@kasgeld.nl";
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      await sendRegistrationRequestEmail({
        adminEmail,
        applicantName: `${firstName} ${lastName}`,
        applicantEmail: email,
        reason: referrer || "Geen reden vermeld",
        baseUrl
      });
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
    const container = await getContainer(registrationContainerId);

    // Get all pending and rejected requests
    const querySpec = {
      query: "SELECT * FROM c WHERE c.status = @pending OR c.status = @rejected ORDER BY c.createdAt DESC",
      parameters: [
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
