import { getContainer } from "@/lib/cosmosdb";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !email.trim()) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const users = await getContainer("users");
    const { resources } = await users.items.query({
      query: "SELECT c.otp, c.mustChangePassword FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email.trim().toLowerCase() }],
    }).fetchAll();
    const user = resources[0];
    return Response.json({
      requiresOtp: Boolean(user?.otp && user.mustChangePassword),
    });
  } catch (error) {
    console.error("Error checking OTP requirement:", error);
    return Response.json({ error: "Could not check account status" }, { status: 500 });
  }
}
