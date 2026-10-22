"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { useSession } from "next-auth/react";

const NextUnitTransaction = ({ users, runs }) => {
    const { data: session } = useSession();

    // Function to get user's next unit transaction
    const getNextUnitTransaction = () => {
        if (!session?.user?.id || !runs?.length) return null;

        const currentDate = new Date();

        // Find all units assigned to the current user
        const userUnits = [];
        runs.forEach(run => {
            if (run.units && Array.isArray(run.units)) {
                run.units.forEach(unit => {
                    if (unit.assignedTo === session.user.id) {
                        const [month, year] = unit.name.split('-').map(Number);
                        userUnits.push({
                            ...unit,
                            runId: run.id,
                            runYear: run.year,
                            month,
                            year,
                            date: new Date(year, month - 1, unit.hand) // Convert to Date object
                        });
                    }
                });
            }
        });

        // Filter for future units and sort by date
        const futureUnits = userUnits
            .filter(unit => unit.date >= currentDate)
            .sort((a, b) => a.date - b.date);

        return futureUnits.length > 0 ? futureUnits[0] : null;
    };

    // Function to format date in Dutch
    const formatDate = (date) => {
        const monthNames = [
            'januari', 'februari', 'maart', 'april', 'mei', 'juni',
            'juli', 'augustus', 'september', 'oktober', 'november', 'december'
        ];
        
        return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    // Function to get days until transaction
    const getDaysUntil = (date) => {
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const nextUnit = getNextUnitTransaction();

    if (!nextUnit) {
        return (
            <Card className="w-full gap-2">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-1 text-lg">
                        <Calendar className="w-5 h-5" />
                        Volgende Kasgeld Transactie
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Je hebt momenteel geen geplande kasgeld transacties.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const daysUntil = getDaysUntil(nextUnit.date);
    const isToday = daysUntil === 0;
    const isPast = daysUntil < 0;

    return (
        <Card className="w-full gap-2 p-2">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5" />
                    Volgende Kasgeld Transactie
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            Datum
                        </p>
                        <p className="text-sm font-semibold">
                            {formatDate(nextUnit.date)}
                        </p>
                    </div>
                    <Badge 
                        variant={isToday ? "default" : isPast ? "destructive" : "secondary"}
                        className="text-sm"
                    >
                        {isToday ? "Vandaag!" : 
                         isPast ? `${Math.abs(daysUntil)} dagen geleden` :
                         `Over ${daysUntil} ${daysUntil === 1 ? 'dag' : 'dagen'}`}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Hand
                        </p>
                        <p className="text-sm font-semibold">
                            {nextUnit.hand}
                        </p>
                    </div>
                    
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Maand
                        </p>
                        <p className="text-sm font-semibold">
                            {nextUnit.name}
                        </p>
                    </div>
                </div>

                <div className="pt-2 border-t">
                    <p className="text-xs italic text-muted-foreground">
                        Run: {nextUnit.runYear}
                    </p>
                </div>
                
                {isToday && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                            🎉 Het is tijd voor je kasgeld transactie!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NextUnitTransaction;