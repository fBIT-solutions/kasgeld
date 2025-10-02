import { getItems, addItem, getContainer } from "../../../lib/cosmosdb";

const containerId = "users";

export async function GET(req) {
    const container = await getContainer(containerId);

    const userQuery = await container.items
        .query({
            query: "SELECT * FROM c WHERE c.expires > @now",
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
        await container.item(id, email).delete();
        return new Response("Ok", { status: 200 });
    } else {
        return new Response(JSON.stringify({ error: "Geen user id opgegeven" }), { status: 400 });
    }
}

export async function PUT(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
        const updatedData = await req.json();
        await container.item(id, email).replace(updatedData);
        return new Response("Ok", { status: 200 });
    } else {
        return new Response(JSON.stringify({ error: "Geen user id opgegeven" }), { status: 400 });
    }
}   