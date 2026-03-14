import { getContainer } from "@/lib/cosmosdb";

const containerId = "unit-assignments";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const runId = searchParams.get("runId");

    // If specific run ID requested, return assignments for that run
    if (runId) {
        try {
            const { resources: assignments } = await container.items
                .query({
                    query: "SELECT * FROM c WHERE c.runId = @runId ORDER BY c.createdAt DESC",
                    parameters: [{ name: "@runId", value: runId }],
                })
                .fetchAll();
            return new Response(JSON.stringify(assignments), { status: 200 });
        } catch (error) {
            console.error("Error fetching unit assignments:", error);
            return new Response(
                JSON.stringify({ error: "Fout bij het ophalen van toewijzingen", details: error.message }),
                { status: 500 }
            );
        }
    }

    // Return all assignments
    try {
        const { resources: assignments } = await container.items
            .query({
                query: "SELECT * FROM c ORDER BY c.createdAt DESC",
            })
            .fetchAll();
        return new Response(JSON.stringify(assignments), { status: 200 });
    } catch (error) {
        console.error("Error fetching unit assignments:", error);
        return new Response(
            JSON.stringify({ error: "Fout bij het ophalen van toewijzingen", details: error.message }),
            { status: 500 }
        );
    }
}

export async function POST(req) {
    const container = await getContainer(containerId);

    try {
        const data = await req.json();

        // Create new unit assignment
        const unitAssignment = {
            id: `${data.runId}-${Date.now()}`,
            runId: data.runId,
            assignments: data.assignments || [], // Array of { userId, handCount, preferredMonths }
            status: "draft", // draft or active
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: data.createdBy || "system",
        };

        const { resource } = await container.items.create(unitAssignment);
        return new Response(JSON.stringify(resource), { status: 201 });
    } catch (error) {
        console.error("Error creating unit assignment:", error);
        return new Response(
            JSON.stringify({ error: "Fout bij het opslaan van toewijzing", details: error.message }),
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const assignmentId = searchParams.get("id");

    if (!assignmentId) {
        return new Response(JSON.stringify({ error: "Assignment ID is required" }), { status: 400 });
    }

    try {
        const data = await req.json();

        // Fetch existing assignment
        const { resource: existingAssignment } = await container.item(assignmentId, assignmentId).read();

        if (!existingAssignment) {
            return new Response(JSON.stringify({ error: "Toewijzing niet gevonden" }), { status: 404 });
        }

        // Update assignment
        const updatedAssignment = {
            ...existingAssignment,
            assignments: data.assignments !== undefined ? data.assignments : existingAssignment.assignments,
            status: data.status !== undefined ? data.status : existingAssignment.status,
            updatedAt: new Date(),
        };

        const { resource } = await container.item(assignmentId, assignmentId).replace(updatedAssignment);
        return new Response(JSON.stringify(resource), { status: 200 });
    } catch (error) {
        console.error("Error updating unit assignment:", error);
        return new Response(
            JSON.stringify({ error: "Fout bij het bijwerken van toewijzing", details: error.message }),
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const container = await getContainer(containerId);
    const assignmentId = searchParams.get("id");

    if (!assignmentId) {
        return new Response(JSON.stringify({ error: "Assignment ID is required" }), { status: 400 });
    }

    try {
        await container.item(assignmentId, assignmentId).delete();
        return new Response(JSON.stringify({ message: "Toewijzing verwijderd" }), { status: 200 });
    } catch (error) {
        console.error("Error deleting unit assignment:", error);
        return new Response(
            JSON.stringify({ error: "Fout bij het verwijderen van toewijzing", details: error.message }),
            { status: 500 }
        );
    }
}
