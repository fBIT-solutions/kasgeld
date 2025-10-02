import bcrypt from "bcryptjs";
import { getItems, addItem, getContainer } from "../../../lib/cosmosdb";

const containerId = "users";
const container = await getContainer(containerId);

export async function POST(req)  {
  if (req.method !== "POST") return new response({status: 405});

  const data = await req.json();
    if (!data.email || !data.password) {
        return new Response(JSON.stringify({ message: "Email and password are required" }), { status: 400 });
    }
  const hashed = await bcrypt.hash(data.password, 10);
  const email = data.email.toLowerCase();
  const existing = await container.items.query({
    query: "SELECT * FROM c WHERE c.email = @email",
    parameters: [{ name: "@email", value: email }]
  }).fetchAll();
  console.log("Existing Users:", existing.resources);
  if (existing.resources.length > 0) {
    return new Response(JSON.stringify({ message: "User already exists" }),{status: 400});
  }
  const payload = {
    email,
    firstname: data.firstname || "",
    lastname: data.lastname || "",
    password: hashed,
    createdAt: new Date().toISOString(),
    role: data.role || ["default"],
    expires: data.expires ? new Date(data.expires).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days if not provided
  };

   // Add the user to the database
  await addItem(containerId, payload);

  return new Response(JSON.stringify({ message: "User created" }),{status: 201});
};
