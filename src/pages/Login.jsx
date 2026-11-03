import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TABLE_EMPLOYEES = ['employee_directory', 'employee directory', 'Employee Directory', 'employees'];

const i18n = {
  en: {
    authSubtitle: 'Email OTP Authentication System',
    emailLabel: 'Employee Email',
    sendOtpBtn: 'Send OTP Code',
    loginDeviceVerifiedBtn: 'Log In (Trusted Device)',
    directLoginBtn: 'Direct Login (No OTP)',
    otpSentTo: 'OTP Code has been sent to:',
    otpInputLabel: 'Enter 6-Digit OTP Code',
    verifyBtn: 'Verify & Enter',
    resendBtn: 'Change email / resend',
    googleBtn: 'Log in with Google',
    orText: 'OR',
    allCompanies: '-- All Companies --',
    selectEmployee: '-- Select Employee --',
    selectedEmployeeLabel: 'Selected Employee (Bypass OTP)',
    loadingData: 'Checking user data...',
    sendingOtp: 'Sending OTP email...',
    otpSentSuccess: 'OTP Code sent! Check your email.',
    verifyingOtp: 'Verifying code...',
    invalidOtp: 'Invalid verification code or expired.',
    accountInactive: 'Your account is currently inactive.',
    emailNotRegistered: 'Email is not registered in Employee Directory.',
    pleaseSelectEmployee: 'Please select an employee first.',
  },
  id: {
    authSubtitle: 'Sistem Otentikasi Email OTP',
    emailLabel: 'Email Karyawan',
    sendOtpBtn: 'Kirim Kode OTP',
    loginDeviceVerifiedBtn: 'Masuk (Perangkat Terverifikasi)',
    directLoginBtn: 'Masuk Langsung (Tanpa OTP)',
    otpSentTo: 'Kode OTP telah dikirim ke:',
    otpInputLabel: 'Masukkan 6 Digit Kode OTP',
    verifyBtn: 'Verifikasi & Masuk',
    resendBtn: 'Ganti email / kirim ulang',
    googleBtn: 'Masuk dengan Google',
    orText: 'ATAU',
    allCompanies: '-- Semua Perusahaan --',
    selectEmployee: '-- Pilih Karyawan --',
    selectedEmployeeLabel: 'Pilih Karyawan (Bypass OTP)',
    loadingData: 'Memeriksa data...',
    sendingOtp: 'Mengirim email OTP...',
    otpSentSuccess: 'Kode OTP telah dikirim! Periksa email Anda.',
    verifyingOtp: 'Memverifikasi kode...',
    invalidOtp: 'Kode verifikasi salah/kedaluwarsa.',
    accountInactive: 'Akun Anda saat ini berstatus tidak aktif.',
    emailNotRegistered: 'Email tidak terdaftar di Employee Directory.',
    pleaseSelectEmployee: 'Silakan pilih karyawan terlebih dahulu.',
  }
};

// Helper: Memeriksa apakah kolom super admin? / super admin bernilai TRUE
export const checkIsSuperAdmin = (emp) => {
  if (!emp || typeof emp !== 'object') return false;
  const keys = Object.keys(emp);
  for (const k of keys) {
    const norm = k.toLowerCase().replace(/[\s_?-]/g, '');
    if (norm === 'superadmin' || norm === 'issuperadmin') {
      const val = emp[k];
      return (
        val === true ||
        val === 1 ||
        String(val).trim().toLowerCase() === 'true' ||
        String(val).trim() === '1'
      );
    }
  }
  return false;
};

export default function Login() {
  const navigate = useNavigate();
  const currentLang = localStorage.getItem('hris_lang') || 'en';
  const t = i18n[currentLang] || i18n.en;

  const [emailInput, setEmailInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState('email');
  const [activeEmail, setActiveEmail] = useState('');
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Super Admin state & hak akses toggle
  const [canAccessSuperAdmin, setCanAccessSuperAdmin] = useState(false);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(
    localStorage.getItem('hris_super_admin_active') === 'true'
  );

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [empSearchQuery, setEmpSearchQuery] = useState('');

  // Floating widget top-left
  const [timeStr, setTimeStr] = useState('');
  const [locationName, setLocationName] = useState('Kecamatan Kuta Selatan, ID');
  const [weatherText, setWeatherText] = useState('⛅ 29°C');

  const getPropCaseInsensitive = (obj, candidateNames, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateNames) {
      const normalizedCand = cand.toLowerCase().replace(/[\s_?-]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[\s_?-]/g, '') === normalizedCand);
      if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
        return String(obj[found]).trim();
      }
    }
    return fallback;
  };

  const isDeviceVerifiedForEmail = (email) => {
    if (!email) return false;
    try {
      const clean = email.toLowerCase().trim();
      const verifiedList = JSON.parse(localStorage.getItem('hris_verified_devices') || '[]');
      return verifiedList.includes(clean);
    } catch (e) {
      return false;
    }
  };

  const markDeviceAsVerified = (email) => {
    if (!email) return;
    try {
      const clean = email.toLowerCase().trim();
      const verifiedList = JSON.parse(localStorage.getItem('hris_verified_devices') || '[]');
      if (!verifiedList.includes(clean)) {
        verifiedList.push(clean);
        localStorage.setItem('hris_verified_devices', JSON.stringify(verifiedList));
      }
    } catch (e) {}
  };

  const fetchDirectory = async () => {
    for (const tbl of TABLE_EMPLOYEES) {
      const { data, error } = await supabase.from(tbl).select('*').limit(1000);
      if (!error && data && data.length > 0) {
        return data;
      }
    }
    return [];
  };

  // 1. Live Time Update
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
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentLang]);

  // 2. Weather & Location Widget
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

    const fetchWeatherDetails = async (lat, lon, city) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (res.ok) {
          const wData = await res.json();
          if (wData?.current_weather) {
            const temp = Math.round(wData.current_weather.temperature);
            const icon = getWeatherIcon(wData.current_weather.weathercode, wData.current_weather.is_day);
            const text = `${icon} ${temp}°C`;
            setWeatherText(text);
            localStorage.setItem('hris_cached_weather', JSON.stringify({ city, weatherText: text }));
            localStorage.setItem('hris_cached_weather_time', String(Date.now()));
          }
        }
      } catch (e) {}
    };

    const fetchWeather = async () => {
      let lat = -8.7963, lon = 115.1764;
      let city = 'Kecamatan Kuta Selatan, ID';

      const cachedWeather = localStorage.getItem('hris_cached_weather');
      const cachedTime = localStorage.getItem('hris_cached_weather_time');
      const nowTs = Date.now();
      if (cachedWeather && cachedTime && (nowTs - parseInt(cachedTime, 10) < 30 * 60 * 1000)) {
        try {
          const parsed = JSON.parse(cachedWeather);
          if (parsed.city) setLocationName(parsed.city);
          if (parsed.weatherText) setWeatherText(parsed.weatherText);
          return;
        } catch (e) {}
      }

      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
              try {
                const revRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                if (revRes.ok) {
                  const revData = await revRes.json();
                  city = revData.locality || revData.city || revData.principalSubdivision || 'Kuta Selatan';
                  if (revData.countryCode) city += `, ${revData.countryCode}`;
                  setLocationName(city);
                }
              } catch (e) {}
              fetchWeatherDetails(lat, lon, city);
            },
            () => { fetchWeatherDetails(lat, lon, city); },
            { timeout: 5000 }
          );
        } else {
          fetchWeatherDetails(lat, lon, city);
        }
      } catch (e) {
        fetchWeatherDetails(lat, lon, city);
      }
    };

    fetchWeather();
  }, []);

  // 3. Verifikasi Hak Akses Toggle Super Admin
  useEffect(() => {
    const checkSuperAdminPermission = async () => {
      const isModeActive = localStorage.getItem('hris_super_admin_active') === 'true';
      const savedOriginal = localStorage.getItem('hris_original_super_admin');
      const savedSession = localStorage.getItem('hris_session_data');

      let originalObj = null;
      let sessionObj = null;
      try { if (savedOriginal) originalObj = JSON.parse(savedOriginal); } catch (e) {}
      try { if (savedSession) sessionObj = JSON.parse(savedSession); } catch (e) {}

      // Hak akses toggle hanya terbuka jika:
      // a. Akun original adalah Super Admin (sedang berpindah akun)
      // b. Akun sesi saat ini adalah Super Admin
      // c. Mode Super Admin telah diaktifkan sebelumnya
      if (checkIsSuperAdmin(originalObj) || checkIsSuperAdmin(sessionObj)) {
        setCanAccessSuperAdmin(true);
      } else if (isModeActive) {
        // Mode pernah aktif sebelumnya: Verifikasi ke database apakah email yang bersangkutan memang Super Admin
        const emailToCheck = getPropCaseInsensitive(originalObj || sessionObj, ['email', 'email address', 'user_uid']);
        if (emailToCheck) {
          const dir = await fetchDirectory();
          const target = dir.find(row => 
            getPropCaseInsensitive(row, ['email', 'email address', 'user_uid']).toLowerCase() === emailToCheck.toLowerCase()
          );
          if (target && checkIsSuperAdmin(target)) {
            setCanAccessSuperAdmin(true);
            return;
          }
        }
        // Jika tidak terbukti Super Admin di database, bersihkan state
        setIsSuperAdminMode(false);
        setCanAccessSuperAdmin(false);
        localStorage.removeItem('hris_super_admin_active');
        localStorage.removeItem('hris_original_super_admin');
      } else {
        setCanAccessSuperAdmin(false);
        setIsSuperAdminMode(false);
      }
    };

    checkSuperAdminPermission();
  }, []);

  // 4. Periksa sesi login yang aktif
  useEffect(() => {
    const existing = localStorage.getItem('hris_session_data');
    if (existing && !isSuperAdminMode) {
      navigate('/');
    }
  }, [navigate, isSuperAdminMode]);

  // 5. OAuth redirection listener (HANYA saat user benar-benar login baru)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const currentSession = localStorage.getItem('hris_session_data');
        if (!currentSession) {
          await validateAndLoginOAuth(session.user.email);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 6. Muat data Super Admin jika mode aktif
  useEffect(() => {
    if (isSuperAdminMode && canAccessSuperAdmin) {
      loadSuperAdminData();
    }
  }, [isSuperAdminMode, canAccessSuperAdmin]);

  const loadSuperAdminData = async () => {
    try {
      const { data: compData } = await supabase.from('company').select('*').limit(100);
      if (compData) setCompanies(compData);

      const empData = await fetchDirectory();
      if (empData && empData.length > 0) {
        setAllEmployees(empData);
        filterSuperAdminEmployees(empData, selectedCompany, '');
      }
    } catch (e) {
      console.warn("Super admin load error:", e);
    }
  };

  const filterSuperAdminEmployees = (employeesList, compFilter, search) => {
    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';
    const seenEmails = new Set();
    const result = [];

    (employeesList || allEmployees).forEach((emp) => {
      const email = getPropCaseInsensitive(emp, ['email', 'email address', 'user_uid'], '').trim();
      if (!email || seenEmails.has(email.toLowerCase())) return;

      if (compFilter) {
        const empComp = getPropCaseInsensitive(emp, ['Company', 'company', 'companyuid', 'company_uid', 'company_id'], '').toLowerCase().trim();
        const compObj = companies.find(c => getPropCaseInsensitive(c, ['CompanyUID', 'companyuid', 'id', 'uid']) === compFilter);
        const compName = compObj ? getPropCaseInsensitive(compObj, ['Company Name', 'company_name', 'name'], '').toLowerCase().trim() : '';

        if (empComp !== compFilter.toLowerCase() && empComp !== compName) {
          return;
        }
      }

      const name = getPropCaseInsensitive(emp, ['name', 'nama', 'fullname', 'nama_lengkap', 'full_name', 'employee_name'], 'User');
      const dept = getPropCaseInsensitive(emp, ['department', 'dept', 'job title', 'jobtitle', 'position'], '');

      if (search) {
        const q = search.toLowerCase();
        if (!name.toLowerCase().includes(q) && !email.toLowerCase().includes(q) && !dept.toLowerCase().includes(q)) {
          return;
        }
      }

      const photo = getPropCaseInsensitive(emp, ['link', 'photo', 'picture', 'avatar', 'foto'], defaultAvatar) || defaultAvatar;

      seenEmails.add(email.toLowerCase());
      result.push({ email, name, photo, dept, raw: emp });
    });

    result.sort((a, b) => a.name.localeCompare(b.name));
    setFilteredEmployees(result);
  };

  const handleCompanyChange = (e) => {
    const val = e.target.value;
    setSelectedCompany(val);
    filterSuperAdminEmployees(allEmployees, val, empSearchQuery);
    if (selectedEmployee && selectedEmployee.raw) {
      const empComp = getPropCaseInsensitive(selectedEmployee.raw, ['Company', 'company', 'companyuid', 'company_uid'], '').toLowerCase();
      if (val && empComp !== val.toLowerCase()) {
        setSelectedEmployee(null);
      }
    }
  };

  const handleSearchEmpChange = (e) => {
    const q = e.target.value;
    setEmpSearchQuery(q);
    filterSuperAdminEmployees(allEmployees, selectedCompany, q);
  };

  const selectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmpDropdownOpen(false);
    setAlert(null);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAlert(null);

    let targetEmail = '';
    if (isSuperAdminMode && canAccessSuperAdmin) {
      if (!selectedEmployee) {
        setAlert({ message: t.pleaseSelectEmployee, type: 'error' });
        return;
      }
      targetEmail = selectedEmployee.email;
    } else {
      targetEmail = emailInput.trim().toLowerCase();
    }

    if (!targetEmail) {
      setAlert({ message: t.pleaseSelectEmployee, type: 'error' });
      return;
    }

    setIsLoading(true);

    // Bypass OTP dalam Super Admin Mode
    if (isSuperAdminMode && canAccessSuperAdmin) {
      try {
        const data = await fetchDirectory();
        const target = data.find(row => 
          Object.values(row).some(v => typeof v === 'string' && v.trim().toLowerCase() === targetEmail.toLowerCase())
        );
        if (!target) throw new Error(`${t.emailNotRegistered} (${targetEmail})`);

        // Simpan akun Super Admin asli agar tidak hilang saat berganti akun
        const currentSessionStr = localStorage.getItem('hris_session_data');
        const savedOriginal = localStorage.getItem('hris_original_super_admin');
        if (!savedOriginal && currentSessionStr) {
          try {
            const curObj = JSON.parse(currentSessionStr);
            if (checkIsSuperAdmin(curObj)) {
              localStorage.setItem('hris_original_super_admin', JSON.stringify(curObj));
            }
          } catch (e) {}
        }

        localStorage.setItem('hris_super_admin_active', 'true');
        localStorage.setItem('hris_session_data', JSON.stringify(target));
        navigate('/');
        return;
      } catch (err) {
        setAlert({ message: err.message, type: 'error' });
        setIsLoading(false);
        return;
      }
    }

    // Normal User Flow
    try {
      const data = await fetchDirectory();
      const target = data.find(row => 
        Object.values(row).some(v => typeof v === 'string' && v.trim().toLowerCase() === targetEmail.toLowerCase())
      );
      if (!target) throw new Error(`${t.emailNotRegistered} (${targetEmail})`);

      const status = (target.STATUS || target.Status || target.status || '').toLowerCase();
      if (status && status !== 'active') throw new Error(t.accountInactive);

      // Bypass OTP jika perangkat sudah terverifikasi
      if (isDeviceVerifiedForEmail(targetEmail)) {
        localStorage.setItem('hris_session_data', JSON.stringify(target));
        if (checkIsSuperAdmin(target)) {
          localStorage.setItem('hris_original_super_admin', JSON.stringify(target));
        }
        navigate('/');
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin
        }
      });

      if (otpError) {
        const match = otpError.message.match(/after (\d+) seconds/);
        if (match && match[1]) {
          const sec = parseInt(match[1], 10);
          setCooldown(sec);
          throw new Error(currentLang === 'id' ? `Terlalu banyak percobaan. Silakan tunggu ${sec} detik lagi.` : `Too many requests. Please wait ${sec} seconds.`);
        }
        throw new Error(otpError.message);
      }

      setActiveEmail(targetEmail);
      setStep('otp');
      setAlert({ message: t.otpSentSuccess, type: 'success' });
    } catch (err) {
      setAlert({ message: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAlert(null);
    setIsLoading(true);

    try {
      const token = otpCode.replace(/\s+/g, '').trim();
      let { error } = await supabase.auth.verifyOtp({
        email: activeEmail,
        token: token,
        type: 'email'
      });

      if (error) {
        const signupTry = await supabase.auth.verifyOtp({
          email: activeEmail,
          token: token,
          type: 'signup'
        });
        error = signupTry.error;
      }

      if (error) throw new Error(t.invalidOtp);

      const data = await fetchDirectory();
      const target = data.find(row => 
        Object.values(row).some(v => typeof v === 'string' && v.trim().toLowerCase() === activeEmail.toLowerCase())
      );

      if (target) {
        localStorage.setItem('hris_session_data', JSON.stringify(target));
        markDeviceAsVerified(activeEmail);

        if (checkIsSuperAdmin(target)) {
          localStorage.setItem('hris_original_super_admin', JSON.stringify(target));
        }
      }
      navigate('/');
    } catch (err) {
      setAlert({ message: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAlert(null);
    try {
      let redirectTarget = window.location.origin;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        redirectTarget = 'http://localhost:5173';
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      setAlert({ message: err.message, type: 'error' });
    }
  };

  const validateAndLoginOAuth = async (email) => {
    try {
      const data = await fetchDirectory();
      const target = data.find(row => 
        Object.values(row).some(v => typeof v === 'string' && v.trim().toLowerCase() === email.toLowerCase())
      );

      if (!target) {
        await supabase.auth.signOut();
        setAlert({ message: `${t.emailNotRegistered} (${email})`, type: 'error' });
        return;
      }

      const status = (target.STATUS || target.Status || target.status || '').toLowerCase();
      if (status && status !== 'active') {
        await supabase.auth.signOut();
        setAlert({ message: t.accountInactive, type: 'error' });
        return;
      }

      localStorage.setItem('hris_session_data', JSON.stringify(target));
      markDeviceAsVerified(email);

      if (checkIsSuperAdmin(target)) {
        localStorage.setItem('hris_original_super_admin', JSON.stringify(target));
      }
      navigate('/');
    } catch (err) {
      setAlert({ message: err.message, type: 'error' });
    }
  };

  const disableSuperAdminMode = async () => {
    setIsSuperAdminMode(false);
    localStorage.removeItem('hris_super_admin_active');
    setSelectedEmployee(null);
    setAlert(null);

    let originalUser = null;
    const savedOriginal = localStorage.getItem('hris_original_super_admin');
    if (savedOriginal) {
      try {
        originalUser = JSON.parse(savedOriginal);
      } catch (e) {}
    }

    if (originalUser && checkIsSuperAdmin(originalUser)) {
      localStorage.setItem('hris_session_data', JSON.stringify(originalUser));
      const nameOrEmail = originalUser.Name || originalUser.name || originalUser.fullname || originalUser.email || 'Super Admin';
      window.alert(currentLang === 'id' 
        ? `Super Admin Mode dinonaktifkan. Kembali ke profil asli (${nameOrEmail}).` 
        : `Super Admin Mode disabled. Reverted to original profile (${nameOrEmail}).`);
      navigate('/');
    } else {
      localStorage.removeItem('hris_original_super_admin');
      setCanAccessSuperAdmin(false);
      window.alert(currentLang === 'id' ? "Super Admin Mode dinonaktifkan." : "Super Admin Mode disabled.");
      navigate('/login');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 bg-gray-100">
      
      {/* Floating Widget Top-Left */}
      <div className="absolute top-4 left-4 hidden sm:flex items-center space-x-2 text-xs font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 transition-all z-10">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{timeStr || 'Fri, Oct 30 - 10:29'}</span>
        <span className="text-gray-300">|</span>
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span>{locationName}</span>
        <span className="text-gray-300">|</span>
        <span className="font-bold text-gray-700">{weatherText}</span>
      </div>

      {/* Main Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-200 mt-10 md:mt-0">
        
        {/* Mobile Widget */}
        <div className="flex sm:hidden justify-center items-center space-x-1.5 text-[10px] text-gray-500 bg-gray-50 py-1.5 px-3 rounded-full mb-3 border border-gray-200 mx-auto w-max">
          <span className="font-medium">{timeStr || 'Loading time...'}</span>
          <span className="opacity-50">|</span>
          <span className="font-bold text-gray-700">{weatherText}</span>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-blue-600">HRIS Portal</h1>
          
          <p className="text-sm text-gray-500 mt-1.5 flex items-center justify-center gap-1">
            {isSuperAdminMode && canAccessSuperAdmin ? (
              <span className="text-indigo-600 font-bold flex items-center gap-1">
                <span className="text-amber-500">⚡</span> Super Admin Mode
              </span>
            ) : (
              t.authSubtitle
            )}
          </p>

          {/* TOGGLE SUPER ADMIN: HANYA MUNCUL JIKA USER ADALAH SUPER ADMIN */}
          {canAccessSuperAdmin && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const nextState = !isSuperAdminMode;
                  setIsSuperAdminMode(nextState);
                  if (nextState) {
                    localStorage.setItem('hris_super_admin_active', 'true');
                  } else {
                    localStorage.removeItem('hris_super_admin_active');
                  }
                  setAlert(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer ${
                  isSuperAdminMode 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200' 
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span className={isSuperAdminMode ? 'text-amber-500' : 'text-gray-400'}>⚡</span>
                <span>{isSuperAdminMode ? 'Mode Super Admin: ON' : 'Switch to Super Admin'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Alert Notification */}
        {alert && (
          <div className={`mb-4 p-3 rounded-lg text-sm text-center font-medium border leading-relaxed ${
            alert.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
          }`}>
            {alert.message}
          </div>
        )}

        {/* Super Admin Active Banner */}
        {isSuperAdminMode && canAccessSuperAdmin && (
          <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-900 font-semibold">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
              </span>
              <span>Super Admin: <strong className="text-indigo-700">Bypass OTP Active</strong></span>
            </div>
            <button 
              type="button" 
              onClick={disableSuperAdminMode} 
              className="text-red-500 hover:text-red-700 font-bold hover:underline ml-2 cursor-pointer"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* STEP 1: Email Input Form */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isSuperAdminMode && canAccessSuperAdmin ? (
                  <span>
                    Selected Employee <span className="text-indigo-600 font-semibold text-xs">(Bypass OTP)</span>
                  </span>
                ) : (
                  t.emailLabel
                )}
              </label>

              {/* Normal Input */}
              {(!isSuperAdminMode || !canAccessSuperAdmin) ? (
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required 
                  placeholder="nama@perusahaan.com" 
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-xs"
                />
              ) : (
                /* Super Admin Mode Dropdowns */
                <div className="space-y-3">
                  <div className="relative">
                    <select 
                      value={selectedCompany} 
                      onChange={handleCompanyChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-700 font-medium transition cursor-pointer shadow-xs appearance-none"
                    >
                      <option value="">{t.allCompanies}</option>
                      {companies.map(c => {
                        const uid = getPropCaseInsensitive(c, ['CompanyUID', 'companyuid', 'id', 'uid']);
                        const name = getPropCaseInsensitive(c, ['Company Name', 'company_name', 'name'], 'Company');
                        return <option key={uid} value={uid}>{name}</option>;
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>

                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setEmpDropdownOpen(!empDropdownOpen)} 
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs hover:bg-gray-50 text-left transition"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        {selectedEmployee?.photo ? (
                          <img 
                            src={selectedEmployee.photo} 
                            alt="Avatar" 
                            className="w-5 h-5 rounded-full object-cover border border-gray-200 shrink-0 bg-gray-100" 
                          />
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        )}
                        <span className={`truncate text-sm ${selectedEmployee ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                          {selectedEmployee?.name || t.selectEmployee}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>

                    {empDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-gray-50 animate-fadeIn">
                        <div className="p-2 sticky top-0 bg-white border-b border-gray-100 z-10" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={empSearchQuery}
                            onChange={handleSearchEmpChange}
                            placeholder="Search employee..." 
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50"
                          />
                        </div>
                        <div className="py-1">
                          {filteredEmployees.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400 text-center">No employee found</div>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <button 
                                key={emp.email}
                                type="button" 
                                onClick={() => selectEmployee(emp)}
                                className="w-full px-3 py-2 flex items-center space-x-3 hover:bg-indigo-50 text-left transition group border-b border-gray-50 last:border-b-0"
                              >
                                <img 
                                  src={emp.photo} 
                                  alt={emp.name} 
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 bg-gray-100" 
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 truncate">{emp.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{emp.dept ? emp.dept + ' • ' : ''}{emp.email}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || cooldown > 0}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition duration-150 shadow-xs flex items-center justify-center gap-1.5 ${
                (isSuperAdminMode && canAccessSuperAdmin)
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${isLoading || cooldown > 0 ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
            >
              {isLoading ? (
                <span>{(isSuperAdminMode && canAccessSuperAdmin) ? 'Logging in...' : t.loadingData}</span>
              ) : cooldown > 0 ? (
                <span>{currentLang === 'id' ? `Tunggu ${cooldown}s` : `Wait ${cooldown}s`}</span>
              ) : (isSuperAdminMode && canAccessSuperAdmin) ? (
                t.directLoginBtn
              ) : isDeviceVerifiedForEmail(emailInput) ? (
                (currentLang === 'id' ? 'Masuk' : 'Log In')
              ) : (
                t.sendOtpBtn
              )}
            </button>

            {/* Google Sign-In & OR Divider */}
            {(!isSuperAdminMode || !canAccessSuperAdmin) && (
              <>
                <div className="relative my-5 flex items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                    {t.orText}
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button 
                  type="button" 
                  onClick={handleGoogleLogin} 
                  className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl font-medium text-sm hover:bg-gray-50 transition duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{t.googleBtn}</span>
                </button>
              </>
            )}

          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span>{t.otpSentTo}</span> <br />
                <strong className="text-gray-800">{activeEmail}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.otpInputLabel}
              </label>
              <input 
                type="text" 
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required 
                maxLength={10} 
                placeholder="123456" 
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-center tracking-widest text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm hover:bg-green-700 transition duration-150 mb-3 shadow-xs cursor-pointer"
            >
              {isLoading ? t.verifyingOtp : t.verifyBtn}
            </button>

            <button 
              type="button" 
              onClick={() => { setStep('email'); setOtpCode(''); setAlert(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-800 text-center cursor-pointer"
            >
              {t.resendBtn}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}