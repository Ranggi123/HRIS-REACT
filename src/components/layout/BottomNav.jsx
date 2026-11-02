import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardCheck, Home, Calendar, Wallet } from 'lucide-react';

export default function BottomNav({ attendanceBadge = false, leaveBadgeCount = 0 }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="md:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full bg-white border-t border-gray-200 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] z-40 transition-transform max-w-[480px]">
      <div className="w-full grid grid-cols-5 items-center px-1 pb-3 pt-1.5">
        
        {/* 1. Directory */}
        <Link 
          to="/directory" 
          className={`flex flex-col items-center justify-center p-1 transition-colors ${path === '/directory' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
        >
          <Users size={22} className="mb-0.5" />
          <span className="text-[10px] leading-tight">Directory</span>
        </Link>

        {/* 2. Attendance (with warning badge '!') */}
        <Link 
          to="/attendance" 
          className={`relative flex flex-col items-center justify-center p-1 transition-colors ${path === '/attendance' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
        >
          <div className="relative">
            <ClipboardCheck size={22} className="mb-0.5" />
            {attendanceBadge && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-xs animate-pulse">
                !
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight truncate max-w-full">Attend...</span>
        </Link>

        {/* 3. Dashboard */}
        <Link 
          to="/" 
          className="flex flex-col items-center justify-center p-1 relative -top-3"
        >
          <div className="bg-blue-600 rounded-full p-3 shadow-lg text-white mb-0.5 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95">
            <Home size={22} />
          </div>
          <span className="text-[11px] font-bold text-blue-600 text-center leading-tight">Dashboard</span>
        </Link>

        {/* 4. Leave (with blinking number badge) */}
        <Link 
          to="/leave" 
          className={`relative flex flex-col items-center justify-center p-1 transition-colors ${path === '/leave' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
        >
          <div className="relative">
            <Calendar size={22} className="mb-0.5" />
            {leaveBadgeCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white shadow-xs animate-pulse">
                {leaveBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Leave</span>
        </Link>

        {/* 5. Payslip */}
        <Link 
          to="/account" 
          className={`flex flex-col items-center justify-center p-1 transition-colors ${path === '/account' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
        >
          <Wallet size={22} className="mb-0.5" />
          <span className="text-[10px] leading-tight">Payslip</span>
        </Link>

      </div>
    </div>
  );
}
