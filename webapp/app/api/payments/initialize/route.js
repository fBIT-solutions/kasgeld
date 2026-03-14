import { getContainer } from "../../../../lib/cosmosdb";

const paymentsContainerId = "payments";

export async function POST(req) {
  try {
    const { runId, units } = await req.json();

    if (!runId || !units || units.length === 0) {
      return new Response(
        JSON.stringify({ error: "runId en units zijn verplicht" }),
        { status: 400 }
      );
    }

    const container = await getContainer(paymentsContainerId);

    // Get existing payments for this run
    const querySpec = {
      query: "SELECT * FROM c WHERE c.runId = @runId",
      parameters: [{ name: "@runId", value: runId }],
    };
    const { resources: existingPayments } = await container.items.query(querySpec).fetchAll();

    // Create a map of existing payments for quick lookup
    const existingPaymentMap = {};
    existingPayments.forEach(p => {
      existingPaymentMap[`${p.userId}-${p.month}`] = p;
    });

    // Extract unique user-month combinations from units
    const userMonthCombos = {};
    units.forEach(unit => {
      if (unit.assignedTo && unit.name) {
        const key = `${unit.assignedTo}-${unit.name}`;
        userMonthCombos[key] = {
          userId: unit.assignedTo,
          month: unit.name,
        };
      }
    });

    // Create payment records for new user-month combinations
    const newPayments = [];
    for (const key in userMonthCombos) {
      if (!existingPaymentMap[key]) {
        const { userId, month } = userMonthCombos[key];
        const newPayment = {
          id: crypto.randomUUID(),
          runId,
          userId,
          month,
          email: "",
          amount: 0,
          handCount: 0,
          paid: false,
          paidDate: null,
          createdAt: new Date().toISOString(),
        };
        newPayments.push(newPayment);
      }
    }

    // Batch create new payments
    for (const payment of newPayments) {
      await container.items.create(payment);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${newPayments.length} payment records aangemaakt`,
        created: newPayments.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment initialization error:", error);
    return new Response(
      JSON.stringify({ error: "Fout bij initialisatie van payments: " + error.message }),
      { status: 500 }
    );
  }
}
