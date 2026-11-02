import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { supabase } from '../../lib/supabase';

const TABLE_EMPLOYEES = ['employee_directory', 'employee directory', 'Employee Directory', 'employees'];

const i18n = {
  en: {
    greeting: 'Hello',
    deptLabel: 'Department',
    jobTitleLabel: 'Job Title',
    statusLabel: 'Account Status:',
    modulesTitle: 'HRIS Module Access',
    moduleNames: { empDir: 'Employee Directory', attendance: 'Attendance Requests', leave: 'Leave Requests', payslip: 'Payslip' },
  },
  id: {
    greeting: 'Halo',
    deptLabel: 'Departemen',
    jobTitleLabel: 'Job Title',
    statusLabel: 'Status Akun:',
    modulesTitle: 'Akses Modul HRIS',
    moduleNames: { empDir: 'Direktori Karyawan', attendance: 'Permintaan Absensi', leave: 'Pengajuan Cuti', payslip: 'Slip Gaji' },
  }
};

export default function MainLayout() {
  const [currentUser, setCurrentUser] = useState(null);
  const [approvalCount, setApprovalCount] = useState(0); // for TopNav dropdown
  const [attendanceBadge, setAttendanceBadge] = useState(false);
  const [leaveBadgeCount, setLeaveBadgeCount] = useState(0);
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('hris_lang') || 'en');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(localStorage.getItem('hris_super_admin_active') === 'true');
  const [isSuperAdminEligible, setIsSuperAdminEligible] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFullscreenBarcodeOpen, setIsFullscreenBarcodeOpen] = useState(false);

  const getCleanProp = (obj, targetNames) => {
    if (!obj) return '';
    const keys = Object.keys(obj);
    for (const target of targetNames) {
      const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget);
      if (foundKey && obj[foundKey] !== null && obj[foundKey] !== undefined && String(obj[foundKey]).trim() !== '') {
        return String(obj[foundKey]).trim();
      }
    }
    return '';
  };

  const checkSuperAdmin = (user) => {
    if (!user) return false;
    const email = String(getCleanProp(user, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
    const saRawVal = getCleanProp(user, [
      'Super Admin?', 'super_admin?', 'Super_Admin?', 
      'Super Admin', 'super_admin', 'Super_Admin', 
      'is_super_admin', 'is_superadmin'
    ]);

    const isTrue = (
      saRawVal === true || 
      ['TRUE', '1', 'T', 'YES'].includes(String(saRawVal).trim().toUpperCase()) ||
      email === 'ranggiit@gmail.com'
    );
    return isTrue;
  };

  useEffect(() => {
    const loadUserFromDatabase = async () => {
      let activeUser = null;
      let saved = localStorage.getItem('hris_session_data');
      if (saved) {
        try {
          activeUser = JSON.parse(saved);
        } catch (e) {}
      }

      let emailToMatch = activeUser 
        ? String(getCleanProp(activeUser, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase()
        : '';

      if (!emailToMatch) {
        const { data: sData } = await supabase.auth.getSession();
        if (sData?.session?.user?.email) {
          emailToMatch = sData.session.user.email.trim().toLowerCase();
        }
      }
      if (!emailToMatch) emailToMatch = 'ranggiit@gmail.com';

      // Selalu ambil data profil terbaru dari tabel employee_directory dengan kondisi email=user login
      try {
        for (const tbl of TABLE_EMPLOYEES) {
          const { data, error } = await supabase.from(tbl).select('*').limit(200);
          if (!error && data && data.length > 0) {
            const matched = data.find(row => {
              const rowEmail = String(getCleanProp(row, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
              return rowEmail === emailToMatch;
            });

            if (matched) {
              activeUser = matched;
              localStorage.setItem('hris_session_data', JSON.stringify(matched));
              break;
            } else if (!activeUser) {
              activeUser = data[0];
              localStorage.setItem('hris_session_data', JSON.stringify(data[0]));
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Error fetching user profile:", err);
      }

      if (activeUser) {
        setCurrentUser(activeUser);
        const isEligible = checkSuperAdmin(activeUser);
        setIsSuperAdminEligible(isEligible);
      }
    };

    loadUserFromDatabase();
  }, []);

  const handleToggleSuperAdmin = async (active) => {
    if (active) {
      setIsSuperAdminMode(true);
      localStorage.setItem('hris_super_admin_active', 'true');
      if (currentUser) {
        localStorage.setItem('hris_original_super_admin', JSON.stringify(currentUser));
      }
      alert(currentLang === 'id' ? "Mode Super Admin diaktifkan." : "Super Admin Mode enabled.");
    } else {
      setIsSuperAdminMode(false);
      localStorage.removeItem('hris_super_admin_active');
      
      let targetUser = null;
      const savedOriginal = localStorage.getItem('hris_original_super_admin');
      if (savedOriginal) {
        try { targetUser = JSON.parse(savedOriginal); } catch (e) {}
      }

      if (!targetUser) {
        for (const tbl of TABLE_EMPLOYEES) {
          try {
            const { data } = await supabase.from(tbl).select('*').limit(100);
            if (data && data.length > 0) {
              targetUser = data.find(row => 
                Object.values(row).some(val => typeof val === 'string' && val.trim().toLowerCase() === 'ranggiit@gmail.com')
              );
              if (targetUser) break;
            }
          } catch (e) {}
        }
      }

      localStorage.removeItem('hris_original_super_admin');

      if (targetUser) {
        localStorage.setItem('hris_session_data', JSON.stringify(targetUser));
        setCurrentUser(targetUser);
        const nameOrEmail = targetUser.Name || targetUser.name || targetUser.fullname || 'ranggiit@gmail.com';
        alert(currentLang === 'id' 
          ? `Super Admin Mode dinonaktifkan. Kembali ke akun asli (${nameOrEmail}).` 
          : `Super Admin Mode disabled. Reverted to original account (${nameOrEmail}).`);
        window.location.reload();
      } else {
        alert(currentLang === 'id' 
          ? "Mode Super Admin telah dinonaktifkan. Silakan login kembali." 
          : "Super Admin Mode disabled. Please log in again.");
        window.location.reload();
      }
    }
  };

  const handleSwitchAccount = async () => {
    if (currentUser) {
      const existingOriginal = localStorage.getItem('hris_original_super_admin');
      if (!existingOriginal) {
        localStorage.setItem('hris_original_super_admin', JSON.stringify(currentUser));
      }
    }
    
    await supabase.auth.signOut();
    localStorage.removeItem('hris_session_data');
    localStorage.setItem('hris_super_admin_active', 'true');
    setIsSuperAdminMode(true);
    navigate('/login');
  };

  // Profile data extraction from employee_directory (currentUser)
  const getProp = (keys, fallback) => getCleanProp(currentUser, keys) || fallback;
  const displayName = getProp(['name', 'nama', 'fullname', 'full_name'], 'Ranggi Tino Fambudi');
  const deptName = getProp(['department', 'dept'], 'Admin & General');
  const jobTitle = getProp(['job title', 'job_title', 'position'], 'Business Applications Manager');
  const empId = getProp(['employee id', 'employee_id', 'id'], 'VGII81');
  const companyName = getProp(['company', 'Company Name'], 'Arra');
  const email = getProp(['email', 'email address', 'user_uid'], 'ranggiit@gmail.com');
  const workEmail = getProp(['Employee work email', 'work_email', 'work email'], 'ranggiit@gmail.com');
  const phone = getProp(['Phone Number', 'phone_number', 'phone'], '87899115218');
  
  // Status akun murni dari database employee_directory kolom status (Dideklarasikan dengan aman)
  const userStatus = String(getProp(['status', 'Status', 'STATUS'], 'Active') || 'Active');
  
  // Foto murni dari kolom 'link'
  const photo = getProp(['link', 'Link', 'photo', 'avatar'], 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png');
  
  // Barcode URL atau generate dynamic QR code dari employee id
  const barcodeRaw = getProp(['Barcode URL', 'barcode_url', 'barcode'], '');
  const barcode = barcodeRaw || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(empId)}`;

  // =========================================================================
  // FUNGSI ANALISIS & PARSER TANGGAL & WAKTU (AKURAT BAHASA INDONESIA & INGGRIS)
  // Menghitung timestamp kronologis hingga tingkat Jam & Menit
  // =========================================================================
  const monthsMap = {
    jan: 1, feb: 2, mar: 3, apr: 4,
    may: 5, mei: 5,
    jun: 6, jul: 7,
    aug: 8, agu: 8, agt: 8,
    sep: 9, okt: 10, oct: 10,
    nov: 11, dec: 12, des: 12
  };

  const parseRowTimestamp = (row) => {
    if (!row) return { timestamp: 0, y: 0, m: 0, d: 0 };

    // 1. Cek created_at jika ada format ISO baku
    const createdStr = row.created_at || row.createddate || row.created_date;
    if (createdStr) {
      const parsedIso = new Date(createdStr);
      if (!isNaN(parsedIso.getTime())) {
        return {
          timestamp: parsedIso.getTime(),
          y: parsedIso.getFullYear(),
          m: parsedIso.getMonth() + 1,
          d: parsedIso.getDate()
        };
      }
    }

    // 2. Kumpulkan field tanggal & waktu dari kolom-kolom yang relevan
    let dateStr = '';
    let timeStr = '';

    for (const [k, v] of Object.entries(row)) {
      const lowerK = k.toLowerCase().trim();
      if (!dateStr && (lowerK.includes('date') || lowerK.includes('schedule') || lowerK.includes('tanggal'))) {
        dateStr = String(v || '').trim();
      }
      if (!timeStr && (lowerK === 'time' || lowerK === 'waktu' || lowerK === 'jam')) {
        timeStr = String(v || '').trim();
      }
    }

    const combined = `${dateStr} ${timeStr}`.trim();

    // Ekstrak Jam & Menit jika tersedia (misal: "20:37" dari "30-10-2026 20:37")
    let hh = 0, mm = 0, ss = 0;
    const timeMatch = combined.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hh = parseInt(timeMatch[1], 10);
      mm = parseInt(timeMatch[2], 10);
      if (timeMatch[3]) ss = parseInt(timeMatch[3], 10);
    }

    let y = 0, m = 0, d = 0;

    // A. Format teks bulan (misal: "Friday, 30-Oct-2026", "30-Okt-2026", "30 Oct 2026")
    const mText = combined.match(/(\d{1,2})[-\s/]+([a-zA-Z]{3,10})[-\s/]+(\d{4})/i);
    if (mText) {
      d = parseInt(mText[1], 10);
      const monStr = mText[2].toLowerCase().slice(0, 3);
      y = parseInt(mText[3], 10);
      if (monthsMap[monStr]) {
        m = monthsMap[monStr];
      }
    }

    // B. Format DD-MM-YYYY atau DD/MM/YYYY
    if (!y || !m || !d) {
      const mDmy = combined.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (mDmy) {
        d = parseInt(mDmy[1], 10);
        m = parseInt(mDmy[2], 10);
        y = parseInt(mDmy[3], 10);
      }
    }

    // C. Format ISO YYYY-MM-DD
    if (!y || !m || !d) {
      const mIso = combined.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (mIso) {
        y = parseInt(mIso[1], 10);
        m = parseInt(mIso[2], 10);
        d = parseInt(mIso[3], 10);
      }
    }

    if (y && m && d) {
      const dateObj = new Date(y, m - 1, d, hh, mm, ss);
      return {
        timestamp: dateObj.getTime(),
        y,
        m,
        d
      };
    }

    return { timestamp: 0, y: 0, m: 0, d: 0 };
  };

  // Fetch badge data for Attendance and Leave
  useEffect(() => {
    const fetchBadges = async () => {
      if (!currentUser) return;
      const userEmail = String(getCleanProp(currentUser, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
      const empIdStr = String(getCleanProp(currentUser, ['employee id', 'employee_id', 'id']) || '').trim().toLowerCase();
      const empNameStr = String(getCleanProp(currentUser, ['name', 'nama', 'fullname', 'full_name']) || '').trim().toLowerCase();
      const validUserKeys = [userEmail, empIdStr, empNameStr].filter(Boolean);

      if (validUserKeys.length === 0) return;

      // =========================================================================
      // 1. LOGIKA BADGE ATTENDANCE
      // Syarat:
      // - employee = user login email
      // - Data absensi TERBARU (berdasarkan kronologi tanggal + jam check in/out)
      // - Status terbaru = "Checking In" (bukan checking out / pulang)
      // - Tanggal data terbaru < hari ini (date < today)
      // =========================================================================
      try {
        const { data: sampleAtt } = await supabase.from('attendance').select('*').limit(1);
        let empCol = 'employee';
        let typeCol = 'Are you checking out or Checking in?';

        if (sampleAtt && sampleAtt.length > 0) {
          const keys = Object.keys(sampleAtt[0]);
          empCol = keys.find(k => k.toLowerCase().trim() === 'employee')
                || keys.find(k => ['email', 'user_uid', 'employee_id'].includes(k.toLowerCase().trim()))
                || keys.find(k => k.toLowerCase().includes('employee'))
                || empCol;

          typeCol = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '') === 'areyoucheckingoutorcheckingin')
                 || keys.find(k => k.toLowerCase().includes('checking out') || k.toLowerCase().includes('checking in'))
                 || keys.find(k => ['type', 'action', 'status'].includes(k.toLowerCase().trim())) 
                 || typeCol;
        }

        // Ambil riwayat absensi user (tanpa memaksakan .order di Supabase yang dapat error jika kolom teks)
        let myAttendance = [];
        const { data: qData, error: qErr } = await supabase
          .from('attendance')
          .select('*')
          .ilike(empCol, `%${userEmail}%`)
          .limit(100);

        if (!qErr && qData && qData.length > 0) {
          myAttendance = qData;
        } else {
          // Fallback pencarian alternatif jika email disimpan dengan id / nama
          for (const key of validUserKeys) {
            if (key === userEmail) continue;
            const { data: altData } = await supabase.from('attendance').select('*').ilike(empCol, `%${key}%`).limit(100);
            if (altData && altData.length > 0) {
              myAttendance = altData;
              break;
            }
          }
        }

        if (myAttendance.length > 0) {
          // URUTKAN SECARA KRONOLOGIS (Timestamp tertinggi / paling mutakhir berada di index 0)
          // Memastikan jika ada Check-In jam 08:00 dan Check-Out jam 17:00 pada tanggal yang sama,
          // Check-Out akan selalu menjadi data terbaru.
          myAttendance.sort((a, b) => {
            const timeA = parseRowTimestamp(a).timestamp;
            const timeB = parseRowTimestamp(b).timestamp;
            if (timeA !== timeB) {
              return timeB - timeA;
            }
            // Fallback id jika timestamp sama persis
            if (a.id && b.id && typeof a.id === 'number') {
              return b.id - a.id;
            }
            return 0;
          });

          // Ambil record yang PALING TERBARU
          const latestRecord = myAttendance[0];

          // 1. Periksa apakah aksi terakhir = "Checking In"
          const typeVal = String(latestRecord[typeCol] || latestRecord['Are you checking out or Checking in?'] || '').trim().toLowerCase();
          const isCheckOut = typeVal.includes('out') || typeVal.includes('pulang');
          const isCheckIn = (typeVal.includes('in') || typeVal.includes('masuk')) && !isCheckOut;

          // 2. Periksa apakah tanggal absensi < hari ini (date < today)
          const parsedLatest = parseRowTimestamp(latestRecord);
          let isLessThanToday = false;

          if (parsedLatest.y > 0 && parsedLatest.m > 0 && parsedLatest.d > 0) {
            const now = new Date();
            const todayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
            const recordNum = parsedLatest.y * 10000 + parsedLatest.m * 100 + parsedLatest.d;
            isLessThanToday = recordNum < todayNum;
          }

          // Badge hanya aktif jika record paling baru adalah Checking In DAN tanggalnya kurang dari hari ini
          setAttendanceBadge(isCheckIn && isLessThanToday);
        } else {
          setAttendanceBadge(false);
        }
      } catch (e) {
        console.warn('Error fetching attendance badge:', e);
        setAttendanceBadge(false);
      }

      // =========================================================================
      // 2. LOGIKA BADGE LEAVE (Cuti)
      // =========================================================================
      try {
        const { data: holidayData, error } = await supabase.from('holiday_balance').select('*').limit(1000);
        if (!error && holidayData) {
          const myHolidays = holidayData.filter(row => {
            const rowEmp = String(getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id']) || '').trim().toLowerCase();
            return validUserKeys.some(key => rowEmp === key || rowEmp.includes(key) || key.includes(rowEmp));
          });

          const now = new Date();
          const fifteenDaysLater = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));
          let expiringCount = 0;

          myHolidays.forEach(row => {
            const status = String(getPropCaseInsensitive(row, ['status', 'Status', 'STATUS']) || '').toLowerCase();
            if (status === 'unused') {
              const expDateRaw = getPropCaseInsensitive(row, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired', 'expired']);
              if (expDateRaw) {
                const expDate = new Date(expDateRaw);
                if (!isNaN(expDate.getTime()) && expDate >= now && expDate <= fifteenDaysLater) {
                  expiringCount++;
                }
              }
            }
          });
          setLeaveBadgeCount(expiringCount);
        }
      } catch (e) {
        console.warn('Error fetching leave badge:', e);
      }
    };

    fetchBadges();
  }, [currentUser]);

  const getPropCaseInsensitive = (obj, candidateNames, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateNames) {
      const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
      if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
        return String(obj[found]).trim();
      }
    }
    return fallback;
  };

  const t = i18n[currentLang] || i18n.en;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <TopNav 
        currentUser={currentUser} 
        approvalCount={approvalCount} 
        currentLang={currentLang}
        isSuperAdminMode={isSuperAdminMode}
        isSuperAdminEligible={isSuperAdminEligible}
        onToggleSuperAdmin={handleToggleSuperAdmin}
        onSwitchAccount={handleSwitchAccount}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLangChange={(lang) => {
          setCurrentLang(lang);
          localStorage.setItem('hris_lang', lang);
        }}
      />
      
      <main className="container mx-auto mt-2 sm:mt-6 px-2 sm:px-6 flex-1 flex flex-col space-y-3 sm:space-y-6">
        
        {/* SHARED: Profile Summary Card */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {t.greeting}, <span className="text-blue-600 font-extrabold">{displayName}</span>!
              </h2>
              {/* SUPER ADMIN badge HANYA muncul saat isSuperAdminMode bernilai true */}
              {isSuperAdminMode && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  SUPER ADMIN
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
              {t.deptLabel}: <strong className="text-gray-900 font-semibold">{deptName}</strong>
              <span className="hidden sm:inline"> | </span>
              <br className="block sm:hidden" />
              {t.jobTitleLabel}: <strong className="text-gray-900 font-semibold">{jobTitle}</strong>
            </p>
          </div>
          
          {/* Status Akun dari database employee_directory kolom status */}
          <div className="flex items-center space-x-2 mt-1 sm:mt-0">
            <span className="text-xs sm:text-sm text-gray-500">{t.statusLabel}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              (userStatus || '').toLowerCase().includes('inactive') || 
              (userStatus || '').toLowerCase().includes('tidak') || 
              (userStatus || '').toLowerCase().includes('resign')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {userStatus}
            </span>
          </div>
        </div>

        {/* SHARED: HRIS Module Access (Sembunyi di Mobile) */}
        <div className="hidden md:block">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">{t.modulesTitle}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Link 
              to="/" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <svg className={`w-8 h-8 ${currentPath === '/' ? 'text-blue-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </div>
              <span className={`text-xs font-bold ${currentPath === '/' ? 'text-blue-700' : 'text-gray-700'}`}>Dashboard</span>
            </Link>

            <Link 
              to="/directory" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/directory' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10691/10691841.png" alt="Directory" className="w-8 h-8 object-contain" />
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/directory' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.empDir}</span>
            </Link>

            <Link 
              to="/attendance" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center relative ${currentPath === '/attendance' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/3125/3125856.png" alt="Attendance" className="w-8 h-8 object-contain" />
                {attendanceBadge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-pulse">!</span>
                )}
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/attendance' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.attendance}</span>
            </Link>

            <Link 
              to="/leave" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center relative ${currentPath === '/leave' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10963/10963675.png" alt="Leave" className="w-8 h-8 object-contain" />
                {leaveBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">{leaveBadgeCount}</span>
                )}
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/leave' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.leave}</span>
            </Link>

            <Link 
              to="/account" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/account' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10695/10695051.png" alt="Payslip" className="w-8 h-8 object-contain" />
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/account' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.payslip}</span>
            </Link>
          </div>
        </div>

        {/* Page Content */}
        <Outlet context={{ currentUser, currentLang, isSuperAdminMode }} />

      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav attendanceBadge={attendanceBadge} leaveBadgeCount={leaveBadgeCount} />

      {/* ==================== MODAL: MY PROFILE ==================== */}
      {isProfileModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 relative max-h-[90vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">
                {currentLang === 'id' ? 'Profil Saya' : 'My Profile'}
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Profile Avatar in Center */}
            <div className="flex flex-col items-center mb-4">
              <img 
                src={photo} 
                alt="Profile" 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4 bg-blue-50"
                onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }}
              />
              
              {/* Employee Barcode Card */}
              <div className="w-full flex flex-col items-center justify-center p-3.5 bg-gray-50/70 rounded-2xl border border-gray-200">
                <div className="w-full flex justify-between items-center mb-2 px-1 text-xs">
                  <span className="text-gray-600 font-semibold text-xs">
                    {currentLang === 'id' ? 'Barcode Karyawan' : 'Employee Barcode'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setIsFullscreenBarcodeOpen(true);
                    }}
                    className="text-blue-600 font-semibold hover:underline text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    </svg>
                    <span>Full Screen</span>
                  </button>
                </div>

                <div 
                  className="w-full flex justify-center bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs cursor-pointer group hover:scale-[1.01] transition-transform"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setIsFullscreenBarcodeOpen(true);
                  }}
                  title="Click to view full screen"
                >
                  <img 
                    src={barcode} 
                    alt="Barcode" 
                    className="w-full max-w-[190px] aspect-square object-contain" 
                  />
                </div>
              </div>
            </div>

            {/* Profile Info Details List */}
            <div className="space-y-2.5 text-xs text-gray-600 divide-y divide-gray-100">
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">Employee ID</span>
                <strong className="text-gray-800 font-bold">{empId}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Nama' : 'Name'}</span>
                <strong className="text-gray-800 font-bold">{displayName}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Perusahaan' : 'Company'}</span>
                <strong className="text-gray-800 font-bold">{companyName}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Departemen' : 'Department'}</span>
                <span className="font-semibold text-gray-700">{deptName}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Jabatan' : 'Job Title'}</span>
                <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[11px]">
                  {jobTitle}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">Email</span>
                <span className="text-gray-700 font-mono text-xs">{email}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Email Kantor' : 'Work Email'}</span>
                <span className="text-gray-700 font-mono text-xs">{workEmail}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Nomor Telepon' : 'Phone Number'}</span>
                <span className="text-gray-700 font-mono text-xs">{phone}</span>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <button 
                type="button"
                onClick={() => setIsProfileModalOpen(false)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {currentLang === 'id' ? 'Tutup' : 'Close'}
              </button>
              
              <Link 
                to="/account" 
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <span>{currentLang === 'id' ? 'Detail Lengkap' : 'More Detail'}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL: FULLSCREEN BARCODE ==================== */}
      {isFullscreenBarcodeOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 p-4" 
          onClick={() => setIsFullscreenBarcodeOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] flex flex-col items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsFullscreenBarcodeOpen(false)} 
              className="absolute -top-11 right-0 text-white hover:text-red-400 p-2 text-2xl transition cursor-pointer"
              title="Close Fullscreen"
            >
              ✕
            </button>
            <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-100">
              <img src={barcode} alt="Barcode Fullscreen" className="max-h-[65vh] max-w-[80vw] object-contain" />
              <p className="mt-4 text-xs text-gray-400 font-medium">Click anywhere outside to exit</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}