import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_SCHEDULE = 'schedule';
const TABLE_PUBLIC_HOLIDAYS = 'public_holidays';
const TABLE_EVENTS = ['events', 'event', 'company_events'];

export default function Dashboard() {
  const navigate = useNavigate();
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

  // Modal State
  const [scheduleModalData, setScheduleModalData] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('hris_session_data');
    if (!session) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

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

  const formatIndoDateOnly = (val) => {
    if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
    const s = String(val).trim();
    const m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) {
      return `${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[1]}`;
    }
    const m2 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m2) {
      return `${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}-${m2[3]}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}-${month}-${year}`;
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
    const t = type.toLowerCase().trim();

    if (t.includes('working') || t === 'work' || t.includes('kerja')) {
      return {
        cardClass: 'bg-green-100 border-green-300 text-green-950 font-medium',
        badgeClass: 'bg-green-600 text-white',
        badgeText: 'Working Day',
        shortCode: 'W'
      };
    }
    if (t.includes('sick') || t.includes('matternity') || t.includes('maternity') || t.includes('compassionate') || t.includes('sakit') || t.includes('melahirkan') || t.includes('duka')) {
      return {
        cardClass: 'bg-pink-100 border-pink-300 text-pink-950 font-medium',
        badgeClass: 'bg-pink-500 text-white',
        badgeText: type,
        shortCode: 'S'
      };
    }
    if (t.includes('day off') || t === 'off' || t.includes('public holiday') || t.includes('holiday') || t.includes('libur')) {
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
    let user = null;
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try { user = JSON.parse(saved); } catch (e) {}
    }

    const promises = [];
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
  }, [calendarMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const setThisMonth = () => {
    const now = new Date();
    setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayOnlyDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

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
          const rawLastEditTime = getPropCaseInsensitive(matched, ['last_edit_time', 'last edit time', 'updated_at', 'updated at', 'modified_at', 'modified at'], null);
          if (rawLastEditBy) lastEditByToPass = rawLastEditBy;
          if (rawLastEditTime) lastEditTimeToPass = formatIndoDateTime(rawLastEditTime);

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
                checkoutToPass = 'Belum check out';
                styleConfig = {
                  cardClass: 'bg-red-50 border-red-300 text-red-950 font-medium',
                  badgeClass: 'bg-red-600 text-white',
                  badgeText: 'Missed Out',
                  shortCode: 'M'
                };
                tooltipText = `${scheduleType} - Belum check out (${dateToPass})`;
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
  }, [year, month, totalDays, scheduleRecords, publicHolidayRecords, eventRecords, calendarMode]);

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

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Work Schedule Calendar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 relative">
        
        {/* Top Header & Controls Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 sm:mb-5 border-b border-gray-200 gap-4">
          
          {/* Left part: Title & Mobile Refresh */}
          <div className="flex justify-between items-start w-full sm:w-auto">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {calendarMode === 'public_holiday' 
                  ? 'Public Holiday Calendar' 
                  : calendarMode === 'event' 
                  ? 'Event Calendar' 
                  : 'Work Schedule Calendar'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {calendarMode === 'public_holiday'
                  ? 'Detail of public holiday calendar'
                  : calendarMode === 'event'
                  ? 'Detail of event calendar'
                  : 'Detail of your calendar'}
              </p>
            </div>
            
            {/* Mobile Refresh Button (Hidden on Desktop) */}
            <button 
              onClick={loadData} 
              disabled={loading}
              className="sm:hidden px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ml-3"
              title="Refresh Data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
          
          {/* Right part: Dropdown & Desktop Refresh */}
          <div className="flex w-full sm:w-auto items-center gap-3 sm:gap-4 justify-between sm:justify-end">
            {/* Dropdown Select Mode (Working Schedule, Event, Public Holiday) */}
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
                <option value="schedule">Working Schedule</option>
                <option value="public_holiday">Public Holiday</option>
                <option value="event">Event</option>
              </select>
            </div>

            {/* Desktop Refresh Button (Hidden on Mobile) */}
            <button 
              onClick={loadData} 
              disabled={loading}
              className="hidden sm:flex px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition shrink-0 items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>

        </div>

        {/* Month Navigation Row: < October 2026 > This Month */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <button 
            onClick={prevMonth} 
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition active:scale-95 shadow-xs"
            title="Previous Month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <span className="text-sm sm:text-base font-bold text-gray-800">
            {monthNames[month]} {year}
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
              This Month
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Boxes (Day Off, Working, Sick/Oth, Leave) - Only in Schedule Mode */}
        {calendarMode === 'schedule' && (
          <div className="grid grid-cols-4 border border-gray-200 rounded-xl overflow-hidden divide-x divide-gray-100 text-center py-2.5 bg-white shadow-xs mb-3">
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">Day Off</span>
              <span className="text-base sm:text-lg font-black text-red-600 leading-tight">{stats.dayOff}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">Working</span>
              <span className="text-base sm:text-lg font-black text-green-600 leading-tight">{stats.working}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">Sick/Oth</span>
              <span className="text-base sm:text-lg font-black text-pink-600 leading-tight">{stats.sick}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">Leave</span>
              <span className="text-base sm:text-lg font-black text-gray-800 leading-tight">{stats.leave}</span>
            </div>
          </div>
        )}

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold pt-1 mb-1">
          <span className="text-red-500">Sun</span>
          <span className="text-gray-700">Mon</span>
          <span className="text-gray-700">Tue</span>
          <span className="text-gray-700">Wed</span>
          <span className="text-gray-700">Thu</span>
          <span className="text-gray-700">Fri</span>
          <span className="text-blue-600">Sat</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
          
          {/* Empty padding before day 1 */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl opacity-40"></div>
          ))}

          {/* Active Days */}
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
                {/* Top Row: Date Number and Icon */}
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

                {/* Center Badge: Full Text on Desktop, Icon/Badge on Mobile */}
                <div className="w-full flex items-center justify-center my-auto">
                  {hasBadge ? (
                    <>
                      {/* Desktop View */}
                      <span className={`hidden sm:inline-block w-full py-0.5 px-1 rounded-md text-[10px] font-bold text-center truncate shadow-2xs ${d.styleConfig.badgeClass}`}>
                        {d.styleConfig.badgeText}
                      </span>
                      {/* Mobile View */}
                      <span className={`sm:hidden inline-block w-full py-0.5 px-0.5 rounded text-[9px] font-bold text-center truncate shadow-2xs ${d.styleConfig.badgeClass}`}>
                        {d.styleConfig.shortCode || d.styleConfig.badgeText.slice(0, 4)}
                      </span>
                    </>
                  ) : (
                    <div className="h-3 sm:h-4"></div>
                  )}
                </div>

                {/* Holiday Note Overlay at Bottom */}
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

        {/* Legend at Bottom (Matching index.html) */}
        {calendarMode === 'schedule' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
            <h4 className="font-bold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">Legend</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-green-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">Working Day</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-pink-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">Sick / Maternity</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-red-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">Day Off / Holiday</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-orange-500 shrink-0"></span>
                <span className="text-gray-600 font-medium">Annual Leave / DP / EO</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded border border-gray-300 bg-white shrink-0"></span>
                <span className="text-gray-600 font-medium">No Schedule</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SCHEDULE MODAL DETAIL (Identical to index.html openScheduleModal) */}
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
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Schedule Detail</h3>
              <button onClick={closeScheduleModal} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Date</span>
                <strong className="text-gray-800">{scheduleModalData.date}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Type / Status</span>
                <strong className="text-gray-800">{scheduleModalData.type}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Shift</span>
                <strong className="text-gray-800">{scheduleModalData.shift}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Checked In At</span>
                <strong className="text-green-600 font-mono text-xs">{scheduleModalData.checkin}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Checked Out At</span>
                {scheduleModalData.checkout && scheduleModalData.checkout.toLowerCase().includes('belum') ? (
                  <span className="text-red-600 font-semibold text-xs italic bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {scheduleModalData.checkout}
                  </span>
                ) : (
                  <strong className="text-blue-600 font-mono text-xs">{scheduleModalData.checkout}</strong>
                )}
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Last Edit By</span>
                <strong className="text-gray-800 text-xs text-right break-words max-w-[150px]">{scheduleModalData.lastEditBy}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500 font-medium">Last Edit Time</span>
                <strong className="text-gray-800 font-mono text-xs">{scheduleModalData.lastEditTime}</strong>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button 
                onClick={closeScheduleModal} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition active:scale-95 shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
