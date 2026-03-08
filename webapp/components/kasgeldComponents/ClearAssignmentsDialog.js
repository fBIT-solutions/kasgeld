"use client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

export default function ClearAssignmentsDialog({
    open,
    onOpenChange,
    onClear
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onClear();
                                onOpenChange(false);
                            }}
                        >
                            Clear All Assignments
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
