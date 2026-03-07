import { getContainer } from "../../../../lib/cosmosdb";
import dayjs from "dayjs";

const containerId = "runs";

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

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Error updating unit status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update unit status", details: error.message }),
      { status: 500 }
    );
  }
}
