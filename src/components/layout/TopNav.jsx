// src/components/layout/TopNav.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// --- Helper Functions ---
const getPropCaseInsensitive = (obj, candidateKeys, fallback = '') => {
  if (!obj) return fallback;
  const keys = Object.keys(obj);
  for (const cand of candidateKeys) {
    const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
    const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
    if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
      return String(obj[found]).trim();
    }
  }
  return fallback;
};

const parseFlexibleDate = (dateVal) => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str || str === '-') return null;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  const mIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mIso) {
    return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10));
  }

  const mSlash = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (mSlash) {
    const n1 = parseInt(mSlash[1], 10);
    const n2 = parseInt(mSlash[2], 10);
    const y = parseInt(mSlash[3], 10);
    return new Date(y, n2 - 1, n1);
  }
  return null;
};

const formatDateDisplay = (dateVal, lang = 'en') => {
  const parsed = parseFlexibleDate(dateVal);
  if (!parsed) return dateVal || '-';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const d = String(parsed.getDate()).padStart(2, '0');
  const m = parsed.toLocaleDateString(locale, { month: 'short' });
  const y = parsed.getFullYear();
  return `${d} ${m} ${y}`;
};

const formatTimeDisplay = (timeVal) => {
  if (!timeVal) return '';
  const parsed = parseFlexibleDate(timeVal);
  if (parsed) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mm = String(parsed.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const str = String(timeVal).trim();
  const m = str.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : str;
};

const isPendingApprovalStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return (
    s === 'pendingapproval' ||
    s === 'pending' ||
    s === 'menunggu' ||
    s === 'menunggupersetujuan' ||
    s === 'diajukan' ||
    s === 'submitted' ||
    s === 'waiting' ||
    s === 'waitingapproval' ||
    s.includes('pending') ||
    s.includes('menunggu')
  );
};

const getRowStatus = (row) => {
  if (!row) return '';
  const explicitApproval = getPropCaseInsensitive(
    row,
    [
      'Approval Status',
      'approval_status',
      'Status Approval',
      'status_approval',
      'Approval',
      'approval',
      'Request Status',
      'request_status'
    ],
    ''
  );
  if (explicitApproval) return explicitApproval;
  return getPropCaseInsensitive(row, ['Status', 'status'], '');
};

const matchesLineManager = (record, targetEmail, targetName = '', extraKeys = []) => {
  if (!record) return false;
  const mgrVal = getPropCaseInsensitive(record, [
    'Line Manager work email',
    'line_manager_work_email',
    'Line Manager Email',
    'line_manager_email',
    'Line Manager',
    'line_manager',
    'Line_Manager',
    'linemanager',
    'manager_email',
    'Manager Email',
    'Manager',
    'manager',
    'Approver Email',
    'approver_email',
    'Approver',
    'approver',
    'Atasan Email',
    'atasan_email',
    'Atasan',
    'atasan',
    'approval_line_manager'
  ], '').trim().toLowerCase();

  if (!mgrVal || mgrVal === '-' || mgrVal === 'null' || mgrVal === 'undefined') {
    return false;
  }

  const allKeys = new Set([
    (targetEmail || '').trim().toLowerCase(),
    (targetName || '').trim().toLowerCase(),
    (targetEmail || '').includes('@') ? (targetEmail || '').split('@')[0].trim().toLowerCase() : '',
    ...extraKeys.map(k => (k || '').trim().toLowerCase())
  ]);

  for (const key of allKeys) {
    if (key && key.length >= 2) {
      if (mgrVal === key) return true;
    }
  }
  return false;
};

export default function TopNav({ 
  currentUser, 
  currentLang = 'en', 
  onLangChange = () => {}, 
  onOpenProfile = () => {},
  approvalCount: externalApprovalCount,
  isSuperAdminMode = false,
  isSuperAdminEligible = false,
  onToggleSuperAdmin = () => {},
  onSwitchAccount = () => {}
}) {
  const navigate = useNavigate();

  // Dropdown States
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [attendanceDropdownOpen, setAttendanceDropdownOpen] = useState(false);
  
  // Header Widget States
  const [timeStr, setTimeStr] = useState('');
  const [locationName, setLocationName] = useState('Kelurahan Benoa, ID');
  const [weatherText, setWeatherText] = useState('⛅ 29°C');

  // Attendance Approval States
  const [pendingAttendanceList, setPendingAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const dropdownRef = useRef(null);
  const attendanceRef = useRef(null);

  // Ambil Data Sesi & User Work Email
  const sessionUser = useMemo(() => {
    if (currentUser && Object.keys(currentUser).length > 0) return currentUser;
    try {
      const saved = localStorage.getItem('hris_session_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return currentUser || null;
  }, [currentUser]);

  const userWorkEmail = useMemo(() => {
    return (
      getPropCaseInsensitive(sessionUser, [
        'Employee work email',
        'employee_work_email',
        'work_email',
        'work email',
        'Work Email',
        'email',
        'Email',
        'user_uid',
        'USER_UID'
      ]) || ''
    ).trim().toLowerCase();
  }, [sessionUser]);

  const userName = sessionUser?.Name || sessionUser?.name || sessionUser?.fullname || userWorkEmail.split('@')[0] || 'User';
  const userAvatar = sessionUser?.link || sessionUser?.Link || sessionUser?.photo || sessionUser?.avatar || 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';
  const showSuperAdminToggle = isSuperAdminEligible || isSuperAdminMode;

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (attendanceRef.current && !attendanceRef.current.contains(event.target)) {
        setAttendanceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = currentLang === 'id' ? 'id-ID' : 'en-US';
      const datePart = now.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
      let timePart = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      timePart = timePart.replace('.', ':');
      setTimeStr(`${datePart} - ${timePart}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [currentLang]);

  // Weather fetch
  useEffect(() => {
    const getWeatherIcon = (code, isDay = 1) => {
      if (code === 0) return isDay ? '☀️' : '🌙';
      if (code === 1 || code === 2) return isDay ? '🌤️' : '⛅';
      if (code === 3) return '☁️';
      if (code === 45 || code === 48) return '🌫️';
      if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
      if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
      if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
      if ([80, 81, 82].includes(code)) return '🌦️';
      if ([95, 96, 99].includes(code)) return '⛈️';
      return '⛅';
    };

    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-8.7963&longitude=115.1764&current_weather=true`);
        if (res.ok) {
          const wData = await res.json();
          if (wData?.current_weather) {
            const temp = Math.round(wData.current_weather.temperature);
            const icon = getWeatherIcon(wData.current_weather.weathercode, wData.current_weather.is_day);
            setWeatherText(`${icon} ${temp}°C`);
          }
        }
      } catch (e) {}
    };
    fetchWeather();
  }, []);

  // Fetch Database Attendance: status="Pending Approval" dan Line Manager = User Work Email
  const fetchPendingAttendance = useCallback(async () => {
    if (!userWorkEmail && !userName) return;
    setLoadingAttendance(true);

    try {
      let realWorkEmail = userWorkEmail;
      let realName = userName;
      const directoryNameMap = new Map();

      // 1. Dapatkan mapping profil dan directory untuk lookup nama
      try {
        const { data: dirData } = await supabase
          .from('employee_directory')
          .select('*')
          .limit(2500);

        if (dirData && dirData.length > 0) {
          const cleanEmail = (userWorkEmail || '').trim().toLowerCase();
          const prefix = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;

          const myProfile = dirData.find(emp => {
            const eEmail = (getPropCaseInsensitive(emp, ['Email', 'email', 'user_uid']) || '').trim().toLowerCase();
            const eWork = (getPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']) || '').trim().toLowerCase();
            const eName = (getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name']) || '').trim().toLowerCase();
            return (
              (cleanEmail && (eEmail === cleanEmail || eWork === cleanEmail)) ||
              (prefix && (eEmail.startsWith(prefix) || eWork.startsWith(prefix))) ||
              (userName && eName === userName.toLowerCase())
            );
          });

          if (myProfile) {
            const foundWork = getPropCaseInsensitive(myProfile, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']).trim().toLowerCase();
            if (foundWork) realWorkEmail = foundWork;
            const foundName = getPropCaseInsensitive(myProfile, ['Name', 'name', 'nama', 'fullname']);
            if (foundName) realName = foundName;
          }

          dirData.forEach(emp => {
            const empEmail = (getPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Email', 'email']) || '').trim().toLowerCase();
            const empName = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], empEmail);
            if (empEmail) directoryNameMap.set(empEmail, empName);
          });
        }
      } catch (err) {
        console.warn('[TopNav] Error checking employee directory:', err);
      }

      // Kumpulan kunci pencocokan Line Manager
      const managerKeys = Array.from(new Set([
        userWorkEmail,
        realWorkEmail,
        userWorkEmail.includes('@') ? userWorkEmail.split('@')[0] : '',
        realWorkEmail.includes('@') ? realWorkEmail.split('@')[0] : '',
        userName.toLowerCase(),
        realName.toLowerCase()
      ])).filter(k => k && k.length >= 2);

      // 2. Query tabel attendance langsung dari Supabase
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .limit(10000);

      if (attErr) {
        console.error('[TopNav] Error fetching attendance:', attErr.message);
      } else if (attData) {
        const cleanUserWork = (userWorkEmail || '').trim().toLowerCase();
        const userPrefix = cleanUserWork.includes('@') ? cleanUserWork.split('@')[0] : cleanUserWork;

        const filtered = attData
          .filter(row => {
            // Status wajib "Pending Approval"
            const status = getRowStatus(row);
            if (!isPendingApprovalStatus(status)) return false;

            // Line Manager wajib cocok dengan User Work Email yang sedang login
            const isManager = matchesLineManager(row, realWorkEmail, realName, managerKeys);
            if (!isManager) return false;

            // Jangan tampilkan pengajuan yang diajukan oleh user login sendiri
            const empEmail = (getPropCaseInsensitive(row, [
              'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
              'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email'
            ]) || '').trim().toLowerCase();
            const empPrefix = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;
            const isSelf = userPrefix && (empEmail === cleanUserWork || empPrefix === userPrefix);

            return !isSelf;
          })
          .map(row => {
            const creatorEmail = (getPropCaseInsensitive(row, [
              'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'user_uid'
            ]) || '').trim().toLowerCase();
            const displayName = getPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'Employee Name'], directoryNameMap.get(creatorEmail) || creatorEmail || 'Employee');
            const action = getPropCaseInsensitive(row, [
              'Are you checking out or Checking in?', 'are you checking out or checking in?',
              'Action', 'action', 'Type', 'type', 'Attendance Type', 'attendance_type'
            ], 'Attendance');
            const date = getPropCaseInsensitive(row, ['Date', 'date', 'attendance_date', 'CreatedDate', 'created_date', 'Tanggal'], '-');
            const time = getPropCaseInsensitive(row, ['Time', 'time', 'Clock In', 'Clock Out', 'time_in', 'time_out'], '');
            const notes = getPropCaseInsensitive(row, ['Reason', 'reason', 'notes', 'Notes', 'keterangan'], '');

            return {
              ...row,
              displayName,
              displayEmail: creatorEmail,
              displayAction: action,
              displayDate: date,
              displayTime: time,
              displayNotes: notes
            };
          });

        setPendingAttendanceList(filtered);
      }
    } catch (e) {
      console.error('[TopNav] Gagal memuat attendance list:', e);
    } finally {
      setLoadingAttendance(false);
    }
  }, [userWorkEmail, userName]);

  // Load awal & auto-refresh berkala (setiap 60 detik)
  useEffect(() => {
    fetchPendingAttendance();
    const interval = setInterval(fetchPendingAttendance, 60000);
    return () => clearInterval(interval);
  }, [fetchPendingAttendance]);

  // Total badge count (menggunakan data realtime pending attendance jika tersedia)
  const totalApprovalCount = pendingAttendanceList.length > 0 
    ? pendingAttendanceList.length 
    : (externalApprovalCount !== undefined ? externalApprovalCount : 0);

  // Logout Total Bersih
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Gagal sign out Supabase:', err);
    } finally {
      localStorage.removeItem('hris_session_data');
      localStorage.removeItem('hris_super_admin_active');
      localStorage.removeItem('hris_original_super_admin');

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });

      window.location.replace('/login');
    }
  };

  const handleToggleClick = (e) => {
    const nextVal = e.target.checked;
    if (typeof onToggleSuperAdmin === 'function') {
      onToggleSuperAdmin(nextVal);
    }
  };

  return (
    <nav className="bg-blue-600 p-2 sm:p-4 text-white shadow-md sticky top-0 z-50 w-full transition-all">
      <div className="container mx-auto flex justify-between items-center px-1 sm:px-2">
        
        {/* Brand Logo & Live Widget */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link to="/" className="flex-shrink-0 group" title="HRIS Portal">
            <img 
              src="/geminilogo.jpg" 
              alt="HRIS Logo" 
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-contain shadow-md group-hover:scale-105 transition-transform bg-white border-2 border-white"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://cdn-icons-png.flaticon.com/128/1946/1946488.png";
              }}
            />
          </Link>
          <div className="flex flex-col justify-center min-w-0">
            <Link to="/" className="flex items-center text-white hover:opacity-95 transition">
              <span className="text-xl sm:text-2xl font-black tracking-wider leading-none" style={{ letterSpacing: '-0.02em' }}>
                HRIS
              </span>
            </Link>
            <div className="flex items-center space-x-1 sm:space-x-2 text-blue-100 text-[10px] sm:text-xs mt-1 leading-none whitespace-nowrap overflow-hidden">
              <span className="font-medium tracking-tight truncate">{timeStr || 'Fri, Oct 30 - 10:18'}</span>
              <span className="opacity-50 hidden sm:inline-block">&bull;</span>
              <span className="hidden sm:inline-block truncate max-w-[140px] sm:max-w-none">{locationName}</span>
              <span className="opacity-50">&bull;</span>
              <span className="font-bold tracking-tight shrink-0">{weatherText}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Language Switch + Attendance List Dropdown + User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Language Switch */}
          <div className="flex items-center bg-blue-700 rounded-lg p-0.5 text-xs font-semibold border border-blue-500">
            <button 
              onClick={() => onLangChange && onLangChange('en')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition ${currentLang === 'en' ? 'text-white bg-blue-800 shadow-sm' : 'text-blue-200 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => onLangChange && onLangChange('id')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition ${currentLang === 'id' ? 'text-white bg-blue-800 shadow-sm' : 'text-blue-200 hover:text-white'}`}
            >
              ID
            </button>
          </div>

          {/* ATTENDANCE LIST DROPDOWN (Pending Approval) */}
          <div className="relative" ref={attendanceRef}>
            <button
              type="button"
              onClick={() => {
                setAttendanceDropdownOpen(!attendanceDropdownOpen);
                if (dropdownOpen) setDropdownOpen(false);
              }}
              className={`relative flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-xl transition focus:outline-none cursor-pointer border border-blue-500/50 ${attendanceDropdownOpen ? 'bg-blue-800 ring-2 ring-blue-300' : ''}`}
              title={currentLang === 'id' ? 'Daftar Presensi Pending Approval' : 'Attendance Pending Approval List'}
            >
              <div className="relative flex items-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {pendingAttendanceList.length > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[18px] text-center border-2 border-blue-700 shadow-md animate-bounce">
                    {pendingAttendanceList.length}
                  </span>
                )}
              </div>

              <span className="text-xs font-bold hidden md:inline-block">
                {currentLang === 'id' ? 'Presensi' : 'Attendance'}
              </span>

              <svg className={`w-3.5 h-3.5 text-blue-200 transition-transform ${attendanceDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            {/* Attendance Popover Panel */}
            {attendanceDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 text-gray-700 z-50 animate-fadeIn">
                {/* Header */}
                <div className="px-4 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                        {currentLang === 'id' ? 'Presensi Pending Approval' : 'Attendance Pending Approval'}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        Line Manager: {userWorkEmail || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[11px] font-extrabold bg-red-100 text-red-700 rounded-full border border-red-200">
                      {pendingAttendanceList.length}
                    </span>
                    <button
                      type="button"
                      onClick={fetchPendingAttendance}
                      disabled={loadingAttendance}
                      title="Refresh Presensi"
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <svg className={`w-3.5 h-3.5 ${loadingAttendance ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Body List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 px-2 py-1">
                  {loadingAttendance ? (
                    <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
                      <svg className="w-6 h-6 animate-spin text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <span>{currentLang === 'id' ? 'Memuat database presensi...' : 'Loading attendance data...'}</span>
                    </div>
                  ) : pendingAttendanceList.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-gray-700">
                        {currentLang === 'id' ? 'Tidak ada presensi pending' : 'No pending attendance'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {currentLang === 'id' ? 'Semua pengajuan presensi bawahan telah diproses.' : 'All attendance requests have been processed.'}
                      </p>
                    </div>
                  ) : (
                    pendingAttendanceList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setAttendanceDropdownOpen(false);
                          navigate('/Approval');
                        }}
                        className="p-2.5 hover:bg-blue-50/60 rounded-xl transition cursor-pointer my-1 flex flex-col gap-1 border border-transparent hover:border-blue-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {(item.displayName || 'E').charAt(0).toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-gray-800 truncate">
                              {item.displayName}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                            {item.displayAction}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 pl-8">
                          <span className="font-medium text-gray-600">
                            {formatDateDisplay(item.displayDate, currentLang)} {item.displayTime ? `(${formatTimeDisplay(item.displayTime)})` : ''}
                          </span>
                          <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">
                            Pending Approval
                          </span>
                        </div>

                        {item.displayNotes && (
                          <p className="text-[10px] text-gray-500 italic pl-8 line-clamp-1">
                            "{item.displayNotes}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Link to Approval Page */}
                <div className="pt-2 px-3 border-t border-gray-100 mt-1">
                  <Link
                    to="/Approval"
                    onClick={() => setAttendanceDropdownOpen(false)}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{currentLang === 'id' ? 'Buka Halaman Persetujuan' : 'Open Approval Page'}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                if (attendanceDropdownOpen) setAttendanceDropdownOpen(false);
              }} 
              className="relative flex items-center space-x-1 sm:space-x-2 bg-blue-700 hover:bg-blue-800 py-1 sm:py-1.5 px-2 sm:px-3 rounded-xl transition focus:outline-none cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-inner bg-blue-100" 
                  onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }}
                />
                {totalApprovalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-blue-700 shadow-sm animate-bounce">
                    {totalApprovalCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold hidden sm:inline-block max-w-[150px] truncate">{userName}</span>
              <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 text-gray-700 z-50 animate-fadeIn"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">{currentLang === 'id' ? 'Masuk sebagai' : 'Logged in as'}</p>
                  <p className="text-xs font-bold text-gray-800 truncate mt-0.5">{userWorkEmail || 'No Work Email'}</p>
                </div>

                {/* SUPER ADMIN TOGGLE */}
                {showSuperAdminToggle && (
                  <div 
                    className="px-4 py-2.5 border-b border-gray-100 bg-indigo-50/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        Super Admin
                      </span>
                      
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isSuperAdminMode}
                          onChange={handleToggleClick}
                          className="sr-only" 
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${isSuperAdminMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm pointer-events-none ${isSuperAdminMode ? 'transform translate-x-5' : ''}`}></div>
                      </label>
                    </div>

                    {isSuperAdminMode && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setDropdownOpen(false);
                          if (typeof onSwitchAccount === 'function') {
                            onSwitchAccount();
                          }
                        }}
                        className="mt-2.5 w-full text-center py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        Switch Account
                      </button>
                    )}
                  </div>
                )}

                {/* Approval Menu Item */}
                <Link 
                  to="/Approval" 
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between transition border-b border-gray-50"
                >
                  <div className="flex items-center space-x-2.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium text-gray-700">{currentLang === 'id' ? 'Persetujuan' : 'Approval'}</span>
                  </div>
                  {totalApprovalCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                      {totalApprovalCount}
                    </span>
                  )}
                </Link>

                {/* My Profile Menu Item */}
                <button 
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    if (typeof onOpenProfile === 'function') {
                      onOpenProfile();
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2.5 transition cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span className="font-medium text-gray-700">{currentLang === 'id' ? 'Profil Saya' : 'My Profile'}</span>
                </button>

                {/* Log Out Menu Item */}
                <button 
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition border-t border-gray-100 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  <span className="font-semibold">{currentLang === 'id' ? 'Keluar' : 'Log Out'}</span>
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}