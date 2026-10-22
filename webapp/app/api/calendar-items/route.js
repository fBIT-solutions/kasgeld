import { getContainer } from "../../../lib/cosmosdb";
import { getCommunityContext, withCommunityId } from "@/lib/communities";
import { put } from "@vercel/blob";

const containerId = "calendar";


export async function GET(req) {
  try {
    const { response, communityId } = await getCommunityContext(req);
    if (response) return response;
    const container = await getContainer(containerId);
    const { resources } = await container.items.query({
      query: "SELECT * FROM c WHERE c.communityId = @communityId",
      parameters: [{ name: "@communityId", value: communityId }],
    }).fetchAll();
    return new Response(JSON.stringify(resources), { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van events" }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const data = await req.json();
    const container = await getContainer(containerId);
    const item = withCommunityId({ ...data, id: data.id || crypto.randomUUID() }, communityId);
    const { resource } = await container.items.create(item);
    return new Response(JSON.stringify(resource), { status: 201 });
  } catch (error) {
    console.error("Error adding event:", error);
    return new Response(JSON.stringify({ error: "Fout bij het toevoegen van events" }), { status: 500 });
  }
}
export async function PUT(req) {
  try {
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const data = await req.json();
    const container = await getContainer(containerId);
    if (!data.id) return Response.json({ error: "Event ID is required" }, { status: 400 });
    const { resource: existing } = await container.item(data.id, data.id).read();
    if (!existing || existing.communityId !== communityId) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    const { resource } = await container.item(data.id, data.id).replace(
      withCommunityId({ ...existing, ...data }, communityId),
    );
    return new Response(JSON.stringify(resource), { status: 200 });
  } catch (error) {
    console.error("Error updating event:", error);
    return new Response(JSON.stringify({ error: "Fout bij het bijwerken van events" }), { status: 500 });
  }
}