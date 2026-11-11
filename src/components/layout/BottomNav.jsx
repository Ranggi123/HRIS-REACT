import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardCheck, Home, Calendar, Wallet } from 'lucide-react';

export default function BottomNav({ attendanceBadge = false, leaveBadgeCount = 0, currentLang = 'en' }) {
  const location = useLocation();
  const path = location.pathname;

  const t = currentLang === 'id' ? {
    directory: 'Direktori',
    attendance: 'Absen...',
    dashboard: 'Dasbor',
    leave: 'Cuti',
    payslip: 'Slip Gaji'
  } : {
    directory: 'Directory',
    attendance: 'Attend...',
    dashboard: 'Dashboard',
    leave: 'Leave',
    payslip: 'Payslip'
  };

  const navItems = [
    {
      label: t.directory,
      to: '/directory',
      icon: Users,
    },
    {
      label: t.attendance,
      to: '/attendance',
      icon: ClipboardCheck,
      badge: attendanceBadge ? '!' : null,
      isAlertBadge: true,
    },
    {
      label: t.dashboard,
      to: '/',
      icon: Home,
    },
    {
      label: t.leave,
      to: '/leave',
      icon: Calendar,
      badge: leaveBadgeCount > 0 ? leaveBadgeCount : null,
      isAlertBadge: false,
    },
    {
      label: t.payslip,
      to: '/account',
      icon: Wallet,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-5 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_15px_35px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,1)] rounded-[2rem] z-40 overflow-visible">
      <div className="w-full grid grid-cols-5 items-center px-2 h-[68px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              <div
                className={`absolute transition-all duration-300 ease-out z-10 flex items-center justify-center ${
                  isActive
                    ? '-top-6 w-14 h-14 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.4),inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-blue-300 text-white'
                    : 'top-2 text-gray-500 hover:text-blue-600 w-10 h-10'
                }`}
              >
                <Icon size={isActive ? 24 : 22} />

                {item.badge && (
                  <span
                    className={`absolute -top-1 -right-1 bg-red-500 text-white rounded-full border-[1.5px] border-white shadow-md animate-pulse flex items-center justify-center ${
                      item.isAlertBadge
                        ? 'min-w-[16px] h-4 px-1 text-[10px] font-black'
                        : 'min-w-[16px] h-4 px-1 text-[9px] font-bold'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`absolute bottom-1.5 leading-tight truncate w-full text-center transition-all duration-300 ${
                  isActive
                    ? 'text-[11px] font-extrabold text-blue-600'
                    : 'text-[10px] text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
