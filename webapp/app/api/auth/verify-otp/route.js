import bcrypt from "bcryptjs";
import { getContainer } from "@/lib/cosmosdb";

const containerId = "users";

/**
 * Verify OTP and validate it before password change
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 * Response: { success: true, token } (temporary token for password change)
 */
export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const container = await getContainer(containerId);

    // Find user by email
    const result = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }],
      })
      .fetchAll();

    const user = result.resources[0];
    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if OTP exists and hasn't expired
    if (!user.otp || !user.otpExpires) {
      return Response.json(
        { error: "OTP not found or has already been used" },
        { status: 400 }
      );
    }

    const otpExpired = new Date(user.otpExpires) < new Date();
    if (otpExpired) {
      return Response.json(
        { error: "OTP has expired. Please contact your administrator." },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpMatch = await bcrypt.compare(otp, user.otp);
    if (!otpMatch) {
      console.warn(`Invalid OTP attempt for user ${user.id}`);
      return Response.json(
        { error: "Invalid OTP" },
        { status: 401 }
      );
    }

    // OTP is valid - return success and user data
    console.log(`OTP verified for user ${user.id}`);

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
      },
      mustChangePassword: user.mustChangePassword || false,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return Response.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
