import { getContainer } from "../../../../lib/cosmosdb";

const paymentsContainerId = "payments";
const runsContainerId = "runs";

export async function POST(req) {
  try {
    const { userId, email, month, amount, handCount } = await req.json();

    if (!userId || !email || !month) {
      return new Response(
        JSON.stringify({ error: "userId, email, and month are required" }),
        { status: 400 }
      );
    }

    const paymentsContainer = await getContainer(paymentsContainerId);

    // Check if payment record already exists for this user
    const existingPayments = {
      query:
        "SELECT * FROM c WHERE c.userId = @userId AND c.month = @month",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@month", value: month },
      ],
    };
    const { resources: existingPaymentRecords } = await paymentsContainer.items
      .query(existingPayments)
      .fetchAll();

    if (existingPaymentRecords.length > 0) {
      console.log(`[AutoCreatePayment] Payment record already exists for ${email} for ${month}`);
      return new Response(
        JSON.stringify({
          message: "Payment record already exists",
          payment: existingPaymentRecords[0],
          created: false,
        }),
        { status: 200 }
      );
    }

    // Create new payment record
    // Important: Payment is based on user's total hands, not just next month assignments
    const newPayment = {
      id: crypto.randomUUID(),
      userId: userId,
      email: email,
      month: month,
      amount: amount || 0,
      handCount: handCount || 0,
      paid: false,
      paidDate: null,
      createdAt: new Date().toISOString(),
    };

    const { resource: createdPayment } = await paymentsContainer.items.create(
      newPayment
    );

    console.log(`[AutoCreatePayment] Created payment record for ${email} for ${month}: €${amount}`);
    return new Response(
      JSON.stringify({
        message: "Payment record auto-created",
        payment: createdPayment,
        created: true,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("[AutoCreatePayment] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Fout bij het automatisch aanmaken van betaling",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
