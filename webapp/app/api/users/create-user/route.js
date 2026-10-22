import { getContainer } from "@/lib/cosmosdb";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sendWelcomeEmail } from "@/lib/email-service";
import { getCommunityContext } from "@/lib/communities";

const containerId = "users";

export async function POST(req) {
  try {
    const { response, session, community, container: communitiesContainer } =
      await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;

    const container = await getContainer(containerId);

    const {
      email,
      firstname,
      lastname,
      displayname,
    } = await req.json();

    // Validate input
    if (typeof email !== "string" || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400 }
      );
    }

    // Check if user already exists
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await container.items
      .query({
        query: "SELECT * FROM c WHERE LOWER(c.email) = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (existingUser.resources.length > 0) {
      return new Response(
        JSON.stringify({ error: "User already exists" }),
        { status: 409 }
      );
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Generate temporary password
    const tempPassword = nanoid(12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user with OTP
    const newUser = {
      id: nanoid(),
      email: normalizedEmail,
      firstname: firstname || "",
      lastname: lastname || "",
      displayname: displayname || normalizedEmail.split("@")[0],
      password: passwordHash,
      role: ["member"],
      otp: otpHash,
      otpExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      createdBy: session.user?.email,
    };

    // Save to database
    const { resource: createdUser } = await container.items.create(newUser);
    community.memberUserIds.push(createdUser.id);
    await communitiesContainer.item(community.id, community.id).replace(community);

    console.log(`User created with ID: ${createdUser.id}`);

    // Send welcome email
    try {
      await sendWelcomeEmail({
        recipientEmail: email,
        recipientName: firstname || displayname,
        email: email,
        otp: otp,
        tempPassword: tempPassword,
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.warn(`Email sending failed (user still created):`, emailError);
      // Don't fail the user creation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: createdUser.id,
        message: "User created successfully. Welcome email has been sent.",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create user" }),
      { status: 500 }
    );
  }
}
