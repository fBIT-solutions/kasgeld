"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Eye, Zap } from "lucide-react";

export default function UnitsManagement({
    run,
    users,
    isAdmin,
    hasAutoAssignReports,
    onViewReport,
    onAutoAssign,
    onClearAssignments,
    onUnitAssignmentChange,
    hasAssignments
}) {
    const getTotalAvailableHands = () => {
        return run?.units?.filter(unit => !unit.assignedTo).length || 0;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-3">
                <div className="flex gap-2 flex-wrap">
                    {hasAutoAssignReports && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onViewReport}
                            className="text-xs"
                        >
                            <Eye className="h-3 w-3 mr-1" />
                            View Reports
                        </Button>
                    )}
                    {hasAssignments && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onClearAssignments}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            Clear All
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onAutoAssign}
                        className="text-xs"
                        disabled={getTotalAvailableHands() === 0}
                    >
                        <Zap className="h-3 w-3 mr-1" />
                        {hasAssignments ? "Auto Assign (open)" : "Auto Assign"}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 max-h-100 w-full p-2 border rounded overflow-y-auto">
                <div className="space-y-4 pr-4 max-h-[350px]">
                    {Object.entries(
                        run?.units?.reduce((groups, unit) => {
                            if (!groups[unit.name]) {
                                groups[unit.name] = [];
                            }
                            groups[unit.name].push(unit);
                            return groups;
                        }, {}) || {}
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
                                                onUnitAssignmentChange(
                                                    unit.name,
                                                    unit.hand,
                                                    userId === "unassigned" ? null : userId
                                                );
                                            }}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Not assigned</SelectItem>
                                                {users?.map(user => {
                                                    const displayName = isAdmin 
                                                        ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.displayname
                                                        : user.firstname;
                                                    return (
                                                        <SelectItem key={user.id} value={user.id}>
                                                            {displayName}
                                                        </SelectItem>
                                                    );
                                                })}
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
    );
}
