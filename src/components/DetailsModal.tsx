import React from 'react';

interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">

                    {/* Header */}
                    <div className="bg-slate-50 px-4 py-3 sm:px-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold leading-6 text-slate-900" id="modal-title">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
