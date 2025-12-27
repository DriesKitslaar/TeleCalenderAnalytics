import https from 'https';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_TELECALENDAR_API_TOKEN=(.+)/);
const token = match ? match[1].trim() : null;

if (!token) process.exit(1);

const TEST_ID = "3833131";
// Target date: Dec 30, 2025
const start = new Date("2025-12-30T00:00:00Z");
const end = new Date("2025-12-30T23:59:59Z");

console.log(`Checking availability for: ${start.toISOString().split('T')[0]}`);

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

            let slots = [];
            if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                slots = Object.values(rawData).flat();
            } else if (Array.isArray(rawData)) {
                slots = rawData;
            }

            console.log(`\nFound ${slots.length} available slots.`);
            console.log("Times:");
            slots.forEach(s => {
                const time = new Date(s.start).toLocaleTimeString('nl-BE', { timeZone: 'Europe/Brussels' });
                console.log(` - ${time} (Start: ${s.start})`);
            });

            // Check specifically for 12:30
            const has1230 = slots.some(s => {
                const d = new Date(s.start);
                // Check if time is 12:30 Brussels time
                // Need to be careful with timezone parsing in node
                // Simpler: check if string contains T12:30 (approx) or convert
                const h = d.getUTCHours(); // API returns UTC usually? "2025-12-30T10:00:00+01:00"
                // Actually the API returns ISO with offset usually.
                return s.start.includes("T12:30") || (d.getHours() === 12 && d.getMinutes() === 30);
            });

        } catch (e) { console.error(e); }
    });
}).end();
