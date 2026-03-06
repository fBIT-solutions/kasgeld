import { getContainer } from "@/lib/cosmosdb";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sendWelcomeEmail } from "@/lib/email-service";

const containerId = "users";

export async function POST(req) {
  try {
    // Check authentication and admin role
    const session = await auth();
    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = session.user?.role?.includes("admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403 }
      );
    }

    const container = await getContainer(containerId);

    const {
      email,
      firstname,
      lastname,
      displayname,
      role = "member",
    } = await req.json();

    // Validate input
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }],
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
      email,
      firstname: firstname || "",
      lastname: lastname || "",
      displayname: displayname || email.split("@")[0],
      password: passwordHash,
      role: [role],
      otp: otpHash,
      otpExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      createdBy: session.user?.email,
    };

    // Save to database
    const { resource: createdUser } = await container.items.create(newUser);

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
