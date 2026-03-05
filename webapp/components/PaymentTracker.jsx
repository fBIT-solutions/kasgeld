"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle } from "lucide-react";
import dayjs from "dayjs";

export default function PaymentTracker({ run, users }) {
  const { data: session } = useSession();
  const [monthlyAmount, setMonthlyAmount] = useState(run?.monthlyAmount || 0);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveAmount, setSaveAmount] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const isAdmin = session?.user?.role?.includes('admin');

  // Get all months and users for this run to create payment overview (calculated early for hooks)
  const months = run?.units ? [...new Set(run.units.map(u => u.name))].sort() : [];
  const unitUsers = run?.units ? [...new Set(run.units.map(u => u.assignedTo).filter(u => u))] : [];

  // Fetch payments for this run
  useEffect(() => {
    if (run?.id) {
      fetchPayments();
    }
  }, [run?.id]);

  // Initialize selectedMonth to first month when months are available
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
      console.log("Initialized selected month to:", months[0]);
    }
  }, [months.length, selectedMonth]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/payments?runId=${run.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched payments:", data);
        console.log("Paid count:", data?.filter(p => p.paid).length);
        console.log("Unpaid count:", data?.filter(p => !p.paid).length);
        setPayments(data || []);
      } else {
        console.error("Failed to fetch payments:", res.status);
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPayments([]);
    }
  };

  const handleSaveAmount = async () => {
    if (!run?.id) return;
    
    try {
      const res = await fetch("/api/runs", {
        method: "PUT",
        body: JSON.stringify({
          id: run.id,
          monthlyAmount: parseFloat(monthlyAmount),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        toast.success("Inlegbedrag opgeslagen!");
        setSaveAmount(false);
      } else {
        toast.error("Fout bij het opslaan van inlegbedrag.");
      }
    } catch (error) {
      console.error("Error saving amount:", error);
      toast.error("Fout bij het opslaan.");
    }
  };

  const handlePaymentToggle = async (payment) => {
    try {
      const updatedPayment = {
        ...payment,
        paid: !payment.paid,
        paidDate: !payment.paid ? new Date().toISOString() : null,
      };

      console.log("Toggling payment:", updatedPayment);

      const res = await fetch("/api/payments", {
        method: "POST",
        body: JSON.stringify(updatedPayment),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const responseData = await res.json();
        console.log("Payment response:", responseData);
        console.log("Payment state after update:", updatedPayment.paid ? "PAID ✓" : "UNPAID ✗");
        await fetchPayments();
        toast.success(updatedPayment.paid ? "Betaling gemarkeerd als betaald" : "Betaling ongedaan gemaakt");
      } else {
        console.error("API error:", res.status);
        const errorData = await res.json();
        console.error("Error details:", errorData);
        toast.error("Fout bij het bijwerken van betaling.");
      }
    } catch (error) {
      console.error("Error toggling payment:", error);
      toast.error("Fout bij het bijwerken.");
    }
  };

  if (!isAdmin) {
    return null;
  }

  // Get user display names
  const getUserName = (userId) => {
    const user = users?.find(u => u.id === userId);
    return user ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayname : userId;
  };

  // Get the number of hands (units) a user has in this run
  const getUserHandCount = (userId) => {
    return run?.units?.filter(u => u.assignedTo === userId).length || 0;
  };

  // Get payment record for a user in a specific month
  const getPaymentStatus = (userId, month) => {
    return payments.find(p => p.userId === userId && p.month === month);
  };

  // Calculate how many unpaid participants there are in the SELECTED month
  const getUnpaidParticipantCount = () => {
    if (!selectedMonth) return 0;
    const unpaidInSelectedMonth = unitUsers.filter(userId => {
      const payment = getPaymentStatus(userId, selectedMonth);
      return !payment || !payment.paid;
    });
    console.log(`Unpaid in month ${selectedMonth}:`, unpaidInSelectedMonth.length);
    return unpaidInSelectedMonth.length;
  };

  // Calculate outstanding amount for SELECTED month only
  const getOutstandingAmount = () => {
    if (!selectedMonth) return "0.00";
    
    // Calculate based on unpaid participants (whether or not payment records exist)
    const unpaidUsers = unitUsers.filter(userId => {
      const payment = getPaymentStatus(userId, selectedMonth);
      return !payment || !payment.paid;
    });
    
    const amount = unpaidUsers.reduce((sum, userId) => {
      const handCount = getUserHandCount(userId);
      const userAmount = handCount * parseFloat(monthlyAmount || 0);
      return sum + userAmount;
    }, 0);
    
    console.log(`Outstanding in month ${selectedMonth}:`, amount, `(${unpaidUsers.length} unpaid users)`);
    return Number(amount).toFixed(2);
  };

  // Calculate total expected amount (all participants × their hand count for all months)
  const getTotalExpectedAmount = () => {
    return unitUsers.reduce((sum, userId) => {
      const handCount = getUserHandCount(userId);
      const userAmount = handCount * parseFloat(monthlyAmount || 0);
      return sum + (userAmount * months.length);
    }, 0);
  };

  // Calculate the amount user should pay = monthly amount × their hand count
  const calculatePaymentAmount = (userId) => {
    const handCount = getUserHandCount(userId);
    return handCount * parseFloat(monthlyAmount || 0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Betalingen Beheren</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Amount Setting */}
        {isAdmin && (
          <div className="space-y-3 p-4 bg-gray-50 rounded">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">Inlegbedrag per maand</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={monthlyAmount}
                  onChange={(e) => {
                    setMonthlyAmount(e.target.value);
                    setSaveAmount(true);
                  }}
                  className="w-24"
                />
                <span className="flex items-center text-sm">€</span>
              </div>
            </div>
            {saveAmount && (
              <Button
                size="sm"
                onClick={handleSaveAmount}
                className="w-full"
              >
                Bedrag opslaan
              </Button>
            )}
            {monthlyAmount && !saveAmount && (
              <div className="text-xs text-gray-500">
                Huidig bedrag: € {parseFloat(monthlyAmount).toFixed(2)} per deelnemer per maand
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Payment Overview */}
        <div className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Betalingsoverzicht</h3>
            <Badge variant="outline" className="text-xs">
              {unitUsers.length} deelnemers
            </Badge>
          </div>

          {months.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Geen maanden beschikbaar in deze run
            </div>
          ) : (
            <ScrollArea className="h-96 border rounded p-4">
              <Accordion 
                type="single" 
                collapsible 
                defaultValue={months[0]} 
                onValueChange={(value) => {
                  setSelectedMonth(value);
                  console.log("Selected month changed to:", value);
                }}
                className="w-full"
              >
                {months.map(month => (
                  <AccordionItem key={month} value={month} className="border-b last:border-b-0">
                    <AccordionTrigger className="text-sm font-medium py-2">
                      {month}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {unitUsers.filter(userId => {
                          const payment = getPaymentStatus(userId, month);
                          return payment?.paid === true;
                        }).length}/{unitUsers.length}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      {unitUsers.map(userId => {
                        const payment = getPaymentStatus(userId, month);
                        const userName = getUserName(userId);
                        const handCount = getUserHandCount(userId);
                        const paymentAmount = calculatePaymentAmount(userId);
                        const isPaid = payment?.paid === true;

                        return (
                          <div
                            key={`${month}-${userId}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={isPaid}
                                onCheckedChange={() => {
                                  if (!payment) {
                                    // Create new payment record
                                    handlePaymentToggle({
                                      runId: run.id,
                                      userId,
                                      month,
                                      amount: paymentAmount,
                                      handCount,
                                      paid: true,
                                      paidDate: new Date().toISOString(),
                                    });
                                  } else {
                                    handlePaymentToggle(payment);
                                  }
                                }}
                              />
                              <div className="flex flex-col">
                                <span className={`text-sm ${isPaid ? 'line-through text-gray-500' : ''}`}>
                                  {userName}
                                </span>
                                <span className="text-xs text-gray-500">{handCount} hand{handCount !== 1 ? 'en' : ''}</span>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-semibold">€ {paymentAmount.toFixed(2)}</div>
                              {payment?.paidDate && (
                                <div className="text-xs text-gray-500">
                                  {dayjs(payment.paidDate).format('DD-MM-YYYY')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}

          {/* Missing Payments Summary */}
          {unitUsers.length > 0 && (
            <>
              <Separator />
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <h4 className="font-medium text-sm text-red-900 mb-1">Openstaande betalingen (huidge maand)</h4>
                    <div className="text-sm text-red-800 space-y-1">
                      <div>
                        {getUnpaidParticipantCount()} deelnemers hebben nog niet betaald
                      </div>
                      <div className="font-semibold">
                        € {getOutstandingAmount()} openstaand
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
