"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export function PaymentStatusBanner({ userEmail }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        // Get current month in MM-YYYY format
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const monthStr = `${month}-${year}`;
        setCurrentMonth(monthStr);

        // Fetch current user's payments for this month
        const response = await fetch(
          `/api/payments?email=${encodeURIComponent(userEmail)}&month=${monthStr}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          setLoading(false);
          setStatus(null);
          return;
        }

        const payments = await response.json();
        
        // Check if user has paid for this month
        const paidThisMonth = payments.some(
          (p) => p.month === monthStr && p.paidDate
        );

        if (paidThisMonth) {
          setStatus("paid");
        } else {
          setStatus("unpaid");
        }
      } catch (error) {
        console.error("Error fetching payment status:", error);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [userEmail]);

  if (loading || !status) {
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
              Betaling voltooid voor {currentMonth}
            </p>
            <p className="text-xs text-green-700">Je bent goed bij kas! ✓</p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              Betaling verwacht voor {currentMonth}
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
