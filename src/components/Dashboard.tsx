import React, { useEffect, useState } from 'react';
import { OccupancyCard } from './OccupancyCard';
import { DetailsModal } from './DetailsModal';
import { AgentSettingsModal } from './AgentSettingsModal';
import { TeamManagementModal } from './TeamManagementModal';
import { SALES_REPS, DEFAULT_SCHEDULE } from '../config/telecalendar';
import type { SalesRep, Schedule } from '../config/telecalendar';
import { TeleCalendarService } from '../services/telecalendar';
import type { TimeRange } from '../services/telecalendar';
import { SupabaseService } from '../services/supabase';

interface AgentData {
    id: string;
    occupancy: number;
    ranges: TimeRange[];
}

export const Dashboard: React.FC = () => {
    // UI State
    const [viewMode, setViewMode] = useState<'day' | 'month' | 'weeks'>('day');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [weeks, setWeeks] = useState<number>(4);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    // Data State
    const [salesReps, setSalesReps] = useState<SalesRep[]>(SALES_REPS);
    const [agentData, setAgentData] = useState<Record<string, AgentData & { availableSlots?: number }>>({});
    const [loading, setLoading] = useState<boolean>(true);

    // Modal State
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [settingsAgentId, setSettingsAgentId] = useState<string | null>(null);

    const loadReps = async () => {
        const reps = await SupabaseService.getSalesReps();
        if (reps.length > 0) {
            setSalesReps(reps);
        } else {
            console.warn("No reps found in DB, or connection failed. Using defaults.");
        }
    };

    // Load Reps from DB
    useEffect(() => {
        loadReps();
    }, []);

    // Derived stats
    const totalReps = salesReps.length;
    const avgOccupancy = Object.values(agentData).length
        ? Math.round(Object.values(agentData).reduce((a, b) => a + b.occupancy, 0) / Object.values(agentData).length)
        : 0;

    // Helper to count working days based on specific agent schedule
    const countWorkingDays = (start: Date, end: Date, days: number[]) => {
        let count = 0;
        let cur = new Date(start);
        while (cur <= end) {
            if (days.includes(cur.getDay())) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Base Date Range
            let start: Date, end: Date;

            if (viewMode === 'day') {
                start = new Date(date);
                start.setUTCHours(0, 0, 0, 0);
                end = new Date(date);
                end.setUTCHours(23, 59, 59, 999);
            } else if (viewMode === 'month') {
                const [y, m] = month.split('-').map(Number);
                start = new Date(Date.UTC(y, m - 1, 1));
                end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
            } else {
                // Weeks
                start = new Date();
                start.setUTCHours(0, 0, 0, 0);
                end = new Date();
                end.setDate(end.getDate() + (weeks * 7));
                end.setUTCHours(23, 59, 59, 999);
            }

            const promises = salesReps.map(async (rep) => {
                const schedule = rep.schedule || DEFAULT_SCHEDULE;

                // Calculate Total Minutes Capacity for this specific Rep based on their schedule
                let totalMinutes = 0;

                if (viewMode === 'day') {
                    // Start/End hour difference * 60
                    totalMinutes = (schedule.endHour - schedule.startHour) * 60;
                } else {
                    const workingDays = countWorkingDays(start, end, schedule.days);
                    const dailyMinutes = (schedule.endHour - schedule.startHour) * 60;
                    totalMinutes = workingDays * dailyMinutes;
                }

                let availableRanges: TimeRange[] = [];

                if (rep.eventTypeId && rep.eventTypeId !== "REPLACE_WITH_REAL_ID") {
                    try {
                        availableRanges = await TeleCalendarService.fetchTimeSlots(
                            rep.eventTypeId,
                            start.toISOString(),
                            end.toISOString(),
                            schedule.slotDuration // Use configured duration
                        );
                    } catch (e) {
                        console.error(`Failed to fetch for ${rep.name}`, e);
                        availableRanges = [];
                    }
                }

                // FILTER: Enforce Schedule Constraints (Days & Hours)
                // This ensures we don't display or calculate slots outside the user's defined schedule (e.g. Sundays)
                availableRanges = availableRanges.filter(range => {
                    const slotStart = new Date(range.start);
                    const day = slotStart.getDay(); // 0=Sun, 6=Sat
                    const hour = slotStart.getHours();

                    // 1. Check Day
                    if (!schedule.days.includes(day)) return false;

                    // 2. Check Hour (Simple check: slot must start strictly within window [start, end))
                    // If a slot starts at 16:30 and endHour is 17, it's valid (16 < 17).
                    // If a slot starts at 17:00 and endHour is 17, it's invalid (17 !< 17).
                    if (hour < schedule.startHour || hour >= schedule.endHour) return false;

                    return true;
                });

                // Pass the schedule to calculation
                const stats = TeleCalendarService.calculateOccupancy(
                    availableRanges,
                    schedule,
                    totalMinutes
                );

                // Calculate estimated slots based on configured duration
                const availableSlots = Math.floor(stats.availableMinutes / (schedule.slotDuration || 30));

                return {
                    id: rep.id,
                    occupancy: stats.occupancy,
                    ranges: availableRanges,
                    availableSlots
                };
            });

            const results = await Promise.all(promises);
            const newData: Record<string, AgentData & { availableSlots?: number }> = {};
            results.forEach(r => newData[r.id] = r);

            setAgentData(newData);
            setLoading(false);
        };

        fetchData();
    }, [date, month, weeks, viewMode, salesReps]); // Re-run if salesReps (settings) change

    // Modal helpers
    const closeModal = () => setSelectedAgentId(null);
    const closeSettings = () => setSettingsAgentId(null);

    const selectedAgent = selectedAgentId ? salesReps.find(r => r.id === selectedAgentId) : null;
    const selectedData = selectedAgentId ? agentData[selectedAgentId] : null;

    const settingsAgent = settingsAgentId ? salesReps.find(r => r.id === settingsAgentId) : null;

    const handleSaveSettings = async (id: string, newSchedule: Schedule) => {
        // Optimistic update
        setSalesReps(prev => prev.map(rep =>
            rep.id === id ? { ...rep, schedule: newSchedule } : rep
        ));

        // Persist to DB
        await SupabaseService.updateSchedule(id, newSchedule);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar / Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">TeleCalendar</h1>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Analytics Dashboard</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Admin Button */}
                        <button
                            onClick={() => setIsTeamModalOpen(true)}
                            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Team
                        </button>

                        {/* View Toggle */}
                        <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                            <button
                                onClick={() => setViewMode('day')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Dag
                            </button>
                            <button
                                onClick={() => setViewMode('weeks')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'weeks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Weken
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Maand
                            </button>
                        </div>

                        {/* Date/Month/Week Picker */}
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100">
                            {viewMode === 'day' ? (
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="outline-none text-slate-700 font-medium bg-transparent px-2"
                                />
                            ) : viewMode === 'month' ? (
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="outline-none text-slate-700 font-medium bg-transparent px-2"
                                />
                            ) : (
                                <div className="flex items-center space-x-2 px-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Weken:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={weeks}
                                        onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                                        className="outline-none text-slate-700 font-medium bg-transparent w-12 text-center"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Agents</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-slate-800">{totalReps}</span>
                            <span className="text-sm text-green-500 font-semibold">Active</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Average Load ({viewMode === 'day' ? 'Day' : viewMode === 'month' ? 'Month' : `${weeks} Weeks`})</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-slate-800">{loading ? '--' : avgOccupancy}%</span>
                            <div className={`h-2 w-2 rounded-full ${avgOccupancy > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 shadow-lg text-white">
                        <div className="text-sm font-medium text-indigo-100 uppercase tracking-wider">System Status</div>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-lg font-bold">
                                {loading ? 'Syncing...' : 'Operational'}
                            </span>
                        </div>
                        <p className="text-indigo-200 text-xs mt-2 opacity-80">
                            Mode: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                        </p>
                    </div>
                </div>

                {/* Main Grid */}
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>Sales Representatives</span>
                    <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs rounded-full">{totalReps}</span>
                </h2>
                <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {salesReps.map((rep) => (
                        <OccupancyCard
                            key={rep.id}
                            salesRep={rep}
                            occupancy={agentData[rep.id]?.occupancy || 0}
                            availableSlots={viewMode === 'weeks' ? agentData[rep.id]?.availableSlots : undefined}
                            loading={loading}
                            onClick={() => setSelectedAgentId(rep.id)}
                            onSettings={() => setSettingsAgentId(rep.id)}
                        />
                    ))}
                </main>
            </div>

            {/* Details Modal */}
            <DetailsModal
                isOpen={!!selectedAgentId}
                onClose={closeModal}
                title={selectedAgent ? `Details: ${selectedAgent.name}` : 'Details'}
            >
                {selectedData && selectedAgent && (
                    <div className="space-y-4">
                        {/* Tag in Modal */}
                        {selectedAgent.tag && (
                            <div className="flex justify-center -mt-2 mb-2">
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    {selectedAgent.tag}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
                            <span className="font-semibold text-slate-600">Bezetting</span>
                            <span className={`font-bold text-xl ${selectedData.occupancy > 80 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {selectedData.occupancy}%
                            </span>
                        </div>

                        {viewMode === 'weeks' && selectedData.availableSlots !== undefined && (
                            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                                <span className="font-semibold text-emerald-700">Beschikbare Sloten (Totaal)</span>
                                <span className="font-bold text-xl text-emerald-700">
                                    {selectedData.availableSlots}
                                </span>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold text-slate-800 mb-2">Gevonden Beschikbare Sloten</h4>
                            {selectedData.ranges.length === 0 ? (
                                <div className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded text-center border border-slate-100">
                                    Geen beschikbare tijdsloten gevonden.<br />
                                    (Volledig bezet of niet werkzaam).
                                </div>
                            ) : (
                                <ul className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedData.ranges.map((range, idx) => {
                                        const s = new Date(range.start);
                                        const e = new Date(range.end);
                                        // Show Date if not single day
                                        const showDate = viewMode !== 'day';
                                        return (
                                            <li key={idx} className="flex justify-between text-sm bg-white border border-slate-100 p-2 rounded hover:bg-slate-50 transition">
                                                <span className="font-mono text-slate-600">
                                                    {showDate && <span className="mr-2 font-bold text-slate-800">{s.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>}
                                                    {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {Math.round((e.getTime() - s.getTime()) / 60000)} min
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Explanation for missing slots */}
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 flex items-start gap-2">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>
                                    <strong>Let op:</strong> De lijst toont <u>alleen</u> de beschikbare momenten.<br />
                                    Tijden die hier <u>niet</u> tussen staan (bijv. 12:30), zijn reeds geboekt of niet beschikbaar.
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
                            Data berekend op basis van kantooruren: {selectedAgent.schedule?.startHour || 10}:00 - {selectedAgent.schedule?.endHour || 17}:00 ({(selectedAgent.schedule?.endHour || 17) - (selectedAgent.schedule?.startHour || 10)}u/dag).
                        </div>
                    </div>
                )}
            </DetailsModal>

            {/* Settings Modal */}
            {settingsAgent && (
                <AgentSettingsModal
                    isOpen={!!settingsAgentId}
                    onClose={closeSettings}
                    salesRep={settingsAgent}
                    schedule={settingsAgent.schedule || DEFAULT_SCHEDULE}
                    onSave={handleSaveSettings}
                />
            )}

            <TeamManagementModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                salesReps={salesReps}
                onUpdate={loadReps}
            />
        </div>
    );
};
