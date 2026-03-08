"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminCalendar({ run, users, payments = [], onChangeRun, onUpdatePayments, onRefreshPayments }) {
  const [openStatusDialog, setOpenStatusDialog] = useState(null);
  const [paymentsInitialized, setPaymentsInitialized] = useState(false);

  // Initialize payments when component mounts or run changes
  useEffect(() => {
    if (run?.id && run?.units && !paymentsInitialized) {
      initializePayments();
    }
  }, [run?.id, paymentsInitialized]);

  const initializePayments = async () => {
    try {
      console.log("Initializing payments for run:", run.id);
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          units: run.units,
        }),
      });
      const data = await res.json();
      console.log("Payment initialization result:", data);
      
      // Refresh payments after initialization
      if (onRefreshPayments) {
        await onRefreshPayments();
      }
      
      setPaymentsInitialized(true);
    } catch (error) {
      console.error("Error initializing payments:", error);
    }
  };

  if (!run?.units || run.units.length === 0) {
    return <div className="text-gray-500">Geen units beschikbaar</div>;
  }

  // Get ALL unique participants in this run (users who have any units in any month)
  const allParticipantsInRun = [...new Set(run.units.map(u => u.assignedTo).filter(u => u))];

  // Helper: Get participants WITH units assigned in a specific month
  const getParticipantsInMonth = (month) => {
    const monthUnits = unitsByMonth[month] || [];
    return [...new Set(monthUnits.map(u => u.assignedTo).filter(u => u))];
  };

  // Group units by month
  const unitsByMonth = {};
  run.units.forEach((unit) => {
    if (!unitsByMonth[unit.name]) {
      unitsByMonth[unit.name] = [];
    }
    unitsByMonth[unit.name].push(unit);
  });

  // Sort months chronologically (MM-YYYY format)
  const sortMonths = (a, b) => {
    const [monthA, yearA] = a.split('-').map(Number);
    const [monthB, yearB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  };

  const months = Object.keys(unitsByMonth).sort(sortMonths);

  // Helper: Get user name by ID
  const getUserName = (userId) => {
    const user = users?.find(u => u.id === userId);
    return user ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayName : userId;
  };

  // Helper: Get unique user names in a month
  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "uitbetaald":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getUnpaidCount = (month) => {
    // Count how many participants in the RUN have NOT paid for this month
    const runPayments = payments.filter(p => p.runId === run.id);
    
    const unpaid = allParticipantsInRun.filter(userId => {
      const payment = runPayments.find(p => p.userId === userId && p.month === month);
      return !payment || payment.paid === false;
    }).length;
    
    console.log(`Unpaid for ${month}:`, {
      totalParticipants: allParticipantsInRun.length,
      unpaidCount: unpaid,
      paidCount: allParticipantsInRun.length - unpaid,
      payments: payments.filter(p => p.runId === run.id && p.month === month),
    });
    
    return unpaid;
  };

  const getPaidCount = (month) => {
    // Count how many participants in the RUN have paid for this month
    const runPayments = payments.filter(p => p.runId === run.id);
    
    const paid = allParticipantsInRun.filter(userId => {
      const payment = runPayments.find(p => p.userId === userId && p.month === month);
      return payment?.paid === true;
    }).length;
    
    return paid;
  };

  const handleStatusChange = async (monthName, newStatus) => {
    try {
      const unitsInMonth = unitsByMonth[monthName];
      if (!unitsInMonth || unitsInMonth.length === 0) return;

      const firstUnit = unitsInMonth[0];
      const res = await fetch("/api/units/status", {
        method: "POST",
        body: JSON.stringify({
          runId: run.id,
          monthName,
          newStatus,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const updatedRun = await res.json();
        onChangeRun(updatedRun);
        toast.success(`Status voor ${monthName} gewijzigd naar ${newStatus}`);
      } else {
        toast.error("Fout bij het wijzigen van status");
      }
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Fout bij het wijzigen van status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Grid - Click on Status badge to open status dialog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((month) => {
          const unitsInMonth = unitsByMonth[month];
          const firstUnit = unitsInMonth[0];
          const participantsInMonth = getParticipantsInMonth(month);
          const paidCount = getPaidCount(month);
          const unpaidCount = getUnpaidCount(month);

          return (
            <div
              key={month}
              className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                firstUnit?.status === "open"
                  ? "border-yellow-300 bg-yellow-50"
                  : firstUnit?.status === "uitbetaald"
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{month}</h3>
                <Dialog
                  open={openStatusDialog === month}
                  onOpenChange={(open) => {
                    setOpenStatusDialog(open ? month : null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Badge
                      className={`${getStatusColor(firstUnit?.status)} cursor-pointer hover:opacity-80 transition`}
                    >
                      {firstUnit?.status === "open"
                        ? "📂 Open"
                        : firstUnit?.status === "uitbetaald"
                        ? "✓ Uitbetaald"
                        : "⏳ Toekomstig"}
                    </Badge>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Maandstatus wijzigen: {month}</DialogTitle>
                      <DialogDescription>
                        Selecteer de nieuwe status voor deze maand
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        defaultValue={firstUnit?.status}
                        onValueChange={(value) => {
                          handleStatusChange(month, value);
                          setOpenStatusDialog(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">⏳ Toekomstig</SelectItem>
                          <SelectItem value="open">📂 Open</SelectItem>
                          <SelectItem value="uitbetaald">✓ Uitbetaald</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Als je op "Uitbetaald" zet, wordt volgende maand automatisch "Open"
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span className="font-semibold">{unitsInMonth.length}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600 text-xs">Deelnemers met eenheden ({participantsInMonth.length}):</div>
                  <div className="text-xs text-gray-700 flex flex-wrap gap-1">
                    {participantsInMonth.length > 0 ? (
                      participantsInMonth.map((userId, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                          {getUserName(userId)}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic">Geen deelnemers met eenheden</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Betalingen:</span>
                  <Badge variant="outline" className="text-xs">
                    {paidCount}/{allParticipantsInRun.length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Openstaand:</span>
                  <span className="font-semibold text-orange-600">{unpaidCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}