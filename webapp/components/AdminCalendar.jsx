"use client";

import { useState } from "react";
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

export default function AdminCalendar({ run, users, payments = [], onChangeRun, onUpdatePayments }) {
  const [openStatusDialog, setOpenStatusDialog] = useState(null);

  if (!run?.units || run.units.length === 0) {
    return <div className="text-gray-500">Geen units beschikbaar</div>;
  }

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
  const getUserNamesInMonth = (month) => {
    const unitsInMonth = unitsByMonth[month] || [];
    const userIds = [...new Set(unitsInMonth.map(u => u.assignedTo).filter(u => u))];
    return userIds.map(userId => getUserName(userId));
  };

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
    // Get user IDs that have units in this run
    const unitsInMonth = unitsByMonth[month] || [];
    const userIdsInMonth = [...new Set(unitsInMonth.map(u => u.assignedTo).filter(u => u))];
    
    // Count how many of those users have NOT paid for this month
    return userIdsInMonth.filter(userId => {
      const payment = payments.find(p => p.userId === userId && p.month === month);
      return !payment || payment.paid === false;
    }).length;
  };

  const getPaidCount = (month) => {
    // Get user IDs that have units in this run
    const unitsInMonth = unitsByMonth[month] || [];
    const userIdsInMonth = [...new Set(unitsInMonth.map(u => u.assignedTo).filter(u => u))];
    
    // Count how many of those users have paid for this month
    return userIdsInMonth.filter(userId => {
      const payment = payments.find(p => p.userId === userId && p.month === month);
      return payment?.paid === true;
    }).length;
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
                  <div className="text-gray-600 text-xs">Deelnemers:</div>
                  <div className="text-xs text-gray-700 flex flex-wrap gap-1">
                    {getUserNamesInMonth(month).map((name, idx) => (
                      <span key={idx} className="bg-gray-200 px-2 py-1 rounded">
                        {name}
                      </span>
                    ))}
                  </div>
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