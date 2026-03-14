"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ViewReportDialog({
    open,
    onOpenChange,
    selectedReport
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                    onClick={() => onOpenChange(false)}
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
    );
}
