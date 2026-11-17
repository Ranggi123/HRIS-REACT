import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardCheck, Home, Calendar, CheckCircle2 } from 'lucide-react';

export default function BottomNav({
  currentUser = null,
  attendanceBadge = false,
  leaveBadgeCount = 0,
  approvalCount = 0,
  currentLang = 'en',
}) {
  const location = useLocation();
  const path = location.pathname;

  const getPropCaseInsensitiveBottomNav = (obj, candidateNames, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateNames) {
      const normalizedCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedCand);
      if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
        return String(obj[found]).trim();
      }
    }
    return fallback;
  };

  const checkDeptHead = (user) => {
    if (!user) return false;
    const keys = Object.keys(user);
    const foundKey = keys.find((k) =>
      ['departmenthead', 'isdepartmenthead'].includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    if (foundKey) {
      const val = user[foundKey];
      return ['true', '1', 't', 'yes', 'y'].includes(String(val).trim().toLowerCase());
    }
    return false;
  };

  const checkHrManagerActive = (user) => {
    if (!user) return false;
    const dept = getPropCaseInsensitiveBottomNav(user, ['Department', 'department', 'dept'], '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const jobLevel = getPropCaseInsensitiveBottomNav(user, ['Job Level', 'job_level', 'joblevel', 'level'], '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const status = getPropCaseInsensitiveBottomNav(user, ['Status', 'status', 'Account Status', 'account_status'], '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return (dept === 'human resources' || dept === 'human resource') && jobLevel === 'manager' && status === 'active';
  };

  const canShowApproval = checkDeptHead(currentUser) || checkHrManagerActive(currentUser);

  const t =
    currentLang === 'id'
      ? {
          directory: 'Direktori',
          attendance: 'Absen...',
          dashboard: 'Dasbor',
          leave: 'Cuti',
          approval: 'Persetujuan',
        }
      : {
          directory: 'Directory',
          attendance: 'Attend...',
          dashboard: 'Dashboard',
          leave: 'Leave',
          approval: 'Approval',
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
    ...(canShowApproval
      ? [
          {
            label: t.approval,
            to: '/Approval',
            icon: CheckCircle2,
            badge: approvalCount > 0 ? approvalCount : null,
            isAlertBadge: false,
            isApprovalBadge: true,
          },
        ]
      : []),
  ];

  return (
    <div className="md:hidden fixed bottom-5 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_15px_35px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,1)] rounded-[2rem] z-40 overflow-visible">
      <div
        className={`w-full grid ${
          navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        } items-center px-2 h-[68px]`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = path.toLowerCase() === item.to.toLowerCase();

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
                    className={`absolute flex items-center justify-center bg-red-500 text-white rounded-full ${
                      item.isApprovalBadge
                        ? '-top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center border-2 border-white shadow-sm animate-bounce'
                        : item.isAlertBadge
                        ? '-top-1 -right-1 border-[1.5px] border-white shadow-md animate-pulse min-w-[16px] h-4 px-1 text-[10px] font-black'
                        : '-top-1 -right-1 border-[1.5px] border-white shadow-md animate-pulse min-w-[16px] h-4 px-1 text-[9px] font-bold'
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