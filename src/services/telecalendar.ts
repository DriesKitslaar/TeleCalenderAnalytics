import { TELECALENDAR_CONFIG } from "../config/telecalendar";

export interface TimeRange {
    start: string;
    end: string;
}

export const TeleCalendarService = {
    /**
     * Fetch available time slots for a specific event type (linked to a sales rep).
     * Uses format=range to get consolidated availability.
     */
    fetchTimeSlots: async (
        eventTypeId: string,
        start: string,
        end: string,
        duration: number = 30 // Default slot duration in minutes
    ): Promise<TimeRange[]> => {
        if (!TELECALENDAR_CONFIG.API_TOKEN) {
            console.warn("TeleCalendar API Token is missing.");
            return [];
        }

        const url = new URL(`${TELECALENDAR_CONFIG.API_BASE_URL}/time-slots`);
        url.searchParams.append("eventTypeId", eventTypeId);
        url.searchParams.append("start", start);
        url.searchParams.append("end", end);
        url.searchParams.append("duration", duration.toString());
        url.searchParams.append("format", "range");
        url.searchParams.append("timeZone", "Europe/Brussels");

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${TELECALENDAR_CONFIG.API_TOKEN}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            });

            if (!response.ok) {
                console.error(`TeleCalendar API Error ${response.status}: ${response.statusText}`);
                const text = await response.text();
                console.error("Response body:", text);
                throw new Error(`TeleCalendar API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const rawData = data.data || data;

            let results: any[] = [];

            // Handle if response is an Object grouped by Date keys
            if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                results = Object.values(rawData).flat();
            } else if (Array.isArray(rawData)) {
                results = rawData;
            }

            // Normalize results to ensure start AND end exist
            return results.map((slot: any) => {
                const startTime = new Date(slot.start).getTime();
                let endTime = slot.end ? new Date(slot.end).getTime() : NaN;

                // Fallback if end time is missing or invalid
                if (isNaN(endTime)) {
                    endTime = startTime + (duration * 60000);
                }

                return {
                    start: slot.start,
                    end: new Date(endTime).toISOString()
                };
            });
        } catch (error) {
            console.error("Failed to fetch time slots:", error);
            return [];
        }
    },

    /**
     * Calculate 'fullness' or occupancy based on DURATION.
     * Logic: 
     * 1. Sum up total minutes of AVAILABLE time returned by API.
     * 2. Define Total Possible Work Minutes (e.g., 8 hours = 480 mins).
     * 3. Occupancy = (Total Possible - Available) / Total Possible.
     */
    /**
     * Calculate 'fullness' or occupancy strictly between 10:00 and 17:00.
     * Logic: 
     * 1. Merge overlapping intervals FIRST.
     * 2. Only then sum the duration of these merged ranges within the 10:00-17:00 window.
     */
    calculateOccupancy: (
        availableRanges: TimeRange[],
        schedule: { days: number[], startHour: number, endHour: number },
        totalPeriodMinutes?: number // Optional override for month/weeks view
    ): { occupancy: number, availableMinutes: number } => {
        const { days, startHour, endHour } = schedule;

        // Calculate daily minutes based on CONFIG
        const dailyMinutes = (endHour - startHour) * 60;

        // If totalPeriodMinutes is NOT provided (e.g. Day View), we assume it's one day capacity
        const totalPossibleMinutes = totalPeriodMinutes !== undefined ? totalPeriodMinutes : dailyMinutes;

        if (availableRanges.length === 0) return { occupancy: 100, availableMinutes: 0 };

        // 1. Sort
        const sortedRanges = [...availableRanges].sort((a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        // 2. Merge overlaps
        const merged: TimeRange[] = [];
        let current = sortedRanges[0];

        for (let i = 1; i < sortedRanges.length; i++) {
            const next = sortedRanges[i];
            const currentEnd = new Date(current.end).getTime();
            const nextStart = new Date(next.start).getTime();
            const nextEnd = new Date(next.end).getTime();

            if (nextStart < currentEnd) {
                if (nextEnd > currentEnd) {
                    current = { ...current, end: next.end };
                }
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);

        // 3. Sum overlap with window for EACH range
        let availableMinutes = 0;

        merged.forEach(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);

            // Construct the window for the specific day of this range
            const windowStart = new Date(rangeStart);
            windowStart.setHours(startHour, 0, 0, 0);

            // Skip days NOT in the schedule
            const dayOfWeek = windowStart.getDay();
            if (!days.includes(dayOfWeek)) return;

            const windowEnd = new Date(rangeStart);
            windowEnd.setHours(endHour, 0, 0, 0);

            const overlapStart = Math.max(rangeStart.getTime(), windowStart.getTime());
            const overlapEnd = Math.min(rangeEnd.getTime(), windowEnd.getTime());

            if (overlapEnd > overlapStart) {
                const diffMs = overlapEnd - overlapStart;
                availableMinutes += Math.floor(diffMs / 60000);
            }
        });

        // Clamp available minutes to the total possible
        if (availableMinutes > totalPossibleMinutes) availableMinutes = totalPossibleMinutes;

        const busyMinutes = totalPossibleMinutes - availableMinutes;
        // Avoid division by zero
        if (totalPossibleMinutes === 0) return { occupancy: 0, availableMinutes: 0 };

        const occupancy = Math.round((busyMinutes / totalPossibleMinutes) * 100);

        return {
            occupancy: Math.max(0, Math.min(100, occupancy)),
            availableMinutes
        };
    },
};
