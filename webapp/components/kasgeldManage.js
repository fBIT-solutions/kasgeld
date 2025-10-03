"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CreateKasgeldRun from "@/components/createKasgeldRun";
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Zap, Eye, Info } from "lucide-react";
import dayjs from "dayjs";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export default function KasgeldManage({ users, runs, onChangeUsers, onChangeRuns }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [selectedRun, setSelectedRun] = useState(null);
    const [openRunDetails, setOpenRunDetails] = useState(false);
    const [openRolePopover, setOpenRolePopover] = useState(false);
    const [editRun, setEditRun] = useState([]);
    const roles = ["default", "guest", "member", "family", "worker", "admin"];
    const [qrToken, setQrToken] = useState(null);

    // Auto-assign states
    const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [userHandCounts, setUserHandCounts] = useState({});
    const [userPreferences, setUserPreferences] = useState({});
    const [processingResultOpen, setProcessingResultOpen] = useState(false);
    const [processingResult, setProcessingResult] = useState(null);
    const [createRunSheetOpen, setCreateRunSheetOpen] = useState(false);
    const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [clearAssignmentsDialogOpen, setClearAssignmentsDialogOpen] = useState(false);

    // Effect to handle runs prop changes
    useEffect(() => {
        // If selectedRun exists but is not in the current runs array, clear it
        if (selectedRun && runs && Array.isArray(runs)) {
            const stillExists = runs.find(r => r.id === selectedRun.id);
            if (!stillExists) {
                setSelectedRun(null);
                setEditRun([]);
            } else {
                // Update selectedRun and editRun with latest data
                const updatedRun = runs.find(r => r.id === selectedRun.id);
                setSelectedRun(updatedRun);
                setEditRun(updatedRun);
            }
        }
    }, [runs, selectedRun]);


    if (status !== "authenticated") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Please log in to access </h1>
                <p className="text-lg">You need to be logged in to view this page.</p>
            </div>
        );
    }


    // Get available months from current run
    const getAvailableMonths = () => {
        if (!editRun?.units) return [];
        const months = [...new Set(editRun.units.map(unit => unit.name))];
        return months.sort();
    };

    // Calculate total hands requested
    const getTotalHandsRequested = () => {
        return Object.values(userHandCounts).reduce((sum, count) => sum + (parseInt(count) || 0), 0);
    };

    // Get total available hands (unassigned only)
    const getTotalAvailableHands = () => {
        return editRun?.units?.filter(unit => !unit.assignedTo).length || 0;
    };

    // Get total assigned hands
    const getTotalAssignedHands = () => {
        return editRun?.units?.filter(unit => unit.assignedTo).length || 0;
    };

    // Check if there are any assignments
    const hasAssignments = () => {
        return editRun?.units?.some(unit => unit.assignedTo) || false;
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

            // Clean up hand counts and preferences for deselected users
            if (!newSelection.includes(userId)) {
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

    // Auto-assign algorithm
    const processAutoAssignment = () => {
        const availableUnits = [...editRun.units.filter(unit => !unit.assignedTo)];
        const assignments = [];
        const conflicts = [];
        const resolutions = [];

        // Helper function to shuffle array randomly
        const shuffleArray = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Group units by month for easier access
        const unitsByMonth = availableUnits.reduce((acc, unit) => {
            if (!acc[unit.name]) acc[unit.name] = [];
            acc[unit.name].push(unit);
            return acc;
        }, {});

        // Create assignment pools for each user and randomize everything
        const userAssignmentPools = shuffleArray(selectedUsers).map(userId => ({
            userId,
            requestedHands: userHandCounts[userId] || 0,
            preferredMonths: shuffleArray(userPreferences[userId] || []),
            assignedUnits: [],
            conflictedAssignments: []
        }));

        // Phase 1: Process preferences in random order
        console.log("Phase 1: Processing preferences randomly...");

        // Create a flat list of all preference requests and shuffle them
        const allPreferenceRequests = [];
        userAssignmentPools.forEach(userPool => {
            userPool.preferredMonths.forEach(month => {
                // Add multiple requests for this month based on how many hands they want
                const handsForThisMonth = Math.min(
                    userPool.requestedHands,
                    Math.ceil(userPool.requestedHands / Math.max(userPool.preferredMonths.length, 1))
                );
                for (let i = 0; i < handsForThisMonth; i++) {
                    allPreferenceRequests.push({
                        userId: userPool.userId,
                        month: month,
                        userPool: userPool
                    });
                }
            });
        });

        // Shuffle all preference requests to handle them randomly
        const shuffledPreferences = shuffleArray(allPreferenceRequests);

        // Process each preference request
        shuffledPreferences.forEach(request => {
            const { userId, month, userPool } = request;

            // Check if user still needs more hands
            if (userPool.assignedUnits.length >= userPool.requestedHands) {
                return;
            }

            const availableInMonth = unitsByMonth[month]?.filter(unit =>
                availableUnits.includes(unit) && !unit.assignedTo
            ) || [];

            if (availableInMonth.length > 0) {
                // Randomly select a unit from available units in this month
                const randomIndex = Math.floor(Math.random() * availableInMonth.length);
                const unit = availableInMonth[randomIndex];

                // Assign the unit
                unit.assignedTo = userId;
                userPool.assignedUnits.push(unit);

                // Remove from available units
                const availableIndex = availableUnits.indexOf(unit);
                if (availableIndex > -1) {
                    availableUnits.splice(availableIndex, 1);
                }

                // Remove from month's available units
                const monthIndex = unitsByMonth[month].indexOf(unit);
                if (monthIndex > -1) {
                    unitsByMonth[month].splice(monthIndex, 1);
                }

                assignments.push({
                    userId: userId,
                    unit: unit,
                    reason: 'Preferred month (random)'
                });

                console.log(`Assigned ${month} Hand ${unit.hand} to user ${userId} (preference)`);
            } else {
                // Mark as conflict - preferred month has no available units
                const conflict = {
                    userId: userId,
                    month: month,
                    reason: 'Preferred month unavailable'
                };

                conflicts.push(conflict);
                userPool.conflictedAssignments.push(conflict);

                console.log(`Conflict: User ${userId} wanted ${month} but no units available`);
            }
        });

        // Phase 2: Handle remaining assignments (both conflicts and additional hands needed)
        console.log("Phase 2: Handling conflicts and remaining assignments...");

        // Collect all users who still need hands (including conflicted assignments)
        const remainingAssignments = [];
        userAssignmentPools.forEach(userPool => {
            const stillNeeded = userPool.requestedHands - userPool.assignedUnits.length;
            for (let i = 0; i < stillNeeded; i++) {
                remainingAssignments.push({
                    userId: userPool.userId,
                    userPool: userPool,
                    isConflictResolution: userPool.conflictedAssignments.length > 0
                });
            }
        });

        // Shuffle remaining assignments to handle randomly
        const shuffledRemainingAssignments = shuffleArray(remainingAssignments);

        // Randomly assign remaining units
        shuffledRemainingAssignments.forEach(assignment => {
            const { userId, userPool, isConflictResolution } = assignment;

            if (availableUnits.length > 0 && userPool.assignedUnits.length < userPool.requestedHands) {
                // Randomly select any available unit
                const randomIndex = Math.floor(Math.random() * availableUnits.length);
                const unit = availableUnits.splice(randomIndex, 1)[0];

                unit.assignedTo = userId;
                userPool.assignedUnits.push(unit);

                const reason = isConflictResolution ? 'Conflict resolution (random)' : 'Random assignment';
                assignments.push({
                    userId: userId,
                    unit: unit,
                    reason: reason
                });

                console.log(`Assigned ${unit.name} Hand ${unit.hand} to user ${userId} (${reason.toLowerCase()})`);

                // Add to resolutions if this was a conflict resolution
                if (isConflictResolution) {
                    resolutions.push({
                        month: unit.name,
                        resolution: `Randomly assigned to ${users?.find(u => u.id === userId)?.firstname || 'Unknown'} (conflict resolution)`
                    });
                }
            }
        });

        // Update the edit run with new assignments and mark auto-assigned units
        const updatedUnits = editRun.units.map(unit => {
            const assignment = assignments.find(a =>
                a.unit.name === unit.name && a.unit.hand === unit.hand
            );
            return assignment ? {
                ...unit,
                assignedTo: assignment.userId,
                autoAssigned: true,
                autoAssignReason: assignment.reason
            } : unit;
        });

        // Store the auto-assign report in the run object
        const autoAssignReport = {
            timestamp: new Date().toISOString(),
            assignments: assignments.map(a => ({
                userName: users?.find(u => u.id === a.userId)?.firstname || 'Unknown',
                month: a.unit.name,
                hand: a.unit.hand,
                reason: a.reason
            })),
            conflicts: conflicts.map(c => ({
                userName: users?.find(u => u.id === c.userId)?.firstname || 'Unknown',
                month: c.month,
                reason: c.reason
            })),
            resolutions,
            summary: {
                totalAssigned: assignments.length,
                totalConflicts: conflicts.length,
                usersProcessed: selectedUsers.length,
                conflictsResolved: resolutions.length
            }
        };

        const updatedEditRun = {
            ...editRun,
            units: updatedUnits,
            autoAssignReports: [...(editRun.autoAssignReports || []), autoAssignReport]
        };

        setEditRun(updatedEditRun);

        // Prepare result summary
        const result = {
            assignments: assignments.map(a => ({
                userName: users?.find(u => u.id === a.userId)?.firstname || 'Unknown',
                month: a.unit.name,
                hand: a.unit.hand,
                reason: a.reason
            })),
            conflicts: conflicts.map(c => ({
                userName: users?.find(u => u.id === c.userId)?.firstname || 'Unknown',
                month: c.month,
                reason: c.reason
            })),
            resolutions,
            summary: {
                totalAssigned: assignments.length,
                totalConflicts: conflicts.length,
                usersProcessed: selectedUsers.length,
                conflictsResolved: resolutions.length
            }
        };

        // console.log("Assignment completed:", result);
        setProcessingResult(result);
        setAutoAssignDialogOpen(false);
        setProcessingResultOpen(true);
    };

    // Reset auto-assign state
    const resetAutoAssignState = () => {
        setSelectedUsers([]);
        setUserHandCounts({});
        setUserPreferences({});
    };

    // Clear all assignments
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
        toast.success("All assignments cleared!");
    };

    return (
        <div className="kasgeld-manage-component flex flex-col items-center w-full py-2">
            <p className="text-xl font-semibold">Beheer Kasgeld </p>
            <div className="flex flex-row w-full justify-between mb-2 items-center border-b-2 border-green-800 py-2">
                <div className="flex items-center gap-2 mt-1">
                    <Select
                        value={selectedRun?.id || ""}
                        onValueChange={runId => {
                            if (!runs || !Array.isArray(runs)) return;
                            const run = runs.find(r => r.id === runId);
                            setSelectedRun(run);
                            setOpenRunDetails(true);
                            setEditRun({ ...run });
                        }}
                    >
                        <SelectTrigger className="w-32 h-7 text-xs text-muted-foreground">
                            <SelectValue placeholder="Run" />
                        </SelectTrigger>
                        <SelectContent>
                            {runs && Array.isArray(runs) ? runs.map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.year}
                                </SelectItem>
                            )) : null}
                        </SelectContent>
                    </Select>
                </div>
                <Sheet open={createRunSheetOpen} onOpenChange={setCreateRunSheetOpen}>
                    <SheetTrigger asChild className=""><Button className="text-xs">Kasgeld toevoegen</Button></SheetTrigger>
                    <SheetContent className="w-full max-w-md">
                        <CreateKasgeldRun onSuccess={(newRun) => {
                            onChangeRuns([...runs, newRun]);
                            setSelectedRun(newRun);
                            setEditRun(newRun);
                            setCreateRunSheetOpen(false);
                        }} />
                    </SheetContent>
                </Sheet>
            </div>
            <Sheet open={openRunDetails} onOpenChange={(open) => {
                setOpenRunDetails(open);
                if (!open) {
                    setSelectedRun(null);
                    setEditRun([]);
                }
            }}>
                <SheetContent className="w-full max-w-2xl px-2 flex flex-col text-sm">
                    <SheetHeader>
                        <SheetTitle>Kasgeld Run Beheer</SheetTitle>
                    </SheetHeader>

                    {selectedRun && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm">Jaar:</Label>
                                    <Input className="text-sm" value={selectedRun.year} readOnly />
                                </div>
                                <div>
                                    <Label className="text-sm">Beschikbare Handen:</Label>
                                    <Input
                                        className="text-sm"
                                        value={editRun.unitsAvailable}
                                        onChange={e => setEditRun({ ...editRun, unitsAvailable: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm">Start:</Label>
                                    <Input
                                        className="text-sm"
                                        type="date"
                                        value={dayjs(editRun.start).format("YYYY-MM-DD")}
                                        onChange={e => setEditRun({ ...editRun, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm">Eind:</Label>
                                    <Input
                                        className="text-sm"
                                        type="date"
                                        value={dayjs(editRun.end).format("YYYY-MM-DD")}
                                        onChange={e => setEditRun({ ...editRun, end: e.target.value })}
                                    />
                                </div>
                            </div>

                            {editRun?.units?.length > 0 && (
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex gap-2">
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
                                    </div>
                                    <p className="font-semibold">Transacties:</p>
                                    <ScrollArea className="flex-1 max-h-100 w-80 mx-auto p-2 border rounded overflow-y-auto">
                                        <div className="space-y-4 pr-4 max-h-[350px]">
                                            {Object.entries(
                                                editRun.units.reduce((groups, unit) => {
                                                    if (!groups[unit.name]) {
                                                        groups[unit.name] = [];
                                                    }
                                                    groups[unit.name].push(unit);
                                                    return groups;
                                                }, {})
                                            ).map(([monthName, monthUnits]) => (
                                                <div key={monthName} className="">
                                                    <p className="font-medium text-sm mb-3">{monthName}</p>
                                                    <div className="space-y-3">
                                                        {monthUnits.map((unit, index) => (
                                                            <div key={unit.name + unit.hand} className="flex text-xs items-center gap-3">
                                                                <span className="min-w-[80px] font-medium flex items-center gap-1">
                                                                    Hand {unit.hand}:
                                                                    {unit.autoAssigned && (
                                                                        <span className="text-blue-600 text-xs" title={`Auto-assigned: ${unit.autoAssignReason}`}>
                                                                            🤖
                                                                        </span>
                                                                    )}
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
                                                                        <SelectItem value="unassigned">Not assigned</SelectItem>
                                                                        {users?.map(user => (
                                                                            <SelectItem key={user.id} value={user.id}>
                                                                                {user.firstname}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        ))}
                                                        <Separator className="my-2" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="flex justify-between items-center gap-4 pt-4 border-t">
                                <Button
                                    onClick={async () => {
                                        const res = await fetch(`/api/runs`, {
                                            method: "PUT",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify(editRun),
                                        });
                                        if (res.ok) {
                                            toast.success("Run updated successfully!");
                                            onChangeRuns(runs.map(u => u.id === selectedRun.id ? { ...u, ...editRun } : u));
                                            setOpenRunDetails(false);
                                            setSelectedRun(null);
                                            setEditRun([]);
                                        } else {
                                            toast.error("Failed to update run.");
                                        }
                                    }}
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={async () => {
                                        const res = await fetch(`/api/runs?id=${selectedRun.id}`, {
                                            method: "DELETE",
                                        });
                                        if (res.ok) {
                                            toast.success("Run deleted successfully!");
                                            onChangeRuns(runs.filter(u => u.id !== selectedRun.id));
                                            setOpenRunDetails(false);
                                            setSelectedRun(null);
                                            setEditRun([]);
                                        } else {
                                            toast.error("Failed to delete run.");
                                        }
                                    }}
                                >
                                    Delete Run
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Auto Assign Dialog */}
            <Dialog open={autoAssignDialogOpen} onOpenChange={setAutoAssignDialogOpen}>
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
                                                    <span className="font-medium">{user.firstname}</span>
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
                                onClick={() => setAutoAssignDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={processAutoAssignment}
                                disabled={!isAssignmentValid()}
                            >
                                Process Assignment
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Processing Result Dialog */}
            <Dialog open={processingResultOpen} onOpenChange={setProcessingResultOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Assignment Results</DialogTitle>
                        <DialogDescription>
                            Overview of the auto-assignment process and any conflicts resolved.
                        </DialogDescription>
                    </DialogHeader>

                    {processingResult && (
                        <ScrollArea className="max-h-[500px]">
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                                        <div className="font-semibold text-green-800">{processingResult.summary.totalAssigned}</div>
                                        <div className="text-green-600">Units Assigned</div>
                                    </div>
                                    <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                                        <div className="font-semibold text-blue-800">{processingResult.summary.usersProcessed}</div>
                                        <div className="text-blue-600">Users Processed</div>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
                                        <div className="font-semibold text-orange-800">{processingResult.summary.totalConflicts}</div>
                                        <div className="text-orange-600">Conflicts Resolved</div>
                                    </div>
                                </div>

                                {/* Assignments */}
                                <div>
                                    <h4 className="font-semibold mb-2">Assignments Made:</h4>
                                    <div className="space-y-1">
                                        {processingResult.assignments.map((assignment, index) => (
                                            <div key={index} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                                                <span>{assignment.userName} → {assignment.month} Hand {assignment.hand}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {assignment.reason}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conflicts */}
                                {processingResult.conflicts.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-orange-800">Conflicts Detected:</h4>
                                        <div className="space-y-2">
                                            {processingResult.conflicts.map((conflict, index) => (
                                                <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                                                    <strong>{conflict.userName}</strong> wanted {conflict.month} but no units were available
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resolutions */}
                                {processingResult.resolutions.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-blue-800">Conflict Resolutions:</h4>
                                        <div className="space-y-2">
                                            {processingResult.resolutions.map((resolution, index) => (
                                                <div key={index} className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
                                                    <strong>{resolution.month}:</strong> {resolution.resolution}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={() => setProcessingResultOpen(false)}
                                        className="w-full"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

            {/* View Stored Report Dialog */}
            <Dialog open={viewReportDialogOpen} onOpenChange={setViewReportDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Auto-Assignment Report</DialogTitle>
                        <DialogDescription>
                            {selectedReport && (
                                <span>Generated on {new Date(selectedReport.timestamp).toLocaleString()}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <ScrollArea className="max-h-[500px]">
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                                        <div className="font-semibold text-green-800">{selectedReport.summary.totalAssigned}</div>
                                        <div className="text-green-600">Units Assigned</div>
                                    </div>
                                    <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                                        <div className="font-semibold text-blue-800">{selectedReport.summary.usersProcessed}</div>
                                        <div className="text-blue-600">Users Processed</div>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
                                        <div className="font-semibold text-orange-800">{selectedReport.summary.totalConflicts}</div>
                                        <div className="text-orange-600">Conflicts Detected</div>
                                    </div>
                                </div>

                                {/* Assignments */}
                                <div>
                                    <h4 className="font-semibold mb-2">Assignments Made:</h4>
                                    <div className="space-y-1">
                                        {selectedReport.assignments.map((assignment, index) => (
                                            <div key={index} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                                                <span>{assignment.userName} → {assignment.month} Hand {assignment.hand}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {assignment.reason}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conflicts */}
                                {selectedReport.conflicts.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-orange-800">Conflicts Detected:</h4>
                                        <div className="space-y-2">
                                            {selectedReport.conflicts.map((conflict, index) => (
                                                <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                                                    <strong>{conflict.userName}</strong> wanted {conflict.month} but no units were available
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resolutions */}
                                {selectedReport.resolutions.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-blue-800">Conflict Resolutions:</h4>
                                        <div className="space-y-2">
                                            {selectedReport.resolutions.map((resolution, index) => (
                                                <div key={index} className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
                                                    <strong>{resolution.month}:</strong> {resolution.resolution}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={() => setViewReportDialogOpen(false)}
                                        className="w-full"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

            {/* Clear Assignments Confirmation Dialog */}
            <Dialog open={clearAssignmentsDialogOpen} onOpenChange={setClearAssignmentsDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Clear All Assignments
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to clear all user assignments? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                            <strong>This will:</strong>
                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                <li>Remove all user assignments from units</li>
                                <li>Clear auto-assignment markers</li>
                                <li>Keep the auto-assignment reports for reference</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setClearAssignmentsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={clearAllAssignments}
                            >
                                Clear All Assignments
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
// W3lc0M3@28052025