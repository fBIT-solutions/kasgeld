"use client";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AssignmentDraftsPanel({ runId, users, isAdmin, refreshTrigger }) {
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Load drafts on mount, when runId changes, or when refreshTrigger changes
    useEffect(() => {
        if (runId) {
            loadDrafts();
        }
    }, [runId, refreshTrigger]);

    const loadDrafts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/unit-assignments?runId=${encodeURIComponent(runId)}`);
            if (!response.ok) throw new Error("Fout bij laden van toewijzingen");
            const data = await response.json();
            setDrafts(data || []);
        } catch (error) {
            console.error("Error loading drafts:", error);
            toast.error("Fout bij het laden van toewijzingen");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (assignmentId) => {
        if (!confirm("Weet je zeker dat je deze toewijzing wilt verwijderen?")) return;

        try {
            const response = await fetch(`/api/unit-assignments?id=${encodeURIComponent(assignmentId)}`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error("Fout bij verwijderen");
            setDrafts(prev => prev.filter(d => d.id !== assignmentId));
            toast.success("Toewijzing verwijderd");
        } catch (error) {
            console.error("Error deleting draft:", error);
            toast.error("Fout bij het verwijderen");
        }
    };

    const handleActivate = async (assignmentId) => {
        try {
            const response = await fetch(`/api/unit-assignments?id=${encodeURIComponent(assignmentId)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "active" })
            });
            if (!response.ok) throw new Error("Fout bij activeren");
            const updated = await response.json();
            setDrafts(prev => prev.map(d => d.id === assignmentId ? updated : d));
            toast.success("Toewijzing geactiveerd!");
        } catch (error) {
            console.error("Error activating draft:", error);
            toast.error("Fout bij het activeren");
        }
    };

    const getUsername = (userId) => {
        const user = users?.find(u => u.id === userId);
        if (!user) return userId;
        return isAdmin
            ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayname
            : user.firstname;
    };

    const getDraftStats = (draft) => {
        return {
            count: draft.assignments?.length || 0,
            totalHands: draft.assignments?.reduce((sum, a) => sum + (a.handCount || 0), 0) || 0
        };
    };

    if (!drafts || drafts.length === 0) {
        return null;
    }

    return (
        <>
            <div className="space-y-3">
                <h3 className="font-semibold text-sm">Opgeslagen toewijzingsconcepten</h3>
                <div className="space-y-2">
                    {drafts.map(draft => {
                        const stats = getDraftStats(draft);
                        const createdDate = new Date(draft.createdAt).toLocaleDateString('nl-NL');
                        const isActive = draft.status === "active";

                        return (
                            <div
                                key={draft.id}
                                className={`p-3 border rounded-lg ${isActive ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {isActive ? (
                                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                            )}
                                            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                                {isActive ? "Actief" : "Concept"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{createdDate}</span>
                                        </div>
                                        <div className="text-sm mt-2">
                                            <span className="font-medium">{stats.count}</span> deelnemer(s) -
                                            <span className="font-medium"> {stats.totalHands}</span> handen
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedDraft(draft);
                                                setShowDetails(true);
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {!isActive && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleActivate(draft.id)}
                                                    className="text-green-600 hover:text-green-700"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(draft.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Toewijzingsdetails</DialogTitle>
                        <DialogDescription>
                            {selectedDraft?.status === "active" ? "Actieve toewijzing" : "Concept toewijzing"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {selectedDraft?.assignments?.map((assignment, index) => (
                            <div key={index} className="border rounded p-3 space-y-2">
                                <div className="font-medium text-sm">
                                    {getUsername(assignment.userId)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <div>Handen: <span className="font-semibold">{assignment.handCount}</span></div>
                                    {assignment.preferredMonths?.length > 0 && (
                                        <div className="mt-1">
                                            Voorkeursmaanden:
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {assignment.preferredMonths.map(month => (
                                                    <Badge key={month} variant="outline" className="text-xs">
                                                        {month}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
