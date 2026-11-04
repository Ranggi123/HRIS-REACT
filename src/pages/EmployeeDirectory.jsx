import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TABLE_EMPLOYEES = ['employee_directory', 'employee directory', 'Employee Directory', 'employees'];
const ITEMS_PER_PAGE = 12; // Jumlah kartu per halaman agar pas 3 baris x 4 kolom

export default function EmployeeDirectory() {
  const context = useOutletContext() || {};
  const currentUser = context.currentUser;
  const currentLang = context.currentLang || 'en';

  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Filter States (Status filter dikontrol via tab summary)
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // Default 'All' atau 'Active'
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Accordion Panels
  const [showNewEmp, setShowNewEmp] = useState(true);
  const [showOffEmp, setShowOffEmp] = useState(true);

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

  // 1. Pengambilan Data Murni berdasarkan Company = User Login Company
  const fetchDirectory = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const userCompany = getPropCaseInsensitive(currentUser, ['company', 'Company Name', 'companyuid']).trim().toLowerCase();

    try {
      let rawData = [];
      for (const tbl of TABLE_EMPLOYEES) {
        const { data: resData, error } = await supabase.from(tbl).select('*').limit(3000);
        if (!error && resData && resData.length > 0) {
          rawData = resData;
          break;
        }
      }

      if (rawData.length > 0) {
        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';

        let formattedData = rawData.map(emp => {
          const name = getPropCaseInsensitive(emp, ['name', 'nama', 'fullname', 'full_name'], 'User');
          const dept = getPropCaseInsensitive(emp, ['department', 'Department', 'dept'], 'General');
          const jobTitle = getPropCaseInsensitive(emp, ['job title', 'job_title', 'Job Title', 'position'], '-');
          const empId = getPropCaseInsensitive(emp, ['employee id', 'employee_id', 'employeeid', 'id'], '-');
          const email = getPropCaseInsensitive(emp, ['email', 'Email', 'user_uid'], '-');
          const workEmail = getPropCaseInsensitive(emp, ['Employee work email', 'work_email', 'work email'], email);
          const phone = getPropCaseInsensitive(emp, ['phone number', 'phone_number', 'phone', 'telepon'], '-');
          const status = getPropCaseInsensitive(emp, ['status', 'Status', 'STATUS'], 'Active');
          const photo = getPropCaseInsensitive(emp, ['link', 'Link', 'photo', 'picture', 'avatar'], defaultAvatar);
          const comp = getPropCaseInsensitive(emp, ['company', 'Company Name', 'companyuid', 'company_uid'], '').trim().toLowerCase();
          const joinDate = getPropCaseInsensitive(emp, ['join date', 'joindate', 'Join Date', 'date_of_joining'], '');

          return { name, dept, jobTitle, empId, email, workEmail, phone, status, photo, comp, joinDate, raw: emp };
        });

        // Filter ketat: Company = User Company
        if (userCompany) {
          formattedData = formattedData.filter(emp => 
            emp.comp === userCompany || 
            emp.comp.includes(userCompany) || 
            userCompany.includes(emp.comp)
          );
        }

        // Ambil daftar unik departemen
        const depts = [...new Set(formattedData.map(e => e.dept))].filter(d => d && d !== '-').sort();
        setDepartments(depts);
        setEmployees(formattedData);
      }
    } catch (e) {
      console.warn("Gagal mengambil data direktori:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [deptFilter, statusFilter, searchQuery]);

  // 2. Karyawan Baru (Join Date di Bulan Ini)
  const newEmployees = useMemo(() => {
    const today = new Date();
    const curM = today.getMonth();
    const curY = today.getFullYear();

    return employees.filter(emp => {
      if (!emp.joinDate || emp.joinDate === '-') return false;
      const pDate = parseFlexibleDate(emp.joinDate);
      return pDate && pDate.getMonth() === curM && pDate.getFullYear() === curY;
    });
  }, [employees]);

  // 3. Karyawan Resign / Off-Boarding
  const offBoardingEmployees = useMemo(() => {
    return employees.filter(emp => {
      const s = emp.status.toLowerCase();
      return s.includes('resign') || s.includes('off-boarding') || s.includes('off boarding');
    });
  }, [employees]);

  // 4. Data Filter untuk Summary Card / Tabs
  const summaryBase = useMemo(() => {
    return employees.filter(emp => {
      if (deptFilter && emp.dept !== deptFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!emp.name.toLowerCase().includes(q) && 
            !emp.empId.toLowerCase().includes(q) && 
            !emp.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  const totalCount = summaryBase.length;
  const activeCount = summaryBase.filter(emp => {
    const s = emp.status.toLowerCase();
    return !s.includes('inactive') && !s.includes('resign') && !s.includes('off');
  }).length;
  const inactiveCount = totalCount - activeCount;

  // 5. Data Filter untuk Grid List Utama
  const filteredList = useMemo(() => {
    const today = new Date();
    const curM = today.getMonth();
    const curY = today.getFullYear();

    return employees.filter(emp => {
      const s = emp.status.toLowerCase();
      const isOff = s.includes('resign') || s.includes('off-boarding') || s.includes('off boarding');
      if (isOff) return false;

      if (emp.joinDate && emp.joinDate !== '-') {
        const pDate = parseFlexibleDate(emp.joinDate);
        if (pDate && pDate.getMonth() === curM && pDate.getFullYear() === curY) {
          return false;
        }
      }

      // Filter Departemen
      if (deptFilter && emp.dept !== deptFilter) return false;

      // Filter Status dari Tab Aktif
      if (statusFilter === 'Active') {
        if (s.includes('inactive') || s.includes('resign') || s.includes('off')) return false;
      } else if (statusFilter === 'Inactive') {
        if (!s.includes('inactive') && !s.includes('resign') && !s.includes('off')) return false;
      }

      // Filter Search Box
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!emp.name.toLowerCase().includes(q) && 
            !emp.empId.toLowerCase().includes(q) && 
            !emp.email.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, deptFilter, statusFilter, searchQuery]);

  // 6. Logika Pagination
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredList, currentPage]);

  const startIndexDisplay = filteredList.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndexDisplay = Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length);

  // Helper WhatsApp URL
  const formatWhatsappUrl = (phone) => {
    if (!phone || phone === '-') return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3.5 sm:p-6 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 z-20 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-semibold text-blue-600">Loading directory records...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-4 sm:mb-5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            {currentLang === 'id' ? 'Direktori Karyawan' : 'Employee Directory'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentLang === 'id' ? 'Lihat daftar karyawan' : 'View list of employees'}
          </p>
        </div>
        <button 
          onClick={fetchDirectory} 
          disabled={isLoading}
          className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
          title="Refresh Data"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>{isLoading ? (currentLang === 'id' ? 'Memuat...' : 'Loading...') : 'Refresh'}</span>
        </button>
      </div>

      {/* Accordion 1: New Employees (This Month) */}
      {newEmployees.length > 0 && (
        <div className="mb-3.5 border-l-4 border-indigo-500 bg-indigo-50/50 rounded-r-xl overflow-hidden shadow-xs">
          <div 
            onClick={() => setShowNewEmp(!showNewEmp)}
            className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-indigo-100/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <h4 className="font-bold text-indigo-900 text-sm">
                {currentLang === 'id' ? 'Karyawan Baru (Bulan Ini)' : 'New Employees (This Month)'}
              </h4>
              <span className="bg-indigo-200 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {newEmployees.length}
              </span>
            </div>
            <svg className={`w-5 h-5 text-indigo-600 transition-transform duration-200 ${showNewEmp ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>

          {showNewEmp && (
            <div className="p-3 sm:p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {newEmployees.map((emp, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={emp.photo} 
                      alt={emp.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-gray-50 shrink-0" 
                      onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }} 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{emp.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{emp.jobTitle}</p>
                    </div>
                  </div>
                  <a 
                    href={formatWhatsappUrl(emp.phone)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition shrink-0 ml-2"
                    title="Chat via WhatsApp"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accordion 2: Resign / Off-Boarding */}
      {offBoardingEmployees.length > 0 && (
        <div className="mb-4 sm:mb-5 border-l-4 border-red-500 bg-red-50/40 rounded-r-xl overflow-hidden shadow-xs">
          <div 
            onClick={() => setShowOffEmp(!showOffEmp)}
            className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-red-100/60 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <h4 className="font-bold text-red-900 text-sm">Resign / Off-Boarding</h4>
              <span className="bg-red-200 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {offBoardingEmployees.length}
              </span>
            </div>
            <svg className={`w-5 h-5 text-red-600 transition-transform duration-200 ${showOffEmp ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>

          {showOffEmp && (
            <div className="p-3 sm:p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {offBoardingEmployees.map((emp, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={emp.photo} 
                      alt={emp.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-gray-50 shrink-0" 
                      onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }} 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{emp.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{emp.jobTitle}</p>
                    </div>
                  </div>
                  <a 
                    href={formatWhatsappUrl(emp.phone)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition shrink-0 ml-2"
                    title="Chat via WhatsApp"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Row: Hanya Departemen & Pencarian */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-4 sm:mb-5">
        <div className="w-full sm:w-1/2">
          <select 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 shadow-xs cursor-pointer"
          >
            <option value="">{currentLang === 'id' ? 'Semua Departemen' : 'All Departments'}</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-1/2">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentLang === 'id' ? 'Cari karyawan...' : 'Search employee...'}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Segmented Pill Tabs (Summary Style Sesuai Gambar) */}
      <div className="flex mb-4 sm:mb-6 overflow-x-auto">
        <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/60 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none ${
              statusFilter === 'All'
                ? 'bg-white text-gray-900 font-bold shadow-xs'
                : 'text-blue-600 hover:text-blue-700 font-medium'
            }`}
          >
            Total ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Active')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none ${
              statusFilter === 'Active'
                ? 'bg-white text-gray-900 font-bold shadow-xs'
                : 'text-blue-600 hover:text-blue-700 font-medium'
            }`}
          >
            {currentLang === 'id' ? `Aktif (${activeCount})` : `Active (${activeCount})`}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Inactive')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none ${
              statusFilter === 'Inactive'
                ? 'bg-white text-gray-900 font-bold shadow-xs'
                : 'text-blue-600 hover:text-blue-700 font-medium'
            }`}
          >
            {currentLang === 'id' ? `Tidak Aktif (${inactiveCount})` : `Inactive (${inactiveCount})`}
          </button>
        </div>
      </div>

      {/* Grid Kartu Karyawan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {paginatedEmployees.map((emp, idx) => {
          const s = emp.status.toLowerCase();
          const isActive = !s.includes('inactive') && !s.includes('resign') && !s.includes('off');
          const stripColor = isActive ? 'bg-green-500' : 'bg-red-500';
          const initials = emp.name ? emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';

          return (
            <div 
              key={idx} 
              className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group"
            >
              {/* Top Colored Status Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${stripColor}`}></div>

              {/* Avatar + Name + Emp ID */}
              <div className="flex items-start justify-between mb-3 mt-1">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={emp.photo} 
                      alt="Photo" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 bg-gray-50"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${initials}&background=e0e7ff&color=4f46e5&bold=true`;
                      }} 
                    />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${stripColor}`}></span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 leading-tight truncate w-36 sm:w-44" title={emp.name}>
                      {emp.name}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1 inline-block">
                      {emp.empId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Job Title & Department */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-start space-x-2 text-xs">
                  <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-700 leading-tight truncate">{emp.jobTitle}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{emp.dept}</p>
                  </div>
                </div>

                {/* Email & Phone WhatsApp Button */}
                <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-gray-600 truncate" title={emp.workEmail}>
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    <span className="truncate">{emp.workEmail}</span>
                  </div>

                  <a 
                    href={formatWhatsappUrl(emp.phone)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center space-x-2 text-xs text-gray-600 hover:text-green-600 truncate transition-colors cursor-pointer group"
                    title="Chat via WhatsApp"
                  >
                    <div className="bg-gray-100 group-hover:bg-green-100 p-1 rounded-full transition-colors flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                    </div>
                    <span className="truncate font-medium">{emp.phone}</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && !isLoading && (
          <div className="col-span-full p-8 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl italic">
            {currentLang === 'id' ? 'Tidak ada data karyawan yang cocok.' : 'No employee records matched.'}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-5 mt-6 gap-3">
          <p className="text-xs text-gray-500 font-medium">
            {currentLang === 'id' ? (
              <>Menampilkan <span className="font-bold text-gray-800">{startIndexDisplay}</span> - <span className="font-bold text-gray-800">{endIndexDisplay}</span> dari <span className="font-bold text-gray-800">{filteredList.length}</span> karyawan</>
            ) : (
              <>Showing <span className="font-bold text-gray-800">{startIndexDisplay}</span> to <span className="font-bold text-gray-800">{endIndexDisplay}</span> of <span className="font-bold text-gray-800">{filteredList.length}</span> employees</>
            )}
          </p>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 shadow-xs cursor-pointer'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{currentLang === 'id' ? 'Sebelumnya' : 'Previous'}</span>
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 shadow-xs cursor-pointer'
              }`}
            >
              <span>{currentLang === 'id' ? 'Selanjutnya' : 'Next'}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}