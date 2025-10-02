import { addItem, getItems, getContainer } from "../../../lib/cosmosdb";
import { put } from "@vercel/blob";

const containerId = "runs";

export async function POST(req) {
  try {
    const data = await req.json();
    const container = await getContainer(containerId);

    // Check if event with same title/date exists (customize as needed)
    const querySpec = {
      query: "SELECT * FROM c WHERE c.year = @year",
      parameters: [
        { name: "@year", value: data.year },
      ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();

    if (resources.length > 0) {
      // Update existing event
      const existing = resources[0];
      const updatedEvent = { ...existing, ...data };
      const { resource } = await container.item(existing.id, existing.id).replace(updatedEvent);
      return new Response(JSON.stringify(resource), { status: 200 });
    } else {
      const item = await addItem(containerId, data);
      return new Response(JSON.stringify({ message: "Run toegevoegd", item }), { status: 201 });
    }
  } catch (error) {
    console.error("Error adding/updating run:", error);
    return new Response(JSON.stringify({ error: "Fout bij het toevoegen/bijwerken van de run" }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const container = await getContainer(containerId);
    // const formData = await req.formData();
    const data = await req.json();
    // for (const [key, value] of formData.entries()) {
    //   // Parse JSON fields if needed
    //   try {
    //     data[key] = JSON.parse(value);
    //   } catch {
    //     data[key] = value;
    //   }
    // }

    if (data.id) {
      const { resource: existingEvent } = await container.item(data.id, data.id).read();

      const updatedEvent = { ...existingEvent, ...data };
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
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const id = searchParams.get("id");

    if (id) {
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
    const items = await getItems(containerId);
    return new Response(JSON.stringify(items), { status: 200 });
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