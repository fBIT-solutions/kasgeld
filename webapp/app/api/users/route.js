import { getItems, addItem, getContainer } from "../../../lib/cosmosdb";

const containerId = "users";

export async function GET(req) {
    const container = await getContainer(containerId);

    const userQuery = await container.items
        .query({
            query: "SELECT * FROM c WHERE c.expires > @now OR NOT IS_DEFINED(c.expires)",
            parameters: [{ name: "@now", value: new Date() }],
        })
        .fetchAll();
    if (!userQuery || userQuery.resources.length === 0) {
        return new Response(JSON.stringify({ message: "No active users found" }), { status: 404 });
    }

    return new Response(JSON.stringify(userQuery.resources), { status: 200 });

}
export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
        try {
            await container.item(id, id).delete();
            return new Response(JSON.stringify({ message: "User succesvol verwijderd" }), { status: 200 });
        } catch (error) {
            console.error("Error deleting user:", error);
            return new Response(
                JSON.stringify({ error: "Fout bij het verwijderen van de user", details: error.message }),
                { status: 500 }
            );
        }
    } else {
        return new Response(JSON.stringify({ error: "Geen user id opgegeven" }), { status: 400 });
    }
}

export async function PUT(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const id = searchParams.get("id");

    if (id) {
        try {
            // First, fetch the existing user document (use id as partition key)
            const { resource: existingUser } = await container.item(id, id).read();
            
            if (!existingUser) {
                return new Response(
                    JSON.stringify({ error: "User niet gevonden" }),
                    { status: 404 }
                );
            }

            // Get the update data from request
            const updatedData = await req.json();

            // Merge existing data with new data (preserve all existing fields)
            const mergedUser = {
                ...existingUser,
                ...updatedData,
                id: existingUser.id // Ensure ID doesn't change
            };

            // Replace the complete document (use id as partition key)
            const { resource } = await container.item(id, id).replace(mergedUser);
            
            return new Response(JSON.stringify(resource), { status: 200 });
        } catch (error) {
            console.error("Error updating user:", error);
            return new Response(
                JSON.stringify({ error: "Fout bij het bijwerken van de user", details: error.message }),
                { status: 500 }
            );
        }
    } else {
        return new Response(JSON.stringify({ error: "Geen user id opgegeven" }), { status: 400 });
    }
}   