import { getCommunityContext } from "@/lib/communities";
import { getContainer } from "@/lib/cosmosdb";
import { sendUnitAssignmentsEmail } from "@/lib/email-service";

export async function POST(req) {
  try {
    const { response, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;

    const { runId } = await req.json();
    if (!runId) return Response.json({ error: "runId is required" }, { status: 400 });

    const runs = await getContainer("runs");
    let run;
    try {
      ({ resource: run } = await runs.item(runId, runId).read());
    } catch (error) {
      if (error.code !== 404) throw error;
    }
    if (!run || run.communityId !== communityId) {
      return Response.json({ error: "Run not found in this community" }, { status: 404 });
    }

    const assignmentsByUser = (run.units || []).reduce((assignments, unit) => {
      if (!unit.assignedTo || !community.memberUserIds.includes(unit.assignedTo)) return assignments;
      if (!assignments.has(unit.assignedTo)) assignments.set(unit.assignedTo, []);
      assignments.get(unit.assignedTo).push({ month: unit.name, hand: unit.hand });
      return assignments;
    }, new Map());

    if (assignmentsByUser.size === 0) {
      return Response.json({ error: "This run has no assigned units" }, { status: 400 });
    }

    const users = await getContainer("users");
    const results = await Promise.all([...assignmentsByUser.entries()].map(async ([userId, assignments]) => {
      try {
        const { resource: user } = await users.item(userId, userId).read();
        if (!user?.email) {
          return { userId, success: false, error: "No email address found" };
        }

        await sendUnitAssignmentsEmail({
          recipientEmail: user.email,
          recipientName: user.firstname || user.displayname || "Deelnemer",
          year: run.year,
          assignments,
        });
        return { userId, success: true };
      } catch (error) {
        console.error(`Failed to send assignment email to user ${userId}:`, error);
        return { userId, success: false, error: "Email could not be sent" };
      }
    }));

    const sent = results.filter((result) => result.success).length;
    const failed = results.length - sent;
    return Response.json({
      sent,
      failed,
      message: `${sent} email(s) sent${failed ? `; ${failed} failed` : ""}`,
    }, { status: failed ? 207 : 200 });
  } catch (error) {
    console.error("Error sending run assignment emails:", error);
    return Response.json({ error: "Failed to send assignment emails" }, { status: 500 });
  }
}
