import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate, useOutletContext } from 'react-router-dom';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_SCHEDULE = 'schedule';
const TABLE_PUBLIC_HOLIDAYS = 'public_holidays';
const TABLE_EVENTS = ['events', 'event', 'company_events'];
const TABLE_EMPLOYEES = ['employee_directory', 'employee directory', 'Employee Directory', 'employees'];

const formatWhatsappUrl = (phone) => {
  if (!phone || phone === '-') return '#';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return `https://wa.me/${clean}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const currentLang = outletContext?.currentLang || 'en';
  
  const [calendarMode, setCalendarMode] = useState('schedule'); 
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(false);

  // Database Records
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [publicHolidayRecords, setPublicHolidayRecords] = useState([]);
  const [eventRecords, setEventRecords] = useState([]);

  // Today Not Working Schedule Notifications
  const [todayNotifGroups, setTodayNotifGroups] = useState([]);
  const [openCategories, setOpenCategories] = useState({}); // Default tertutup (false)

  // Modal State
  const [scheduleModalData, setScheduleModalData] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('hris_session_data');
    if (!session) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const t = currentLang === 'id' ? {
    todayNotWorkingTitle: 'Today Not Working Schedule',
    titleHoliday: 'Kalender Libur Nasional',
    titleEvent: 'Kalender Acara',
    titleSchedule: 'Kalender Jadwal Kerja',
    subHoliday: 'Detail kalender libur nasional',
    subEvent: 'Detail kalender acara',
    subSchedule: 'Detail kalender Anda',
    refresh: 'Muat Ulang',
    loading: 'Memuat...',
    optSchedule: 'Jadwal Kerja',
    optHoliday: 'Libur Nasional',
    optEvent: 'Acara',
    thisMonth: 'Bulan Ini',
    statDayOff: 'Libur',
    statWorking: 'Kerja',
    statSick: 'Sakit/Lain',
    statLeave: 'Cuti',
    legend: 'Legenda',
    legWorking: 'Hari Kerja',
    legSick: 'Sakit / Melahirkan',
    legOff: 'Hari Libur',
    legLeave: 'Cuti Tahunan / DP / EO',
    legNoSched: 'Tidak Ada Jadwal',
    modalTitle: 'Detail Jadwal',
    modalDate: 'Tanggal',
    modalType: 'Tipe / Status',
    modalShift: 'Shift',
    modalCheckIn: 'Waktu Check In',
    modalCheckOut: 'Waktu Check Out',
    modalLastEditBy: 'Terakhir Diedit Oleh',
    modalLastEditTime: 'Waktu Terakhir Diedit',
    btnClose: 'Tutup',
    missedOut: 'Belum check out',
    missedOutBadge: 'Terlewat',
    workingDay: 'Hari Kerja',
    chatWa: 'Chat via WhatsApp',
    daysOfWeek: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
    daysFull: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  } : {
    todayNotWorkingTitle: 'Today Not Working Schedule',
    titleHoliday: 'Public Holiday Calendar',
    titleEvent: 'Event Calendar',
    titleSchedule: 'Work Schedule Calendar',
    subHoliday: 'Detail of public holiday calendar',
    subEvent: 'Detail of event calendar',
    subSchedule: 'Detail of your calendar',
    refresh: 'Refresh',
    loading: 'Loading...',
    optSchedule: 'Working Schedule',
    optHoliday: 'Public Holiday',
    optEvent: 'Event',
    thisMonth: 'This Month',
    statDayOff: 'Day Off',
    statWorking: 'Working',
    statSick: 'Sick/Oth',
    statLeave: 'Leave',
    legend: 'Legend',
    legWorking: 'Working Day',
    legSick: 'Sick / Maternity',
    legOff: 'Day Off / Holiday',
    legLeave: 'Annual Leave / DP / EO',
    legNoSched: 'No Schedule',
    modalTitle: 'Schedule Detail',
    modalDate: 'Date',
    modalType: 'Type / Status',
    modalShift: 'Shift',
    modalCheckIn: 'Checked In At',
    modalCheckOut: 'Checked Out At',
    modalLastEditBy: 'Last Edit By',
    modalLastEditTime: 'Last Edit Time',
    btnClose: 'Close',
    missedOut: 'Not checked out',
    missedOutBadge: 'Missed Out',
    workingDay: 'Working Day',
    chatWa: 'Chat via WhatsApp',
    daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    daysFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };

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

  const formatIndoDateTime = (val) => {
    if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
    const s = String(val).trim();
    if (/^\d{1,2}[:.]\d{2}(?:[:.]\d{2})?$/.test(s)) {
      const parts = s.split(/[:.]/);
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    const m1 = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s]+(\d{1,2})[:.](\d{1,2}))?/);
    if (m1) {
      const y = m1[1];
      const m = m1[2].padStart(2, '0');
      const d = m1[3].padStart(2, '0');
      if (m1[4]) {
        const hh = m1[4].padStart(2, '0');
        const mm = m1[5].padStart(2, '0');
        return `${d}-${m}-${y} ${hh}:${mm}`;
      }
      return `${d}-${m}-${y}`;
    }
    const m2 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s]+(\d{1,2})[:.](\d{1,2}))?/);
    if (m2) {
      const d = m2[1].padStart(2, '0');
      const m = m2[2].padStart(2, '0');
      const y = m2[3];
      if (m2[4]) {
        const hh = m2[4].padStart(2, '0');
        const mm = m2[5].padStart(2, '0');
        return `${d}-${m}-${y} ${hh}:${mm}`;
      }
      return `${d}-${m}-${y}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      const hh = String(parsed.getHours()).padStart(2, '0');
      const mm = String(parsed.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hh}:${mm}`;
    }
    return s;
  };

  const formatLastEditDate = (val) => {
    if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
    const s = String(val).trim();
    let parsed = new Date(s);
    
    if (isNaN(parsed.getTime())) {
      const m1 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s]+(\d{1,2})[:.](\d{1,2}))?/);
      if (m1) {
        const d = m1[1];
        const m = m1[2];
        const y = m1[3];
        const hh = m1[4] || '00';
        const mm = m1[5] || '00';
        parsed = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hh.padStart(2,'0')}:${mm.padStart(2,'0')}:00`);
      }
    }

    if (!isNaN(parsed.getTime())) {
      const dayName = t.daysFull[parsed.getDay()];
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mmm = t.monthsShort[parsed.getMonth()];
      const yyyy = parsed.getFullYear();
      const hh = String(parsed.getHours()).padStart(2, '0');
      const min = String(parsed.getMinutes()).padStart(2, '0');
      
      return `${dayName}, ${dd}-${mmm}-${yyyy} ${hh}:${min}`;
    }
    return s;
  };

  const checkDateMatch = (rawDbDate, targetYear, targetMonth, targetDay) => {
    if (!rawDbDate) return false;
    const str = String(rawDbDate).trim();
    if (str.includes('-')) {
      const parts = str.split('T')[0].split(' ')[0].split('-');
      if (parts.length === 3) {
        return parseInt(parts[0], 10) === targetYear && (parseInt(parts[1], 10) - 1) === targetMonth && parseInt(parts[2], 10) === targetDay;
      }
    }
    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10), p2 = parseInt(parts[2], 10);
        if (p2 === targetYear) {
          if ((p1 - 1) === targetMonth && p0 === targetDay) return true;
          if ((p0 - 1) === targetMonth && p1 === targetDay) return true;
        }
      }
    }
    if (!isNaN(str) && Number(str) > 30000 && Number(str) < 60000) {
      const excelDate = new Date((Number(str) - 25569) * 86400 * 1000);
      return excelDate.getFullYear() === targetYear && excelDate.getMonth() === targetMonth && excelDate.getDate() === targetDay;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear() === targetYear && parsed.getMonth() === targetMonth && parsed.getDate() === targetDay;
    }
    return false;
  };

  const getScheduleStyle = (type) => {
    if (!type) return { cardClass: 'bg-white border-gray-200 text-gray-700', badgeClass: 'bg-gray-100 text-gray-700', badgeText: '', shortCode: '' };
    const tLower = type.toLowerCase().trim();

    if (tLower.includes('working') || tLower === 'work' || tLower.includes('kerja')) {
      return {
        cardClass: 'bg-green-100 border-green-300 text-green-950 font-medium',
        badgeClass: 'bg-green-600 text-white',
        badgeText: t.workingDay,
        shortCode: 'W'
      };
    }
    if (tLower.includes('sick') || tLower.includes('matternity') || tLower.includes('maternity') || tLower.includes('compassionate') || tLower.includes('sakit') || tLower.includes('melahirkan') || tLower.includes('duka')) {
      return {
        cardClass: 'bg-pink-100 border-pink-300 text-pink-950 font-medium',
        badgeClass: 'bg-pink-500 text-white',
        badgeText: type,
        shortCode: 'S'
      };
    }
    if (tLower.includes('day off') || tLower === 'off' || tLower.includes('public holiday') || tLower.includes('holiday') || tLower.includes('libur')) {
      return {
        cardClass: 'bg-red-100 border-red-300 text-red-950 font-medium',
        badgeClass: 'bg-red-600 text-white',
        badgeText: type,
        shortCode: 'D'
      };
    }
    return {
      cardClass: 'bg-orange-100 border-orange-300 text-orange-950 font-medium',
      badgeClass: 'bg-orange-500 text-white',
      badgeText: type,
      shortCode: 'L'
    };
  };

  // Styling & Icon untuk setiap kategori accordion
  const getNotifTheme = (categoryType) => {
    const lower = categoryType.toLowerCase().trim();
    if (lower === 'annual leave' || lower.includes('leave') || lower.includes('cuti')) {
      return {
        wrapper: 'border-orange-500 bg-orange-50/50',
        headerHover: 'hover:bg-orange-100/60',
        iconColor: 'text-orange-600',
        titleColor: 'text-orange-900',
        badgeColor: 'bg-orange-200 text-orange-800',
        iconType: 'calendar'
      };
    }
    if (lower === 'public holiday' || lower.includes('holiday')) {
      return {
        wrapper: 'border-red-500 bg-red-50/40',
        headerHover: 'hover:bg-red-100/60',
        iconColor: 'text-red-600',
        titleColor: 'text-red-900',
        badgeColor: 'bg-red-200 text-red-800',
        iconType: 'alert'
      };
    }
    if (lower === 'sick' || lower.includes('sakit') || lower.includes('maternity') || lower.includes('matternity')) {
      return {
        wrapper: 'border-pink-500 bg-pink-50/50',
        headerHover: 'hover:bg-pink-100/60',
        iconColor: 'text-pink-600',
        titleColor: 'text-pink-900',
        badgeColor: 'bg-pink-200 text-pink-800',
        iconType: 'heart'
      };
    }
    if (lower === 'day off' || lower === 'off') {
      return {
        wrapper: 'border-indigo-500 bg-indigo-50/50',
        headerHover: 'hover:bg-indigo-100/60',
        iconColor: 'text-indigo-600',
        titleColor: 'text-indigo-900',
        badgeColor: 'bg-indigo-200 text-indigo-800',
        iconType: 'bolt'
      };
    }
    return {
      wrapper: 'border-blue-500 bg-blue-50/50',
      headerHover: 'hover:bg-blue-100/60',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      badgeColor: 'bg-blue-200 text-blue-800',
      iconType: 'info'
    };
  };

  // Ambil data HARI INI saja (type <> Working Day) & gabungkan dengan profil Employee Directory
  const fetchTodayNotifications = async (user) => {
    try {
      const now = new Date();
      const tYear = now.getFullYear();
      const tMonth = now.getMonth();
      const tDay = now.getDate();

      const padM = String(tMonth + 1).padStart(2, '0');
      const padD = String(tDay).padStart(2, '0');
      const isoToday = `${tYear}-${padM}-${padD}`;
      const dmyDash = `${padD}-${padM}-${tYear}`;
      const dmySlash = `${padD}/${padM}/${tYear}`;
      const mdySlash = `${padM}/${padD}/${tYear}`;
      const dmyShort = `${tDay}/${tMonth + 1}/${tYear}`;
      const mdyShort = `${tMonth + 1}/${tDay}/${tYear}`;

      const userCompany = getPropCaseInsensitive(user, ['company', 'Company Name', 'companyuid', 'company_uid'], '').trim().toLowerCase();

      // 1. Ambil data Employee Directory
      let rawEmployees = [];
      for (const tbl of TABLE_EMPLOYEES) {
        const { data: resData, error } = await supabase.from(tbl).select('*').limit(3000);
        if (!error && resData && resData.length > 0) {
          rawEmployees = resData;
          break;
        }
      }

      const defaultAvatar = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';
      const empLookupMap = new Map();
      const companyEmployees = [];

      rawEmployees.forEach(emp => {
        const comp = getPropCaseInsensitive(emp, ['company', 'Company Name', 'companyuid', 'company_uid'], '').trim().toLowerCase();
        if (userCompany && comp && comp !== userCompany && !comp.includes(userCompany) && !userCompany.includes(comp)) {
          return;
        }

        const formattedEmp = {
          name: getPropCaseInsensitive(emp, ['name', 'nama', 'fullname', 'full_name'], 'User'),
          jobTitle: getPropCaseInsensitive(emp, ['job title', 'job_title', 'Job Title', 'position'], '-'),
          empId: getPropCaseInsensitive(emp, ['employee id', 'employee_id', 'employeeid', 'id'], ''),
          email: getPropCaseInsensitive(emp, ['email', 'Email', 'user_uid'], ''),
          workEmail: getPropCaseInsensitive(emp, ['Employee work email', 'work_email', 'work email'], ''),
          phone: getPropCaseInsensitive(emp, ['phone number', 'phone_number', 'phone', 'telepon'], '-'),
          photo: getPropCaseInsensitive(emp, ['link', 'Link', 'photo', 'picture', 'avatar'], defaultAvatar)
        };

        companyEmployees.push(formattedEmp);

        if (formattedEmp.email) empLookupMap.set(formattedEmp.email.toLowerCase(), formattedEmp);
        if (formattedEmp.workEmail) empLookupMap.set(formattedEmp.workEmail.toLowerCase(), formattedEmp);
        if (formattedEmp.empId) empLookupMap.set(formattedEmp.empId.toLowerCase(), formattedEmp);
        if (formattedEmp.name) empLookupMap.set(formattedEmp.name.toLowerCase(), formattedEmp);
      });

      // 2. Ambil data Schedule khusus HARI INI
      let todaySchedules = [];
      const { data: sampleSched } = await supabase.from(TABLE_SCHEDULE).select('*').limit(1);
      let dateColName = null;
      if (sampleSched && sampleSched.length > 0) {
        dateColName = Object.keys(sampleSched[0]).find(k => {
          const lk = k.toLowerCase().replace(/[\s_-]/g, '');
          return lk === 'date' || lk === 'tanggal' || lk === 'scheduledate' || lk === 'startdate';
        });
      }

      if (dateColName) {
        const orDateFilter = [
          `${dateColName}.eq.${isoToday}`,
          `${dateColName}.ilike.${isoToday}%`,
          `${dateColName}.ilike.%${dmyDash}%`,
          `${dateColName}.ilike.%${dmySlash}%`,
          `${dateColName}.ilike.%${mdySlash}%`,
          `${dateColName}.ilike.%${dmyShort}%`,
          `${dateColName}.ilike.%${mdyShort}%`
        ].join(',');

        const { data: matchedToday, error: todayErr } = await supabase
          .from(TABLE_SCHEDULE)
          .select('*')
          .or(orDateFilter)
          .limit(3000);

        if (!todayErr && matchedToday && matchedToday.length > 0) {
          todaySchedules = matchedToday.filter(row => checkDateMatch(row[dateColName], tYear, tMonth, tDay));
        }
      }

      if (todaySchedules.length === 0) {
        let fbQuery = supabase.from(TABLE_SCHEDULE).select('*');
        if (dateColName) {
          fbQuery = fbQuery.order(dateColName, { ascending: false });
        }
        const { data: fbSched } = await fbQuery.limit(5000);
        if (fbSched) {
          todaySchedules = fbSched.filter(row => {
            const dbDate = dateColName
              ? row[dateColName]
              : getPropCaseInsensitive(row, ['date', 'Date', 'tanggal', 'scheduledate', 'startdate'], null);
            return checkDateMatch(dbDate, tYear, tMonth, tDay);
          });
        }
      }

      // 3. Filter type <> Working Day & kelompokkan berdasarkan type
      const groupedMap = new Map();
      const seenPerCategory = new Set();

      todaySchedules.forEach(row => {
        const rawType = getPropCaseInsensitive(row, ['type', 'Type', 'TYPE', 'status'], '').trim();
        if (!rawType) return;

        const tLower = rawType.toLowerCase();
        // Hanya ambil type <> Working Day
        if (tLower === 'working day' || tLower === 'working' || tLower === 'work' || tLower === 'hari kerja') {
          return;
        }

        const empIdentifier = getPropCaseInsensitive(
          row,
          ['employee', 'email', 'user_uid', 'employee_id', 'employee id', 'name', 'nama', 'employee_name'],
          ''
        ).trim();

        const matchedEmp = empIdentifier ? empLookupMap.get(empIdentifier.toLowerCase()) : null;

        if (userCompany && companyEmployees.length > 0 && !matchedEmp) {
          const rowComp = getPropCaseInsensitive(row, ['company', 'Company Name', 'companyuid', 'company_uid'], '').trim().toLowerCase();
          if (rowComp && rowComp !== userCompany && !rowComp.includes(userCompany) && !userCompany.includes(rowComp)) {
            return;
          }
        }

        let categoryLabel = rawType;
        if (tLower === 'annual leave') categoryLabel = 'Annual Leave';
        else if (tLower === 'public holiday') categoryLabel = 'Public Holiday';
        else if (tLower === 'sick') categoryLabel = 'Sick';
        else if (tLower === 'day off') categoryLabel = 'Day Off';

        const employeeCard = matchedEmp || {
          name: getPropCaseInsensitive(row, ['name', 'nama', 'employee_name', 'employee'], empIdentifier || 'Employee'),
          jobTitle: getPropCaseInsensitive(row, ['job title', 'job_title', 'position', 'department', 'shift'], '-'),
          phone: getPropCaseInsensitive(row, ['phone', 'phone_number', 'telepon'], '-'),
          photo: defaultAvatar
        };

        const dedupKey = `${categoryLabel.toLowerCase()}::${employeeCard.name.toLowerCase()}::${empIdentifier.toLowerCase()}`;
        if (seenPerCategory.has(dedupKey)) return;
        seenPerCategory.add(dedupKey);

        if (!groupedMap.has(categoryLabel)) {
          groupedMap.set(categoryLabel, []);
        }
        groupedMap.get(categoryLabel).push(employeeCard);
      });

      const priorityOrder = ['Annual Leave', 'Public Holiday', 'Sick', 'Day Off'];
      const sortedGroups = Array.from(groupedMap.entries())
        .filter(([, items]) => items.length > 0) // Hide jika tidak ada listnya
        .sort(([typeA], [typeB]) => {
          const idxA = priorityOrder.findIndex(p => p.toLowerCase() === typeA.toLowerCase());
          const idxB = priorityOrder.findIndex(p => p.toLowerCase() === typeB.toLowerCase());
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return typeA.localeCompare(typeB);
        })
        .map(([category, items]) => ({
          category,
          items: items.sort((a, b) => a.name.localeCompare(b.name))
        }));

      setTodayNotifGroups(sortedGroups);
    } catch (err) {
      console.warn('Error fetching today not working schedule:', err);
      setTodayNotifGroups([]);
    }
  };

  const fetchScheduleData = async (user) => {
    try {
      const userEmail = (user?.email || user?.Email || user?.USER_UID || '').trim().toLowerCase();
      const empId = getPropCaseInsensitive(user, ['employee id', 'employeeid', 'employee_id', 'id', 'emp_id'], '').trim().toLowerCase();
      const empName = getPropCaseInsensitive(user, ['name', 'nama', 'fullname', 'full_name', 'employee_name'], '').trim().toLowerCase();

      let empColName = sessionStorage.getItem('hris_sched_col');
      if (!empColName) {
        const { data: sampleData } = await supabase.from(TABLE_SCHEDULE).select('*').limit(1);
        if (sampleData && sampleData.length > 0) {
          const sampleKeys = Object.keys(sampleData[0]);
          empColName = sampleKeys.find(k => k.toLowerCase().trim() === 'employee') 
                    || sampleKeys.find(k => k.toLowerCase().includes('email'))
                    || sampleKeys.find(k => k.toLowerCase().includes('user_uid'))
                    || sampleKeys.find(k => k.toLowerCase().includes('name'));
          if (empColName) sessionStorage.setItem('hris_sched_col', empColName);
        }
      }

      let records = [];
      if (empColName) {
        const fetchQueries = [];
        if (userEmail) fetchQueries.push(supabase.from(TABLE_SCHEDULE).select('*').eq(empColName, userEmail).limit(1000));
        if (empId) fetchQueries.push(supabase.from(TABLE_SCHEDULE).select('*').eq(empColName, empId).limit(1000));
        if (empName) fetchQueries.push(supabase.from(TABLE_SCHEDULE).select('*').eq(empColName, empName).limit(1000));
        
        const results = await Promise.all(fetchQueries);
        const allData = [];
        results.forEach(res => { if (!res.error && res.data) allData.push(...res.data); });

        const uniqueDates = new Set();
        records = allData.filter(row => {
          const dateVal = getPropCaseInsensitive(row, ['date', 'Date', 'tanggal', 'scheduledate', 'schedule_date', 'startdate']);
          if (dateVal && !uniqueDates.has(dateVal)) {
            uniqueDates.add(dateVal);
            return true;
          }
          return false;
        });
      }

      if (records.length === 0) {
        let orStr = '';
        if (empColName) {
          const parts = [];
          if (userEmail) parts.push(`${empColName}.ilike.*${userEmail}*`);
          if (empName) parts.push(`${empColName}.ilike.*${empName}*`);
          orStr = parts.join(',');
        }
        const { data: fbData } = await supabase.from(TABLE_SCHEDULE).select('*').or(orStr).limit(1500);
        if (fbData) records = fbData;
      }
      setScheduleRecords(records);
    } catch (e) {
      console.warn("Schedule fetch error:", e);
    }
  };

  const fetchPublicHolidayData = async () => {
    try {
      const { data, error } = await supabase.from(TABLE_PUBLIC_HOLIDAYS).select('*').limit(500);
      setPublicHolidayRecords(!error && data ? data : []);
    } catch (e) {
      setPublicHolidayRecords([]);
    }
  };

  const fetchEventData = async () => {
    for (const tbl of TABLE_EVENTS) {
      try {
        const { data, error } = await supabase.from(tbl).select('*').limit(500);
        if (!error && data && data.length > 0) {
          setEventRecords(data);
          return;
        }
      } catch (e) {}
    }
    setEventRecords([]);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    let user = outletContext?.currentUser || null;
    if (!user) {
      const saved = localStorage.getItem('hris_session_data');
      if (saved) {
        try { user = JSON.parse(saved); } catch (e) {}
      }
    }

    const promises = [fetchTodayNotifications(user)];
    if (calendarMode === 'schedule') {
      promises.push(fetchScheduleData(user));
      promises.push(fetchPublicHolidayData());
    } else if (calendarMode === 'public_holiday') {
      promises.push(fetchPublicHolidayData());
    } else if (calendarMode === 'event') {
      promises.push(fetchEventData());
    }

    await Promise.all(promises);
    setLoading(false);
  }, [calendarMode, outletContext?.currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const setThisMonth = () => {
    const now = new Date();
    setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayOnlyDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayFormattedHeader = `${t.daysFull[today.getDay()]}, ${String(today.getDate()).padStart(2, '0')} ${t.monthsShort[today.getMonth()]} ${today.getFullYear()}`;
  const totalTodayNotWorking = todayNotifGroups.reduce((sum, g) => sum + g.items.length, 0);

  const { calendarDays, stats } = useMemo(() => {
    const days = [];
    let countDayOff = 0;
    let countWorking = 0;
    let countSick = 0;
    let countLeave = 0;

    for (let day = 1; day <= totalDays; day++) {
      const currLoopDate = new Date(year, month, day);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const isPast = currLoopDate.getTime() < todayOnlyDate.getTime();

      let styleConfig = { cardClass: 'bg-white border-gray-200 text-gray-700', badgeClass: '', badgeText: '', shortCode: '' };
      let tooltipText = '';
      let iconHtml = '';
      let noteOverlayText = '';

      let dateToPass = `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`;
      let typeToPass = '-';
      let shiftToPass = '-';
      let checkinToPass = '-';
      let checkoutToPass = '-';
      let lastEditByToPass = '-';
      let lastEditTimeToPass = '-';
      let currentScheduleType = '';

      const matchedHoliday = publicHolidayRecords.find(item => {
        const dateVal = item.date || item.Date || item.tanggal || item.Tanggal || item.DATE;
        return checkDateMatch(dateVal, year, month, day);
      });
      const matchingHolidayName = matchedHoliday 
        ? (matchedHoliday.Remarks || matchedHoliday.remarks || matchedHoliday.holiday_name || matchedHoliday.name || matchedHoliday.description || matchedHoliday.type || 'Public Holiday')
        : '';

      if (calendarMode === 'schedule') {
        const matched = scheduleRecords.find(item => {
          const dateKey = Object.keys(item).find(k => {
            const lk = k.toLowerCase().replace(/[\s_-]/g, '');
            return lk === 'date' || lk === 'tanggal' || lk === 'scheduledate' || lk === 'startdate';
          });
          const dbDate = dateKey ? item[dateKey] : (item.date || item.Date || item.tanggal || item.Tanggal || item.DATE);
          return checkDateMatch(dbDate, year, month, day);
        });

        if (matched) {
          const scheduleType = (matched.type || matched.Type || matched.TYPE || matched.status || '').trim();
          currentScheduleType = scheduleType.toLowerCase();
          typeToPass = scheduleType;
          shiftToPass = getPropCaseInsensitive(matched, ['shift', 'jam kerja'], '-');

          const rawCheckin = getPropCaseInsensitive(matched, ['checked in at', 'checked_in_at', 'checkedinat', 'checked in', 'checkedin', 'check in at', 'checkin at', 'check_in', 'check in', 'checkin', 'masuk'], null);
          const rawCheckout = getPropCaseInsensitive(matched, ['checked out at', 'checked_out_at', 'checkedoutat', 'checked out', 'checkedout', 'check out at', 'checkout at', 'check_out', 'check out', 'checkout', 'pulang'], null);
          
          if (rawCheckin) checkinToPass = formatIndoDateTime(rawCheckin);
          if (rawCheckout) checkoutToPass = formatIndoDateTime(rawCheckout);

          const rawLastEditBy = getPropCaseInsensitive(matched, ['last_edit_by', 'last edit by', 'updated_by', 'updated by', 'modified_by', 'modified by'], '-');
          const rawLastEditTime = getPropCaseInsensitive(matched, ['lasteditdate', 'last_edit_date', 'last_edit_time', 'updated_at', 'updated at', 'modified_at', 'modified at'], null);
          
          if (rawLastEditBy) lastEditByToPass = rawLastEditBy;
          if (rawLastEditTime) lastEditTimeToPass = formatLastEditDate(rawLastEditTime);

          const styleRes = getScheduleStyle(scheduleType);
          styleConfig = styleRes;
          if (scheduleType) tooltipText = `${scheduleType} (${dateToPass})`;

          const tLower = scheduleType.toLowerCase();
          const isWorking = tLower.includes('working') || tLower === 'work' || tLower.includes('kerja');
          const isSick = tLower.includes('sick') || tLower.includes('matternity') || tLower.includes('maternity') || tLower.includes('compassionate') || tLower.includes('sakit') || tLower.includes('melahirkan') || tLower.includes('duka');

          if (isWorking) {
            const hasCheckin = rawCheckin !== null && rawCheckin !== '';
            const hasCheckout = rawCheckout !== null && rawCheckout !== '';

            if (isPast) {
              if (hasCheckin && hasCheckout) {
                iconHtml = '✅';
              } else if (hasCheckin && !hasCheckout) {
                iconHtml = '⚠️';
                checkoutToPass = t.missedOut;
                styleConfig = {
                  cardClass: 'bg-red-50 border-red-300 text-red-950 font-medium',
                  badgeClass: 'bg-red-600 text-white',
                  badgeText: t.missedOutBadge,
                  shortCode: 'M'
                };
                tooltipText = `${scheduleType} - ${t.missedOut} (${dateToPass})`;
              }
            } else if (isToday) {
              if (hasCheckin && hasCheckout) {
                iconHtml = '✅';
              } else if (hasCheckin && !hasCheckout) {
                iconHtml = '📥';
              }
            }
          } else if (isSick) {
            iconHtml = '💉';
          } else if (scheduleType !== '') {
            iconHtml = '🏖️';
          }

          if (matchingHolidayName) {
            noteOverlayText = matchingHolidayName;
          }
        } else {
          if (matchingHolidayName) {
            styleConfig = {
              cardClass: 'bg-red-100 border-red-300 text-red-950 font-medium',
              badgeClass: 'bg-red-600 text-white',
              badgeText: matchingHolidayName,
              shortCode: 'D'
            };
            iconHtml = '🏖️';
            noteOverlayText = matchingHolidayName;
            currentScheduleType = 'public holiday';
          }
        }

        if (currentScheduleType) {
          if (currentScheduleType.includes('working') || currentScheduleType === 'work' || currentScheduleType.includes('kerja')) {
            countWorking++;
          } else if (currentScheduleType.includes('sick') || currentScheduleType.includes('maternity') || currentScheduleType.includes('matternity') || currentScheduleType.includes('compassionate') || currentScheduleType.includes('sakit') || currentScheduleType.includes('melahirkan') || currentScheduleType.includes('duka')) {
            countSick++;
          } else if (currentScheduleType.includes('public holiday') || currentScheduleType.includes('nasional') || currentScheduleType.includes('day off') || currentScheduleType === 'off' || currentScheduleType.includes('libur')) {
            countDayOff++;
          } else {
            countLeave++;
          }
        }
      } else if (calendarMode === 'public_holiday') {
        if (matchingHolidayName) {
          styleConfig = {
            cardClass: 'bg-red-100 border-red-300 text-red-950 font-medium',
            badgeClass: 'bg-red-600 text-white',
            badgeText: matchingHolidayName,
            shortCode: 'H'
          };
          iconHtml = '🏖️';
          tooltipText = `${matchingHolidayName} (${dateToPass})`;
          noteOverlayText = matchingHolidayName;
        }
      } else if (calendarMode === 'event') {
        const matchedEvent = eventRecords.find(item => {
          const dateVal = item.date || item.Date || item.event_date || item.start_date;
          return checkDateMatch(dateVal, year, month, day);
        });

        if (matchedEvent) {
          const evtTitle = matchedEvent.title || matchedEvent.name || matchedEvent.event_name || 'Event';
          styleConfig = {
            cardClass: 'bg-blue-100 border-blue-300 text-blue-950 font-medium',
            badgeClass: 'bg-blue-600 text-white',
            badgeText: evtTitle,
            shortCode: 'E'
          };
          iconHtml = '📅';
          tooltipText = `${evtTitle} (${dateToPass})`;
        }
      }

      days.push({
        day,
        dateToPass,
        typeToPass,
        shiftToPass,
        checkinToPass,
        checkoutToPass,
        lastEditByToPass,
        lastEditTimeToPass,
        styleConfig,
        tooltipText,
        iconHtml,
        noteOverlayText,
        isToday,
        isSunday: currLoopDate.getDay() === 0,
        isSaturday: currLoopDate.getDay() === 6
      });
    }

    return {
      calendarDays: days,
      stats: { dayOff: countDayOff, working: countWorking, sick: countSick, leave: countLeave }
    };
  }, [year, month, totalDays, scheduleRecords, publicHolidayRecords, eventRecords, calendarMode, t]);

  const handleDayClick = (dayData) => {
    if (calendarMode === 'schedule') {
      setScheduleModalData({
        date: dayData.dateToPass,
        type: dayData.typeToPass,
        shift: dayData.shiftToPass,
        checkin: dayData.checkinToPass,
        checkout: dayData.checkoutToPass,
        lastEditBy: dayData.lastEditByToPass,
        lastEditTime: dayData.lastEditTimeToPass
      });
    }
  };

  const closeScheduleModal = () => {
    setScheduleModalData(null);
  };

  const renderCategoryIcon = (iconType, className) => {
    if (iconType === 'alert') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      );
    }
    if (iconType === 'bolt') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      );
    }
    if (iconType === 'heart') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      );
    }
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    );
  };

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Section: Today Not Working Schedule */}
      {todayNotifGroups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {t.todayNotWorkingTitle}
                </h3>
                <span className="bg-gray-100 text-gray-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {totalTodayNotWorking}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {todayFormattedHeader}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {todayNotifGroups.map(({ category, items }) => {
              // Hide jika tidak ada listnya
              if (!items || items.length === 0) return null;

              const isOpen = !!openCategories[category];
              const theme = getNotifTheme(category);

              return (
                <div
                  key={category}
                  className={`border-l-4 ${theme.wrapper} rounded-r-xl overflow-hidden shadow-xs`}
                >
                  <div
                    onClick={() => toggleCategory(category)}
                    className={`w-full flex items-center justify-between p-3 sm:p-4 ${theme.headerHover} transition cursor-pointer select-none`}
                  >
                    <div className="flex items-center gap-2">
                      {renderCategoryIcon(theme.iconType, `w-5 h-5 ${theme.iconColor}`)}
                      <h4 className={`font-bold ${theme.titleColor} text-sm`}>
                        {category}
                      </h4>
                      <span className={`${theme.badgeColor} text-[10px] font-black px-2 py-0.5 rounded-full ml-1`}>
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 ${theme.iconColor} transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="p-3 sm:p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {items.map((emp, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center justify-between shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={emp.photo}
                              alt={emp.name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-gray-50 shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png';
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 break-words whitespace-normal">
                                {emp.name}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {emp.jobTitle}
                              </p>
                            </div>
                          </div>

                          {emp.phone && emp.phone !== '-' && (
                            <a
                              href={formatWhatsappUrl(emp.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition shrink-0 ml-2"
                              title={t.chatWa}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 relative">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 sm:mb-5 border-b border-gray-200 gap-4">
          
          <div className="flex justify-between items-start w-full sm:w-auto">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {calendarMode === 'public_holiday' 
                  ? t.titleHoliday 
                  : calendarMode === 'event' 
                  ? t.titleEvent 
                  : t.titleSchedule}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {calendarMode === 'public_holiday'
                  ? t.subHoliday
                  : calendarMode === 'event'
                  ? t.subEvent
                  : t.subSchedule}
              </p>
            </div>
            
            <button 
              onClick={loadData} 
              disabled={loading}
              className="sm:hidden px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ml-3"
              title="Refresh Data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? t.loading : t.refresh}</span>
            </button>
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-3 sm:gap-4 justify-between sm:justify-end">
            <div className="relative w-full sm:w-48">
              <select 
                value={calendarMode} 
                onChange={(e) => setCalendarMode(e.target.value)}
                className="w-full py-2.5 px-3.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23374151'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.85rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="schedule">{t.optSchedule}</option>
                <option value="public_holiday">{t.optHoliday}</option>
                <option value="event">{t.optEvent}</option>
              </select>
            </div>

            <button 
              onClick={loadData} 
              disabled={loading}
              className="hidden sm:flex px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition shrink-0 items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? t.loading : t.refresh}</span>
            </button>
          </div>

        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <button 
            onClick={prevMonth} 
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition active:scale-95 shadow-xs"
            title="Previous Month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <span className="text-sm sm:text-base font-bold text-gray-800">
            {t.months[month]} {year}
          </span>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={nextMonth} 
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition active:scale-95 shadow-xs"
              title="Next Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button 
              onClick={setThisMonth} 
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition active:scale-95 shadow-xs"
            >
              {t.thisMonth}
            </button>
          </div>
        </div>

        {calendarMode === 'schedule' && (
          <div className="grid grid-cols-4 border border-gray-200 rounded-xl overflow-hidden divide-x divide-gray-100 text-center py-2.5 bg-white shadow-xs mb-3">
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statDayOff}</span>
              <span className="text-base sm:text-lg font-black text-red-600 leading-tight">{stats.dayOff}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statWorking}</span>
              <span className="text-base sm:text-lg font-black text-green-600 leading-tight">{stats.working}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statSick}</span>
              <span className="text-base sm:text-lg font-black text-pink-600 leading-tight">{stats.sick}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statLeave}</span>
              <span className="text-base sm:text-lg font-black text-gray-800 leading-tight">{stats.leave}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 text-center text-xs font-bold pt-1 mb-1">
          {t.daysOfWeek.map((day, idx) => (
            <span key={day} className={idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-600' : 'text-gray-700'}>
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl opacity-40"></div>
          ))}

          {calendarDays.map((d) => {
            const hasBadge = !!d.styleConfig.badgeText;
            const isClickable = calendarMode === 'schedule';

            return (
              <div 
                key={`day-${d.day}`}
                onClick={() => isClickable && handleDayClick(d)}
                className={`relative h-16 sm:h-24 p-1 sm:p-2 rounded-xl border transition flex flex-col justify-between overflow-hidden ${d.styleConfig.cardClass} ${
                  d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 font-bold' : ''
                } ${isClickable ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}`}
                title={d.tooltipText || undefined}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`text-xs sm:text-sm font-extrabold leading-none ${
                    d.isToday ? 'text-blue-600' : d.isSunday ? 'text-red-500' : 'text-gray-800'
                  }`}>
                    {d.day}
                  </span>
                  {d.iconHtml && (
                    <span className="text-base sm:text-lg leading-none cursor-default select-none">{d.iconHtml}</span>
                  )}
                </div>

                <div className="w-full flex items-center justify-center my-auto">
                  {hasBadge ? (
                    <>
                      <span className={`hidden sm:inline-block w-full py-0.5 px-1 rounded-md text-[10px] font-bold text-center truncate shadow-2xs ${d.styleConfig.badgeClass}`}>
                        {d.styleConfig.badgeText}
                      </span>
                      <span className={`sm:hidden inline-block w-full py-0.5 px-0.5 rounded text-[9px] font-bold text-center truncate shadow-2xs ${d.styleConfig.badgeClass}`}>
                        {d.styleConfig.shortCode || d.styleConfig.badgeText.slice(0, 4)}
                      </span>
                    </>
                  ) : (
                    <div className="h-3 sm:h-4"></div>
                  )}
                </div>

                {d.noteOverlayText && (
                  <div 
                    className="hidden sm:block absolute bottom-1 left-1 right-1 bg-red-100 text-red-900 text-[9px] px-1 py-0.5 rounded border border-red-200 truncate z-10"
                    title={d.noteOverlayText}
                  >
                    {d.noteOverlayText}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {calendarMode === 'schedule' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
            <h4 className="font-bold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">{t.legend}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-green-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">{t.legWorking}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-pink-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">{t.legSick}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-red-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">{t.legOff}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-orange-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">{t.legLeave}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded border border-gray-300 bg-white shrink-0"></span>
                <span className="text-gray-600 font-medium">{t.legNoSched}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {scheduleModalData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4"
          onClick={closeScheduleModal}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{t.modalTitle}</h3>
              <button onClick={closeScheduleModal} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">{t.modalDate}</span>
                <strong className="text-gray-800">{scheduleModalData.date}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">{t.modalType}</span>
                <strong className="text-gray-800">{scheduleModalData.type}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">{t.modalShift}</span>
                <strong className="text-gray-800">{scheduleModalData.shift}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">{t.modalCheckIn}</span>
                <strong className="text-green-600 font-mono text-xs">{scheduleModalData.checkin}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">{t.modalCheckOut}</span>
                {scheduleModalData.checkout && (scheduleModalData.checkout.toLowerCase().includes('belum') || scheduleModalData.checkout.toLowerCase().includes('not checked') || scheduleModalData.checkout.toLowerCase().includes('terlewat')) ? (
                  <span className="text-red-600 font-semibold text-xs italic bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {scheduleModalData.checkout}
                  </span>
                ) : (
                  <strong className="text-blue-600 font-mono text-xs">{scheduleModalData.checkout}</strong>
                )}
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">{t.modalLastEditBy}</span>
                <strong className="text-gray-800 text-xs text-right break-words max-w-[150px]">{scheduleModalData.lastEditBy}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">{t.modalLastEditTime}</span>
                <strong className="text-gray-800 font-mono text-xs">{scheduleModalData.lastEditTime}</strong>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button 
                onClick={closeScheduleModal} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition active:scale-95 shadow-xs"
              >
                {t.btnClose}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}