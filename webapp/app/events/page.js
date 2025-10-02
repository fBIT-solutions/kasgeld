"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import MonthGridCalendar from "@/components/month-grid-calendar";

export default function EventsPage({ users, runs, onChangeUsers, onChangeRuns }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editEvent, setEditEvent] = useState(null);

    function handleTileClick(run) {
        setSelectedEvent(run);
        setEditEvent({ ...run }); // clone for editing
    }
    async function handleSave() {
        const res = await fetch(`/api/runs`, {
            method: "PUT",
            body: JSON.stringify(editEvent),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (res.ok) {
            toast("Run updated!");
            onChangeRuns(runs.map(e => (e.id === editEvent.id ? editEvent : e)));
            setSelectedEvent(null);
        } else {
            toast("Failed to update run.");
        }
    }

    return (
        <div className="w-full">
            <MonthGridCalendar users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} />
            
        </div>
    );
}