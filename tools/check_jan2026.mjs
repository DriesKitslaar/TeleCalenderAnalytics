import https from 'https';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_TELECALENDAR_API_TOKEN=(.+)/);
const token = match ? match[1].trim() : null;

if (!token) process.exit(1);

const TEST_ID = "3833131";
// Target: January 2026
const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2026-01-31T23:59:59Z");

console.log(`Checking availability for: ${start.toISOString()} to ${end.toISOString()}`);

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
            console.log(`Status Code: ${res.statusCode}`);
            const json = JSON.parse(data);
            const rawData = json.data || json;

            let slots = [];
            if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                slots = Object.values(rawData).flat();
            } else if (Array.isArray(rawData)) {
                slots = rawData;
            }

            console.log(`\nFound ${slots.length} available slots for Jan 2026.`);

            if (slots.length > 0) {
                console.log("First 3 slots:");
                console.log(slots.slice(0, 3));
            } else {
                console.log("Raw response dump if empty:");
                console.log(JSON.stringify(json, null, 2).slice(0, 500));
            }

        } catch (e) { console.error(e); }
    });
}).end();
