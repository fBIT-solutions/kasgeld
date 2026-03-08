import { getContainer } from "../../../../lib/cosmosdb";
import { sendUnitPaidEmail } from "../../../../lib/email-service";
import dayjs from "dayjs";

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

/**
 * Update unit status and handle transitions
 * - When a unit is marked "uitbetaald", the next month gets "open"
 */
export async function POST(req) {
  try {
    const { runId, monthName, newStatus } = await req.json();

    if (!runId || !monthName || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: runId, monthName, newStatus" }),
        { status: 400 }
      );
    }

    const container = await getContainer(containerId);
    const { resource: run } = await container.item(runId, runId).read();

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), { status: 404 });
    }

    // Find the unit being updated to get assignedTo info
    const unitBeingUpdated = run.units.find((unit) => unit.name === monthName);

    // Update the unit status
    const updatedUnits = run.units.map((unit) => {
      if (unit.name === monthName) {
        return { ...unit, status: newStatus };
      }
      return unit;
    });

    // If unit is marked "uitbetaald", automatically set next month to "open"
    if (newStatus === "uitbetaald") {
      const currentDate = dayjs(`${monthName}-01`, "MM-YYYY-DD");
      const nextMonthName = currentDate.add(1, "month").format("MM-YYYY");

      updatedUnits.forEach((unit) => {
        if (unit.name === nextMonthName && unit.status === "pending") {
          unit.status = "open";
        }
      });
    }

    // Update run with new units
    const updatedRun = { ...run, units: updatedUnits };
    const { resource: result } = await container.item(runId, runId).replace(updatedRun);

    // Send email notification when unit is marked as paid
    if (newStatus === "uitbetaald" && unitBeingUpdated?.assignedTo) {
      console.log(`Unit ${monthName} marked as paid, attempting to send email to ${unitBeingUpdated.assignedTo}...`);
      try {
        const user = await getUserById(unitBeingUpdated.assignedTo);
        console.log(`User lookup result:`, user);

        if (!user) {
          console.error(`User ${unitBeingUpdated.assignedTo} not found`);
        } else if (!user.email) {
          console.error(`User ${unitBeingUpdated.assignedTo} has no email`);
        } else {
          const monthParts = monthName.split('-');
          const handNumber = unitBeingUpdated.hand || "N/A";
          // Calculate total pot: sum of all hands in run × monthly amount per hand
          const totalHands = run.units.reduce((sum, u) => sum + (u.hand || 1), 0);
          const totalPot = (totalHands * (run.monthlyAmount || 0));

          console.log(`Sending unit paid email to ${user.email} for hand ${handNumber}, total pot: €${totalPot} (${totalHands} hands × €${run.monthlyAmount})`);
          await sendUnitPaidEmail({
            recipientEmail: user.email,
            recipientName: user.firstname || user.displayname || "Deelnemer",
            handNumber: handNumber,
            month: monthParts[0] || monthName,
            year: monthParts[1] || run.year || "2026",
            amount: totalPot
          });
          console.log(`Email sent successfully for unit ${monthName}`);
        }
      } catch (emailError) {
        console.error("Failed to send unit paid notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Error updating unit status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update unit status", details: error.message }),
      { status: 500 }
    );
  }
}
