"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentTracker from "@/components/PaymentTracker";
import AdminCalendar from "@/components/AdminCalendar";
import UserCreationForm from "@/components/user-creation-form";
import CreateKasgeldRun from "@/components/createKasgeldRun";
import AppSettingsPanel from "@/components/app-settings-panel";
import KasgeldManage from "@/components/kasgeldManage";
import { ChevronDown, X, Eye, Zap } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

export default function BeheerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [runs, setRuns] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  
  // Modal states
  const [openModal, setOpenModal] = useState(null); // 'run', 'participant-add', 'participant-edit', 'email', 'settings'
  const [editRun, setEditRun] = useState(null);
  
  // Participant edit states
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [openUserDetails, setOpenUserDetails] = useState(false);
  const [openRolePopover, setOpenRolePopover] = useState(false);
  const roles = ["default", "guest", "member", "family", "worker", "admin"];
  
  // Auto-assign states
  const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userHandCounts, setUserHandCounts] = useState({});
  const [userPreferences, setUserPreferences] = useState({});
  const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [clearAssignmentsDialogOpen, setClearAssignmentsDialogOpen] = useState(false);
  
  // Email states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailRecipientMode, setEmailRecipientMode] = useState('all'); // 'all' or 'selected'
  const [emailSelectedRecipients, setEmailSelectedRecipients] = useState([]);
  const [emailSending, setEmailSending] = useState(false);

  // Check admin role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
    if (status === "authenticated" && !session?.user?.role?.includes("admin")) {
      router.push("/");
    }
  }, [status, session, router]);

  // Fetch runs, users, and payments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [runsRes, usersRes, paymentsRes] = await Promise.all([
          fetch("/api/runs"),
          fetch("/api/users"),
          fetch("/api/payments"),
        ]);

        if (runsRes.ok && usersRes.ok && paymentsRes.ok) {
          const runsData = await runsRes.json();
          setRuns(runsData);
          if (runsData.length > 0) {
            setSelectedRun(runsData[0]);
            setEditRun(runsData[0]);
          }
          setUsers(await usersRes.json());
          setPayments(await paymentsRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && session?.user?.role?.includes("admin")) {
      fetchData();
    }
  }, [status, session]);

  if (status === "loading" || loading) {
    return <div className="p-6">Laden...</div>;
  }

  if (status !== "authenticated" || !session?.user?.role?.includes("admin")) {
    return null;
  }

  // Helper functions for auto-assign
  const getTotalAvailableHands = () => {
    return editRun?.units?.filter(unit => !unit.assignedTo).length || 0;
  };

  const getTotalAssignedHands = () => {
    return editRun?.units?.filter(unit => unit.assignedTo).length || 0;
  };

  const hasAssignments = () => {
    return editRun?.units?.some(unit => unit.assignedTo) || false;
  };

  const resetAutoAssignState = () => {
    setSelectedUsers([]);
    setUserHandCounts({});
    setUserPreferences({});
  };

  const clearAllAssignments = () => {
    const clearedUnits = editRun.units.map(unit => ({
      ...unit,
      assignedTo: null,
      autoAssigned: undefined,
      autoAssignReason: undefined
    }));

    const updatedEditRun = {
      ...editRun,
      units: clearedUnits
    };

    setEditRun(updatedEditRun);
    setClearAssignmentsDialogOpen(false);
    toast.success("Alle toewijzingen verwijderd!");
  };

  // Calculate total monthly pot (sum of all participants' contributions per month)
  const calculateTotalMonthlyPot = () => {
    if (!selectedRun?.units) return 0;
    
    // Get unique users
    const uniqueUsers = [...new Set(selectedRun.units.map(u => u.assignedTo).filter(u => u))];
    
    // Calculate total for each user (handcount × monthlyAmount)
    const totalPerUser = uniqueUsers.reduce((sum, userId) => {
      const userUnits = selectedRun.units.filter(u => u.assignedTo === userId);
      const handCount = userUnits.reduce((acc, u) => acc + (u.hand || 1), 0);
      return sum + (handCount * (selectedRun.monthlyAmount || 0));
    }, 0);
    
    return totalPerUser;
  };

  // Get participants of the selected run
  const getRunParticipants = () => {
    if (!selectedRun?.units) return [];
    
    // Get unique user IDs from units
    const uniqueUserIds = [...new Set(selectedRun.units.map(u => u.assignedTo).filter(u => u))];
    
    // Map to user details
    return uniqueUserIds
      .map(userId => users.find(u => u.id === userId))
      .filter(u => u) // Filter out undefined users
      .map(u => ({
        id: u.id,
        name: [u.firstname, u.lastname].filter(Boolean).join(' ') || u.displayname || u.email,
        email: u.email,
      }));
  };

  // Send email to run participants
  const handleSendEmail = async () => {
    try {
      setEmailSending(true);

      // Determine recipients
      let recipients = [];
      if (emailRecipientMode === 'all') {
        recipients = getRunParticipants();
      } else {
        recipients = getRunParticipants().filter(p => emailSelectedRecipients.includes(p.id));
      }

      if (recipients.length === 0) {
        toast.error('Selecteer minimaal één ontvanger');
        setEmailSending(false);
        return;
      }

      const response = await fetch('/api/email/send-run-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          recipients: recipients,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Reset form
        setEmailSubject('');
        setEmailMessage('');
        setEmailRecipientMode('all');
        setEmailSelectedRecipients([]);
        setOpenModal(null);
      } else {
        toast.error(data.error || 'Fout bij verzenden van email');
      }
    } catch (error) {
      console.error('Email send error:', error);
      toast.error('Netwerkfout bij verzenden');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Beheer Dashboard</h1>
            <p className="text-gray-600 mt-2">Beheer betalingen, units en gebruikerstoewijzingen</p>
          </div>
          
          {/* Admin Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Admin Opties
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setOpenModal('run')}>
                ➕ Run aanmaken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenModal('participant-add')}>
                👤 Deelnemer toevoegen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenModal('participant-edit')}>
                ✏️ Deelnemers bewerken
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenModal('email')}>
                ✉️ Email bericht versturen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenModal('settings')}>
                ⚙️ Instellingen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Run Selector */}
        {runs.length > 0 && (
          <div className="mb-8">
            <Label className="text-sm font-medium mb-2">Selecteer een Run</Label>
            <Select value={selectedRun?.id || ""} onValueChange={(runId) => {
              const run = runs.find(r => r.id === runId);
              setSelectedRun(run);
              setEditRun(run);
            }}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Kies een run..." />
              </SelectTrigger>
              <SelectContent>
                {runs.map(run => (
                  <SelectItem key={run.id} value={run.id}>
                    {run.name || `Run ${run.year}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Totaal Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{runs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Deelnemers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Uitbetaling</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                €{calculateTotalMonthlyPot().toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Maandelijkse pot</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {selectedRun?.units?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools */}
        <Tabs defaultValue="kalendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kalendar">Kalender</TabsTrigger>
            <TabsTrigger value="betalingen">Betalingen</TabsTrigger>
            <TabsTrigger value="toewijzingen">Toewijzingen</TabsTrigger>
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="kalendar">
            <Card>
              <CardHeader>
                <CardTitle>Maand Overzicht</CardTitle>
                <CardDescription>
                  Klik op een maand om betalingen in te voeren of units als uitbetaald te markeren
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRun ? (
                  <AdminCalendar 
                    run={selectedRun} 
                    users={users}
                    payments={payments}
                    onChangeRun={(updatedRun) => {
                      setRuns(runs.map(r => r.id === updatedRun.id ? updatedRun : r));
                    }}
                    onUpdatePayments={(updatedPayment) => {
                      setPayments(payments.map(p => p.id === updatedPayment.id ? updatedPayment : p));
                    }}
                    onRefreshPayments={async () => {
                      const paymentsRes = await fetch("/api/payments");
                      if (paymentsRes.ok) {
                        setPayments(await paymentsRes.json());
                      }
                    }}
                  />
                ) : (
                  <p className="text-gray-500">Geen actieve run gevonden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="betalingen">
            <Card>
              <CardHeader>
                <CardTitle>Betalingen Beheren</CardTitle>
                <CardDescription>
                  Registreer en beheer betalingen van deelnemers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRun ? (
                  <PaymentTracker 
                    run={selectedRun} 
                    users={users}
                    onChangeRuns={(updatedRun) => {
                      setRuns(runs.map(r => r.id === updatedRun.id ? updatedRun : r));
                    }}
                  />
                ) : (
                  <p className="text-gray-500">Geen actieve run gevonden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="toewijzingen" className="space-y-4">
            {selectedRun && editRun ? (
              <>
                {/* Basisinformatie Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basisinformatie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Jaar:</Label>
                        <Input className="text-sm mt-1" value={selectedRun.year} readOnly />
                      </div>
                      <div>
                        <Label className="text-sm">Beschikbare Handen:</Label>
                        <Input
                          className="text-sm mt-1"
                          value={editRun.unitsAvailable || ""}
                          onChange={(e) => setEditRun({ ...editRun, unitsAvailable: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Start:</Label>
                        <Input
                          className="text-sm mt-1"
                          type="date"
                          value={editRun.start ? dayjs(editRun.start).format("YYYY-MM-DD") : ""}
                          onChange={(e) => setEditRun({ ...editRun, start: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Eind:</Label>
                        <Input
                          className="text-sm mt-1"
                          type="date"
                          value={editRun.end ? dayjs(editRun.end).format("YYYY-MM-DD") : ""}
                          onChange={(e) => setEditRun({ ...editRun, end: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transacties Section */}
                {editRun?.units?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Transacties ({editRun.units.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-4">
                          {editRun?.autoAssignReports?.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReport(editRun.autoAssignReports[editRun.autoAssignReports.length - 1]);
                                setViewReportDialogOpen(true);
                              }}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Reports ({editRun.autoAssignReports.length})
                            </Button>
                          )}
                          {hasAssignments() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setClearAssignmentsDialogOpen(true)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Clear All
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              resetAutoAssignState();
                              setAutoAssignDialogOpen(true);
                            }}
                            className="text-xs"
                            disabled={getTotalAvailableHands() === 0}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {hasAssignments() ? "Auto Assign (open)" : "Auto Assign"}
                          </Button>
                        </div>

                        {/* Units List */}
                        {Object.entries(
                          editRun.units.reduce((groups, unit) => {
                            if (!groups[unit.name]) {
                              groups[unit.name] = [];
                            }
                            groups[unit.name].push(unit);
                            return groups;
                          }, {})
                        ).map(([monthName, monthUnits]) => (
                          <div key={monthName}>
                            <p className="font-medium text-sm mb-3">{monthName}</p>
                            <div className="space-y-3 ml-4">
                              {monthUnits.map((unit) => (
                                <div key={unit.name + unit.hand} className="flex text-xs items-center gap-3">
                                  <span className="min-w-[80px] font-medium">
                                    Hand {unit.hand}:
                                  </span>
                                  <Select
                                    value={unit.assignedTo || "unassigned"}
                                    onValueChange={(userId) => {
                                      const updatedUnits = editRun.units.map(u =>
                                        u.name === unit.name && u.hand === unit.hand
                                          ? { ...u, assignedTo: userId === "unassigned" ? null : userId }
                                          : u
                                      );
                                      setEditRun({ ...editRun, units: updatedUnits });
                                    }}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                                      {users?.map(user => {
                                        const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayname;
                                        return (
                                          <SelectItem key={user.id} value={user.id}>
                                            {displayName}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-gray-200 my-4" />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/runs`, {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(editRun),
                                });
                                if (res.ok) {
                                  console.log("Run saved successfully. Initializing payments...", {
                                    runId: editRun.id,
                                    unitCount: editRun.units?.length,
                                    assignedUserCount: editRun.units?.filter(u => u.assignedTo).length,
                                  });
                                  
                                  // Initialize payment records
                                  try {
                                    const initRes = await fetch(`/api/payments/initialize`, {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        runId: editRun.id,
                                        units: editRun.units,
                                      }),
                                    });
                                    const initData = await initRes.json();
                                    console.log("Payment initialization response:", initData);
                                  } catch (paymentError) {
                                    console.error("Payment initialization error:", paymentError);
                                  }

                                  setRuns(runs.map(r => r.id === selectedRun.id ? editRun : r));
                                  setSelectedRun(editRun);
                                  
                                  // Refetch payments
                                  const paymentsRes = await fetch("/api/payments");
                                  if (paymentsRes.ok) {
                                    const paymentsData = await paymentsRes.json();
                                    console.log("Payments after refetch:", {
                                      totalPayments: paymentsData?.length,
                                      forThisRun: paymentsData?.filter(p => p.runId === editRun.id)?.length,
                                    });
                                    setPayments(paymentsData);
                                  }
                                  
                                  toast.success("Run bijgewerkt!");
                                } else {
                                  toast.error("Fout bij bijwerken");
                                }
                              } catch (error) {
                                toast.error("Netwerkfout");
                              }
                            }}
                          >
                            Opslaan
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">Selecteer een run om toewijzingen te beheren</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* MODALS */}

        {/* Run Aanmaken Modal */}
        <Dialog open={openModal === 'run'} onOpenChange={(open) => !open && setOpenModal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Run Aanmaken</DialogTitle>
              <DialogDescription>Maak een nieuwe run aan met maanden en deelnemers</DialogDescription>
            </DialogHeader>
            <CreateKasgeldRun 
              users={users}
              onRunCreated={(newRun) => {
                setRuns([...runs, newRun]);
                setOpenModal(null);
                toast.success('Run aangemaakt!');
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Deelnemer Toevoegen Modal */}
        <Dialog open={openModal === 'participant-add'} onOpenChange={(open) => !open && setOpenModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deelnemer Toevoegen</DialogTitle>
              <DialogDescription>Voeg een nieuwe deelnemer toe</DialogDescription>
            </DialogHeader>
            <UserCreationForm 
              onUserCreated={() => {
                // Refetch users
                fetch('/api/users').then(res => res.json()).then(data => setUsers(data));
                setOpenModal(null);
                toast.success('Deelnemer toegevoegd!');
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Deelnemers Beheren Modal */}
        <Dialog open={openModal === 'participant-edit'} onOpenChange={(open) => {
          if (!open) {
            setOpenModal(null);
            setSelectedUser(null);
            setEditUser(null);
            setOpenUserDetails(false);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Deelnemers Bewerken</DialogTitle>
              <DialogDescription>Selecteer een deelnemer om te bewerken</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Participant Select */}
              <div>
                <Label htmlFor="participant-select">Deelnemer selecteren</Label>
                <Select
                  value={selectedUser?.id || ""}
                  onValueChange={(userId) => {
                    const user = users.find(u => u.id === userId);
                    setSelectedUser(user);
                    setOpenUserDetails(true);
                    setEditUser({ 
                      ...user, 
                      role: Array.isArray(user.role) ? user.role : [user.role].filter(r => r) 
                    });
                  }}
                >
                  <SelectTrigger id="participant-select">
                    <SelectValue placeholder="Kies een deelnemer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstname} {u.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Edit Details Popover */}
              <Popover open={openUserDetails}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="hidden">
                    Bewerk details
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full">
                  {selectedUser && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">{selectedUser.firstname} {selectedUser.lastname}</h3>
                        <X
                          size={18}
                          className="cursor-pointer"
                          onClick={() => {
                            setOpenUserDetails(false);
                            setSelectedUser(null);
                            setEditUser(null);
                          }}
                        />
                      </div>

                      {editUser && (
                        <div className="space-y-3 text-sm">
                          <div>
                            <Label className="text-xs">Email:</Label>
                            <Input 
                              value={selectedUser.email}
                              readOnly
                              className="text-xs"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Voornaam:</Label>
                            <Input
                              className="text-xs"
                              value={editUser.firstname || ''}
                              onChange={(e) => setEditUser({ ...editUser, firstname: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Achternaam:</Label>
                            <Input
                              className="text-xs"
                              value={editUser.lastname || ''}
                              onChange={(e) => setEditUser({ ...editUser, lastname: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Rollen:</Label>
                            <Popover open={openRolePopover} onOpenChange={setOpenRolePopover}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-xs">
                                  {editUser.role?.length
                                    ? editUser.role.join(", ")
                                    : "Selecteer rollen"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48">
                                <div className="space-y-2">
                                  {roles.map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`role-${role}`}
                                        checked={editUser.role?.includes(role) || false}
                                        onCheckedChange={(checked) => {
                                          const newRoles = checked
                                            ? [...(editUser.role || []), role]
                                            : editUser.role?.filter((r) => r !== role);
                                          setEditUser({ ...editUser, role: newRoles });
                                        }}
                                      />
                                      <label
                                        htmlFor={`role-${role}`}
                                        className="text-xs font-medium cursor-pointer"
                                      >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                      </label>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    className="w-full text-xs mt-2"
                                    onClick={() => setOpenRolePopover(false)}
                                  >
                                    Sluiten
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div>
                            <Label className="text-xs">Verloopt:</Label>
                            <Input
                              className="text-xs"
                              type="date"
                              value={editUser.expires ? dayjs(editUser.expires).format("YYYY-MM-DD") : ""}
                              onChange={(e) => setEditUser({ ...editUser, expires: e.target.value })}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(editUser),
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setUsers(users.map(u => u.id === selectedUser.id ? updated : u));
                                    setOpenUserDetails(false);
                                    toast.success("Deelnemer bijgewerkt!");
                                  } else {
                                    toast.error("Fout bij bijwerken");
                                  }
                                } catch (error) {
                                  toast.error("Netwerkfout");
                                }
                              }}
                            >
                              Opslaan
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, {
                                    method: "DELETE",
                                  });
                                  if (res.ok) {
                                    setUsers(users.filter(u => u.id !== selectedUser.id));
                                    setOpenUserDetails(false);
                                    toast.success("Deelnemer verwijderd!");
                                  } else {
                                    toast.error("Fout bij verwijderen");
                                  }
                                } catch (error) {
                                  toast.error("Netwerkfout");
                                }
                              }}
                            >
                              Verwijderen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Versturen Modal */}
        <Dialog open={openModal === 'email'} onOpenChange={(open) => {
          if (!open) {
            setOpenModal(null);
            setEmailSubject('');
            setEmailMessage('');
            setEmailRecipientMode('all');
            setEmailSelectedRecipients([]);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Versturen</DialogTitle>
              <DialogDescription>Stuur een bericht naar deelnemers van deze run</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Onderwerp */}
              <div>
                <Label htmlFor="email-subject" className="text-sm font-medium">Onderwerp *</Label>
                <Input
                  id="email-subject"
                  placeholder="Bijv: Kasgeld bijdrage januari"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={emailSending}
                  className="mt-1"
                />
              </div>

              {/* Bericht */}
              <div>
                <Label htmlFor="email-message" className="text-sm font-medium">Bericht *</Label>
                <textarea
                  id="email-message"
                  placeholder="Typ uw bericht hier..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  disabled={emailSending}
                  className="w-full min-h-[150px] p-2 border border-gray-300 rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Recipients Selection */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Ontvangers</Label>
                <div className="space-y-3">
                  {/* All recipients option */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="email-all-recipients"
                      checked={emailRecipientMode === 'all'}
                      onCheckedChange={() => {
                        setEmailRecipientMode('all');
                        setEmailSelectedRecipients([]);
                      }}
                      disabled={emailSending}
                    />
                    <label htmlFor="email-all-recipients" className="text-sm cursor-pointer">
                      Alle deelnemers ({getRunParticipants().length})
                    </label>
                  </div>

                  {/* Specific recipients option */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="email-specific-recipients"
                      checked={emailRecipientMode === 'selected'}
                      onCheckedChange={() => setEmailRecipientMode('selected')}
                      disabled={emailSending}
                    />
                    <label htmlFor="email-specific-recipients" className="text-sm cursor-pointer">
                      Selectieve deelnemers
                    </label>
                  </div>

                  {/* Recipients list */}
                  {emailRecipientMode === 'selected' && (
                    <div className="border border-gray-200 rounded-md p-3 max-h-[200px] overflow-y-auto bg-gray-50">
                      {getRunParticipants().length === 0 ? (
                        <p className="text-xs text-gray-500">Geen deelnemers beschikbaar</p>
                      ) : (
                        <div className="space-y-2">
                          {getRunParticipants().map(participant => (
                            <div key={participant.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`recipient-${participant.id}`}
                                checked={emailSelectedRecipients.includes(participant.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEmailSelectedRecipients([...emailSelectedRecipients, participant.id]);
                                  } else {
                                    setEmailSelectedRecipients(emailSelectedRecipients.filter(id => id !== participant.id));
                                  }
                                }}
                                disabled={emailSending}
                              />
                              <label
                                htmlFor={`recipient-${participant.id}`}
                                className="text-xs cursor-pointer flex-1"
                              >
                                <span className="font-medium">{participant.name}</span>
                                <span className="text-gray-500"> ({participant.email})</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSendEmail}
                  disabled={!emailSubject.trim() || !emailMessage.trim() || emailSending}
                  className="flex-1"
                >
                  {emailSending ? 'Bezig met versturen...' : 'Email Versturen'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOpenModal(null)}
                  disabled={emailSending}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Instellingen Modal */}
        <Dialog open={openModal === 'settings'} onOpenChange={(open) => !open && setOpenModal(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Instellingen</DialogTitle>
              <DialogDescription>Beheer app instellingen en configuratie</DialogDescription>
            </DialogHeader>
            <AppSettingsPanel />
          </DialogContent>
        </Dialog>

        {/* Clear Assignments Confirmation Dialog */}
        <Dialog open={clearAssignmentsDialogOpen} onOpenChange={setClearAssignmentsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Toewijzingen verwijderen?</DialogTitle>
              <DialogDescription>
                Dit zal alle toewijzingen verwijderen. Dit kan niet ongedaan gemaakt worden.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setClearAssignmentsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={clearAllAssignments}>
                Verwijderen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Report Dialog */}
        <Dialog open={viewReportDialogOpen} onOpenChange={setViewReportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Auto-Assign Report</DialogTitle>
              <DialogDescription>
                Report van automatische toewijzing {selectedReport ? dayjs(selectedReport.timestamp).format('DD-MM-YYYY HH:mm') : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4 text-sm">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-800">{selectedReport.summary.totalAssigned}</div>
                    <div className="text-blue-600 text-xs">Toegewezen</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded">
                    <div className="font-semibold text-yellow-800">{selectedReport.summary.totalConflicts}</div>
                    <div className="text-yellow-600 text-xs">Conflicten</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="font-semibold text-green-800">{selectedReport.summary.conflictsResolved}</div>
                    <div className="text-green-600 text-xs">Opgelost</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="font-semibold text-purple-800">{selectedReport.summary.usersProcessed}</div>
                    <div className="text-purple-600 text-xs">Gebruikers</div>
                  </div>
                </div>

                {/* Assignments */}
                {selectedReport.assignments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Toewijzingen</h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {selectedReport.assignments.map((a, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                          <div>{a.userName} → {a.month} (Hand {a.hand})</div>
                          <div className="text-gray-500">{a.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts */}
                {selectedReport.conflicts.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-yellow-700">Conflicten</h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {selectedReport.conflicts.map((c, i) => (
                        <div key={i} className="p-2 bg-yellow-50 rounded text-xs">
                          <div>{c.userName} → {c.month}</div>
                          <div className="text-gray-500">{c.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
