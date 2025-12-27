// --- MOCK SERVICE LOGIC ---
const calculateOccupancy = (availableRanges) => {
    const WORK_START_HOUR = 10;
    const WORK_END_HOUR = 17;
    const TOTAL_MINUTES = (WORK_END_HOUR - WORK_START_HOUR) * 60; // 420 min

    if (availableRanges.length === 0) return 100;

    let availableMinutes = 0;

    console.log(`Analyzing window: ${WORK_START_HOUR}:00 - ${WORK_END_HOUR}:00 (${TOTAL_MINUTES} min)`);

    availableRanges.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);

        // Create window boundaries for THIS specific day based on the range's date
        // Note: This logic assumes all ranges are on the same day or we handle each range relative to its own day.
        // For multi-day arrays (month view), this actually works correctly per slot.
        const windowStart = new Date(rangeStart);
        windowStart.setHours(WORK_START_HOUR, 0, 0, 0);

        const windowEnd = new Date(rangeStart);
        windowEnd.setHours(WORK_END_HOUR, 0, 0, 0);

        // Calculate overlap
        const overlapStart = Math.max(rangeStart.getTime(), windowStart.getTime());
        const overlapEnd = Math.min(rangeEnd.getTime(), windowEnd.getTime());

        if (overlapEnd > overlapStart) {
            const diffMs = overlapEnd - overlapStart;
            const diffMins = Math.floor(diffMs / 60000);
            const rStartStr = rangeStart.toLocaleTimeString();
            const rEndStr = rangeEnd.toLocaleTimeString();
            console.log(`Slot ${rStartStr} - ${rEndStr} adds ${diffMins} min`);
            availableMinutes += diffMins;
        } else {
            const rStartStr = rangeStart.toLocaleTimeString();
            const rEndStr = rangeEnd.toLocaleTimeString();
            console.log(`Slot ${rStartStr} - ${rEndStr} is completely outside window.`);
        }
    });

    if (availableMinutes > TOTAL_MINUTES) availableMinutes = TOTAL_MINUTES;

    const busyMinutes = TOTAL_MINUTES - availableMinutes;
    const occupancy = Math.round((busyMinutes / TOTAL_MINUTES) * 100);

    console.log(`\nTotal Available in Window: ${availableMinutes}`);
    console.log(`Total Busy: ${busyMinutes}`);
    console.log(`Occupancy: ${occupancy}%`);
};

// Mock data reflecting what we saw earlier for Dec 30
// "Merged Ranges" from previous debug output:
// - 10:00 to 11:30 (90 min)
// - 13:00 to 14:00 (60 min)
// - 16:30 to 19:00 (Overlap with window 16:30-17:00 = 30 min)
const ranges = [
    { start: "2025-12-30T10:00:00.000+01:00", end: "2025-12-30T11:30:00.000+01:00" },
    { start: "2025-12-30T13:00:00.000+01:00", end: "2025-12-30T14:00:00.000+01:00" },
    { start: "2025-12-30T16:30:00.000+01:00", end: "2025-12-30T19:00:00.000+01:00" },
];

calculateOccupancy(ranges);
