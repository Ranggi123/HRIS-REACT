import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardCheck, Home, Calendar, Wallet } from 'lucide-react';

export default function BottomNav({ attendanceBadge = false, leaveBadgeCount = 0 }) {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    {
      label: 'Directory',
      to: '/directory',
      icon: Users,
    },
    {
      label: 'Attend...',
      to: '/attendance',
      icon: ClipboardCheck,
      badge: attendanceBadge ? '!' : null,
      isAlertBadge: true,
    },
    {
      label: 'Dashboard',
      to: '/',
      icon: Home,
    },
    {
      label: 'Leave',
      to: '/leave',
      icon: Calendar,
      badge: leaveBadgeCount > 0 ? leaveBadgeCount : null,
      isAlertBadge: false,
    },
    {
      label: 'Payslip',
      to: '/account',
      icon: Wallet,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full bg-white border-t border-gray-200 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] z-40 transition-transform max-w-[480px]">
      <div className="w-full grid grid-cols-5 items-center px-1 pb-3 pt-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center p-1 transition-all duration-200 ${
                isActive ? 'relative -top-3' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <div className="relative">
                {isActive ? (
                  <div className="bg-blue-600 rounded-full p-3 shadow-lg text-white mb-0.5 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95">
                    <Icon size={22} />
                  </div>
                ) : (
                  <div className="p-1 mb-0.5 transition-colors">
                    <Icon size={22} />
                  </div>
                )}

                {/* Badge Notifikasi */}
                {item.badge && (
                  <span
                    className={`absolute ${
                      isActive ? '-top-1 -right-1' : '-top-1.5 -right-2'
                    } bg-red-500 text-white rounded-full border border-white shadow-xs animate-pulse ${
                      item.isAlertBadge
                        ? 'text-[10px] font-black px-1.5 py-0.2'
                        : 'text-[9px] font-bold px-1.5 py-0.2'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`leading-tight truncate max-w-full text-center ${
                  isActive
                    ? 'text-[11px] font-bold text-blue-600'
                    : 'text-[10px]'
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