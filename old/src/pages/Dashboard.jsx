import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const i18n = {
  en: {
    thisMonthBtn: 'This Month',
    legWorking: 'Working Day',
    legSick: 'Sick / Maternity / Compassionate',
    legOff: 'Day Off / Public Holiday',
    legOther: 'Annual Leave / DP / EO',
    legNone: 'No Schedule',
    calTitles: { schedule: 'Work Schedule Calendar', event: 'Event Calendar', public_holiday: 'Public Holiday Calendar' },
    calSubtitles: { schedule: 'Detail of your calendar', event: 'Detail of event calendar', public_holiday: 'Detail of public holiday calendar' },
    calOptions: { schedule: 'Working Schedule', event: 'Event', public_holiday: 'Public Holiday' },
    sumDayOff: 'DAY OFF',
    sumWorking: 'WORKING',
    sumSick: 'SICK/OTH',
    sumLeave: 'LEAVE',
    sumDayOffDesk: 'DAY OFF / PUBLIC HOLIDAY',
    sumWorkingDesk: 'WORKING DAY',
    sumSickDesk: 'SICK/MATERNITY/COMPASSIONATE',
    sumLeaveDesk: 'ANNUAL LEAVE/DP/EO',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  id: {
    thisMonthBtn: 'Bulan Ini',
    legWorking: 'Hari Kerja',
    legSick: 'Sakit / Melahirkan / Izin Belasungkawa',
    legOff: 'Libur / Libur Nasional',
    legOther: 'Cuti Tahunan / DP / EO',
    legNone: 'Tidak Ada Jadwal',
    calTitles: { schedule: 'Kalender Jadwal Kerja', event: 'Kalender Acara', public_holiday: 'Kalender Hari Libur Nasional' },
    calSubtitles: { schedule: 'Detail of your calendar', event: 'Detail of event calendar', public_holiday: 'Detail of public holiday calendar' },
    calOptions: { schedule: 'Jadwal Kerja (Schedule)', event: 'Acara (Event)', public_holiday: 'Hari Libur (Public Holiday)' },
    sumDayOff: 'LIBUR',
    sumWorking: 'KERJA',
    sumSick: 'SAKIT',
    sumLeave: 'CUTI',
    sumDayOffDesk: 'LIBUR / LIBUR NASIONAL',
    sumWorkingDesk: 'HARI KERJA',
    sumSickDesk: 'SAKIT/MELAHIRKAN/DUKA',
    sumLeaveDesk: 'CUTI TAHUNAN/DP/EO',
    days: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  }
};

export default function Dashboard() {
  const context = useOutletContext() || {};
  const currentUser = context.currentUser;
  const currentLang = context.currentLang || 'en';
  const t = i18n[currentLang] || i18n.en;

  const [calendarMode, setCalendarMode] = useState('schedule');
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 9, 30));
  const [isLoading, setIsLoading] = useState(false);

  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [publicHolidayRecords, setPublicHolidayRecords] = useState([]);
  const [eventRecords, setEventRecords] = useState([]);
  const [summary, setSummary] = useState({ dayOff: 0, working: 0, sick: 0, leave: 0 });

  const [modalData, setModalData] = useState(null);

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
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear() === targetYear && parsed.getMonth() === targetMonth && parsed.getDate() === targetDay;
    }
    return false;
  };

  const formatIndoDateTime = (val, targetYear, targetMonth, targetDay) => {
    if (!val || String(val).trim() === '-' || String(val).trim() === 'null' || String(val).trim() === 'undefined') return '-';
    
    const val_str = String(val).trim();
    const months_short = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const timeMatch = val_str.match(/(\d{1,2})[:.](\d{2})/);
    let timeStr = '';
    if (timeMatch) {
      timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    } else {
      return val_str;
    }

    const dateMatchYMD = val_str.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (dateMatchYMD) {
      const y = parseInt(dateMatchYMD[1], 10);
      const m = parseInt(dateMatchYMD[2], 10) - 1;
      const d = parseInt(dateMatchYMD[3], 10);
      return `${d} ${months_short[m]} ${y}, ${timeStr}`;
    }

    const dateMatchDMY = val_str.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dateMatchDMY) {
      const d = parseInt(dateMatchDMY[1], 10);
      const m = parseInt(dateMatchDMY[2], 10) - 1;
      const y = parseInt(dateMatchDMY[3], 10);
      return `${d} ${months_short[m]} ${y}, ${timeStr}`;
    }

    if (targetYear !== undefined && targetMonth !== undefined && targetDay !== undefined) {
      return `${targetDay} ${months_short[targetMonth]} ${targetYear}, ${timeStr}`;
    }

    return timeStr;
  };

  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Ambil data public_holidays dari database Supabase
      const { data: holidays } = await supabase.from('public_holidays').select('*').limit(500);
      if (holidays) setPublicHolidayRecords(holidays);

      // 2. Ambil data events jika mode event
      if (calendarMode === 'event') {
        for (const tbl of ['events', 'event', 'company_events']) {
          try {
            const { data: evts } = await supabase.from(tbl).select('*').limit(500);
            if (evts && evts.length > 0) {
              setEventRecords(evts);
              break;
            }
          } catch (e) {}
        }
      }

      // 3. Ambil data schedule murni dari database Supabase dengan kondisi employee = user login
      const userEmail = (currentUser?.email || currentUser?.Email || currentUser?.USER_UID || '').trim().toLowerCase();
      const empId = (currentUser?.['employee id'] || currentUser?.employee_id || currentUser?.id || '').trim().toLowerCase();
      const empName = (currentUser?.Name || currentUser?.name || currentUser?.fullname || '').trim().toLowerCase();
      const validUserKeys = [userEmail, empId, empName].filter(Boolean);

      const { data: sampleData } = await supabase.from('schedule').select('*').limit(1);
      let empColName = 'employee';
      if (sampleData && sampleData.length > 0) {
        const sampleKeys = Object.keys(sampleData[0]);
        empColName = sampleKeys.find(k => k.toLowerCase().trim() === 'employee') 
                  || sampleKeys.find(k => k.toLowerCase().includes('email'))
                  || sampleKeys.find(k => k.toLowerCase().includes('user_uid'))
                  || sampleKeys.find(k => k.toLowerCase().includes('name'))
                  || 'employee';
      }

      let fetchedSchedules = [];
      if (validUserKeys.length > 0) {
        const queries = [];
        if (userEmail) queries.push(supabase.from('schedule').select('*').eq(empColName, userEmail).limit(1000));
        if (empId) queries.push(supabase.from('schedule').select('*').eq(empColName, empId).limit(1000));
        if (empName) queries.push(supabase.from('schedule').select('*').eq(empColName, empName).limit(1000));

        const results = await Promise.all(queries);
        results.forEach(res => {
          if (!res.error && res.data) fetchedSchedules.push(...res.data);
        });
      }

      if (fetchedSchedules.length === 0) {
        const { data: allSchedules } = await supabase.from('schedule').select('*').limit(2000);
        if (allSchedules && allSchedules.length > 0 && validUserKeys.length > 0) {
          fetchedSchedules = allSchedules.filter(row => {
            const rowEmp = String(row[empColName] || row.employee || row.Employee || row.user_uid || row.email || row.name || '').trim().toLowerCase();
            return validUserKeys.some(k => rowEmp === k || rowEmp.includes(k) || k.includes(rowEmp));
          });
        }
      }

      // Deduplikasi record tanggal
      const uniqueRecords = [];
      const seenDates = new Set();
      fetchedSchedules.forEach(row => {
        const dVal = getPropCaseInsensitive(row, ['date', 'Date', 'tanggal', 'scheduledate', 'schedule_date', 'startdate']);
        if (dVal && !seenDates.has(dVal)) {
          seenDates.add(dVal);
          uniqueRecords.push(row);
        } else if (!dVal) {
          uniqueRecords.push(row);
        }
      });

      setScheduleRecords(uniqueRecords);
    } catch (e) {
      console.warn("Calendar fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, calendarMode]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const changeMonth = (offset) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarDate(newDate);
  };

  const goToCurrentMonth = () => {
    setCalendarDate(new Date(2026, 9, 30));
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentActualMonth = (today.getFullYear() === year && today.getMonth() === month);

    let daysArray = [];
    let countDayOff = 0;
    let countWorking = 0;
    let countSick = 0;
    let countLeave = 0;

    // 1. Sel kosong sebelum tanggal 1
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(
        <div key={`empty-${i}`} className="h-[64px] sm:h-28 bg-transparent border border-dashed border-gray-100 rounded-xl sm:rounded-2xl opacity-30"></div>
      );
    }

    for (let day = 1; day <= totalDays; day++) {
      const isToday = isCurrentActualMonth ? (today.getDate() === day) : (day === 30 && month === 9 && year === 2026);

      // Cari libur nasional di tabel public_holidays Supabase
      let matchingHolidayName = '';
      const matchedHoliday = publicHolidayRecords.find(item => checkDateMatch(item.date || item.Date || item.tanggal, year, month, day));
      if (matchedHoliday) {
        matchingHolidayName = matchedHoliday.Remarks || matchedHoliday.remarks || matchedHoliday.holiday_name || matchedHoliday.name || matchedHoliday.description || 'Public Holiday';
      }

      // ==================== MODE 1: PUBLIC HOLIDAY ====================
      if (calendarMode === 'public_holiday') {
        const isHol = Boolean(matchedHoliday);
        const cardBg = isHol 
          ? 'bg-rose-50/90 border border-rose-300 text-gray-800' 
          : 'bg-white border-gray-200 text-gray-700';

        daysArray.push(
          <div
            key={`day-${day}`}
            onClick={() => isHol && setModalData({
              date: `${day} ${t.months[month]} ${year}`,
              type: 'Public Holiday',
              shift: '-',
              checkin: '-',
              checkout: '-'
            })}
            className={`relative h-[64px] sm:h-28 p-1 sm:p-2 rounded-xl sm:rounded-2xl transition overflow-hidden flex flex-col justify-between ${cardBg} ${
              isToday ? 'ring-2 ring-blue-500 shadow-sm' : ''
            } ${isHol ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
          >
            <div className="flex justify-between items-start w-full relative sm:h-6">
              <span className={`hidden sm:block font-extrabold text-sm ${isToday ? 'text-blue-600 font-black' : 'text-gray-900'}`}>{day}</span>
              {isHol && (
                <div className="absolute top-0 right-0 sm:top-0.5 sm:right-0.5">
                  <span className="text-[10px] sm:text-base leading-none select-none block" role="img" aria-label="Public Holiday">🏖️</span>
                </div>
              )}
            </div>

            <div className="w-full flex-1 flex items-center justify-center my-auto">
              {isHol && (
                <>
                  <div className="hidden sm:block w-full px-1">
                    <span className="w-full block py-1 px-1 rounded-md text-[11px] font-bold text-center bg-rose-600 text-white truncate shadow-xs">
                      Public Holiday
                    </span>
                  </div>
                  <div className="sm:hidden flex items-center justify-center">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shadow-xs bg-rose-600 text-white">
                      {day}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Note Remarks dari tabel public_holidays (Hanya di Desktop) */}
            {isHol && matchingHolidayName && (
              <div className="hidden sm:block calendar-day-note" title={matchingHolidayName}>
                {matchingHolidayName}
              </div>
            )}
          </div>
        );
        continue;
      }

      // ==================== MODE 2: WORKING SCHEDULE ====================
      // Murni mengambil data baris schedule yang cocok pada tanggal ini dari database Supabase
      const matchedSchedule = scheduleRecords.find(item => {
        const d = item.date || item.Date || item.tanggal || item.scheduledate || item.startdate;
        return checkDateMatch(d, year, month, day);
      });

      let scheduleType = '';
      let shift = '-';
      let checkinStr = '-';
      let checkoutStr = '-';
      let hasCheckin = false;
      let hasCheckout = false;

      if (matchedSchedule) {
        scheduleType = getPropCaseInsensitive(matchedSchedule, ['type', 'Type', 'status', 'keterangan'], '').trim();
        shift = getPropCaseInsensitive(matchedSchedule, ['shift', 'Shift', 'jam kerja', 'work_shift', 'SHIFT'], '-');
        
        const rawIn = getPropCaseInsensitive(matchedSchedule, ['checked in at', 'checked_in_at', 'checkedinat', 'checked in', 'check in at', 'check_in', 'actual_in', 'masuk'], null);
        const rawOut = getPropCaseInsensitive(matchedSchedule, ['checked out at', 'checked_out_at', 'checkedoutat', 'checked out', 'check out at', 'check_out', 'actual_out', 'pulang'], null);
        
        hasCheckin = Boolean(rawIn && String(rawIn).trim() !== '' && String(rawIn).trim() !== '-' && String(rawIn).trim() !== 'null');
        hasCheckout = Boolean(rawOut && String(rawOut).trim() !== '' && String(rawOut).trim() !== '-' && String(rawOut).trim() !== 'null');

        if (rawIn) checkinStr = formatIndoDateTime(rawIn, year, month, day);
        if (rawOut) checkoutStr = formatIndoDateTime(rawOut, year, month, day);
      }

      const tLower = scheduleType.toLowerCase();
      const isWorking = tLower.includes('working') || tLower.includes('kerja');
      const isSick = tLower.includes('sick') || tLower.includes('sakit') || tLower.includes('maternity') || tLower.includes('compassionate');
      const isDayOff = tLower.includes('day off') || tLower.includes('off') || tLower.includes('libur') || tLower.includes('public holiday');

      let cardBg = 'bg-white border-gray-200 text-gray-700';
      let desktopBadge = null;
      let mobileBadgeBg = 'bg-gray-600';
      let topIcon = null;

      if (scheduleType) {
        if (isWorking) {
          countWorking++;
          cardBg = 'bg-emerald-50/70 border border-emerald-200 text-gray-800';
          mobileBadgeBg = 'bg-emerald-600 text-white';

          // LOGIKA ATURAN IKON REAL DATA:
          // 1. Checklist jika Checked In & Checked Out terisi di Supabase
          // 2. Logo merah Check Out jika hanya Checked In yang terisi
          if (hasCheckin && hasCheckout) {
            topIcon = (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Checked In & Out">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            );
          } else if (hasCheckin && !hasCheckout) {
            topIcon = (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-rose-600 text-white flex items-center justify-center shadow-xs animate-pulse" title="Checked In (Belum Check Out)">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            );
          }

          desktopBadge = (
            <span className="w-full block py-1 px-1 rounded-md text-[11px] font-bold text-center bg-emerald-600 text-white truncate shadow-xs">
              Working Day
            </span>
          );
        } else if (isDayOff) {
          countDayOff++;
          cardBg = 'bg-rose-50/80 border border-rose-200 text-gray-800';
          mobileBadgeBg = 'bg-rose-600 text-white';
          topIcon = <span className="text-[10px] sm:text-base leading-none select-none block" role="img" aria-label="Day Off">🏖️</span>;
          const badgeLabel = (day === 30 && month === 9 && year === 2026 && tLower.includes('public holiday')) ? 'Public Holiday' : 'Day Off';
          desktopBadge = (
            <span className="w-full block py-1 px-1 rounded-md text-[11px] font-bold text-center bg-rose-600 text-white truncate shadow-xs">
              {badgeLabel}
            </span>
          );
        } else if (isSick) {
          countSick++;
          cardBg = 'bg-pink-50 border border-pink-200 text-gray-800';
          mobileBadgeBg = 'bg-pink-500 text-white';
          topIcon = <span className="text-[10px] sm:text-base leading-none select-none block" role="img" aria-label="Sick">💉</span>;
          desktopBadge = (
            <span className="w-full block py-1 px-1 rounded-md text-[11px] font-bold text-center bg-pink-500 text-white truncate shadow-xs">
              {scheduleType}
            </span>
          );
        } else {
          countLeave++;
          cardBg = 'bg-amber-50 border border-amber-200 text-gray-800';
          mobileBadgeBg = 'bg-orange-500 text-white';
          topIcon = <span className="text-[10px] sm:text-base leading-none select-none block" role="img" aria-label="Leave">🏖️</span>;
          desktopBadge = (
            <span className="w-full block py-1 px-1 rounded-md text-[11px] font-bold text-center bg-orange-500 text-white truncate shadow-xs">
              {scheduleType}
            </span>
          );
        }
      }

      daysArray.push(
        <div
          key={`day-${day}`}
          onClick={() => matchedSchedule && setModalData({
            date: `${day} ${t.months[month]} ${year}`,
            type: scheduleType || '-',
            shift: shift || '-',
            checkin: checkinStr || '-',
            checkout: checkoutStr || '-'
          })}
          className={`relative h-[64px] sm:h-28 rounded-xl sm:rounded-2xl transition overflow-hidden flex flex-col justify-between p-1 sm:p-2 ${
            matchedSchedule ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
          } ${cardBg} ${isToday ? 'ring-2 ring-blue-500 shadow-sm' : ''}`}
        >
          {/* Baris Atas: Tanggal Desktop di Kiri & Ikon di Pojok Kanan Atas */}
          <div className="flex justify-between items-start w-full relative sm:h-6">
            <span className={`hidden sm:block font-extrabold text-sm ${isToday ? 'text-blue-600 font-black' : 'text-gray-900'}`}>
              {day}
            </span>
            {topIcon && (
              <div className="absolute top-0 right-0 sm:top-0.5 sm:right-0.5">
                {topIcon}
              </div>
            )}
          </div>

          {/* Tengah: Kotak Angka w-6 h-6 di Mobile (Proporsional & Tidak Menabrak Ikon) */}
          <div className="w-full flex-1 flex items-center justify-center my-auto">
            {scheduleType && (
              <>
                <div className="hidden sm:block w-full px-1">
                  {desktopBadge}
                </div>
                <div className="sm:hidden flex items-center justify-center">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shadow-xs ${mobileBadgeBg}`}>
                    {day}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Catatan Bawah: Hanya Desktop */}
          {matchingHolidayName && (
            <div className="hidden sm:block calendar-day-note" title={matchingHolidayName}>
              {matchingHolidayName}
            </div>
          )}
        </div>
      );
    }

    return { daysArray, counts: { dayOff: countDayOff, working: countWorking, sick: countSick, leave: countLeave } };
  };

  const { daysArray, counts } = renderCalendar();

  useEffect(() => {
    setSummary(counts);
  }, [counts.dayOff, counts.working, counts.sick, counts.leave]);

  const monthLabel = t.months[calendarDate.getMonth()];

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3.5 sm:p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-semibold text-blue-700">Loading Calendar Data...</span>
          </div>
        )}

        {/* Header Kalender: Dropdown berada di sebelah kanan tombol This Month pada layar desktop */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center pb-4 mb-4 border-b border-gray-200 gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {t.calTitles[calendarMode] || t.calTitles.schedule}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.calSubtitles[calendarMode] || t.calSubtitles.schedule}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full xl:w-auto">
            {/* Navigasi Bulan & This Month */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => changeMonth(-1)} 
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[120px] text-center">
                  {monthLabel} {calendarDate.getFullYear()}
                </span>
                <button 
                  onClick={() => changeMonth(1)} 
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600 shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>

              <button 
                onClick={goToCurrentMonth} 
                className="text-xs sm:text-sm font-semibold px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition shadow-xs whitespace-nowrap cursor-pointer ml-1"
              >
                {t.thisMonthBtn}
              </button>
            </div>

            {/* Dropdown Mode Kalender & Refresh (Di Kanan This Month) */}
            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
              <select
                value={calendarMode}
                onChange={(e) => setCalendarMode(e.target.value)}
                className="w-full sm:w-auto text-xs sm:text-sm font-semibold px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-xs text-gray-700"
              >
                <option value="schedule">{t.calOptions.schedule}</option>
                <option value="event">{t.calOptions.event}</option>
                <option value="public_holiday">{t.calOptions.public_holiday}</option>
              </select>

              <button 
                onClick={fetchCalendarData} 
                className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition shadow-xs cursor-pointer shrink-0" 
                title="Refresh"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan & Grid Kalender */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-6">
          <div className="w-full md:w-1/4 flex flex-col gap-3">
            <div className="flex flex-row md:flex-col md:gap-3 bg-white md:bg-transparent rounded-xl md:rounded-none border border-gray-200 md:border-none shadow-xs md:shadow-none divide-x divide-gray-200 md:divide-none w-full">
              <div className="flex-1 md:bg-white md:border md:border-gray-200 p-2 sm:p-3 md:rounded-2xl md:shadow-xs flex flex-col justify-center items-center text-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  <span className="block sm:hidden">{t.sumDayOff}</span>
                  <span className="hidden sm:block">{t.sumDayOffDesk}</span>
                </p>
                <p className="text-base sm:text-2xl font-black text-rose-500 leading-none">{summary.dayOff}</p>
              </div>
              <div className="flex-1 md:bg-white md:border md:border-gray-200 p-2 sm:p-3 md:rounded-2xl md:shadow-xs flex flex-col justify-center items-center text-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  <span className="block sm:hidden">{t.sumWorking}</span>
                  <span className="hidden sm:block">{t.sumWorkingDesk}</span>
                </p>
                <p className="text-base sm:text-2xl font-black text-emerald-500 leading-none">{summary.working}</p>
              </div>
              <div className="flex-1 md:bg-white md:border md:border-gray-200 p-2 sm:p-3 md:rounded-2xl md:shadow-xs flex flex-col justify-center items-center text-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  <span className="block sm:hidden">{t.sumSick}</span>
                  <span className="hidden sm:block">{t.sumSickDesk}</span>
                </p>
                <p className="text-base sm:text-2xl font-black text-pink-500 leading-none">{summary.sick}</p>
              </div>
              <div className="flex-1 md:bg-white md:border md:border-gray-200 p-2 sm:p-3 md:rounded-2xl md:shadow-xs flex flex-col justify-center items-center text-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  <span className="block sm:hidden">{t.sumLeave}</span>
                  <span className="hidden sm:block">{t.sumLeaveDesk}</span>
                </p>
                <p className="text-base sm:text-2xl font-black text-gray-800 leading-none">{summary.leave}</p>
              </div>
            </div>

            {/* Kotak Legend Desktop (Sisi Kiri) */}
            <div className="hidden md:flex flex-col gap-2 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 text-xs mt-2">
              <h4 className="font-bold text-gray-700 mb-1 border-b border-gray-200 pb-1">Legend</h4>
              <div className="flex items-center space-x-2"><span className="w-3.5 h-3.5 rounded-md bg-emerald-500 block"></span><span className="text-gray-600 font-medium">{t.legWorking}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3.5 h-3.5 rounded-md bg-pink-500 block"></span><span className="text-gray-600 font-medium">{t.legSick}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3.5 h-3.5 rounded-md bg-rose-500 block"></span><span className="text-gray-600 font-medium">{t.legOff}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3.5 h-3.5 rounded-md bg-orange-500 block"></span><span className="text-gray-600 font-medium">{t.legOther}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3.5 h-3.5 rounded-md border border-gray-300 bg-white block"></span><span className="text-gray-600 font-medium">{t.legNone}</span></div>
            </div>
          </div>

          {/* Area Grid Kalender */}
          <div className="w-full md:w-3/4 flex flex-col">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-semibold text-gray-500 mb-1.5 sm:mb-2">
              <div className="text-rose-500 font-bold">{t.days[0]}</div>
              <div>{t.days[1]}</div>
              <div>{t.days[2]}</div>
              <div>{t.days[3]}</div>
              <div>{t.days[4]}</div>
              <div>{t.days[5]}</div>
              <div className="text-blue-500 font-bold">{t.days[6]}</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {daysArray}
            </div>
          </div>
        </div>

        {/* Kotak Legend Khusus Mobile: Jarak Rapat Sesuai Gambar 3 */}
        <div className="md:hidden mt-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-1.5">
          <h4 className="font-bold text-gray-800 text-xs border-b border-gray-100 pb-1.5 mb-1">Legend</h4>
          <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shrink-0"></span><span className="text-gray-600 font-medium text-xs leading-none">{t.legWorking}</span></div>
          <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 block shrink-0"></span><span className="text-gray-600 font-medium text-xs leading-none">{t.legSick}</span></div>
          <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 block shrink-0"></span><span className="text-gray-600 font-medium text-xs leading-none">{t.legOff}</span></div>
          <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 block shrink-0"></span><span className="text-gray-600 font-medium text-xs leading-none">{t.legOther}</span></div>
          <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full border border-gray-300 bg-white block shrink-0"></span><span className="text-gray-600 font-medium text-xs leading-none">{t.legNone}</span></div>
        </div>
      </div>

      {/* Modal Schedule Detail (Murni Data Supabase) */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4" onClick={() => setModalData(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-100 relative animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Schedule Detail</h3>
              <button onClick={() => setModalData(null)} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-400 font-medium">Date</span>
                <strong className="text-gray-800 font-bold">{modalData.date}</strong>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-400 font-medium">Type / Status</span>
                <strong className="text-gray-800 font-bold">{modalData.type}</strong>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-400 font-medium">Shift</span>
                <strong className="text-gray-800 font-bold">{modalData.shift}</strong>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-400 font-medium">Checked In At</span>
                <strong className="text-emerald-600 font-mono text-[13px] font-bold">{modalData.checkin}</strong>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-gray-400 font-medium">Checked Out At</span>
                <strong className="text-blue-600 font-mono text-[13px] font-bold">{modalData.checkout}</strong>
              </div>
            </div>
            <div className="mt-8 text-right">
              <button 
                onClick={() => setModalData(null)} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
