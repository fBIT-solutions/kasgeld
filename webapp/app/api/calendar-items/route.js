import { addItem, getItems, getContainer } from "../../../lib/cosmosdb";
import { put } from "@vercel/blob";

const containerId = "calendar";


export async function GET(req) {
  try {
    const items = await getItems(containerId);
    return new Response(JSON.stringify(items), { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van events" }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const item = await addItem(containerId, data);
    return new Response(JSON.stringify(item), { status: 201 });
  } catch (error) {
    console.error("Error adding event:", error);
    return new Response(JSON.stringify({ error: "Fout bij het toevoegen van events" }), { status: 500 });
  }
}
export async function PUT(req) {
  try {
    const data = await req.json();
    const container = await getContainer(containerId);
    const { resource } = await container.item(data.id, data.id).replace(data);
    return new Response(JSON.stringify(resource), { status: 200 });
  } catch (error) {
    console.error("Error updating event:", error);
    return new Response(JSON.stringify({ error: "Fout bij het bijwerken van events" }), { status: 500 });
  }
}