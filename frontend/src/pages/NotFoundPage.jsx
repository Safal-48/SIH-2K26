import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4 shadow-xl">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">404 - Page Not Found</h1>
      <p className="mt-2 text-slate-300 max-w-md text-sm">
        The platform view or sovereign route you requested does not exist or has been relocated.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs sm:text-sm hover:bg-teal-500 transition shadow-lg shadow-teal-900/40"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Platform Overview</span>
      </Link>
    </div>
  );
}
