import { getContainer } from "../../../lib/cosmosdb";
import { getCommunityContext, withCommunityId } from "@/lib/communities";
import { put } from "@vercel/blob";

const containerId = "runs";

export async function POST(req) {
  try {
    const { response, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const data = await req.json();
    if ((data.units || []).some((unit) => unit.assignedTo && !community.memberUserIds.includes(unit.assignedTo))) {
      return Response.json({ error: "All assigned users must belong to this community" }, { status: 400 });
    }
    const container = await getContainer(containerId);

    // Check if event with same title/date exists (customize as needed)
    const querySpec = {
      query: "SELECT * FROM c WHERE c.communityId = @communityId AND c.year = @year",
      parameters: [
        { name: "@communityId", value: communityId },
        { name: "@year", value: data.year },
      ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();

    if (resources.length > 0) {
      // Update existing event
      const existing = resources[0];
      const updatedEvent = withCommunityId({ ...existing, ...data }, communityId);
      const { resource } = await container.item(existing.id, existing.id).replace(updatedEvent);
      return new Response(JSON.stringify(resource), { status: 200 });
    } else {
      const item = withCommunityId({ ...data, id: data.id || crypto.randomUUID() }, communityId);
      const { resource } = await container.items.create(item);
      return new Response(JSON.stringify({ message: "Run toegevoegd", item: resource }), { status: 201 });
    }
  } catch (error) {
    console.error("Error adding/updating run:", error);
    return new Response(JSON.stringify({ error: "Fout bij het toevoegen/bijwerken van de run" }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { response, communityId, community } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const container = await getContainer(containerId);
    const data = await req.json();

    if (data.id) {
      if ((data.units || []).some((unit) => unit.assignedTo && !community.memberUserIds.includes(unit.assignedTo))) {
        return Response.json({ error: "All assigned users must belong to this community" }, { status: 400 });
      }
      const { resource: existingEvent } = await container.item(data.id, data.id).read();
      if (!existingEvent || existingEvent.communityId !== communityId) {
        return new Response(JSON.stringify({ error: "Run niet gevonden" }), { status: 404 });
      }

      const updatedEvent = withCommunityId({ ...existingEvent, ...data }, communityId);
      const { resource } = await container.item(data.id, data.id).replace(updatedEvent);

      return new Response(JSON.stringify(resource), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Fout bij het bijwerken van de run" }), { status: 400 });
    }
  } catch (error) {
    console.error("Error updating run:", error);
    return new Response(JSON.stringify({ error: "Fout bij het bijwerken van de run" }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const id = searchParams.get("id");

    if (id) {
      const { resource } = await container.item(id, id).read();
      if (!resource || resource.communityId !== communityId) {
        return new Response(JSON.stringify({ error: "Run niet gevonden" }), { status: 404 });
      }
      await container.item(id, id).delete();
      return new Response("Ok", { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: "Geen run id opgegeven" }), { status: 400 });
    }
  } catch (error) {
    console.error("Error deleting run:", error);
    return new Response(JSON.stringify({ error: "Fout bij het verwijderen van de run" }), { status: 500 });
  }
}

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
    console.error("Error fetching runs:", error);
    return new Response(JSON.stringify({ error: "Fout bij het ophalen van runs" }), { status: 500 });
  }
}


export async function addMedia(eventId, file) {
  if (file && eventId) {
    const blobName = `/fambalker-app/runs/${eventId}/${Date.now()}-${file.name}`;
    const blob = await put(blobName, file, { access: "public" });
    return blob.url;
    // return "#";
  }
}