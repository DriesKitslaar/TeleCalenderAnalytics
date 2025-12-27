import https from 'https';
import fs from 'fs';
import path from 'path';

// --- COPIED SERVICE LOGIC ---
const calculateOccupancy = (availableRanges, totalPeriodMinutes) => {
    const WORK_START_HOUR = 10;
    const WORK_END_HOUR = 17;
    // const DAILY_MINUTES = (WORK_END_HOUR - WORK_START_HOUR) * 60; 
    const TOTAL_POSSIBLE_MINUTES = totalPeriodMinutes || 1; // avoid divide by zero

    if (availableRanges.length === 0) return 100;

    // 1. Sort
    const sortedRanges = [...availableRanges].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // 2. Merge overlaps
    const merged = [];
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

    console.log(`Merged into ${merged.length} continuous blocks.`);

    // 3. Sum overlap with window for EACH range
    let availableMinutes = 0;

    merged.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);

        const windowStart = new Date(rangeStart);
        windowStart.setHours(WORK_START_HOUR, 0, 0, 0);

        const windowEnd = new Date(rangeStart);
        windowEnd.setHours(WORK_END_HOUR, 0, 0, 0);

        const overlapStart = Math.max(rangeStart.getTime(), windowStart.getTime());
        const overlapEnd = Math.min(rangeEnd.getTime(), windowEnd.getTime());

        if (overlapEnd > overlapStart) {
            const diffMs = overlapEnd - overlapStart;
            availableMinutes += Math.floor(diffMs / 60000);
        }
    });

    console.log(`Total Available Minutes in Window: ${availableMinutes}`);
    console.log(`Total Possible Minutes: ${TOTAL_POSSIBLE_MINUTES}`);

    if (availableMinutes > TOTAL_POSSIBLE_MINUTES) availableMinutes = TOTAL_POSSIBLE_MINUTES;

    const busyMinutes = TOTAL_POSSIBLE_MINUTES - availableMinutes;
    const occupancy = Math.round((busyMinutes / TOTAL_POSSIBLE_MINUTES) * 100);

    console.log(`Occupancy: ${occupancy}%`);
};
// ----------------------------

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_TELECALENDAR_API_TOKEN=(.+)/);
const token = match ? match[1].trim() : null;

if (!token) process.exit(1);

const TEST_ID = "3833131";
const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2026-01-31T23:59:59Z");

const options = {
    hostname: 'api.telecalendar.com',
    path: `/api/time-slots?eventTypeId=${TEST_ID}&start=${start.toISOString()}&end=${end.toISOString()}&format=range&timeZone=Europe/Brussels&duration=30`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
};

https.request(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const rawData = json.data || json;
            let results = Array.isArray(rawData) ? rawData : (rawData ? Object.values(rawData).flat() : []);

            console.log(`Raw slots found: ${results.length}`);

            // Prepare ranges as component does
            const duration = 30;
            const availableRanges = results.map((slot) => {
                const startTime = new Date(slot.start).getTime();
                let endTime = slot.end ? new Date(slot.end).getTime() : NaN;
                if (isNaN(endTime)) {
                    endTime = startTime + (duration * 60000);
                }
                return {
                    start: slot.start,
                    end: new Date(endTime).toISOString()
                };
            });

            // Calculate manual logic for Jan 2026 working days = 22 * 420 = 9240
            const workingDaysMock = 22;
            const totalMins = workingDaysMock * 420;

            calculateOccupancy(availableRanges, totalMins);

        } catch (e) { console.error(e); }
    });
}).end();
