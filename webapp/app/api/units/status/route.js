import { getContainer } from "../../../../lib/cosmosdb";
import { sendUnitPaidEmail } from "../../../../lib/email-service";
import { getCommunityContext } from "@/lib/communities";
import dayjs from "dayjs";

const containerId = "runs";
const usersContainerId = "users";

async function getUserById(userId, community) {
  if (!community.memberUserIds.includes(userId)) return null;
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
    const { response, community, communityId } = await getCommunityContext(req, { ownerOnly: true });
    if (response) return response;
    const { runId, monthName, newStatus } = await req.json();

    if (!runId || !monthName || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: runId, monthName, newStatus" }),
        { status: 400 }
      );
    }

    const container = await getContainer(containerId);
    const { resource: run } = await container.item(runId, runId).read();

    if (!run || run.communityId !== communityId) {
      return new Response(JSON.stringify({ error: "Run not found" }), { status: 404 });
    }

    const unitsInMonth = run.units.filter((unit) => unit.name === monthName);
    const wasAlreadyPaidOut = unitsInMonth.length > 0 && unitsInMonth.every((unit) => unit.status === "uitbetaald");

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
    if (newStatus === "uitbetaald" && !wasAlreadyPaidOut) {
      const payoutUnits = unitsInMonth.filter((unit) => unit.assignedTo);
      const assignedUnitCount = run.units.filter((unit) => unit.assignedTo).length;
      const monthlyPot = assignedUnitCount * (run.monthlyAmount || 0);
      const payoutPerUnit = payoutUnits.length > 0 ? monthlyPot / payoutUnits.length : 0;
      const [month, year] = monthName.split("-");

      for (const unit of payoutUnits) {
        try {
          const user = await getUserById(unit.assignedTo, community);
          if (!user?.email) {
            console.error(`Cannot send unit paid notification: user ${unit.assignedTo} has no email`);
            continue;
          }

          await sendUnitPaidEmail({
            recipientEmail: user.email,
            recipientName: user.firstname || user.displayname || "Deelnemer",
            handNumber: unit.hand || "N/A",
            month,
            year: year || run.year || "2026",
            amount: payoutPerUnit,
          });
        } catch (emailError) {
          console.error(`Failed to send unit paid notification for ${unit.name}, hand ${unit.hand}:`, emailError);
        }
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
