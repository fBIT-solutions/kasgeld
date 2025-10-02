"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import dayjs from "dayjs";

export default function SwapRequests({ users, runs, onChangeUsers, onChangeRuns }) {
    const { data: session } = useSession();
    const [swapRequests, setSwapRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [responseNote, setResponseNote] = useState("");
    const [responseDialogOpen, setResponseDialogOpen] = useState(false);
    const [actionType, setActionType] = useState(""); // "accept" or "reject"

    useEffect(() => {
        if (session?.user?.id) {
            fetchSwapRequests();
        }
    }, [session]);

    const fetchSwapRequests = async () => {
        try {
            const response = await fetch(`/api/swaps?userId=${session.user.id}`);
            if (response.ok) {
                const data = await response.json();
                setSwapRequests(data);
            }
        } catch (error) {
            console.error("Error fetching swap requests:", error);
        }
    };

    const getUserName = (userId) => {
        const user = users?.find(u => u.id === userId);
        return user?.displayname || "Onbekende Gebruiker";
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "accepted": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const openResponseDialog = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setResponseNote("");
        setResponseDialogOpen(true);
    };

    const handleResponse = async () => {
        if (!selectedRequest || !actionType) return;

        try {
            // Update swap request status
            const swapUpdateResponse = await fetch(`/api/swaps?id=${selectedRequest.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: actionType === "accept" ? "accepted" : "rejected",
                    responseNote: responseNote,
                    respondedAt: new Date().toISOString()
                }),
            });

            if (!swapUpdateResponse.ok) {
                throw new Error("Failed to update swap request");
            }

            // If accepted, update the run units
            if (actionType === "accept") {
                await updateRunUnits(selectedRequest);
            }

            toast.success(`Swap request ${actionType}ed successfully!`);
            setResponseDialogOpen(false);
            fetchSwapRequests(); // Refresh the list
        } catch (error) {
            console.error("Error handling swap response:", error);
            toast.error(`Failed to ${actionType} swap request`);
        }
    };

    const updateRunUnits = async (swapRequest) => {
        try {
            // Find the target run from the global runs state
            const targetRun = runs?.find(run => run.id === swapRequest.runId);
            
            if (!targetRun) {
                throw new Error("Run not found");
            }

            // Update the units assignments
            const updatedUnits = targetRun.units.map(unit => {
                // Swap the requester's unit
                if (unit.name === swapRequest.requesterUnitName && unit.hand === swapRequest.requesterUnitHand) {
                    return { ...unit, assignedTo: swapRequest.targetedUserId };
                }
                // Swap the targeted unit
                if (unit.name === swapRequest.targetedUnitName && unit.hand === swapRequest.targetedUnitHand) {
                    return { ...unit, assignedTo: swapRequest.requesterUserId };
                }
                return unit;
            });

            const updatedRun = {
                ...targetRun,
                units: updatedUnits
            };

            // Update the run via API
            const updateResponse = await fetch("/api/runs", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedRun),
            });

            if (!updateResponse.ok) {
                throw new Error("Failed to update run units");
            }

            // Update the global state
            if (runs && Array.isArray(runs)) {
                onChangeRuns(runs.map(run => 
                    run.id === targetRun.id ? updatedRun : run
                ));
            }
        } catch (error) {
            console.error("Error updating run units:", error);
            throw error;
        }
    };

    const sentRequests = swapRequests.filter(req => req.requesterUserId === session?.user?.id);
    const receivedRequests = swapRequests.filter(req => req.targetedUserId === session?.user?.id);

    if (!session) {
        return <div className="p-4">Inloggen om ruilverzoeken te bekijken.</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Ruilverzoeken</h2>

            {/* Received Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Ontvangen Ruil Verzoeken ({receivedRequests.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {receivedRequests.length === 0 ? (
                        <p className="text-muted-foreground">Geen ontvangen verzoeken.</p>
                    ) : (
                        <div className="space-y-3">
                            {receivedRequests.map(request => (
                                <div key={request.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium">
                                                Van: {getUserName(request.requesterUserId)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {dayjs(request.requestedDate).format('MMM DD, YYYY HH:mm')}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium">Ze willen geven:</p>
                                            <p>{request.requesterUnitName} - Hand {request.requesterUnitHand}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium">Ze willen jouw:</p>
                                            <p>{request.targetedUnitName} - Hand {request.targetedUnitHand}</p>
                                        </div>
                                    </div>
                                    {request.note && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium">Opmerkingen:</p>
                                            <p className="text-sm text-muted-foreground">{request.note}</p>
                                        </div>
                                    )}
                                    {request.status === "pending" && (
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                onClick={() => openResponseDialog(request, "accept")}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                Accepteren
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => openResponseDialog(request, "reject")}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Afwijzen
                                            </Button>
                                        </div>
                                    )}
                                    {request.responseNote && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded">
                                            <p className="text-sm font-medium">Jouw antwoord:</p>
                                            <p className="text-sm">{request.responseNote}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Sent Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Verzonden Ruil Verzoeken ({sentRequests.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sentRequests.length === 0 ? (
                        <p className="text-muted-foreground">Geen verzonden verzoeken.</p>
                    ) : (
                        <div className="space-y-3">
                            {sentRequests.map(request => (
                                <div key={request.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium">
                                                Aan: {getUserName(request.targetedUserId)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {dayjs(request.requestedDate).format('MMM DD, YYYY HH:mm')}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium">Jouw Hand:</p>
                                            <p>{request.requesterUnitName} - Hand {request.requesterUnitHand}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium">Gewenste Hand:</p>
                                            <p>{request.targetedUnitName} - Hand {request.targetedUnitHand}</p>
                                        </div>
                                    </div>
                                    {request.note && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium">Opmerkingen:</p>
                                            <p className="text-sm text-muted-foreground">{request.note}</p>
                                        </div>
                                    )}
                                    {request.responseNote && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded">
                                            <p className="text-sm font-medium">Reactie:</p>
                                            <p className="text-sm">{request.responseNote}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Response Dialog */}
            <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "accept" ? "Accepteren" : "Afwijzen"} Ruil Verzoek
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === "accept" 
                                ? "Je staat op het punt dit ruilverzoek te accepteren. De eenheden worden onmiddellijk uitgewisseld."
                                : "Je staat op het punt dit ruilverzoek af te wijzen."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedRequest && (
                            <div className="space-y-2">
                                <Label>Ruil Details:</Label>
                                <div className="p-3 bg-gray-50 rounded">
                                    <p><strong>Van:</strong> {getUserName(selectedRequest.requesterUserId)}</p>
                                    <p><strong>Ze geven:</strong> {selectedRequest.requesterUnitName} - Hand {selectedRequest.requesterUnitHand}</p>
                                    <p><strong>Jij geeft:</strong> {selectedRequest.targetedUnitName} - Hand {selectedRequest.targetedUnitHand}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="responseNote">Reactie Opmerking (Optioneel)</Label>
                            <Textarea
                                id="responseNote"
                                placeholder="Voeg een opmerking toe bij je reactie..."
                                value={responseNote}
                                onChange={(e) => setResponseNote(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <Button 
                                variant="outline" 
                                onClick={() => setResponseDialogOpen(false)}
                            >
                                Annuleren
                            </Button>
                            <Button 
                                onClick={handleResponse}
                                className={actionType === "accept" ? "bg-green-600 hover:bg-green-700" : ""}
                                variant={actionType === "reject" ? "destructive" : "default"}
                            >
                                {actionType === "accept" ? "Accepteren" : "Afwijzen"} Ruil Verzoek
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}