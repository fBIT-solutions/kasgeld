"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export function PaymentStatusBanner({ userEmail }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextMonth, setNextMonth] = useState("");

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current month and NEXT month
        const now = new Date();
        const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
        const currentYear = now.getFullYear();

        // Calculate next month (where payment is needed)
        const nextDate = new Date(now);
        nextDate.setMonth(nextDate.getMonth() + 1);
        const nextMonthNum = String(nextDate.getMonth() + 1).padStart(2, "0");
        const nextYear = nextDate.getFullYear();
        const nextMonthStr = `${nextMonthNum}-${nextYear}`;
        setNextMonth(nextMonthStr);

        console.log(`Next unit (payment due): ${nextMonthStr}`);
        console.log("Fetching payment status for:", userEmail, nextMonthStr);

        // Fetch current user's payment for NEXT month
        const response = await fetch(
          `/api/payments?email=${encodeURIComponent(userEmail)}&month=${nextMonthStr}`
        );

        console.log("Payment response:", response.status, response.ok);

        if (!response.ok) {
          console.error("Payment fetch failed:", response.status);
          setError("Kon betalingsstatus niet laden");
          setStatus("unknown");
          setLoading(false);
          return;
        }

        const payments = await response.json();
        console.log("Payments data for next month:", payments);

        // Check if user has paid for NEXT month
        let paidNextMonth = false;

        if (Array.isArray(payments) && payments.length > 0) {
          // If payments found with email filter
          paidNextMonth = payments.some(
            (p) => p.month === nextMonthStr && p.paidDate
          );
          console.log("Payment found for next month. Paid?", paidNextMonth);
        } else {
          // No payments found - user may not have units assigned yet
          console.log("No payments found for next month. User may not have units assigned yet.");
          paidNextMonth = false; // Default: no payment found means "expected"
        }

        if (paidNextMonth) {
          setStatus("paid");
        } else {
          setStatus("unpaid");
        }
      } catch (err) {
        console.error("Error fetching payment status:", err);
        setError(err.message);
        setStatus("unknown");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchPaymentStatus();
    }
  }, [userEmail]);

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

  // Not loaded yet
  if (!status) {
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
              Betaling voltooid voor {nextMonth}
            </p>
            <p className="text-xs text-green-700">Je bent goed bij kas! ✓</p>
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
              Zorg ervoor dat je je aandeel betaalt via de aangegeven methode
            </p>
          </div>
        </>
      )}
    </div>
  );
}
