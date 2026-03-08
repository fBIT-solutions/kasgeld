"use client";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function AutoAssignDialog({
    open,
    onOpenChange,
    run,
    users,
    isAdmin,
    onProcessAutoAssignment
}) {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [userHandCounts, setUserHandCounts] = useState({});
    const [userPreferences, setUserPreferences] = useState({});

    // Get available months from current run
    const getAvailableMonths = () => {
        if (!run?.units) return [];
        const months = [...new Set(run.units.map(unit => unit.name))];
        return months.sort();
    };

    // Calculate total hands requested
    const getTotalHandsRequested = () => {
        return Object.values(userHandCounts).reduce((sum, count) => sum + (parseInt(count) || 0), 0);
    };

    // Get total available hands (unassigned only)
    const getTotalAvailableHands = () => {
        return run?.units?.filter(unit => !unit.assignedTo).length || 0;
    };

    // Get total assigned hands
    const getTotalAssignedHands = () => {
        return run?.units?.filter(unit => unit.assignedTo).length || 0;
    };

    // Check if there are any assignments
    const hasAssignments = () => {
        return run?.units?.some(unit => unit.assignedTo) || false;
    };

    // Check if assignment is valid
    const isAssignmentValid = () => {
        return getTotalHandsRequested() <= getTotalAvailableHands() && selectedUsers.length > 0;
    };

    // Toggle user selection
    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => {
            const newSelection = prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId];

            // If selecting a user, pre-fill their preferences if they have any
            if (!prev.includes(userId) && newSelection.includes(userId)) {
                const user = users.find(u => u.id === userId);
                if (user?.preferences) {
                    // Set hand count from user preferences
                    if (user.preferences.preferredHands) {
                        setUserHandCounts(prev => ({
                            ...prev,
                            [userId]: user.preferences.preferredHands
                        }));
                    }
                    // Set month preferences from user preferences
                    if (user.preferences.preferredMonths?.length > 0) {
                        setUserPreferences(prev => ({
                            ...prev,
                            [userId]: user.preferences.preferredMonths
                        }));
                    }
                }
            } else if (prev.includes(userId) && !newSelection.includes(userId)) {
                // Clean up hand counts and preferences for deselected users
                setUserHandCounts(prev => {
                    const newCounts = { ...prev };
                    delete newCounts[userId];
                    return newCounts;
                });
                setUserPreferences(prev => {
                    const newPrefs = { ...prev };
                    delete newPrefs[userId];
                    return newPrefs;
                });
            }

            return newSelection;
        });
    };

    // Update user hand count
    const updateUserHandCount = (userId, count) => {
        setUserHandCounts(prev => ({
            ...prev,
            [userId]: Math.max(0, parseInt(count) || 0)
        }));
    };

    // Toggle month preference for user
    const toggleMonthPreference = (userId, month) => {
        setUserPreferences(prev => {
            const userPrefs = prev[userId] || [];
            const newPrefs = userPrefs.includes(month)
                ? userPrefs.filter(m => m !== month)
                : [...userPrefs, month];

            return {
                ...prev,
                [userId]: newPrefs
            };
        });
    };

    // Handle processing
    const handleProcess = () => {
        onProcessAutoAssignment({
            selectedUsers,
            userHandCounts,
            userPreferences
        });
        // Reset state
        setSelectedUsers([]);
        setUserHandCounts({});
        setUserPreferences({});
        onOpenChange(false);
    };

    // Handle close
    const handleClose = () => {
        setSelectedUsers([]);
        setUserHandCounts({});
        setUserPreferences({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Automatisch toewijzen
                    </DialogTitle>
                    <DialogDescription>
                        Selecteer deelnemers om handen aan toe te wijzen.
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="inline-block h-4 w-4 ml-1 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">
                                    Specificeer hoeveel handen elke deelnemer wil en hun voorkeursmaanden. Het systeem zal proberen om de voorkeuren te respecteren, maar kan ook willekeurig toewijzen indien nodig.
                                    Handen die al zijn toegewezen blijven ongewijzigd. Automatisch toewijzen werkt alleen met de resterende beschikbare handen.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    {/* Summary - Fixed section */}
                    <div className="flex-shrink-0 space-y-3">
                        {/* Assignment Status */}
                        {hasAssignments() && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded">
                                    <div className="font-semibold text-blue-800">{getTotalAssignedHands()}</div>
                                    <div className="text-blue-600 text-xs">Toegewezen</div>
                                </div>
                                <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <div className="font-semibold text-yellow-800">{getTotalAvailableHands()}</div>
                                    <div className="text-yellow-600 text-xs">Beschikbaar</div>
                                </div>
                            </div>
                        )}

                        {/* Request Summary */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-semibold">{getTotalAvailableHands()}</div>
                                <div className="text-xs text-muted-foreground">Beschikbaar</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-semibold">{getTotalHandsRequested()}</div>
                                <div className="text-xs text-muted-foreground">Gevraagde Handen</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className={`font-semibold ${isAssignmentValid() ? 'text-green-600' : 'text-red-600'}`}>
                                    {getTotalAvailableHands() - getTotalHandsRequested()}
                                </div>
                                <div className="text-xs text-muted-foreground">Nog beschikbaar</div>
                            </div>
                        </div>
                    </div>

                    {/* Error message - Fixed section */}
                    {!isAssignmentValid() && getTotalHandsRequested() > getTotalAvailableHands() && (
                        <div className="flex-shrink-0 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Te veel handen geselecteerd, pas de toewijzing aan</span>
                        </div>
                    )}

                    {/* Info message for existing assignments */}
                    {hasAssignments() && (
                        <div className="flex-shrink-0 flex items-center gap-2 p-1 bg-blue-50 border border-blue-200 rounded text-blue-800">
                            <Users className="h-4 w-4" />
                            <span className="text-xs">Sommige eenheden zijn al toegewezen. Automatisch toewijzen werkt alleen met de resterende {getTotalAvailableHands()} beschikbare handen.</span>
                        </div>
                    )}

                    {/* Scrollable user list */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full max-h-[350px] overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-4 max-h-[350px]">
                                    {users?.map(user => (
                                        <div key={user.id} className="border rounded p-3">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Checkbox
                                                    checked={selectedUsers.includes(user.id)}
                                                    onCheckedChange={() => toggleUserSelection(user.id)}
                                                />
                                                <span className="font-medium">
                                                    {isAdmin 
                                                        ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayname
                                                        : user.firstname}
                                                </span>
                                            </div>

                                            {selectedUsers.includes(user.id) && (
                                                <div className="ml-6 space-y-3">
                                                    <div>
                                                        <Label className="text-sm">Number of hands:</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={getTotalAvailableHands()}
                                                            value={userHandCounts[user.id] || 0}
                                                            onChange={(e) => updateUserHandCount(user.id, e.target.value)}
                                                            className="w-20 text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label className="text-sm">Preferred months:</Label>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {getAvailableMonths().map(month => (
                                                                <Badge
                                                                    key={month}
                                                                    variant={userPreferences[user.id]?.includes(month) ? "default" : "outline"}
                                                                    className="cursor-pointer text-xs"
                                                                    onClick={() => toggleMonthPreference(user.id, month)}
                                                                >
                                                                    {month}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Fixed buttons at bottom */}
                    <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleProcess}
                            disabled={!isAssignmentValid()}
                        >
                            Process Assignment
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
