import { getContainer } from "@/lib/cosmosdb";
import { getCommunityContext } from "@/lib/communities";

const containerId = "unit-assignments";

export async function GET(req) {
    try {
        const { response, communityId } = await getCommunityContext(req);
        if (response) return response;
        const { searchParams } = new URL(req.url);
        const container = await getContainer(containerId);
        const runId = searchParams.get("runId");
        const querySpec = runId
            ? {
                query: "SELECT * FROM c WHERE c.communityId = @communityId AND c.runId = @runId ORDER BY c.createdAt DESC",
                parameters: [
                    { name: "@communityId", value: communityId },
                    { name: "@runId", value: runId },
                ],
            }
            : {
                query: "SELECT * FROM c WHERE c.communityId = @communityId ORDER BY c.createdAt DESC",
                parameters: [{ name: "@communityId", value: communityId }],
            };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return new Response(JSON.stringify(resources), { status: 200 });
    } catch (error) {
        console.error("Error fetching unit assignments:", error);
        return Response.json({ error: "Fout bij het ophalen van toewijzingen", details: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { response, session, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
        if (response) return response;
        const data = await req.json();
        if (!data.runId) {
            return Response.json({ error: "Run ID is required" }, { status: 400 });
        }
        const runs = await getContainer("runs");
        const { resource: run } = await runs.item(data.runId, data.runId).read();
        if (!run || run.communityId !== communityId) {
            return Response.json({ error: "Run not found in this community" }, { status: 404 });
        }
        if ((data.assignments || []).some((assignment) => !community.memberUserIds.includes(assignment.userId))) {
            return Response.json({ error: "All assigned users must belong to this community" }, { status: 400 });
        }
        const container = await getContainer(containerId);

        // Create new unit assignment
        const unitAssignment = {
            id: `${data.runId}-${Date.now()}`,
            runId: data.runId,
            assignments: data.assignments || [], // Array of { userId, handCount, preferredMonths }
            status: "draft", // draft or active
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: session.user.id,
            communityId,
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
    try {
        const { response, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
        if (response) return response;
        const { searchParams } = new URL(req.url);
        const container = await getContainer(containerId);
        const assignmentId = searchParams.get("id");

        if (!assignmentId) {
            return new Response(JSON.stringify({ error: "Assignment ID is required" }), { status: 400 });
        }
        const data = await req.json();

        // Fetch existing assignment
        const { resource: existingAssignment } = await container.item(assignmentId, assignmentId).read();

        if (!existingAssignment || existingAssignment.communityId !== communityId) {
            return new Response(JSON.stringify({ error: "Toewijzing niet gevonden" }), { status: 404 });
        }
        if ((data.assignments || []).some((assignment) => !community.memberUserIds.includes(assignment.userId))) {
            return Response.json({ error: "All assigned users must belong to this community" }, { status: 400 });
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
    try {
        const { response, communityId } = await getCommunityContext(req, { ownerOnly: true });
        if (response) return response;
        const { searchParams } = new URL(req.url);
        const container = await getContainer(containerId);
        const assignmentId = searchParams.get("id");

        if (!assignmentId) {
            return new Response(JSON.stringify({ error: "Assignment ID is required" }), { status: 400 });
        }
        const { resource } = await container.item(assignmentId, assignmentId).read();
        if (!resource || resource.communityId !== communityId) {
            return Response.json({ error: "Toewijzing niet gevonden" }, { status: 404 });
        }
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
