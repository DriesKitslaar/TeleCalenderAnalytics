import React, { useState } from 'react';
import type { Schedule, SalesRep } from '../config/telecalendar';

interface AgentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    salesRep: SalesRep;
    schedule: Schedule;
    onSave: (salesRepId: string, newSchedule: Schedule) => void;
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
    isOpen,
    onClose,
    salesRep,
    schedule: initialSchedule,
    onSave
}) => {
    const [days, setDays] = useState<number[]>(initialSchedule.days);
    const [startHour, setStartHour] = useState<number>(initialSchedule.startHour);
    const [endHour, setEndHour] = useState<number>(initialSchedule.endHour);
    const [slotDuration, setSlotDuration] = useState<number>(initialSchedule.slotDuration || 30);

    if (!isOpen) return null;

    const toggleDay = (day: number) => {
        if (days.includes(day)) {
            setDays(days.filter(d => d !== day));
        } else {
            setDays([...days, day]);
        }
    };

    const handleSave = () => {
        onSave(salesRep.id, { days, startHour, endHour, slotDuration });
        onClose();
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-6 flex flex-col items-center text-white shrink-0">
                    <h2 className="text-xl font-bold">Schedule Settings</h2>
                    <p className="text-indigo-100 text-sm mt-1">Configure {salesRep.name}</p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Working Hours */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Working Hours</label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-slate-500 mb-1 block">Start (24h)</label>
                                <input
                                    type="number"
                                    min="0" max="23"
                                    value={startHour}
                                    onChange={e => setStartHour(parseInt(e.target.value))}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <span className="text-slate-400 font-bold">-</span>
                            <div className="flex-1">
                                <label className="text-xs text-slate-500 mb-1 block">End (24h)</label>
                                <input
                                    type="number"
                                    min="1" max="24"
                                    value={endHour}
                                    onChange={e => setEndHour(parseInt(e.target.value))}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Slot Duration */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Slot Duration</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="5" max="240" step="5"
                                value={slotDuration}
                                onChange={e => setSlotDuration(parseInt(e.target.value))}
                                className="w-24 border border-slate-300 rounded-lg p-2 text-center font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-slate-500 font-medium">Minutes</span>
                        </div>
                    </div>

                    {/* Working Days */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Working Days</label>
                        <div className="grid grid-cols-4 gap-2">
                            {dayNames.map((name, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => toggleDay(idx)}
                                    className={`
                                        py-2 rounded-lg text-sm font-semibold transition-all
                                        ${days.includes(idx)
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                                    `}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                        <strong>Preview:</strong> Occupancy will be calculated based on {days.length} days/week, {endHour - startHour} hours/day with {slotDuration} min slots.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:text-slate-700">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
                    >
                        Save Settings
                    </button>
                </div>

            </div>
        </div>
    );
};
