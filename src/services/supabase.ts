import { createClient } from '@supabase/supabase-js';
import type { SalesRep, Schedule } from '../config/telecalendar';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Anon Key missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseService = {
    /**
     * Fetch all sales reps and their configuration from the DB.
     * Maps DB snake_case to app camelCase.
     */
    async getSalesReps(): Promise<SalesRep[]> {
        const { data, error } = await supabase
            .from('sales_reps')
            .select('*');

        if (error) {
            console.error('Error fetching sales reps:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            name: row.name,
            eventTypeId: row.event_type_id,
            tag: row.tag,
            schedule: row.schedule // Assumes JSON matches Schedule interface
        }));
    },

    /**
     * Update a sales rep's schedule.
     */
    async updateSchedule(id: string, schedule: Schedule): Promise<boolean> {
        const { error } = await supabase
            .from('sales_reps')
            .update({ schedule: schedule })
            .eq('id', id);

        if (error) {
            console.error('Error updating schedule:', error);
            return false;
        }
        return true;
    }
};
