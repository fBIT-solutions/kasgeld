import bcrypt from "bcryptjs";
import { getContainer } from "@/lib/cosmosdb";

const containerId = "users";

/**
 * Change password
 * POST /api/auth/change-password
 * Body: { userId, newPassword, otp } (first time with OTP) OR
 *       { userId, currentPassword, newPassword } (subsequent changes)
 */
export async function POST(req) {
  try {
    const { userId, newPassword, otp, currentPassword } = await req.json();

    if (!userId || !newPassword) {
      return Response.json(
        { error: "UserId and newPassword are required" },
        { status: 400 }
      );
    }

    if (!otp && !currentPassword) {
      return Response.json(
        { error: "Either OTP or current password must be provided" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const container = await getContainer(containerId);

    // Get user
    const { resource: user } = await container.item(userId, userId).read();
    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate authorization
    if (otp) {
      // First-time password change with OTP
      if (!user.otp) {
        return Response.json(
          { error: "OTP not found or already used" },
          { status: 400 }
        );
      }

      const otpMatch = await bcrypt.compare(otp, user.otp);
      if (!otpMatch) {
        return Response.json(
          { error: "Invalid OTP" },
          { status: 401 }
        );
      }
    } else if (currentPassword) {
      // Subsequent password change - verify current password
      const passwordMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!passwordMatch) {
        return Response.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update user
    const updatedUser = {
      ...user,
      password: newPasswordHash,
      otp: null, // Clear OTP after use
      otpExpires: null,
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString(),
      // Set default roles if this is first password change (OTP flow)
      role: otp ? ["member", "default"] : user.role,
    };

    await container.item(userId, userId).replace(updatedUser);

    console.log(`Password changed for user ${userId}`);

    return Response.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return Response.json(
      { error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}
