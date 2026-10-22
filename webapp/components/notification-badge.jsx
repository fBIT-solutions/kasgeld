"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCommunity } from "@/context/CommunityContext";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NotificationBadge() {
  const { data: session, status } = useSession();
  const { activeCommunity } = useCommunity();
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [incomingSwapRequests, setIncomingSwapRequests] = useState([]);
  const [outgoingSwapRequests, setOutgoingSwapRequests] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  
  // Swap handling state
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [swapResponseDialogOpen, setSwapResponseDialogOpen] = useState(false);
  const [swapActionType, setSwapActionType] = useState(null); // "accept" or "reject"
  const [swapResponseNote, setSwapResponseNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Registration handling state
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [regResponseDialogOpen, setRegResponseDialogOpen] = useState(false);
  const [regActionType, setRegActionType] = useState(null); // "approve" or "reject"
  const [regRejectionMessage, setRegRejectionMessage] = useState("");
  const [regIsProcessing, setRegIsProcessing] = useState(false);

  const fetchOpenTasks = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      
      // Fetch pending swap requests for current user
      const swapsRes = await fetch(`/api/swaps?userId=${session.user.id}`);
      if (swapsRes.ok) {
        const swaps = await swapsRes.json();
        const pendingSwaps = swaps.filter(s => s.status === "pending");
        
        // Split into incoming and outgoing
        const incoming = pendingSwaps.filter(s => s.targetedUserId === session.user.id);
        const outgoing = pendingSwaps.filter(s => s.requesterUserId === session.user.id);
        
        setIncomingSwapRequests(incoming);
        setOutgoingSwapRequests(outgoing);
      }

      // Fetch pending registration requests for admins only
      if (activeCommunity?.isOwner) {
        const regRes = await fetch("/api/registration-requests");
        if (regRes.ok) {
          const regs = await regRes.json();
          const pendingRegs = (regs || []).filter(r => r.status === "pending");
          setRegistrationRequests(pendingRegs);
        }
      }
    } catch (error) {
      console.error("Error fetching open tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch open tasks on mount and whenever session changes
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    let cancelled = false;
    const refreshTasks = () => {
      const swapsRequest = fetch(`/api/swaps?userId=${session.user.id}`)
        .then(response => response.ok ? response.json() : []);
      const registrationsRequest = activeCommunity?.isOwner
        ? fetch("/api/registration-requests").then(response => response.ok ? response.json() : [])
        : Promise.resolve([]);

      Promise.all([swapsRequest, registrationsRequest])
        .then(([swaps, registrations]) => {
          if (cancelled) return;
          const pendingSwaps = swaps.filter(swap => swap.status === "pending");
          setIncomingSwapRequests(pendingSwaps.filter(swap => swap.targetedUserId === session.user.id));
          setOutgoingSwapRequests(pendingSwaps.filter(swap => swap.requesterUserId === session.user.id));
          setRegistrationRequests(registrations.filter(request => request.status === "pending"));
        })
        .catch(error => {
          if (!cancelled) console.error("Error fetching open tasks:", error);
        })
        .finally(() => {
          if (!cancelled) setHasLoadedTasks(true);
        });
    };

    refreshTasks();
    const interval = setInterval(refreshTasks, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, session?.user?.id, activeCommunity?.isOwner]);

  const openSwapResponseDialog = (swap, action) => {
    setSelectedSwap(swap);
    setSwapActionType(action);
    setSwapResponseNote("");
    setSwapResponseDialogOpen(true);
  };

  const handleSwapResponse = async () => {
    if (!selectedSwap || !swapActionType) return;

    try {
      setIsProcessing(true);
      
      // Update swap request status
      const response = await fetch(`/api/swaps?id=${selectedSwap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: swapActionType === "accept" ? "accepted" : "rejected",
          responseNote: swapResponseNote,
          respondedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process swap request");
      }

      toast.success(`Ruilverzoek ${swapActionType === "accept" ? "geaccepteerd" : "afgewezen"}!`);
      setSwapResponseDialogOpen(false);
      fetchOpenTasks();
    } catch (error) {
      console.error("Error processing swap:", error);
      toast.error("Fout bij verwerken van ruilverzoek");
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCancelSwap = async (swap) => {
    try {
      setIsProcessing(true);
      
      // Cancel outgoing swap request
      const response = await fetch(`/api/swaps?id=${swap.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancelledAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel swap request");
      }

      toast.success("Ruilverzoek geannuleerd!");
      fetchOpenTasks();
    } catch (error) {
      console.error("Error cancelling swap:", error);
      toast.error("Fout bij annuleren van ruilverzoek");
    } finally {
      setIsProcessing(false);
    }
  }

  const openRegResponseDialog = (registration, action) => {
    setSelectedRegistration(registration);
    setRegActionType(action);
    setRegRejectionMessage("");
    setRegResponseDialogOpen(true);
  };

  const handleRegResponse = async () => {
    if (!selectedRegistration || !regActionType) return;

    try {
      setRegIsProcessing(true);
      const requestId = selectedRegistration.id;
      
      if (regActionType === "approve") {
        // Approve the registration
        const response = await fetch(`/api/registration-requests/${requestId}/approve`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Fout bij goedkeuring");
          return;
        }

        toast.success("Registratie goedgekeurd! Gebruiker aangemaakt.");
        toast.success(`OTP: ${data.otp}`);
      } else {
        // Reject the registration
        const response = await fetch(`/api/registration-requests/${requestId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rejectionMessage: regRejectionMessage || "Je aanvraag is afgewezen.",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Fout bij afwijzing");
          return;
        }

        toast.success("Registratie afgewezen.");
      }

      setRegResponseDialogOpen(false);
      fetchOpenTasks();
    } catch (error) {
      console.error("Error processing registration:", error);
      toast.error("Fout bij verwerken van registratieverzoek");
    } finally {
      setRegIsProcessing(false);
    }
  }

  if (status !== "authenticated") {
    return null;
  }

  const totalCount = incomingSwapRequests.length + outgoingSwapRequests.length + registrationRequests.length;

  return (
    <>
      <button
        onClick={() => setOpenDialogOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition"
        title="Open taken"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {totalCount > 0 && (
          <Badge
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs p-1 h-5 w-5 flex items-center justify-center rounded-full"
          >
            {totalCount}
          </Badge>
        )}
      </button>

      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Open Taken</DialogTitle>
            <DialogDescription>
              Taken die jouw aandacht nodig hebben
            </DialogDescription>
          </DialogHeader>

          {loading || (status === "authenticated" && !hasLoadedTasks) ? (
            <div className="text-center py-8">Taken laden...</div>
          ) : totalCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Goed gedaan! Geen open taken.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Incoming Swap Requests Section (from other users) */}
              {incomingSwapRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-gray-700">
                    Ruilverzoeken van anderen ({incomingSwapRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {incomingSwapRequests.map(swap => (
                      <Card key={swap.id} className="cursor-pointer hover:shadow-md transition">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {swap.requesterDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {swap.requesterUnitName} ↔ {swap.targetedUnitName}
                              </p>
                              {swap.note && (
                                <p className="text-xs text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                                  Bericht: {swap.note}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Ingediend: {new Date(swap.createdAt).toLocaleDateString('nl-NL')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => openSwapResponseDialog(swap, "accept")}
                                disabled={isProcessing}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => openSwapResponseDialog(swap, "reject")}
                                disabled={isProcessing}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Swap Requests Section (initiated by current user) */}
              {outgoingSwapRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-gray-700">
                    Mijn ruilverzoeken ({outgoingSwapRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {outgoingSwapRequests.map(swap => (
                      <Card key={swap.id} className="cursor-pointer hover:shadow-md transition">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {swap.targetedUserDisplayName}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {swap.requesterUnitName} ↔ {swap.targetedUnitName}
                              </p>
                              {swap.note && (
                                <p className="text-xs text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                                  Bericht: {swap.note}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Ingediend: {new Date(swap.createdAt).toLocaleDateString('nl-NL')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleCancelSwap(swap)}
                                disabled={isProcessing}
                                title="Ruilverzoek annuleren"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration Requests Section (Admin Only) */}
              {activeCommunity?.isOwner && registrationRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-gray-700">
                    Registratieverzoeken ({registrationRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {registrationRequests.map(req => (
                      <Card key={req.id} className="cursor-pointer hover:shadow-md transition">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {req.firstName} {req.lastName}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {req.email}
                              </p>
                              {(req.handsCount || req.referrer) && (
                                <div className="mt-2 space-y-1 text-xs text-gray-600">
                                  {req.handsCount && <p>Gewenste handen: {req.handsCount}</p>}
                                  {req.referrer && <p>Doorverwijzer: {req.referrer}</p>}
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Ingediend: {new Date(req.createdAt).toLocaleDateString('nl-NL')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => openRegResponseDialog(req, "approve")}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => openRegResponseDialog(req, "reject")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap Response Dialog */}
      <Dialog open={swapResponseDialogOpen} onOpenChange={setSwapResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ruilverzoek {swapActionType === "accept" ? "Accepteren" : "Afwijzen"}
            </DialogTitle>
            <DialogDescription>
              {swapActionType === "accept" 
                ? "Accepteer je dit ruilverzoek?" 
                : "Waarom wijs je dit ruilverzoek af?"}
            </DialogDescription>
          </DialogHeader>

          {swapActionType === "reject" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="response-note">Opmerking (optioneel)</Label>
                <Textarea
                  id="response-note"
                  placeholder="Voeg een opmerking toe..."
                  value={swapResponseNote}
                  onChange={(e) => setSwapResponseNote(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setSwapResponseDialogOpen(false)}
              disabled={isProcessing}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleSwapResponse}
              disabled={isProcessing}
              className={swapActionType === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isProcessing ? "Verwerken..." : swapActionType === "accept" ? "Accepteren" : "Afwijzen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registration Response Dialog */}
      <Dialog open={regResponseDialogOpen} onOpenChange={setRegResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registratie {regActionType === "approve" ? "Goedkeuren" : "Afwijzen"}
            </DialogTitle>
            <DialogDescription>
              {regActionType === "approve" 
                ? "Keur je deze registratie goed?" 
                : "Waarom wijs je deze registratie af?"}
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Naam</p>
                <p className="text-sm">{selectedRegistration.firstName} {selectedRegistration.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-sm">{selectedRegistration.email}</p>
              </div>
              {selectedRegistration.handsCount && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Gewenste handen</p>
                  <p className="text-sm">{selectedRegistration.handsCount}</p>
                </div>
              )}
              {selectedRegistration.referrer && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Doorverwijzer</p>
                  <p className="text-sm">{selectedRegistration.referrer}</p>
                </div>
              )}
            </div>
          )}

          {regActionType === "reject" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-note">Reden voor afwijzing (optioneel)</Label>
                <Textarea
                  id="rejection-note"
                  placeholder="Voeg een reden toe..."
                  value={regRejectionMessage}
                  onChange={(e) => setRegRejectionMessage(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setRegResponseDialogOpen(false)}
              disabled={regIsProcessing}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleRegResponse}
              disabled={regIsProcessing}
              className={regActionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {regIsProcessing ? "Verwerken..." : regActionType === "approve" ? "Goedkeuren" : "Afwijzen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
