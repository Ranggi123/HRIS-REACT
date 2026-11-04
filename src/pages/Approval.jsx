import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby28F424Ikd21T4yf0MkGFXdQvgSBKJWXYO5-dQ582lOSxH-kxau6myCtGjulEUleo0RA/exec';

// --- Format Helpers ---
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

  // Auto-fallback: If we're looking for email or status and they have weird names (e.g. emailAddress)
  if (candidateKeys.includes('email')) {
    const foundEmail = keys.find(k => k.toLowerCase().includes('email'));
    if (foundEmail && obj[foundEmail]) return String(obj[foundEmail]).trim();
  }
  if (candidateKeys.includes('status')) {
    const foundStatus = keys.find(k => k.toLowerCase().includes('status'));
    if (foundStatus && obj[foundStatus]) return String(obj[foundStatus]).trim();
  }

  return fallback;
};

const resolveTableColumn = (knownCols, candidates) => {
  if (!knownCols || knownCols.length === 0) return candidates[0];
  for (const cand of candidates) {
    const normCand = cand.toLowerCase().replace(/[\s_?-]/g, '');
    const found = knownCols.find(col => col.toLowerCase().replace(/[\s_?-]/g, '') === normCand);
    if (found) return found;
  }
  return null;
};

const isPendingApprovalStatus = (status) => {
  if (!status) return true; // Anggap pending jika status kosong
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return s === 'pendingapproval' || s === 'pending' || s === 'requesttocancel' || s.includes('pending') || s.includes('tunggu') || s.includes('wait') || s.includes('req') || s === 'submitted' || s === 'unapproved';
};

const isApprovedStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return s === 'approved' || s === 'approve' || s === 'setuju' || s === 'disetujui' || s.includes('approve');
};

const getRowStatus = (row) => {
  if (!row) return '';
  return getPropCaseInsensitive(row, ['Status', 'status', 'Approval Status', 'approval_status', 'Status Approval', 'status_approval'], '');
};

const matchesLineManager = (record, targetEmail, targetName = '') => {
  if (!record || (!targetEmail && !targetName)) return false;
  const mgrVal = getPropCaseInsensitive(record, [
    'Line Manager',
    'line_manager',
    'Line Manager Email',
    'manager_email',
    'Approver',
    'approver_email',
    'Manager',
    'atasan_email',
    'Atasan'
  ], '').trim().toLowerCase();

  if (!mgrVal) return false;
  const tEmail = (targetEmail || '').trim().toLowerCase();
  const tName = (targetName || '').trim().toLowerCase();
  const tUser = tEmail.includes('@') ? tEmail.split('@')[0] : '';

  if (tEmail && (mgrVal === tEmail || mgrVal.includes(tEmail) || tEmail.includes(mgrVal))) return true;
  if (tUser && tUser.length > 2 && (mgrVal === tUser || mgrVal.includes(tUser) || tUser.includes(mgrVal))) return true;
  if (tName && (mgrVal === tName || mgrVal.includes(tName) || tName.includes(mgrVal))) return true;

  return false;
};

// Calendar Date Matcher
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
  return false;
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Approval() {
  const [currentUser] = useState(() => {
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const lang = localStorage.getItem('hris_lang') || 'en';

  // Data States
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  
  // Team Calendar & Directory States
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamScheduleRecords, setTeamScheduleRecords] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [teamScheduleModalData, setTeamScheduleModalData] = useState(null);

  // Filter States
  const [statusTab, setStatusTab] = useState('pending');
  const [activeTab, setActiveTab] = useState('leave');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [itemToReject, setItemToReject] = useState(null);
  
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Line Manager Logged In
  const userWorkEmail = useMemo(() => {
    return (getPropCaseInsensitive(currentUser, ['Employee work email', 'employee_work_email', 'work_email', 'email', 'Email']) || '').trim().toLowerCase();
  }, [currentUser]);

  const userName = useMemo(() => {
    return getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name'], userWorkEmail.split('@')[0] || 'Manager');
  }, [currentUser, userWorkEmail]);

  const refreshAllData = useCallback(async () => {
    if (!userWorkEmail && !userName) return;
    setLoading(true);

    try {
      let subordinateEmails = [];
      const subordinateIdentifiers = new Set();
      
      // 1. Fetch Subordinate Employees
      try {
        const { data: dirData, error: dirErr } = await supabase
          .from('employee_directory')
          .select('*')
          .limit(2000);

        if (!dirErr && dirData) {
          const subordinates = dirData.filter(row => matchesLineManager(row, userWorkEmail, userName));
          
          const uniqueMap = new Map();
          subordinates.forEach(emp => {
            const email = (getPropCaseInsensitive(emp, ['Employee work email', 'work_email', 'email']) || '').trim().toLowerCase();
            const name = getPropCaseInsensitive(emp, ['Name', 'name', 'fullname'], email);

            if (email) {
              subordinateIdentifiers.add(email);
              if (!uniqueMap.has(email)) {
                uniqueMap.set(email, { email, name });
              }
            }
            if (name) subordinateIdentifiers.add(name.trim().toLowerCase());
          });

          subordinateEmails = Array.from(uniqueMap.keys());
          setTeamMembers(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (err) {
        console.warn("Could not query employee_directory:", err);
      }

      // 2. Fetch Leave Requests
      const { data: lvData, error: lvError } = await supabase
        .from('leave_requests')
        .select('*')
        .limit(5000);
      let myLeaves = [];
      if (!lvError && lvData) {
        myLeaves = lvData
          .filter(row => {
            const status = getRowStatus(row);
            const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status);
            
            const hasDirectMgr = matchesLineManager(row, userWorkEmail, userName);
            const empEmail = (getPropCaseInsensitive(row, ['Employee', 'employee', 'email', 'employee_email', 'work_email']) || '').trim().toLowerCase();
            const empName = (getPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'employee_name']) || '').trim().toLowerCase();
            
            const isSubordinate = subordinateEmails.includes(empEmail) || 
                                  subordinateIdentifiers.has(empEmail) || 
                                  subordinateIdentifiers.has(empName) ||
                                  subordinateEmails.some(sub => empEmail && (empEmail.includes(sub) || sub.includes(empEmail)));
            
            if (hasDirectMgr && empEmail) subordinateIdentifiers.add(empEmail);

            return isRelevant && (hasDirectMgr || isSubordinate);
          })
          .map(row => ({
            ...row,
            _category: 'Leave',
            _sourceTable: 'leave_requests'
          }));
      }

      // 3. Fetch Attendance Requests (Exact Same Logic as Leave)
      const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('*')
          .limit(10000);
      let myAttendance = [];
      if (!attErr && attData) {
        myAttendance = attData
          .filter(row => {
            const status = getRowStatus(row);
            const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status);
            
            const hasDirectMgr = matchesLineManager(row, userWorkEmail, userName);
            const empEmail = (getPropCaseInsensitive(row, ['Employee', 'employee', 'email', 'employee_email', 'work_email']) || '').trim().toLowerCase();
            const empName = (getPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'employee_name']) || '').trim().toLowerCase();
            
            const isSubordinate = subordinateEmails.includes(empEmail) || 
                                  subordinateIdentifiers.has(empEmail) || 
                                  subordinateIdentifiers.has(empName) ||
                                  subordinateEmails.some(sub => empEmail && (empEmail.includes(sub) || sub.includes(empEmail)));
            
            if (hasDirectMgr && empEmail) subordinateIdentifiers.add(empEmail);

            return isRelevant && (hasDirectMgr || isSubordinate);
          })
          .map(row => ({
            ...row,
            _category: 'Attendance',
            _sourceTable: 'attendance'
          }));
      }

      // 4. Fetch Team Schedule
      let teamSched = [];
      try {
        const { data: schedData, error: schedErr } = await supabase
          .from('schedule')
          .select('*')
          .limit(5000);

        if (!schedErr && schedData) {
          teamSched = schedData.filter(row => {
            const empEmail = (getPropCaseInsensitive(row, ['Employee', 'employee', 'email', 'work_email']) || '').trim().toLowerCase();
            return subordinateEmails.includes(empEmail) || subordinateEmails.some(sub => empEmail.includes(sub));
          });
        }
      } catch (e) {
        console.warn("Could not query schedule table:", e);
      }

      setLeaveRequests(myLeaves);
      setAttendanceRequests(myAttendance);
      setTeamScheduleRecords(teamSched);
    } catch (err) {
      console.error('Error fetching approval records:', err);
    }
    setLoading(false);
  }, [userWorkEmail, userName]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const setThisMonth = () => setCalendarDate(new Date());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const filteredScheduleRecords = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') return teamScheduleRecords;
    return teamScheduleRecords.filter(item => {
      const email = (getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'work_email']) || '').toLowerCase();
      return email === selectedEmployee.toLowerCase();
    });
  }, [teamScheduleRecords, selectedEmployee]);

  const { calendarDays } = useMemo(() => {
    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const currLoopDate = new Date(year, month, day);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      const teamOnThisDay = filteredScheduleRecords.filter(item => {
        const dbDate = getPropCaseInsensitive(item, ['date', 'Date', 'tanggal', 'schedule_date', 'startdate']);
        return checkDateMatch(dbDate, year, month, day);
      });

      let workingCount = 0; let sickCount = 0; let offCount = 0; let leaveCount = 0;
      teamOnThisDay.forEach(item => {
        const t = (getPropCaseInsensitive(item, ['type', 'Type', 'status']) || '').toLowerCase();
        if (t.includes('working') || t === 'work' || t.includes('kerja')) workingCount++;
        else if (t.includes('sick') || t.includes('maternity') || t.includes('sakit') || t.includes('melahirkan')) sickCount++;
        else if (t.includes('day off') || t === 'off' || t.includes('holiday') || t.includes('libur')) offCount++;
        else if (t) leaveCount++;
      });
      
      days.push({
        day,
        dateToPass: `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`,
        teamData: teamOnThisDay,
        counts: { workingCount, sickCount, offCount, leaveCount },
        isToday,
        isSunday: currLoopDate.getDay() === 0,
        isSaturday: currLoopDate.getDay() === 6
      });
    }
    return { calendarDays: days };
  }, [year, month, totalDays, filteredScheduleRecords, today]);

  const sendNotificationEmail = async (item, newStatus, reason = '') => {
    const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email']);
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname'], 'Employee');
    const reqType = item._category === 'Leave'
      ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], 'Leave')
      : getPropCaseInsensitive(item, ['Type', 'type', 'Attendance Type', 'attendance_type'], 'Attendance');

    if (!empEmail || !empEmail.includes('@')) return;

    let statusColor = '#16a34a';
    if (newStatus === 'Rejected' || newStatus === 'Cancelled') statusColor = '#dc2626';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: ${statusColor}; margin-top: 0; font-size: 18px;">Request ${newStatus}</h2>
        <p style="font-size: 14px;">Hello <strong>${empName}</strong>,</p>
        <p style="font-size: 14px;">Your <strong>${reqType} (${item._category})</strong> request status has been updated to <strong>${newStatus}</strong> by your Line Manager (<strong>${userName}</strong>).</p>
        ${reason ? `<p style="font-size: 14px; background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;"><strong>Notes:</strong> ${reason}</p>` : ''}
      </div>
    `;

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sendEmail", to: empEmail, subject: `[${newStatus}] ${item._category} Request - ${empName}`, body: emailHtml, htmlBody: emailHtml, fromEmail: userWorkEmail })
      });
    } catch (e) { console.warn("Email could not be sent"); }
  };

  const handleUpdateStatus = async (item, newStatus, reason = '') => {
    setIsProcessing(true);
    try {
      const table = item._sourceTable || (item._category === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);

      const statusCol = resolveTableColumn(cols, ['Status', 'status', 'Approval Status', 'approval_status']) || 'Status';
      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'attendance_id', 'no', '_id']);
      const payload = { [statusCol]: newStatus };

      const approverCol = resolveTableColumn(cols, ['approved_by', 'action_by', 'lasteditby']);
      if (approverCol) payload[approverCol] = userWorkEmail;

      const dateCol = resolveTableColumn(cols, ['approved_date', 'approved_at', 'lasteditdate']);
      if (dateCol) payload[dateCol] = new Date().toISOString();

      if (newStatus === 'Rejected' && reason) {
        const reasonCol = resolveTableColumn(cols, ['rejection_reason', 'reject_reason', 'reason', 'notes']);
        if (reasonCol) payload[reasonCol] = reason;
      }

      let query = supabase.from(table).update(payload);

      if (idCol && item[idCol] !== undefined && item[idCol] !== null) {
        query = query.eq(idCol, item[idCol]);
      } else {
        const empCol = resolveTableColumn(cols, ['Employee', 'employee', 'email']) || 'Employee';
        const createdCol = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Date', 'date']) || 'CreatedDate';
        query = query.eq(empCol, item[empCol]).eq(createdCol, item[createdCol]);
      }

      const { error } = await query;
      if (error) throw error;

      // --- SKIP POST-LOGIC FOR ATTENDANCE (Hanya untuk LEAVE) ---
      if (newStatus === 'Approved' && item._category === 'Leave') {
        const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email']);
        const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama']);
        const leaveType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], '');
        const fromDate = getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']);
        const toDate = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
        const totalDays = parseInt(getPropCaseInsensitive(item, ['Total Days Count', 'Total Days', 'Duration']) || '1', 10);

        try {
          const { data: schedSample } = await supabase.from('schedule').select('*').limit(1);
          const schedCols = schedSample && schedSample.length > 0 ? Object.keys(schedSample[0]) : [];
          const schedTypeCol = resolveTableColumn(schedCols, ['Type', 'type', 'schedule_type']) || 'Type';
          const schedEmpCol = resolveTableColumn(schedCols, ['Employee', 'employee']) || 'Employee';
          const schedDateCol = resolveTableColumn(schedCols, ['Date', 'date']) || 'Date';

          const { data: dirSample } = await supabase.from('employee_directory').select('*').limit(1);
          const dirCols = dirSample && dirSample.length > 0 ? Object.keys(dirSample[0]) : [];
          const dirEmailCol = resolveTableColumn(dirCols, ['Email', 'email', 'work_email']) || 'Email';

          let validKeys = [empEmail, empName].filter(Boolean).map(v => String(v).trim().toLowerCase());
          
          if (leaveType === 'Day Off Payment' || leaveType === 'Extra Off') {
             // LOGIKA POTONG SALDO OFF ...
             // (Dipertahankan sama persis dari kode asli)
             const { data: hSample } = await supabase.from('holiday_balance').select('*').limit(1);
             const hCols = hSample && hSample.length > 0 ? Object.keys(hSample[0]) : [];
             const exHolEmpCol = resolveTableColumn(hCols, ['Employee', 'employee', 'email', 'Name', 'name']) || 'Employee';
             
             let holQuery = supabase.from('holiday_balance').select('*').limit(5000);
             const orConditions = validKeys.map(k => `${exHolEmpCol}.ilike.%${k}%`).join(',');
             if (orConditions) holQuery = holQuery.or(orConditions);
             const { data: allHolidays } = await holQuery;

             const candidateHolidays = (allHolidays || []).filter(row => {
               const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
               if (s !== 'unused') return false;
               const t = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type'], '').trim().toLowerCase();
               const isTypeMatch = leaveType.toLowerCase().includes('extra') ? t.includes('extra') : t.includes('day off');
               if (!isTypeMatch) return false;
               const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'email', 'Name']).trim().toLowerCase();
               return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
             });

             if (candidateHolidays.length > 0) {
               const targetHol = candidateHolidays[0];
               const holCols = Object.keys(targetHol);
               const holStatusCol = resolveTableColumn(holCols, ['Status', 'status']) || 'Status';
               const holUsedDateCol = resolveTableColumn(holCols, ['Used Date', 'used_date']) || 'Used Date';
               const holIdCol = resolveTableColumn(holCols, ['UID', 'uid', 'id', 'no']);

               const holUpdatePayload = { [holStatusCol]: 'Used', [holUsedDateCol]: fromDate };

               if (holIdCol && targetHol[holIdCol] !== undefined && targetHol[holIdCol] !== null) {
                 await supabase.from('holiday_balance').update(holUpdatePayload).eq(holIdCol, targetHol[holIdCol]);
               }
             }

             await supabase.from('schedule').update({ [schedTypeCol]: leaveType }).ilike(schedEmpCol, `%${empEmail}%`).eq(schedDateCol, fromDate);
          }
          else if (leaveType === 'Annual Leave') {
            await supabase.from('schedule').update({ [schedTypeCol]: leaveType }).ilike(schedEmpCol, `%${empEmail}%`).gte(schedDateCol, fromDate).lte(schedDateCol, toDate);
            const { data: emps } = await supabase.from('employee_directory').select('*').ilike(dirEmailCol, empEmail).limit(1);
            if (emps && emps.length > 0) {
              const empData = emps[0];
              const annBalCol = resolveTableColumn(dirCols, ['Annual Leave Balance', 'annual_leave_balance']) || 'Annual Leave Balance';
              const currBal = parseFloat(empData[annBalCol]) || 0;
              await supabase.from('employee_directory').update({ [annBalCol]: Math.max(0, currBal - totalDays) }).ilike(dirEmailCol, empEmail);
            }
          }
          else if (['Sick Leave', 'Maternity Leave', 'Compassionate Leave', 'Unpaid Leave'].includes(leaveType)) {
            await supabase.from('schedule').update({ [schedTypeCol]: leaveType }).ilike(schedEmpCol, `%${empEmail}%`).gte(schedDateCol, fromDate).lte(schedDateCol, toDate);
          }
        } catch (sideErr) {
          console.error('Error applying post-approval side effects:', sideErr);
        }
      }

      await sendNotificationEmail(item, newStatus, reason);

      alert(`Request successfully ${newStatus === 'Approved' ? 'approved' : 'rejected'}!`);
      setIsDetailModalOpen(false);
      setIsRejectModalOpen(false);
      setItemToReject(null);
      setRejectReason('');
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to process request: ' + err.message);
    }
    setIsProcessing(false);
  };

  const handleCancelApproved = async (item) => {
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama'], 'Employee');
    const reqCategory = item._category || 'Leave';
    const reqType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type'], reqCategory);

    if (!window.confirm(`Batalkan persetujuan ${reqType} untuk ${empName}?`)) return;

    setIsProcessing(true);
    try {
      const table = item._sourceTable || (reqCategory === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);
      const statusCol = resolveTableColumn(cols, ['Status', 'status', 'Approval Status']) || 'Status';
      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'attendance_id']);

      const payload = { [statusCol]: 'Cancelled' };
      const approverCol = resolveTableColumn(cols, ['approved_by', 'action_by']);
      if (approverCol) payload[approverCol] = userWorkEmail;

      let query = supabase.from(table).update(payload);
      if (idCol && item[idCol] !== undefined && item[idCol] !== null) {
        query = query.eq(idCol, item[idCol]);
      } else {
        const empCol = resolveTableColumn(cols, ['Employee', 'employee', 'email']) || 'Employee';
        const createdCol = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Date', 'date']) || 'CreatedDate';
        query = query.eq(empCol, item[empCol]).eq(createdCol, item[createdCol]);
      }

      const { error: cancelErr } = await query;
      if (cancelErr) throw cancelErr;

      // REVERT BALANCE HANYA UNTUK LEAVE
      if (reqCategory === 'Leave') {
         // ... (Logic Revert Balance dan Schedule) ...
         const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email']);
         const leaveType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], '');
         const fromDate = getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']);
         const toDate = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
         
         const { data: schedSample } = await supabase.from('schedule').select('*').limit(1);
         const schedCols = schedSample && schedSample.length > 0 ? Object.keys(schedSample[0]) : [];
         const schedTypeCol = resolveTableColumn(schedCols, ['Type', 'type', 'schedule_type']) || 'Type';
         const schedEmpCol = resolveTableColumn(schedCols, ['Employee', 'employee']) || 'Employee';
         const schedDateCol = resolveTableColumn(schedCols, ['Date', 'date']) || 'Date';
 
         if (leaveType === 'Annual Leave' || ['Sick Leave', 'Maternity Leave', 'Compassionate Leave', 'Unpaid Leave'].includes(leaveType) || leaveType === 'Day Off Payment' || leaveType === 'Extra Off') {
           await supabase.from('schedule').update({
             [schedTypeCol]: 'Working Day'
           })
           .ilike(schedEmpCol, `%${empEmail}%`)
           .gte(schedDateCol, fromDate)
           .lte(schedDateCol, toDate || fromDate);
         }
      }

      await sendNotificationEmail(item, 'Cancelled', 'Persetujuan telah dibatalkan oleh Line Manager.');
      alert('Persetujuan berhasil dibatalkan!');
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Gagal membatalkan: ' + err.message);
    }
    setIsProcessing(false);
  };

  const openDetailModal = (item) => { setSelectedRequest(item); setIsDetailModalOpen(true); };
  const openRejectDialog = (item, e) => { if (e) e.stopPropagation(); setItemToReject(item); setRejectReason(''); setIsRejectModalOpen(true); };
  const handleConfirmReject = () => { if (!itemToReject) return; handleUpdateStatus(itemToReject, 'Rejected', rejectReason); };

  const pendingLeavesCount = useMemo(() => leaveRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length, [leaveRequests]);
  const approvedLeavesCount = useMemo(() => leaveRequests.filter(r => isApprovedStatus(getRowStatus(r))).length, [leaveRequests]);
  const pendingAttCount = useMemo(() => attendanceRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length, [attendanceRequests]);
  const approvedAttCount = useMemo(() => attendanceRequests.filter(r => isApprovedStatus(getRowStatus(r))).length, [attendanceRequests]);

  const currentLeaveCount = statusTab === 'approved' ? approvedLeavesCount : pendingLeavesCount;
  const currentAttCount = statusTab === 'approved' ? approvedAttCount : pendingAttCount;

  const combinedList = useMemo(() => {
    let list = [];
    if (activeTab === 'leave') {
      list = [...leaveRequests];
      list = list.filter(item => statusTab === 'pending' ? isPendingApprovalStatus(getRowStatus(item)) : isApprovedStatus(getRowStatus(item)));
    } else if (activeTab === 'attendance') {
      list = [...attendanceRequests];
      list = list.filter(item => statusTab === 'pending' ? isPendingApprovalStatus(getRowStatus(item)) : isApprovedStatus(getRowStatus(item)));
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      const target = selectedEmployee.toLowerCase();
      list = list.filter(item => {
        const empEmail = (getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email']) || '').toLowerCase();
        return empEmail === target || empEmail.includes(target) || target.includes(empEmail);
      });
    }

    return list.sort((a, b) => {
      const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'created_at'])) || new Date(0);
      const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'created_at'])) || new Date(0);
      return dtB.getTime() - dtA.getTime();
    });
  }, [statusTab, activeTab, leaveRequests, attendanceRequests, selectedEmployee]);

  return (
    <div className="w-full text-gray-800 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 w-full">
        <div className="p-4 sm:p-6 pb-4 border-b border-gray-100">
          <div className="flex flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 pr-2 sm:pr-3">
              <div className="hidden sm:flex p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-gray-900 break-words">Approval Requests</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:flex bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-gray-400 mr-1.5 font-medium">Line Manager:</span>
                <span className="font-semibold text-gray-700">{userWorkEmail || 'Not Logged In'}</span>
              </div>
              <button
                onClick={refreshAllData}
                disabled={loading}
                className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-row justify-between items-center gap-2 w-full sm:w-auto">
              <div className="flex p-1 bg-gray-100 rounded-xl space-x-1 shrink-0">
                <button onClick={() => setActiveTab('leave')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'leave' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Leave ({currentLeaveCount})</button>
                <button onClick={() => setActiveTab('attendance')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'attendance' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Attendance ({currentAttCount})</button>
              </div>
              <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
                <select value={statusTab} onChange={(e) => setStatusTab(e.target.value)} className="w-full pl-3 pr-8 py-2 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}>
                  <option value="pending">Pending ({activeTab === 'leave' ? pendingLeavesCount : pendingAttCount})</option>
                  <option value="approved">Approved ({activeTab === 'leave' ? approvedLeavesCount : approvedAttCount})</option>
                </select>
              </div>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[240px]">
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full pl-3 pr-8 py-2 text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}>
                <option value="all">All Team Members ({teamMembers.length})</option>
                {teamMembers.map(m => <option key={m.email} value={m.email}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Request Type</th>
                <th className="px-4 py-3">Date / Period</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-400"><svg className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p className="text-xs">Loading requests...</p></td></tr>
              ) : combinedList.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-400"><p className="font-semibold text-gray-600 text-sm">No requests found.</p></td></tr>
              ) : (
                combinedList.map((item, idx) => {
                  const isLeave = item._category === 'Leave';
                  const employeeName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name'], 'No Name');
                  const employeeEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid'], '-');
                  const reqType = isLeave ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], 'Leave') : getPropCaseInsensitive(item, ['Type', 'type', 'Attendance Type', 'attendance_type'], 'Attendance');
                  const status = getRowStatus(item) || 'Pending Approval';
                  let dateInfo = '-';
                  if (isLeave) {
                    const fromDate = formatDateDisplay(getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date']), lang);
                    const toDate = formatDateDisplay(getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date']), lang);
                    dateInfo = `${fromDate} - ${toDate}`;
                  } else {
                    dateInfo = formatDateDisplay(getPropCaseInsensitive(item, ['Date', 'date', 'attendance_date', 'CreatedDate']), lang);
                  }

                  return (
                    <tr key={idx} onClick={() => openDetailModal(item)} className="hover:bg-blue-50/40 transition cursor-pointer text-xs sm:text-sm border-b border-gray-100">
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${isLeave ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{item._category}</span></td>
                      <td className="px-4 py-3"><div className="font-semibold text-gray-900">{employeeName}</div><div className="text-[11px] text-gray-400 truncate max-w-[150px]">{employeeEmail}</div></td>
                      <td className="px-4 py-3 font-medium text-gray-800"><span className="font-semibold text-gray-800">{reqType}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">{dateInfo}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {(() => {
                          let badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                          if (isApprovedStatus(status)) badgeClass = 'bg-green-100 text-green-700 border-green-200';
                          else if (status.toLowerCase().includes('reject') || status.toLowerCase().includes('cancel')) badgeClass = 'bg-red-100 text-red-700 border-red-200';
                          return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>{status || 'Pending Approval'}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const s = getRowStatus(item);
                          if (isApprovedStatus(s)) {
                            return <button onClick={() => handleCancelApproved(item)} className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg flex items-center gap-1 mx-auto cursor-pointer"><span>Cancel Approval</span></button>;
                          }
                          if (s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel') {
                            return (
                              <div className="flex items-center justify-center space-x-1.5">
                                <button onClick={() => handleCancelApproved(item)} className="px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg cursor-pointer">Approve Cancel</button>
                                <button onClick={(e) => openRejectDialog(item, e)} className="px-2.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold rounded-lg cursor-pointer">Reject</button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button onClick={() => { if (window.confirm(`Approve request from ${employeeName}?`)) handleUpdateStatus(item, 'Approved'); }} className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer">Approve</button>
                              <button onClick={(e) => openRejectDialog(item, e)} className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg cursor-pointer">Reject</button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Detail Modals Below (Same as original) --- */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${selectedRequest._category === 'Leave' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  {selectedRequest._category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Request Detail</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Employee Information</span>
              <div className="text-sm font-bold text-gray-800">{getPropCaseInsensitive(selectedRequest, ['Name', 'name', 'nama', 'fullname', 'full_name'], '-')}</div>
              <div className="text-xs text-gray-500">Email: {getPropCaseInsensitive(selectedRequest, ['Employee', 'employee', 'email', 'user_uid'], '-')}</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Request Type</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">
                    {selectedRequest._category === 'Leave' ? getPropCaseInsensitive(selectedRequest, ['Leave Type', 'leave_type', 'Type', 'type'], '-') : getPropCaseInsensitive(selectedRequest, ['Type', 'type', 'Attendance Type', 'attendance_type'], '-')}
                  </span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Current Status</span>
                  <span className="text-xs sm:text-sm font-bold text-yellow-600">{getRowStatus(selectedRequest) || 'Pending Approval'}</span>
                </div>
              </div>

              {selectedRequest._category === 'Leave' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">From Date</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">{formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['From Date', 'from_date', 'Start Date', 'start_date']), lang)}</span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">To Date</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">{formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['To Date', 'to_date', 'End Date', 'end_date']), lang)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">Attendance Date</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">{formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['Date', 'date', 'attendance_date', 'CreatedDate']), lang)}</span>
                  </div>
                </>
              )}

              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <span className="text-[10px] text-gray-400 font-semibold block">Reason / Notes</span>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{getPropCaseInsensitive(selectedRequest, ['Reason', 'reason', 'Description', 'notes', 'keterangan'], '-')}</p>
              </div>

              {getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'photo']) && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block mb-2">Attachment</span>
                  <img src={getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'photo'])} alt="Proof" className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => { setPhotoPreviewUrl(getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'photo'])); setIsPhotoModalOpen(true); }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/128/337/337946.png'; }} />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-gray-100">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer">Close</button>
              {(() => {
                const s = getRowStatus(selectedRequest);
                if (isApprovedStatus(s)) return <button onClick={() => handleCancelApproved(selectedRequest)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl cursor-pointer">Cancel Approval</button>;
                return (
                  <>
                    <button onClick={() => openRejectDialog(selectedRequest)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl cursor-pointer">Reject</button>
                    <button onClick={() => { if (window.confirm('Are you sure you want to approve this request?')) handleUpdateStatus(selectedRequest, 'Approved'); }} className="px-5 py-2 bg-green-600 text-white text-xs font-bold rounded-xl cursor-pointer">Approve</button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && itemToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Confirm Rejection</h3>
            <label className="block text-xs font-semibold text-gray-700 mb-1 mt-3">Reason (optional)</label>
            <textarea rows="3" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsRejectModalOpen(false); setItemToReject(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer">Cancel</button>
              <button onClick={handleConfirmReject} className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer">Reject</button>
            </div>
          </div>
        </div>
      )}

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-700">Preview</span>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-3 flex justify-center bg-gray-50 max-h-[80vh] overflow-auto">
              <img src={photoPreviewUrl} referrerPolicy="no-referrer" alt="Preview" className="max-h-[70vh] w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}