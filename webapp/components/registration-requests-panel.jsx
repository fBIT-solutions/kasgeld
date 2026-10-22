"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Check, X } from "lucide-react";

export default function RegistrationRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/registration-requests")
      .then(response => response.json())
      .then(data => {
        if (!cancelled) setRequests(data || []);
      })
      .catch(error => {
        console.error("Error fetching requests:", error);
        toast.error("Fout bij ophalen van registratieverzoeken");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApprove = async (requestId) => {
    try {
      setApprovingId(requestId);
      const response = await fetch(`/api/registration-requests/${requestId}/approve`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij goedkeuring");
        return;
      }

      toast.success("Verzoek goedgekeurd. Gebruiker aangemaakt.");
      // Show OTP
      const request = requests.find(r => r.id === requestId);
      toast.success(`OTP voor ${request.email}: ${data.otp}`);
      
      // Refresh list
      fetchRequests();
    } catch (error) {
      toast.error("Fout bij goedkeuring van verzoek");
      console.error("Approval error:", error);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setRejectingId(selectedRequest.id);
      const response = await fetch(`/api/registration-requests/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejectionMessage: rejectionMessage || "Je aanvraag is afgewezen.",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij afwijzing");
        return;
      }

      toast.success("Verzoek afgewezen. Afwijzingsbericht verzonden.");
      setRejectionMessage("");
      setSelectedRequest(null);
      
      // Refresh list
      fetchRequests();
    } catch (error) {
      toast.error("Fout bij afwijzing van verzoek");
      console.error("Rejection error:", error);
    } finally {
      setRejectingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Registratieverzoeken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "pending");

  if (pendingRequests.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Registratieverzoeken</CardTitle>
          <CardDescription>Geen openstaande registratieverzoeken</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Registratieverzoeken</CardTitle>
        <CardDescription>{pendingRequests.length} openstaande verzoeken</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="font-semibold">
                  {request.firstName} {request.lastName}
                </div>
                <div className="text-sm text-gray-600">
                  Weergavenaam: <span className="font-medium">{request.displayName}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {request.email}
                </div>
                <div className="text-sm text-gray-600">
                  Aangevraagde handen: <span className="font-medium">{request.handsCount || 0}</span>
                </div>
                {request.referrer && (
                  <div className="text-sm text-gray-600">
                    Doorverwijzer: {request.referrer}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(request.id)}
                  disabled={approvingId === request.id}
                >
                  {approvingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Dialog open={selectedRequest?.id === request.id} onOpenChange={(open) => {
                  if (!open) setSelectedRequest(null);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Verzoek afwijzen</DialogTitle>
                      <DialogDescription>
                        Voer een bericht in dat naar {request.email} wordt verzonden
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="rejection-message">Afwijzingsbericht</Label>
                        <textarea
                          id="rejection-message"
                          placeholder="Bijvoorbeeld: We hebben voldoende deelnemers op dit moment..."
                          value={rejectionMessage}
                          onChange={(e) => setRejectionMessage(e.target.value)}
                          className="w-full min-h-24 p-2 border rounded-md text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRequest(null)}
                        >
                          Annuleren
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectingId === request.id}
                        >
                          {rejectingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Afwijzen
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
