import React, { useState } from 'react';
import { SupabaseService } from '../services/supabase';
import { DEFAULT_SCHEDULE } from '../config/telecalendar';
import type { SalesRep } from '../config/telecalendar';

interface TeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    salesReps: SalesRep[];
    onUpdate: () => void; // Trigger refresh of data
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose, salesReps, onUpdate }) => {
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [editingRep, setEditingRep] = useState<SalesRep | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [eventTypeId, setEventTypeId] = useState('');
    const [tag, setTag] = useState('');

    if (!isOpen) return null;

    const resetForm = () => {
        setName('');
        setEventTypeId('');
        setTag('');
    };

    const handleAdd = async () => {
        if (!name || !eventTypeId) return;

        const newRep: SalesRep = {
            id: crypto.randomUUID(), // Standard web crypto API
            name,
            eventTypeId,
            tag: tag || undefined,
            schedule: DEFAULT_SCHEDULE
        };

        const success = await SupabaseService.addSalesRep(newRep);
        if (success) {
            onUpdate();
            setView('list');
            resetForm();
        } else {
            alert('Failed to add sales rep. Check console for details.');
        }
    };

    const handleEditSave = async () => {
        if (!editingRep || !name || !eventTypeId) return;

        const updatedRep: SalesRep = {
            ...editingRep,
            name,
            eventTypeId,
            tag: tag || undefined
        };

        const success = await SupabaseService.updateSalesRepDetails(updatedRep);
        if (success) {
            onUpdate();
            setView('list');
            setEditingRep(null);
            resetForm();
        } else {
            alert('Failed to update sales rep.');
        }
    };

    const handleDelete = async (id: string, repName: string) => {
        if (confirm(`Are you sure you want to delete ${repName}? This cannot be undone.`)) {
            const success = await SupabaseService.deleteSalesRep(id);
            if (success) {
                onUpdate();
            } else {
                alert('Failed to delete sales rep.');
            }
        }
    };

    const startEdit = (rep: SalesRep) => {
        setEditingRep(rep);
        setName(rep.name);
        setEventTypeId(rep.eventTypeId);
        setTag(rep.tag || '');
        setView('edit');
    };

    const startAdd = () => {
        resetForm();
        setView('add');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Team Management</h2>
                        <p className="text-slate-400 text-sm mt-1">Manage sales representatives</p>
                    </div>
                    {view === 'list' && (
                        <button
                            onClick={startAdd}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add New Rep
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {view === 'list' && (
                        <div className="space-y-3">
                            {salesReps.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No sales reps found.</p>
                            ) : (
                                salesReps.map(rep => (
                                    <div key={rep.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                                                {rep.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{rep.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="font-mono bg-slate-200 px-1 rounded">ID: {rep.eventTypeId}</span>
                                                    {rep.tag && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{rep.tag}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(rep)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rep.id, rep.name)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {(view === 'add' || view === 'edit') && (
                        <div className="max-w-md mx-auto space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. John Doe"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">TeleCalendar Event Type ID</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-3 font-mono text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 3833131"
                                    value={eventTypeId}
                                    onChange={e => setEventTypeId(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 mt-1">This ID links to the calendar data.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Tag (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Home4You"
                                    value={tag}
                                    onChange={e => setTag(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    {view === 'list' ? (
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800">Close</button>
                    ) : (
                        <>
                            <button
                                onClick={() => { setView('list'); setEditingRep(null); }}
                                className="px-4 py-2 text-slate-500 font-medium hover:text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={view === 'add' ? handleAdd : handleEditSave}
                                disabled={!name || !eventTypeId}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow transition-colors"
                            >
                                {view === 'add' ? 'Create Rep' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
