import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ibquzueymlwobmixypsb.supabase.co';
const SUPABASE_KEY = 'sb_secret_l4k-w7_uHq8N2ueNjgqwuw_UlIGt83w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SALES_REPS = [
    {
        id: "1",
        name: "Jens Urbain",
        event_type_id: "3833131",
        tag: "Home4You",
        schedule: {
            days: [1, 2, 3, 4, 5],
            startHour: 10,
            endHour: 17,
            slotDuration: 30
        }
    }
];

async function seed() {
    console.log("Attempting to seed Supabase...");

    const { data, error } = await supabase
        .from('sales_reps')
        .upsert(SALES_REPS)
        .select();

    if (error) {
        console.error("Error inserting data:", error);
        if (error.code === '42P01') {
            console.error("\nCRITICAL: The table 'sales_reps' does not exist.");
            console.error("You MUST run the SQL creation script in the Supabase Dashboard SQL Editor first!");
        }
    } else {
        console.log("Success! Data inserted:", data);
    }
}

seed();
