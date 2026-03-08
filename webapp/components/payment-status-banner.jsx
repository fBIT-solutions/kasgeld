"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Payment Status Banner Component
 * 
 * IMPORTANT: Payment system model
 * - User must pay: monthlyAmount × (total hands across ALL runs)
 * - Payment is due EVERY MONTH, regardless of unit payouts
 * - Example: User with 2 hands pays €50 × 2 = €100 every month
 */
export function PaymentStatusBanner({ userEmail, userId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextMonth, setNextMonth] = useState("");
  const [handCount, setHandCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all runs
        const runsResponse = await fetch("/api/runs");
        if (!runsResponse.ok) throw new Error("Failed to fetch runs");

        const runs = await runsResponse.json();

        // Step 1: Find the OPEN month by looking for units with "open" status
        let openMonth = null;
        let runData = null;

        for (const run of runs) {
          if (run.units && Array.isArray(run.units)) {
            for (const unit of run.units) {
              // Look for units with "open" status
              if (unit.status === "open") {
                openMonth = unit.name;  // Use unit.name, not unit.month!
                runData = run;
                break;
              }
            }
            if (openMonth) break;
          }
        }

        if (!openMonth) {
          setStatus("none");
          setLoading(false);
          return;
        }

        setNextMonth(openMonth);

        // Step 2: Count TOTAL hands assigned to user across ALL runs
        let totalHands = 0;
        runs.forEach(run => {
          if (run.units && Array.isArray(run.units)) {
            run.units.forEach(unit => {
              if (unit.assignedTo === userId) {
                totalHands += (unit.hand || 1);  // Add unit.hand (could be > 1), default to 1
              }
            });
          }
        });

        setHandCount(totalHands);

        // If no hands assigned, don't show banner
        if (totalHands === 0) {
          setStatus("none");
          setLoading(false);
          return;
        }

        // Step 3: Calculate payment amount: monthlyAmount × total hands
        const amount = (runData?.monthlyAmount || 0) * totalHands;
        setPaymentAmount(amount);

        // Step 4: Check if payment record exists for OPEN MONTH + this specific user
        const paymentsResponse = await fetch(
          `/api/payments?userId=${userId}&month=${openMonth}`
        );

        if (!paymentsResponse.ok) throw new Error("Failed to fetch payments");

        const payments = await paymentsResponse.json();

        // Check if payment is marked as received (paidDate exists)
        let isPaid = false;
        if (Array.isArray(payments) && payments.length > 0) {
          isPaid = payments.some(p => p.paidDate);
        } else {
          // No payment record - auto-create one if user has hands
          try {
            const autoCreateResponse = await fetch("/api/payments/auto-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                email: userEmail,
                month: openMonth,
                amount: amount,
                handCount: totalHands,
              }),
            });

            if (autoCreateResponse.ok) {
              const autoCreateData = await autoCreateResponse.json();
              isPaid = false; // Newly created, not paid yet
            } else {
              // Auto-create failed - user likely has no hands
            }
          } catch (autoCreateErr) {
            // Silently handle error
          }
        }

        setStatus(isPaid ? "paid" : "unpaid");
      } catch (err) {
        setError(err.message);
        setStatus("unknown");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail && userId) {
      checkPaymentStatus();
    }
  }, [userEmail, userId]);

  // Show loading state
  if (loading) {
    return (
      <div className="px-4 py-3 rounded-lg flex items-center gap-3 bg-gray-50 border border-gray-200">
        <Loader2 className="h-5 w-5 text-gray-600 animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-800">
            Betalingsstatus laden...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || status === "unknown") {
    return (
      <div className="px-4 py-3 rounded-lg flex items-center gap-3 bg-red-50 border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">
            Fout bij laden betalingsstatus
          </p>
          <p className="text-xs text-red-700">{error || "Onbekende fout"}</p>
        </div>
      </div>
    );
  }

  // Not loaded yet or no assignments for next month
  if (!status || status === "none") {
    return null;
  }

  const isPaid = status === "paid";

  return (
    <div
      className={`px-4 py-3 rounded-lg flex items-center gap-3 ${
        isPaid
          ? "bg-green-50 border border-green-200"
          : "bg-orange-50 border border-orange-200"
      }`}
    >
      {isPaid ? (
        <>
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Betaling ontvangen voor {nextMonth}
            </p>
            <p className="text-xs text-green-700">Je inleg van €{paymentAmount.toFixed(2)} is ontvangen ✓</p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Betaling verwacht voor {nextMonth}
            </p>
            <p className="text-xs text-orange-700">
             Verschuldigde inleg: €{paymentAmount.toFixed(2)} ({handCount} {handCount === 1 ? "hand" : "handen"})
            </p>
          </div>
        </>
      )}
    </div>
  );
}
