import { getContainer } from "../../../../../lib/cosmosdb";
import { sendWelcomeEmail } from "../../../../../lib/email-service";
import bcrypt from "bcryptjs";

const registrationContainerId = "registration-requests";
const usersContainerId = "users";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const container = await getContainer(registrationContainerId);
    const usersContainer = await getContainer(usersContainerId);

    // Get registration request
    const { resource: registrationRequest } = await container.item(id, id).read();
    
    if (!registrationRequest) {
      return new Response(JSON.stringify({ error: "Registratieverzoek niet gevonden" }), { status: 404 });
    }

    if (registrationRequest.status !== "pending") {
      return new Response(JSON.stringify({ error: "Dit verzoek is al verwerkt" }), { status: 400 });
    }

    // Check if user with this email already exists
    const existingUserQuery = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: registrationRequest.email }]
    };
    
    const { resources: existingUsers } = await usersContainer.items.query(existingUserQuery).fetchAll();
    if (existingUsers.length > 0) {
      return new Response(JSON.stringify({ error: "Gebruiker met dit emailadres bestaat al" }), { status: 400 });
    }

    // Create new user with OTP (6 random digits)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const otpTimeout = new Date();
    otpTimeout.setMinutes(otpTimeout.getMinutes() + 10);

    const newUser = {
      id: crypto.randomUUID(),
      email: registrationRequest.email,
      firstname: registrationRequest.firstName,
      lastname: registrationRequest.lastName,
      displayName: registrationRequest.displayName,
      handsCount: registrationRequest.handsCount,
      referrer: registrationRequest.referrer || "",
      role: ["member", "default"],
      password: null,
      otp: otpHash,
      otpExpires: otpTimeout.toISOString(),
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };

    await usersContainer.items.create(newUser);

    // Update registration request status
    const updatedRequest = {
      ...registrationRequest,
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    await container.item(id, id).replace(updatedRequest);

    // Send welcome email with OTP
    try {
      await sendWelcomeEmail({
        recipientEmail: registrationRequest.email,
        recipientName: registrationRequest.firstName,
        email: registrationRequest.email,
        otp,
        tempPassword: "Geldig na eerste inlog",
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the approval if email fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Registratieverzoek goedgekeurd. Gebruiker aangemaakt en welkommail verzonden.",
      otp 
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fout bij goedkeuring van registratieverzoek", details: error.message }), { status: 500 });
  }
}

