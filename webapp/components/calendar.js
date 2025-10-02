"use client"

import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import nlNL from 'date-fns/locale/nl';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
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
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const DnDCalendar = withDragAndDrop(Calendar)
const locales = {
    'nl-NL': nlNL,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const MyCalendar = ({ users, runs, onChangeUsers, onChangeRuns }) => {
    const { data: session } = useSession();
    const [calendarItems, setCalendarItems] = useState([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [swapDialogOpen, setSwapDialogOpen] = useState(false)
    const [userUnits, setUserUnits] = useState([])
    const [selectedUserUnit, setSelectedUserUnit] = useState("")
    const [swapNote, setSwapNote] = useState("")


useEffect(() => {
    // Transform runs.units into calendar events
    let calendarEvents = [];
    if (runs && Array.isArray(runs)) {
        runs.forEach(run => {
            if (run.units && Array.isArray(run.units)) {
                run.units.forEach(unit => {
                    // Parse the unit.name as date (assuming it's in MM-YYYY format)
                    const dateParts = unit.name.split('-');
                    if (dateParts.length === 2) {
                        const month = parseInt(dateParts[0]) - 1; // Month is 0-indexed
                        const year = parseInt(dateParts[1]);
                        const eventDate = new Date(year, month, unit.hand); // Use hand as day
                        
                        // Get the assigned user's name
                        let assignedUserName = null;
                        if (unit.assignedTo && users && Array.isArray(users)) {
                            const assignedUser = users.find(user => user.id === unit.assignedTo);
                            assignedUserName = assignedUser?.displayname || null;
                        }
                        
                        calendarEvents.push({
                            id: `${run.id}-${unit.name}-${unit.hand}`,
                            title: `Hand ${unit.hand} - ${assignedUserName || 'Niet toegewezen'}`,
                            start: eventDate,
                            end: eventDate,
                            resource: {
                                runId: run.id,
                                runYear: run.year,
                                unitName: unit.name,
                                hand: unit.hand,
                                assignedTo: assignedUserName
                            }
                        });
                    }
                });
            }
        });
    }
    
    setCalendarItems(calendarEvents);
}, [users, runs]);

// Function to get units assigned to the current user
const getUserAssignedUnits = () => {
    if (!session?.user?.id || !calendarItems.length) return [];
    
    return calendarItems.filter(item => 
        item.resource && 
        item.resource.assignedTo && 
        users?.find(user => 
            user.id === session.user.id && 
            user.displayname === item.resource.assignedTo
        )
    ).map(item => ({
        id: item.id,
        title: item.title,
        unitName: item.resource.unitName,
        hand: item.resource.hand,
        runId: item.resource.runId
    }));
};

// Function to handle swap request
const handleSwapRequest = async () => {
    if (!selectedUserUnit || !selectedEvent || !session?.user?.id) {
        toast.error("Please select a unit to swap");
        return;
    }

    try {
        const userUnit = userUnits.find(unit => unit.id === selectedUserUnit);
        const targetUser = users?.find(user => user.displayname === selectedEvent.assignedTo);
        
        if (!targetUser) {
            toast.error("Target user not found");
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
            toast.success("Swap request sent successfully!");
            setSwapDialogOpen(false);
            setSelectedUserUnit("");
            setSwapNote("");
        } else {
            toast.error("Failed to send swap request");
        }
    } catch (error) {
        console.error("Error sending swap request:", error);
        toast.error("Failed to send swap request");
    }
};

// Function to open swap dialog
const openSwapDialog = () => {
    const assignedUnits = getUserAssignedUnits();
    setUserUnits(assignedUnits);
    setSwapDialogOpen(true);
};

return (
    <div>
        <Calendar
            selectable
            date={currentDate}
            onNavigate={(date) => {
                console.log('Calendar navigated to:', date);
                setCurrentDate(date);
            }}
            onSelectSlot={({ start, end }) => {
                const title = prompt('Wat is de titel van de afspraak?')
                if (title) {
                    setCalendarItems([...calendarItems, { start, end, title }])
                }
            }}
            onSelectEvent={event => {
                const resource = event.resource;
                if (resource) {
                    setSelectedEvent(resource);
                    setDialogOpen(true);
                } else {
                    setSelectedEvent({ title: event.title, isCustomEvent: true });
                    setDialogOpen(true);
                }
            }}
            localizer={localizer}
            events={calendarItems}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            popup
            showMultiDayTimes
            className='calendar-component'
        />
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {selectedEvent?.isCustomEvent ? 'Afspraak Details' : 'Kasgeld Run Details'}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedEvent?.isCustomEvent 
                            ? 'Informatie over deze afspraak'
                            : 'Informatie over deze kasgeld run'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {selectedEvent?.isCustomEvent ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="font-semibold">Titel:</span>
                            <span className="col-span-3">{selectedEvent.title}</span>
                        </div>
                    ) : selectedEvent ? (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold">Jaar:</span>
                                <span className="col-span-3">{selectedEvent.runYear}</span>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold">Maand:</span>
                                <span className="col-span-3">{selectedEvent.unitName}</span>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold">Hand:</span>
                                <span className="col-span-3">{selectedEvent.hand}</span>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold">Toegewezen aan:</span>
                                <span className="col-span-3">{selectedEvent.assignedTo || 'Niet toegewezen'}</span>
                            </div>
                            {selectedEvent.assignedTo && selectedEvent.assignedTo !== session?.user?.displayname && (
                                <div className="mt-4 pt-4 border-t">
                                    <Button 
                                        onClick={openSwapDialog}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        Ruil verzoek versturen
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
        
        {/* Swap Request Dialog */}
        <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Ruil verzoek</DialogTitle>
                    <DialogDescription>
                        Vraag om jouw hand te ruilen met {selectedEvent?.assignedTo}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Doel hand</Label>
                        <div className="p-3 bg-gray-50 rounded">
                            <strong>{selectedEvent?.unitName}</strong> - Hand {selectedEvent?.hand}
                            <br />
                            <small>Toegewezen aan: {selectedEvent?.assignedTo}</small>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="userUnit">Jouw hand om te ruilen</Label>
                        <Select value={selectedUserUnit} onValueChange={setSelectedUserUnit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecteer een van jouw toegewezen handen" />
                            </SelectTrigger>
                            <SelectContent>
                                {userUnits.map(unit => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                        {unit.unitName} - Hand {unit.hand}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {userUnits.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Je hebt geen toegewezen handen om te ruilen
                            </p>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="note">Opmerking (Optioneel)</Label>
                        <Textarea
                            id="note"
                            placeholder="Voeg een opmerking toe m.b.t jouw verzoek toe."
                            value={swapNote}
                            onChange={(e) => setSwapNote(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button 
                            variant="outline" 
                            onClick={() => setSwapDialogOpen(false)}
                        >
                            Annuleren
                        </Button>
                        <Button 
                            onClick={handleSwapRequest}
                            disabled={!selectedUserUnit || userUnits.length === 0}
                        >
                            Versturen
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
)
}

export default MyCalendar