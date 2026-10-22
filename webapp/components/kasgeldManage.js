"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CreateKasgeldRun from "@/components/createKasgeldRun";
import PaymentTracker from "@/components/PaymentTracker";
import AutoAssignDialog from "@/components/kasgeldComponents/AutoAssignDialog";
import ProcessingResultDialog from "@/components/kasgeldComponents/ProcessingResultDialog";
import ViewReportDialog from "@/components/kasgeldComponents/ViewReportDialog";
import ClearAssignmentsDialog from "@/components/kasgeldComponents/ClearAssignmentsDialog";
import UnitsManagement from "@/components/kasgeldComponents/UnitsManagement";
import { processAutoAssignment, clearAllAssignments, createAutoAssignReport } from "@/components/kasgeldComponents/autoAssignUtils";
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
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import dayjs from "dayjs";
import { useCommunity } from "@/context/CommunityContext";

export default function KasgeldManage({ users, runs, onChangeUsers, onChangeRuns }) {
    const { data: session, status } = useSession();
    const { activeCommunity } = useCommunity();
    const isAdmin = activeCommunity?.isOwner;
    const [selectedRunId, setSelectedRunId] = useState(null);
    const selectedRun = runs?.find(run => run.id === selectedRunId) || null;
    const [openRunDetails, setOpenRunDetails] = useState(false);
    const [editRunState, setEditRunState] = useState({ baseRun: null, draft: null });
    const editRun = editRunState.baseRun === selectedRun
        ? editRunState.draft ?? selectedRun ?? []
        : selectedRun ?? [];
    const setEditRun = (nextEditRun) => {
        const draft = typeof nextEditRun === "function" ? nextEditRun(editRun) : nextEditRun;
        setEditRunState({ baseRun: selectedRun, draft });
    };
    const [createRunSheetOpen, setCreateRunSheetOpen] = useState(false);

    // Dialog states
    const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
    const [processingResultOpen, setProcessingResultOpen] = useState(false);
    const [processingResult, setProcessingResult] = useState(null);
    const [viewReportDialogOpen, setViewReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [clearAssignmentsDialogOpen, setClearAssignmentsDialogOpen] = useState(false);

    if (status !== "authenticated") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Please log in to access </h1>
                <p className="text-lg">You need to be logged in to view this page.</p>
            </div>
        );
    }

    // Handler for auto-assign processing
    const handleProcessAutoAssignment = (params) => {
        const result = processAutoAssignment(editRun, params, users);
        const report = createAutoAssignReport(result);
        
        const updatedRun = {
            ...editRun,
            units: result.updatedUnits,
            autoAssignReports: [...(editRun.autoAssignReports || []), report]
        };
        
        setEditRun(updatedRun);
        setProcessingResult(result);
        setProcessingResultOpen(true);
    };

    // Handler for clearing assignments
    const handleClearAssignments = () => {
        const clearedUnits = clearAllAssignments(editRun.units);
        const updatedRun = {
            ...editRun,
            units: clearedUnits
        };
        setEditRun(updatedRun);
        toast.success("All assignments cleared!");
    };

    // Handler for viewing reports
    const handleViewReport = () => {
        if (editRun?.autoAssignReports?.length > 0) {
            setSelectedReport(editRun.autoAssignReports[editRun.autoAssignReports.length - 1]);
            setViewReportDialogOpen(true);
        }
    };

    // Check if there are any assignments
    const hasAssignments = () => {
        return editRun?.units?.some(unit => unit.assignedTo) || false;
    };

    // Handle unit assignment change
    const handleUnitAssignmentChange = (monthName, hand, userId) => {
        const updatedUnits = editRun.units.map(u =>
            u.name === monthName && u.hand === hand
                ? { ...u, assignedTo: userId }
                : u
        );
        setEditRun({ ...editRun, units: updatedUnits });
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
                            setSelectedRunId(run.id);
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
                        <CreateKasgeldRun onSuccess={async (newRun) => {
                            const res = await fetch("/api/runs");
                            if (res.ok) {
                                const freshRuns = await res.json();
                                onChangeRuns(freshRuns);
                                const createdRun = freshRuns.find(r => r.id === newRun.id);
                                if (createdRun) {
                                    setSelectedRunId(createdRun.id);
                                    setEditRun(createdRun);
                                }
                            }
                            setCreateRunSheetOpen(false);
                        }} />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Run Details Sheet */}
            <Sheet open={openRunDetails} onOpenChange={(open) => {
                setOpenRunDetails(open);
                if (!open) {
                    setSelectedRunId(null);
                    setEditRun([]);
                }
            }}>
                <SheetContent className="w-full max-w-2xl px-2 flex flex-col text-sm">
                    <SheetHeader>
                        <SheetTitle>Kasgeld Run Beheer</SheetTitle>
                    </SheetHeader>

                    {selectedRun && (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="flex flex-col gap-4 pr-4">
                                <Accordion type="single" collapsible defaultValue="basisinformatie" className="w-full">
                                    {/* Basisinformatie Section */}
                                    <AccordionItem value="basisinformatie">
                                        <AccordionTrigger className="text-sm font-semibold">
                                            Basisinformatie
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4">
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
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Betalingen Beheren Section */}
                                    <AccordionItem value="betalingen">
                                        <AccordionTrigger className="text-sm font-semibold">
                                            Betalingen Beheren
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4">
                                            <PaymentTracker run={editRun} users={users} />
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Transacties Section */}
                                    {editRun?.units?.length > 0 && (
                                        <AccordionItem value="transacties">
                                            <AccordionTrigger className="text-sm font-semibold">
                                                Transacties ({editRun.units.length})
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-4">
                                                <UnitsManagement
                                                    run={editRun}
                                                    users={users}
                                                    isAdmin={isAdmin}
                                                    hasAutoAssignReports={editRun?.autoAssignReports?.length > 0}
                                                    onViewReport={handleViewReport}
                                                    onAutoAssign={() => setAutoAssignDialogOpen(true)}
                                                    onClearAssignments={() => setClearAssignmentsDialogOpen(true)}
                                                    onUnitAssignmentChange={handleUnitAssignmentChange}
                                                    hasAssignments={hasAssignments()}
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    )}
                                </Accordion>

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
                                                setSelectedRunId(null);
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
                                                setSelectedRunId(null);
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
                        </ScrollArea>
                    )}
                </SheetContent>
            </Sheet>

            {/* Auto Assign Dialog */}
            <AutoAssignDialog
                open={autoAssignDialogOpen}
                onOpenChange={setAutoAssignDialogOpen}
                run={editRun}
                users={users}
                isAdmin={isAdmin}
                onProcessAutoAssignment={handleProcessAutoAssignment}
            />

            {/* Processing Result Dialog */}
            <ProcessingResultDialog
                open={processingResultOpen}
                onOpenChange={setProcessingResultOpen}
                processingResult={processingResult}
            />

            {/* View Report Dialog */}
            <ViewReportDialog
                open={viewReportDialogOpen}
                onOpenChange={setViewReportDialogOpen}
                selectedReport={selectedReport}
            />

            {/* Clear Assignments Dialog */}
            <ClearAssignmentsDialog
                open={clearAssignmentsDialogOpen}
                onOpenChange={setClearAssignmentsDialogOpen}
                onClear={handleClearAssignments}
            />
        </div>
    );
}
// W3lc0M3@28052025
