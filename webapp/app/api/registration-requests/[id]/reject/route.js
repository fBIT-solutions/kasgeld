import { getContainer } from "../../../../../lib/cosmosdb";
import { sendRejectionEmail } from "../../../../../lib/email-service";

const registrationContainerId = "registration-requests";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`[REJECT] Processing reject request for id: ${id}`);
    
    const { rejectionMessage } = await req.json();
    console.log(`[REJECT] Rejection message: ${rejectionMessage}`);

    const container = await getContainer(registrationContainerId);

    // Get registration request
    const { resource: registrationRequest } = await container.item(id, id).read();
    console.log(`[REJECT] Found registration request: ${registrationRequest?.email}`);
    
    if (!registrationRequest) {
      return new Response(JSON.stringify({ error: "Registratieverzoek niet gevonden" }), { status: 404 });
    }

    if (registrationRequest.status !== "pending") {
      return new Response(JSON.stringify({ error: "Dit verzoek is al verwerkt" }), { status: 400 });
    }

    // Update registration request status
    const updatedRequest = {
      ...registrationRequest,
      status: "rejected",
      rejectionMessage: rejectionMessage || "Je aanvraag is afgewezen.",
      rejectedAt: new Date().toISOString(),
    };

    await container.item(id, id).replace(updatedRequest);
    console.log(`[REJECT] Updated registration request status to rejected`);

    // Send rejection email - don't block on error
    try {
      console.log(`[REJECT] Attempting to send rejection email to ${registrationRequest.email}`);
      await sendRejectionEmail(registrationRequest.email, registrationRequest.displayName, rejectionMessage);
      console.log(`[REJECT] Successfully sent rejection email`);
    } catch (emailError) {
      console.error(`[REJECT] Error sending rejection email:`, emailError);
      // Continue even if email fails - the request is still rejected in DB
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Registratieverzoek afgewezen. Afwijzingsbericht verzonden naar aanvraagder."
    }), { status: 200 });
  } catch (error) {
    console.error("[REJECT] Error in reject endpoint:", error);
    return new Response(JSON.stringify({ error: "Fout bij afwijzing van registratieverzoek", details: error.message }), { status: 500 });
  }
}

