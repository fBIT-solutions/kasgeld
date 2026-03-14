import { addItem, getItems, getContainer } from "../../../lib/cosmosdb";
import { put } from "@vercel/blob";
import { sendUnitAssignedEmail } from "../../../lib/email-service";

const containerId = "runs";
const usersContainerId = "users";

async function getUserById(userId) {
  try {
    const container = await getContainer(usersContainerId);
    const { resource } = await container.item(userId, userId).read();
    return resource;
  } catch (error) {
    console.error(`Failed to get user ${userId}:`, error);
    return null;
  }
}

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
    const data = await req.json();

    if (data.id) {
      const { resource: existingEvent } = await container.item(data.id, data.id).read();

      const updatedEvent = { ...existingEvent, ...data };
      const { resource } = await container.item(data.id, data.id).replace(updatedEvent);

      // Send notifications for newly assigned units
      try {
        if (existingEvent.units && data.units) {
          // Compare old and new units to find new assignments
          for (const newUnit of data.units) {
            const oldUnit = existingEvent.units.find(u => u.name === newUnit.name && u.hand === newUnit.hand);
            
            // If unit was unassigned and is now assigned, send notification
            if (newUnit.assignedTo && (!oldUnit || !oldUnit.assignedTo)) {
              const user = await getUserById(newUnit.assignedTo);
              
              if (user?.email) {
                await sendUnitAssignedEmail({
                  recipientEmail: user.email,
                  recipientName: user.firstname || user.displayname || "Deelnemer",
                  handNumber: newUnit.hand,
                  month: newUnit.name,
                  year: data.year || new Date().getFullYear().toString()
                });
              }
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to send unit assignment notifications:", emailError);
        // Don't fail the request if emails fail
      }

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