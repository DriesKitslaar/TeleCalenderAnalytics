import https from 'https';
import fs from 'fs';
import path from 'path';

// --- MOCK SERVICE LOGIC ---
const calculateOccupancy = (availableRanges, totalPossibleMinutes = 480) => {
    if (availableRanges.length === 0) {
        console.log("No ranges available. Returning 100% busy.");
        return 100;
    }

    // 1. Sort ranges by start time
    const sortedRanges = [...availableRanges].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // 2. Merge overlapping intervals
    const merged = [];
    let current = sortedRanges[0];

    for (let i = 1; i < sortedRanges.length; i++) {
        const next = sortedRanges[i];
        const currentEnd = new Date(current.end).getTime();
        const nextStart = new Date(next.start).getTime();
        const nextEnd = new Date(next.end).getTime();

        if (nextStart < currentEnd) {
            // Overlap: merge by extending the current end if needed
            if (nextEnd > currentEnd) {
                current = { ...current, end: next.end };
            }
        } else {
            // No overlap: push current and start new
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);

    console.log("Merged Ranges:");
    merged.forEach(r => console.log(` - ${r.start} to ${r.end}`));

    // 3. Sum duration of merged ranges
    let availableMinutes = 0;
    let minStart = new Date(merged[0].start).getTime();
    let maxEnd = new Date(merged[merged.length - 1].end).getTime();

    merged.forEach(range => {
        const start = new Date(range.start);
        const end = new Date(range.end);
        const diffMs = end.getTime() - start.getTime();
        availableMinutes += Math.floor(diffMs / 60000);
    });

    console.log(`\nTotal Available Minutes: ${availableMinutes}`);
    console.log(`Configured Total Possible: ${totalPossibleMinutes}`);

    // Dynamic range calculation
    const actualSpanMinutes = (maxEnd - minStart) / 60000;
    console.log(`Actual Date Span (First Start to Last End): ${actualSpanMinutes} minutes`);

    // 4. Calculate Occupancy
    if (availableMinutes >= totalPossibleMinutes) {
        console.log("Available >= Total Possible -> Clamping to 0%");
        return 0;
    }

    const busyMinutes = totalPossibleMinutes - availableMinutes;
    const occupancy = Math.round((busyMinutes / totalPossibleMinutes) * 100);

    console.log(`Busy Minutes: ${busyMinutes}`);
    console.log(`Calculated Occupancy: ${occupancy}%`);
    return Math.max(0, Math.min(100, occupancy));
};

// --- FETCH LOGIC ---
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_TELECALENDAR_API_TOKEN=(.+)/);
const token = match ? match[1].trim() : null;

if (!token) process.exit(1);

const TEST_ID = "3833131";
const start = new Date("2025-12-30T00:00:00Z");
const end = new Date("2025-12-30T23:59:59Z");
const duration = 30;

const options = {
    hostname: 'api.telecalendar.com',
    path: `/api/time-slots?eventTypeId=${TEST_ID}&start=${start.toISOString()}&end=${end.toISOString()}&format=range&timeZone=Europe/Brussels&duration=${duration}`,
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
            let results = [];
            if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                results = Object.values(rawData).flat();
            } else if (Array.isArray(rawData)) {
                results = rawData;
            }

            // Normalization (as in service)
            const availableRanges = results.map((slot) => {
                const startTime = new Date(slot.start).getTime();
                let endTime = slot.end ? new Date(slot.end).getTime() : NaN;
                if (isNaN(endTime)) endTime = startTime + (duration * 60000);
                return {
                    start: slot.start,
                    end: new Date(endTime).toISOString()
                };
            });

            calculateOccupancy(availableRanges, 480);

        } catch (e) { console.error(e); }
    });
}).end();
