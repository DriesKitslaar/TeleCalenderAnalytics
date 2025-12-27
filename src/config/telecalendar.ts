export const TELECALENDAR_CONFIG = {
    API_BASE_URL: "https://api.telecalendar.com/api",
    API_TOKEN: import.meta.env.VITE_TELECALENDAR_API_TOKEN || "",
};

export interface Schedule {
    days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
    startHour: number;
    endHour: number;
    slotDuration: number; // Duration in minutes
}

export interface SalesRep {
    id: string;
    name: string;
    eventTypeId: string;
    tag?: string;
    schedule?: Schedule; // User-configured schedule
}

export const DEFAULT_SCHEDULE: Schedule = {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    startHour: 10,
    endHour: 17,
    slotDuration: 30
};

export const SALES_REPS: SalesRep[] = [
    {
        id: "1",
        name: "Jens Urbain",
        eventTypeId: "3833131", // Real ID from tools/test_id.mjs
        tag: "Home4You",
        schedule: DEFAULT_SCHEDULE
    },
    // Add more sales reps here...
];
