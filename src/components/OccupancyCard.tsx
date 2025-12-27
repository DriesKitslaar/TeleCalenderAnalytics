import React from 'react';
import type { SalesRep } from '../config/telecalendar';

interface OccupancyCardProps {
    salesRep: SalesRep;
    occupancy: number; // 0 to 100
    availableSlots?: number; // Estimated number of 30 min slots
    loading?: boolean;
    onClick: () => void;
    onSettings: () => void;
}

export const OccupancyCard: React.FC<OccupancyCardProps> = ({ salesRep, occupancy, availableSlots, loading, onClick, onSettings }) => {
    const getColorClass = (occ: number) => {
        if (occ > 85) return 'bg-red-500 shadow-red-200';
        if (occ > 60) return 'bg-amber-500 shadow-amber-200';
        return 'bg-emerald-500 shadow-emerald-200';
    };

    const statusText = occupancy > 85 ? 'Heavy Load' : occupancy > 60 ? 'Moderate' : 'Available';

    return (
        <div
            onClick={onClick}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 overflow-hidden cursor-pointer active:scale-95"
        >
            {/* Background Decorative Blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:bg-slate-100 transition-colors"></div>

            {/* Settings Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onSettings(); }}
                className="absolute top-4 right-4 z-20 p-2 text-slate-300 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
                title="Configure Schedule"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

            <div className="relative z-10 flex flex-col items-center">
                {/* Avatar Circle */}
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-600 shadow-inner mb-4 border border-white">
                    {salesRep.name.charAt(0)}
                </div>

                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{salesRep.name}</h3>
                {salesRep.tag && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1 mt-1">
                        {salesRep.tag}
                    </span>
                )}
                <p className="text-sm font-medium text-slate-400 mb-6">{loading ? 'Syncing...' : statusText}</p>

                <div className="w-full">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Occupancy</span>
                        <span className="text-2xl font-bold text-slate-700">{loading ? '--' : occupancy}<span className="text-sm text-slate-400 font-normal">%</span></span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner relative">
                        {loading ? (
                            <div className="bg-slate-300 h-full rounded-full animate-pulse w-full"></div>
                        ) : (
                            <div
                                className={`h-full rounded-full ${getColorClass(occupancy)} shadow-lg transition-all duration-1000 ease-out`}
                                style={{ width: `${occupancy}%` }}
                            ></div>
                        )}
                    </div>

                    {/* Available Slots Indicator */}
                    {availableSlots !== undefined && (
                        <div className="mt-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {availableSlots} vrije slots (30m)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
