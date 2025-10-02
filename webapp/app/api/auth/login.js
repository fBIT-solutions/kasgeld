import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getItems, addItem, getContainer } from "../../../lib/cosmosdb";

const containerId = "users";
const container = await getContainer(containerId);

export async function POST(req, res) {
  if (req.method !== "POST") return new response({status: 405});

  const { email, password } = req.body;

  const result = await container.items.query({
    query: "SELECT * FROM c WHERE c.email = @email",
    parameters: [{ name: "@email", value: email }]
  }).fetchAll();

  const user = result.resources[0];
  if (!user) return new response(JSON.stringify({ message: "Unreconized email" }),{status: 401});

  const match = await bcrypt.compare(password, user.password);
  if (!match) return new response(JSON.stringify({ message: "Invalid credentials" }),{status: 401});

  const token = jwt.sign({ email: user.email, id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return new response(JSON.stringify({ token }),{status: 200});
};
