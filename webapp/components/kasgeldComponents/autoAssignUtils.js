/**
 * Auto-assign utility functions for kasgeld management
 */

/**
 * Shuffle array randomly
 */
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Process auto-assignment for units
 * @param {Object} run - The run object with units
 * @param {Object} params - Parameters for assignment
 * @param {Array} params.selectedUsers - Selected user IDs
 * @param {Object} params.userHandCounts - Hand counts per user
 * @param {Object} params.userPreferences - Month preferences per user
 * @param {Array} params.users - All user objects for lookup
 * @returns {Object} Assignment result with assignments, conflicts, resolutions, and summary
 */
export function processAutoAssignment(run, params, users) {
    const { selectedUsers, userHandCounts, userPreferences } = params;
    
    const availableUnits = [...run.units.filter(unit => !unit.assignedTo)];
    const assignments = [];
    const conflicts = [];
    const resolutions = [];

    // Group units by month
    const unitsByMonth = availableUnits.reduce((acc, unit) => {
        if (!acc[unit.name]) acc[unit.name] = [];
        acc[unit.name].push(unit);
        return acc;
    }, {});

    // Create assignment pools
    const userAssignmentPools = shuffleArray(selectedUsers).map(userId => ({
        userId,
        requestedHands: userHandCounts[userId] || 0,
        preferredMonths: shuffleArray(userPreferences[userId] || []),
        assignedUnits: [],
        conflictedAssignments: []
    }));

    // Phase 1: Process preferences in random order
    console.log("Phase 1: Processing preferences randomly...");

    const allPreferenceRequests = [];
    userAssignmentPools.forEach(userPool => {
        userPool.preferredMonths.forEach(month => {
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

    const shuffledPreferences = shuffleArray(allPreferenceRequests);

    shuffledPreferences.forEach(request => {
        const { userId, month, userPool } = request;

        if (userPool.assignedUnits.length >= userPool.requestedHands) {
            return;
        }

        const availableInMonth = unitsByMonth[month]?.filter(unit =>
            availableUnits.includes(unit) && !unit.assignedTo
        ) || [];

        if (availableInMonth.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableInMonth.length);
            const unit = availableInMonth[randomIndex];

            unit.assignedTo = userId;
            userPool.assignedUnits.push(unit);

            const availableIndex = availableUnits.indexOf(unit);
            if (availableIndex > -1) {
                availableUnits.splice(availableIndex, 1);
            }

            const monthIndex = unitsByMonth[month].indexOf(unit);
            if (monthIndex > -1) {
                unitsByMonth[month].splice(monthIndex, 1);
            }

            assignments.push({
                userId: userId,
                unit: unit,
                reason: 'Preferred month (random)',
                usedPreferences: true
            });

            console.log(`Assigned ${month} Hand ${unit.hand} to user ${userId} (preference)`);
        } else {
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

    // Phase 2: Handle remaining assignments
    console.log("Phase 2: Handling conflicts and remaining assignments...");

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

    const shuffledRemainingAssignments = shuffleArray(remainingAssignments);

    shuffledRemainingAssignments.forEach(assignment => {
        const { userId, userPool, isConflictResolution } = assignment;

        if (availableUnits.length > 0 && userPool.assignedUnits.length < userPool.requestedHands) {
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

            if (isConflictResolution) {
                resolutions.push({
                    month: unit.name,
                    resolution: `Randomly assigned to ${users?.find(u => u.id === userId)?.firstname || 'Unknown'} (conflict resolution)`
                });
            }
        }
    });

    // Return result
    return {
        assignments: assignments.map(a => ({
            userId: a.userId,
            userName: users?.find(u => u.id === a.userId)?.firstname || 'Unknown',
            month: a.unit.name,
            hand: a.unit.hand,
            reason: a.reason,
            usedPreferences: a.usedPreferences || false
        })),
        conflicts: conflicts.map(c => ({
            userId: c.userId,
            userName: users?.find(u => u.id === c.userId)?.firstname || 'Unknown',
            month: c.month,
            reason: c.reason
        })),
        resolutions,
        updatedUnits: run.units.map(unit => {
            const assignment = assignments.find(a =>
                a.unit.name === unit.name && a.unit.hand === unit.hand
            );
            return assignment ? {
                ...unit,
                assignedTo: assignment.userId,
                autoAssigned: true,
                autoAssignReason: assignment.reason
            } : unit;
        }),
        summary: {
            totalAssigned: assignments.length,
            totalConflicts: conflicts.length,
            usersProcessed: selectedUsers.length,
            conflictsResolved: resolutions.length
        }
    };
}

/**
 * Clear all assignments from units
 * @param {Array} units - Array of units
 * @returns {Array} Units with cleared assignments
 */
export function clearAllAssignments(units) {
    return units.map(unit => ({
        ...unit,
        assignedTo: null,
        autoAssigned: undefined,
        autoAssignReason: undefined
    }));
}

/**
 * Create auto-assign report for storage
 * @param {Object} result - Result from processAutoAssignment
 * @returns {Object} Report object for storage
 */
export function createAutoAssignReport(result) {
    return {
        timestamp: new Date().toISOString(),
        assignments: result.assignments,
        conflicts: result.conflicts,
        resolutions: result.resolutions,
        summary: result.summary
    };
}
