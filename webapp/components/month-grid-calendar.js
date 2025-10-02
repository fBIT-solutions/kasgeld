"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const MonthGridCalendar = ({ users, runs, onChangeUsers, onChangeRuns }) => {
    const { data: session } = useSession();
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [swapDialogOpen, setSwapDialogOpen] = useState(false);
    const [userUnits, setUserUnits] = useState([]);
    const [selectedUserUnit, setSelectedUserUnit] = useState("");
    const [swapNote, setSwapNote] = useState("");

    // Force component update when runs change
    useEffect(() => {
        // Reset selectedEvent if it's no longer valid
        if (selectedEvent && runs && Array.isArray(runs)) {
            const runExists = runs.find(r => r.id === selectedEvent.runId);
            if (!runExists) {
                setSelectedEvent(null);
                setDialogOpen(false);
            }
        }
    }, [runs, selectedEvent]);

    const monthNames = [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
    ];

    // Generate months data for the grid
    const getMonthsData = () => {
        const months = [];

        for (let i = 0; i < 12; i++) {
            const monthNumber = i + 1;
            const monthKey = `${monthNumber.toString().padStart(2, '0')}-${currentYear}`;
            
            // Find units for this month across all runs
            const monthUnits = [];
            if (runs && Array.isArray(runs)) {
                runs.forEach(run => {
                    if (run.units && Array.isArray(run.units)) {
                        const unitsInMonth = run.units.filter(unit => unit.name === monthKey);
                        monthUnits.push(...unitsInMonth.map(unit => ({
                            ...unit,
                            runId: run.id,
                            runYear: run.year
                        })));
                    }
                });
            }

            months.push({
                name: monthNames[i],
                key: monthKey,
                units: monthUnits
            });
        }

        return months;
    };

    // Get user display name
    const getUserDisplayName = (userId) => {
        const user = users?.find(u => u.id === userId);
        return user?.displayname || user?.firstname || 'Onbekend';
    };

    // Handle unit click
    const handleUnitClick = (unit) => {
        setSelectedEvent({
            runId: unit.runId,
            runYear: unit.runYear,
            unitName: unit.name,
            hand: unit.hand,
            assignedTo: getUserDisplayName(unit.assignedTo)
        });
        setDialogOpen(true);
    };

    // Function to get units assigned to the current user
    const getUserAssignedUnits = () => {
        if (!session?.user?.id || !runs?.length) return [];
        
        const userAssignedUnits = [];
        runs.forEach(run => {
            if (run.units && Array.isArray(run.units)) {
                run.units.forEach(unit => {
                    if (unit.assignedTo === session.user.id) {
                        userAssignedUnits.push({
                            id: `${run.id}-${unit.name}-${unit.hand}`,
                            title: `${unit.name} - Hand ${unit.hand}`,
                            unitName: unit.name,
                            hand: unit.hand,
                            runId: run.id
                        });
                    }
                });
            }
        });
        
        return userAssignedUnits;
    };

    // Function to handle swap request
    const handleSwapRequest = async () => {
        if (!selectedUserUnit || !selectedEvent || !session?.user?.id) {
            toast.error("Selecteer een hand om te ruilen.");
            return;
        }

        try {
            const userUnit = userUnits.find(unit => unit.id === selectedUserUnit);
            const targetUser = users?.find(user => user.displayname === selectedEvent.assignedTo);
            
            if (!targetUser) {
                toast.error("Doelgebruiker niet gevonden");
                return;
            }

            const swapData = {
                requesterUserId: session.user.id,
                targetedUserId: targetUser.id,
                note: swapNote,
                runId: selectedEvent.runId,
                requesterUnitName: userUnit.unitName,
                requesterUnitHand: userUnit.hand,
                targetedUnitName: selectedEvent.unitName,
                targetedUnitHand: selectedEvent.hand
            };

            const response = await fetch('/api/swaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(swapData),
            });

            if (response.ok) {
                toast.success("Ruil verzoek verzonden!");
                setSwapDialogOpen(false);
                setSelectedUserUnit("");
                setSwapNote("");
            } else {
                toast.error("Verzenden van ruil verzoek mislukt");
            }
        } catch (error) {
            console.error("Error sending swap request:", error);
            toast.error("Verzenden van ruil verzoek mislukt");
        }
    };

    // Function to open swap dialog
    const openSwapDialog = () => {
        const assignedUnits = getUserAssignedUnits();
        setUserUnits(assignedUnits);
        setSwapDialogOpen(true);
    };

    const months = getMonthsData();

    return (
        <div className="w-full">
                <h2 className="text-center pb-4 text-2xl font-bold">Kasgeld Kalender</h2>
            {/* Year Navigation */}
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentYear(prev => prev - 1)}
                    className="flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {currentYear - 1}
                </Button>
                
                <h3 className="text-xl font-bold">{currentYear}</h3>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentYear(prev => prev + 1)}
                    className="flex items-center gap-2"
                >
                    {currentYear + 1}
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* 3x4 Month Grid */}
            <ScrollArea className="h-[400px] border p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {months.map((month, index) => (
                    <Card key={month.key} className="p-2 h-auto gap-1">
                        <CardHeader className="text-center items-center">
                            <CardTitle className="text-lg">{month.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {month.units.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Geen units</p>
                            ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {month.units.map((unit) => (
                                        <div
                                            key={`${unit.runId}-${unit.name}-${unit.hand}`}
                                            className="flex items-center justify-between p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                                            onClick={() => handleUnitClick(unit)}
                                        >
                                            <span className="text-sm font-normal">
                                                {unit.hand}:
                                            </span>
                                            <Badge 
                                                variant={unit.assignedTo ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {unit.assignedTo ? getUserDisplayName(unit.assignedTo) : 'Vrij'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            </ScrollArea>

            {/* Unit Details Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unit Details</DialogTitle>
                        <DialogDescription>
                            Details voor {selectedEvent?.unitName} - Hand {selectedEvent?.hand}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label>Maand</Label>
                            <p className="text-sm">{selectedEvent?.unitName}</p>
                        </div>
                        
                        <div>
                            <Label>Hand</Label>
                            <p className="text-sm">{selectedEvent?.hand}</p>
                        </div>
                        
                        <div>
                            <Label>Toegewezen Aan</Label>
                            <p className="text-sm">{selectedEvent?.assignedTo || 'Niet toegewezen'}</p>
                        </div>
                        
                        <div>
                            <Label>Run Jaar</Label>
                            <p className="text-sm">{selectedEvent?.runYear}</p>
                        </div>
                        
                        {selectedEvent?.assignedTo && selectedEvent.assignedTo !== 'Onbekend' && (
                            <Button onClick={openSwapDialog} className="w-full">
                                Ruil verzoeken
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Swap Request Dialog */}
            <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ruil Verzoek</DialogTitle>
                        <DialogDescription>
                            Verzoek om je hand te ruilen met {selectedEvent?.unitName} - Hand {selectedEvent?.hand} toegewezen aan {selectedEvent?.assignedTo}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="userUnit">Selecteer je hand om te ruilen</Label>
                            <Select value={selectedUserUnit} onValueChange={setSelectedUserUnit}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Kies een hand" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userUnits.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label htmlFor="swapNote">Opmerking (optioneel)</Label>
                            <Textarea
                                id="swapNote"
                                placeholder="Voeg een opmerking toe aan je ruil verzoek..."
                                value={swapNote}
                                onChange={(e) => setSwapNote(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>
                                Annuleren
                            </Button>
                            <Button onClick={handleSwapRequest}>
                                Verzenden
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MonthGridCalendar;