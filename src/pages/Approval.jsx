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

const resolveTableColumn = (knownCols, candidates) => {
  if (!knownCols || knownCols.length === 0) return candidates[0];
  for (const cand of candidates) {
    const normCand = cand.toLowerCase().replace(/[\s_?-]/g, '');
    const found = knownCols.find(col => col.toLowerCase().replace(/[\s_?-]/g, '') === normCand);
    if (found) return found;
  }
  return null;
};

// Approval Status Checkers (Bilingual: ID & EN)
const isPendingApprovalStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return (
    s === 'pendingapproval' ||
    s === 'pending' ||
    s === 'requesttocancel' ||
    s === 'menunggu' ||
    s === 'menunggupersetujuan' ||
    s === 'diajukan' ||
    s === 'submitted' ||
    s === 'review' ||
    s === 'waiting' ||
    s === 'waitingapproval' ||
    s.includes('pending') ||
    s.includes('menunggu')
  );
};

const isApprovedStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return (
    s === 'approved' ||
    s === 'approve' ||
    s === 'setuju' ||
    s === 'disetujui' ||
    s === 'diterima' ||
    s.includes('approve') ||
    s.includes('setuju') ||
    s.includes('disetujui')
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
      'request_status',
      'Status Pengajuan',
      'status_pengajuan'
    ],
    ''
  );
  if (explicitApproval) return explicitApproval;

  return getPropCaseInsensitive(row, ['Status', 'status'], '');
};

// Helper pencocokan Line Manager strictly
const matchesLineManager = (record, targetEmail, targetName = '') => {
  if (!record || (!targetEmail && !targetName)) return false;
  const tEmail = (targetEmail || '').trim().toLowerCase();
  const tName = (targetName || '').trim().toLowerCase();
  const tUser = tEmail.includes('@') ? tEmail.split('@')[0] : '';

  const mgrVal = getPropCaseInsensitive(record, [
    'Line Manager work email', 'line_manager_work_email', 'Line Manager Email',
    'line_manager_email', 'Line Manager', 'line_manager', 'manager_email',
    'Manager Email', 'Approver Email', 'approver_email', 'Approver', 'approver',
    'Atasan Email', 'atasan_email'
  ], '').trim().toLowerCase();

  if (!mgrVal || mgrVal === '-' || mgrVal === 'null' || mgrVal === 'undefined') {
    return false;
  }

  if (tEmail && (mgrVal === tEmail || mgrVal.includes(tEmail) || tEmail.includes(mgrVal))) return true;
  if (tUser && tUser.length > 2 && (mgrVal === tUser || mgrVal.includes(tUser) || tUser.includes(mgrVal))) return true;
  if (tName && tName.length > 2 && (mgrVal === tName || mgrVal.includes(tName) || tName.includes(mgrVal))) return true;

  return false;
};

// Fungsi pengecekan hybrid untuk attendance dan leave
const isRecordForMyTeam = (record, targetEmail, targetName, subordinateEmails, category) => {
  const isLineManagerMatched = matchesLineManager(record, targetEmail, targetName);
  
  if (isLineManagerMatched) return true;

  // Jika tidak match, tapi ini tabel attendance, kita gunakan FALLBACK bawahan
  // Karena seringkali tabel attendance tidak memiliki kolom Line Manager yang valid saat awal mula insert
  if (category === 'Attendance') {
    const empEmail = (getPropCaseInsensitive(record, [
      'Employee work email', 'employee_work_email', 'work_email', 'work email',
      'Work Email', 'Employee', 'employee', 'email', 'Email', 'user_uid'
    ]) || '').trim().toLowerCase();
    
    return Boolean(empEmail && subordinateEmails.includes(empEmail));
  }

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

  // Filter States: 'all' | 'pending' | 'approved'
  const [statusTab, setStatusTab] = useState('pending'); // Default to pending
  const [activeTab, setActiveTab] = useState('leave'); // 'leave' | 'attendance'
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [itemToReject, setItemToReject] = useState(null);
  
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Line Manager login identifier (from session)
  const sessionIdentifier = useMemo(() => {
    return (
      getPropCaseInsensitive(currentUser, [
        'email',
        'Email',
        'user_uid',
        'USER_UID',
        'Employee work email',
        'employee_work_email',
        'work_email',
        'work email',
        'Work Email'
      ]) || ''
    ).trim().toLowerCase();
  }, [currentUser]);

  const sessionName = useMemo(() => {
    return getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name'], sessionIdentifier.split('@')[0] || 'Manager');
  }, [currentUser, sessionIdentifier]);

  // State untuk menyimpan data riil user yang sedang login dari directory
  const [actualUserWorkEmail, setActualUserWorkEmail] = useState('');
  const [actualUserName, setActualUserName] = useState('');

  // Fetch Requests, Directory, and Schedule for this Line Manager
  const refreshAllData = useCallback(async () => {
    if (!sessionIdentifier) return;
    setLoading(true);

    try {
      let subordinateEmails = [];
      const subordinateIdentifiers = new Set();
      let realWorkEmail = sessionIdentifier;
      let realName = sessionName;

      // 0. Ambil data riil user yang sedang login dari employee_directory terlebih dahulu
      // Ini berguna jika email login (session) berbeda dengan work email di sistem HRIS
      try {
        const { data: myDirData } = await supabase
          .from('employee_directory')
          .select('*');
          
        if (myDirData && myDirData.length > 0) {
          // Cari record diri sendiri (berdasarkan login email/uid atau nama)
          const myRecord = myDirData.find(emp => {
            const empEmail = (getPropCaseInsensitive(emp, ['Email', 'email', 'user_uid']) || '').trim().toLowerCase();
            const empWorkEmail = (getPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email']) || '').trim().toLowerCase();
            return empEmail === sessionIdentifier || empWorkEmail === sessionIdentifier;
          });

          if (myRecord) {
            // Gunakan Employee work email riil dari database
            const foundWorkEmail = getPropCaseInsensitive(myRecord, [
              'Employee work email',
              'employee_work_email',
              'work_email',
              'work email',
              'Work Email',
              'email',
              'Email'
            ]).trim().toLowerCase();
            
            if (foundWorkEmail) realWorkEmail = foundWorkEmail;
            
            const foundName = getPropCaseInsensitive(myRecord, ['Name', 'name', 'nama', 'fullname', 'full_name']);
            if (foundName) realName = foundName;
          }
        }
      } catch (err) {
        console.warn("[Approval] Error fetching real user data:", err);
      }

      setActualUserWorkEmail(realWorkEmail);
      setActualUserName(realName);

      // 1. Fetch Subordinate Employees from employee_directory
      try {
        const { data: dirData, error: dirErr } = await supabase
          .from('employee_directory')
          .select('*')
          .limit(2000);

        if (dirErr) {
          console.warn("[Approval] Error fetching employee_directory:", dirErr.message);
        } else if (dirData) {
          // Gunakan realWorkEmail yang sudah divalidasi dari database
          const subordinates = dirData.filter(row => matchesLineManager(row, realWorkEmail, realName));
          
          const uniqueMap = new Map();
          subordinates.forEach(emp => {
            const email = (getPropCaseInsensitive(emp, [
              'Employee work email',
              'employee_work_email',
              'work_email',
              'work email',
              'Work Email',
              'email',
              'Email',
              'user_uid'
            ]) || '').trim().toLowerCase();

            const name = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], email);
            const id = (getPropCaseInsensitive(emp, ['Employee ID', 'employee_id', 'id', 'Barcode', 'barcode', 'nik', 'nip']) || '').trim().toLowerCase();

            if (email) {
              subordinateIdentifiers.add(email);
              if (!uniqueMap.has(email)) {
                uniqueMap.set(email, { email, name });
              }
            }
            if (name) subordinateIdentifiers.add(name.trim().toLowerCase());
            if (id) subordinateIdentifiers.add(id);
          });

          subordinateEmails = Array.from(uniqueMap.keys());
          setTeamMembers(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (err) {
        console.warn("[Approval] Could not query employee_directory:", err);
      }

      // 2. Fetch Leave Requests (Pending and Approved)
      let myLeaves = [];
      try {
        const { data: lvData, error: lvError } = await supabase
          .from('leave_requests')
          .select('*')
          .limit(2000);

        if (lvError) {
          console.warn("[Approval] Error fetching leave_requests:", lvError.message);
        } else if (lvData) {
          myLeaves = lvData
            .filter(row => {
              const status = getRowStatus(row);
              const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status);
              const isMyLineManager = isRecordForMyTeam(row, realWorkEmail, realName, subordinateEmails, row._category);

              return isRelevant && isMyLineManager;
            })
            .map(row => ({
              ...row,
              _category: 'Leave',
              _sourceTable: 'leave_requests'
            }));
        }
      } catch (e) {
        console.warn("[Approval] Failed fetching leave_requests:", e);
      }

      // 3. Fetch Attendance Requests
      let myAttendance = [];
      try {
        const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('*')
          .limit(3000);

        if (attErr) {
          console.error("[Approval] Error query table attendance:", attErr.message);
        } else if (attData) {
          myAttendance = attData
            .filter(row => {
              const status = getRowStatus(row);
              // Untuk attendance tidak perlu yang approved, hanya yang pending atau blank yg butuh approve
              const isRelevant = isPendingApprovalStatus(status) || !status;
              const isMyLineManager = isRecordForMyTeam(row, realWorkEmail, realName, subordinateEmails, row._category);

              return isRelevant && isMyLineManager;
            })
            .map(row => ({
              ...row,
              _category: 'Attendance',
              _sourceTable: 'attendance'
            }));
        }
      } catch (e) {
        console.error("[Approval] Exception saat query attendance:", e);
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
            const empEmail = (getPropCaseInsensitive(row, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email', 'Employee work email']) || '').trim().toLowerCase();
            return subordinateEmails.includes(empEmail);
          });
        }
      } catch (e) {
        console.warn("[Approval] Could not query schedule table:", e);
      }

      setLeaveRequests(myLeaves);
      setAttendanceRequests(myAttendance);
      setTeamScheduleRecords(teamSched);
    } catch (err) {
      console.error('[Approval] Error fetching approval records:', err);
    }
    setLoading(false);
  }, [sessionIdentifier, sessionName]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Calendar Controls
  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const setThisMonth = () => setCalendarDate(new Date());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Filtered schedules according to selected employee dropdown
  const filteredScheduleRecords = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') {
      return teamScheduleRecords;
    }
    return teamScheduleRecords.filter(item => {
      const email = (getPropCaseInsensitive(item, [
        'Employee',
        'employee',
        'email',
        'user_uid',
        'employee_email',
        'work_email',
        'Employee work email'
      ]) || '').toLowerCase();
      return email === selectedEmployee.toLowerCase();
    });
  }, [teamScheduleRecords, selectedEmployee]);

  const { calendarDays } = useMemo(() => {
    const days = [];

    for (let day = 1; day <= totalDays; day++) {
      const currLoopDate = new Date(year, month, day);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      const teamOnThisDay = filteredScheduleRecords.filter(item => {
        const dbDate = getPropCaseInsensitive(item, ['date', 'Date', 'tanggal', 'scheduledate', 'schedule_date', 'startdate']);
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

  // Send email notification upon Approve / Reject / Cancel
  const sendNotificationEmail = async (item, newStatus, reason = '') => {
    const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email']);
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'employee_name'], 'Employee');
    const reqType = item._category === 'Leave'
      ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], 'Leave')
      : (getPropCaseInsensitive(item, ['Action', 'action', 'Type', 'type', 'Attendance Type'], 'Attendance'));

    if (!empEmail || !empEmail.includes('@')) return;

    let statusColor = '#16a34a';
    if (newStatus === 'Rejected' || newStatus === 'Cancelled') statusColor = '#dc2626';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: ${statusColor}; margin-top: 0; font-size: 18px;">Request ${newStatus}</h2>
        <p style="font-size: 14px;">Hello <strong>${empName}</strong>,</p>
        <p style="font-size: 14px;">Your <strong>${reqType} (${item._category})</strong> request status has been updated to <strong>${newStatus}</strong> by your Line Manager (<strong>${actualUserName}</strong>).</p>
        ${reason ? `<p style="font-size: 14px; background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;"><strong>Notes:</strong> ${reason}</p>` : ''}
        <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></p>
          <p style="margin: 4px 0;"><strong>Line Manager:</strong> ${actualUserWorkEmail}</p>
        </div>
      </div>
    `;

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "sendEmail",
          to: empEmail,
          subject: `[${newStatus}] ${item._category} Request - ${empName}`,
          body: emailHtml,
          htmlBody: emailHtml,
          fromEmail: actualUserWorkEmail
        })
      });
    } catch (e) {
      console.warn("Notice email could not be sent:", e);
    }
  };

  // Action: Approve or Reject
  const handleUpdateStatus = async (item, newStatus, reason = '') => {
    setIsProcessing(true);
    try {
      const table = item._sourceTable || (item._category === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);

      const statusCol = resolveTableColumn(cols, [
        'Approval Status',
        'approval_status',
        'Status Approval',
        'status_approval',
        'Approval',
        'approval',
        'Request Status',
        'request_status',
        'Status',
        'status'
      ]) || 'Status';

      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'Leave ID', 'Leave_ID', 'attendance_id', 'Attendance ID', 'no', '_id']);

      const nowIso = new Date().toISOString();
      const payload = {
        [statusCol]: newStatus
      };

      const approverCol = resolveTableColumn(cols, ['approved_by', 'Approved By', 'action_by', 'Action By', 'lasteditby', 'last_edit_by']);
      if (approverCol) payload[approverCol] = actualUserWorkEmail;

      const dateCol = resolveTableColumn(cols, ['approved_date', 'Approved Date', 'approved_at', 'lasteditdate', 'last_editdate', 'last_edit_date']);
      if (dateCol) payload[dateCol] = nowIso;

      if (newStatus === 'Rejected' && reason) {
        const reasonCol = resolveTableColumn(cols, ['rejection_reason', 'Rejection Reason', 'reject_reason', 'reason', 'Reason', 'notes', 'Notes']);
        if (reasonCol) payload[reasonCol] = reason;
      }

      let query = supabase.from(table).update(payload);

      if (idCol && item[idCol] !== undefined && item[idCol] !== null) {
        query = query.eq(idCol, item[idCol]);
      } else {
        const empCol = resolveTableColumn(cols, ['Employee', 'employee', 'user_uid', 'email']) || 'Employee';
        const createdCol = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Date', 'date']) || 'CreatedDate';
        query = query.eq(empCol, item[empCol]).eq(createdCol, item[createdCol]);
      }

      const { error } = await query;
      if (error) throw error;

      // --- LEAVE APPROVAL POST-LOGIC ---
      if (newStatus === 'Approved' && item._category === 'Leave') {
        const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'user_uid', 'email']);
        const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name']);
        const leaveType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '');
        const fromDate = getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']);
        const toDate = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
        const totalDays = parseInt(getPropCaseInsensitive(item, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration']) || '1', 10);

        try {
          const { data: schedSample } = await supabase.from('schedule').select('*').limit(1);
          const schedCols = schedSample && schedSample.length > 0 ? Object.keys(schedSample[0]) : [];
          const schedTypeCol = resolveTableColumn(schedCols, ['Type', 'type', 'schedule_type']) || 'Type';
          const schedEmpCol = resolveTableColumn(schedCols, ['Employee', 'employee']) || 'Employee';
          const schedDateCol = resolveTableColumn(schedCols, ['Date', 'date']) || 'Date';

          const { data: dirSample } = await supabase.from('employee_directory').select('*').limit(1);
          const dirCols = dirSample && dirSample.length > 0 ? Object.keys(dirSample[0]) : [];
          const dirEmailCol = resolveTableColumn(dirCols, ['Email', 'email', 'Employee work email', 'work_email']) || 'Email';

          let validKeys = [empEmail, empName].filter(Boolean).map(v => String(v).trim().toLowerCase());
          try {
            const { data: empDirMatch } = await supabase.from('employee_directory').select('*').ilike(dirEmailCol, empEmail).limit(1);
            if (empDirMatch && empDirMatch.length > 0) {
              const ed = empDirMatch[0];
              const eId = getPropCaseInsensitive(ed, ['Employee ID', 'employee_id', 'employeeid', 'id', 'Barcode', 'barcode']);
              const eName = getPropCaseInsensitive(ed, ['Name', 'name', 'nama', 'fullname', 'full_name']);
              if (eId) validKeys.push(eId.trim().toLowerCase());
              if (eName) validKeys.push(eName.trim().toLowerCase());
            }
          } catch (e) {}
          validKeys = Array.from(new Set(validKeys.filter(Boolean)));

          if (leaveType === 'Day Off Payment' || leaveType === 'Extra Off') {
            const { data: hSample } = await supabase.from('holiday_balance').select('*').limit(1);
            const hCols = hSample && hSample.length > 0 ? Object.keys(hSample[0]) : [];
            const exHolEmpCol = resolveTableColumn(hCols, ['Employee', 'employee', 'user_uid', 'email', 'Name', 'name']) || 'Employee';
            
            let holQuery = supabase.from('holiday_balance').select('*').limit(5000);
            const orConditions = validKeys.map(k => `${exHolEmpCol}.ilike.%${k}%`).join(',');
            if (orConditions) {
               holQuery = holQuery.or(orConditions);
            }
            const { data: allHolidays, error: holFetchErr } = await holQuery;

            if (holFetchErr) throw new Error("Gagal membaca holiday_balance: " + holFetchErr.message);

            const candidateHolidays = (allHolidays || []).filter(row => {
              const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
              if (s !== 'unused') return false;

              const t = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
              const isTypeMatch = leaveType.toLowerCase().includes('extra')
                ? (t.includes('extra off') || t.includes('extra'))
                : (t.includes('day off') || t.includes('dayoff'));
              if (!isTypeMatch) return false;

              const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']).trim().toLowerCase();
              return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
            });

            candidateHolidays.sort((a, b) => {
              const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired Date', 'expired', 'Date', 'date'])) || new Date(9999, 11, 31);
              const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired Date', 'expired', 'Date', 'date'])) || new Date(9999, 11, 31);
              return dtA.getTime() - dtB.getTime();
            });

            if (candidateHolidays.length > 0) {
              const targetHol = candidateHolidays[0];
              const holCols = Object.keys(targetHol);
              const holStatusCol = resolveTableColumn(holCols, ['Status', 'status', 'STATUS']) || 'Status';
              const holUsedDateCol = resolveTableColumn(holCols, ['Used Date', 'used_date', 'UsedDate', 'tanggal_digunakan']) || 'Used Date';
              const holIdCol = resolveTableColumn(holCols, ['UID', 'uid', 'id', 'ID', 'Id', '_id', 'Holiday ID', 'holiday_id', 'no', 'No']);

              const holUpdatePayload = {
                [holStatusCol]: 'Used',
                [holUsedDateCol]: fromDate
              };

              if (holIdCol && targetHol[holIdCol] !== undefined && targetHol[holIdCol] !== null) {
                await supabase.from('holiday_balance').update(holUpdatePayload).eq(holIdCol, targetHol[holIdCol]);
              } else {
                const holEmpCol = resolveTableColumn(holCols, ['Employee', 'employee', 'user_uid', 'email']) || 'Employee';
                const holTypeCol = resolveTableColumn(holCols, ['Type Holiday', 'type_holiday', 'Type', 'type']) || 'Type Holiday';
                const holExpDateCol = resolveTableColumn(holCols, ['Expiration Date', 'expiration_date', 'Expired Date']) || 'Expiration Date';

                await supabase.from('holiday_balance').update(holUpdatePayload)
                  .eq(holEmpCol, targetHol[holEmpCol])
                  .eq(holTypeCol, targetHol[holTypeCol])
                  .eq(holStatusCol, targetHol[holStatusCol])
                  .eq(holExpDateCol, targetHol[holExpDateCol]);
              }
            }

            // Update schedule
            await supabase.from('schedule').update({
              [schedTypeCol]: leaveType
            })
            .ilike(schedEmpCol, `%${empEmail}%`)
            .eq(schedDateCol, fromDate);

            // Recalculate Balance
            let recheckQuery = supabase.from('holiday_balance').select('*').limit(5000);
            if (orConditions) {
               recheckQuery = recheckQuery.or(orConditions);
            }
            const { data: recheckHolidays } = await recheckQuery;
            
            let unusedCount = 0;
            if (recheckHolidays) {
              unusedCount = recheckHolidays.filter(row => {
                const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
                if (s !== 'unused') return false;
                const t = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
                const isTypeMatch = leaveType.toLowerCase().includes('extra')
                  ? (t.includes('extra off') || t.includes('extra'))
                  : (t.includes('day off') || t.includes('dayoff'));
                if (!isTypeMatch) return false;
                const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']).trim().toLowerCase();
                return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
              }).length;
            }

            const balColCandidates = leaveType.toLowerCase().includes('extra') 
              ? ['Extra Off Balance', 'extra_off_balance', 'Extra Off', 'extraoffbalance'] 
              : ['Day Off Payment Balance', 'day_off_payment_balance', 'Day Off Payment', 'dayoffbalance'];
            const balCol = resolveTableColumn(dirCols, balColCandidates) || balColCandidates[0];
            
            await supabase.from('employee_directory').update({
              [balCol]: unusedCount
            }).ilike(dirEmailCol, empEmail);
          } else if (leaveType === 'Annual Leave') {
            await supabase.from('schedule').update({
              [schedTypeCol]: leaveType
            })
            .ilike(schedEmpCol, `%${empEmail}%`)
            .gte(schedDateCol, fromDate)
            .lte(schedDateCol, toDate);

            const { data: emps } = await supabase.from('employee_directory').select('*').ilike(dirEmailCol, empEmail).limit(1);
            if (emps && emps.length > 0) {
              const empData = emps[0];
              const annBalCol = resolveTableColumn(dirCols, ['Annual Leave Balance', 'annual_leave_balance', 'Annual Leave', 'annualleave']) || 'Annual Leave Balance';
              const currBal = parseFloat(empData[annBalCol]) || 0;
              await supabase.from('employee_directory').update({
                [annBalCol]: Math.max(0, currBal - totalDays)
              }).ilike(dirEmailCol, empEmail);
            }
          } else if (['Sick Leave', 'Maternity Leave', 'Compassionate Leave', 'Unpaid Leave'].includes(leaveType)) {
            await supabase.from('schedule').update({
              [schedTypeCol]: leaveType
            })
            .ilike(schedEmpCol, `%${empEmail}%`)
            .gte(schedDateCol, fromDate)
            .lte(schedDateCol, toDate);
          }

        } catch (sideErr) {
          console.error('Error applying post-approval side effects:', sideErr);
          alert('Catatan Sinkronisasi: ' + sideErr.message);
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

  // Action: Cancel Approved Request and Revert Balances to Unused
  const handleCancelApproved = async (item) => {
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name'], 'Employee');
    const reqCategory = item._category || 'Leave';
    const reqType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Action', 'action', 'Type', 'type'], reqCategory);

    if (!window.confirm(`Batalkan persetujuan ${reqType} untuk ${empName}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const table = item._sourceTable || (reqCategory === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);

      const statusCol = resolveTableColumn(cols, [
        'Approval Status',
        'approval_status',
        'Status Approval',
        'status_approval',
        'Approval',
        'approval',
        'Request Status',
        'request_status',
        'Status',
        'status'
      ]) || 'Status';

      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'Leave ID', 'Leave_ID', 'attendance_id', 'Attendance ID', 'no', '_id']);

      const nowIso = new Date().toISOString();
      const payload = {
        [statusCol]: 'Cancelled'
      };

      const approverCol = resolveTableColumn(cols, ['approved_by', 'Approved By', 'action_by', 'Action By', 'lasteditby', 'last_edit_by']);
      if (approverCol) payload[approverCol] = actualUserWorkEmail;

      const dateCol = resolveTableColumn(cols, ['approved_date', 'Approved Date', 'approved_at', 'lasteditdate', 'last_editdate', 'last_edit_date']);
      if (dateCol) payload[dateCol] = nowIso;

      let query = supabase.from(table).update(payload);
      if (idCol && item[idCol] !== undefined && item[idCol] !== null) {
        query = query.eq(idCol, item[idCol]);
      } else {
        const empCol = resolveTableColumn(cols, ['Employee', 'employee', 'user_uid', 'email']) || 'Employee';
        const createdCol = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Date', 'date']) || 'CreatedDate';
        query = query.eq(empCol, item[empCol]).eq(createdCol, item[createdCol]);
      }

      const { error: cancelErr } = await query;
      if (cancelErr) throw cancelErr;

      // REVERT BALANCE & SCHEDULE IF LEAVE
      if (reqCategory === 'Leave') {
        const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'user_uid', 'email']);
        const leaveType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '');
        const fromDate = getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']);
        const toDate = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
        const totalDays = parseInt(getPropCaseInsensitive(item, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration']) || '1', 10);

        const { data: schedSample } = await supabase.from('schedule').select('*').limit(1);
        const schedCols = schedSample && schedSample.length > 0 ? Object.keys(schedSample[0]) : [];
        const schedTypeCol = resolveTableColumn(schedCols, ['Type', 'type', 'schedule_type']) || 'Type';
        const schedEmpCol = resolveTableColumn(schedCols, ['Employee', 'employee']) || 'Employee';
        const schedDateCol = resolveTableColumn(schedCols, ['Date', 'date']) || 'Date';

        const { data: dirSample } = await supabase.from('employee_directory').select('*').limit(1);
        const dirCols = dirSample && dirSample.length > 0 ? Object.keys(dirSample[0]) : [];
        const dirEmailCol = resolveTableColumn(dirCols, ['Email', 'email', 'Employee work email', 'work_email']) || 'Email';

        let validKeys = [empEmail, empName].filter(Boolean).map(v => String(v).trim().toLowerCase());
        try {
          const { data: empDirMatch } = await supabase.from('employee_directory').select('*').ilike(dirEmailCol, empEmail).limit(1);
          if (empDirMatch && empDirMatch.length > 0) {
            const ed = empDirMatch[0];
            const eId = getPropCaseInsensitive(ed, ['Employee ID', 'employee_id', 'employeeid', 'id', 'Barcode', 'barcode']);
            const eName = getPropCaseInsensitive(ed, ['Name', 'name', 'nama', 'fullname', 'full_name']);
            if (eId) validKeys.push(eId.trim().toLowerCase());
            if (eName) validKeys.push(eName.trim().toLowerCase());
          }
        } catch (e) {}
        validKeys = Array.from(new Set(validKeys.filter(Boolean)));

        if (leaveType === 'Day Off Payment' || leaveType === 'Extra Off') {
          const { data: hSample } = await supabase.from('holiday_balance').select('*').limit(1);
          const hCols = hSample && hSample.length > 0 ? Object.keys(hSample[0]) : [];
          const exHolEmpCol = resolveTableColumn(hCols, ['Employee', 'employee', 'user_uid', 'email', 'Name', 'name']) || 'Employee';

          let holQuery = supabase.from('holiday_balance').select('*').limit(5000);
          const orConditions = validKeys.map(k => `${exHolEmpCol}.ilike.%${k}%`).join(',');
          if (orConditions) {
            holQuery = holQuery.or(orConditions);
          }
          const { data: userHolidays } = await holQuery;

          const usedCandidates = (userHolidays || []).filter(row => {
            const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
            if (s !== 'used') return false;

            const t = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
            const isTypeMatch = leaveType.toLowerCase().includes('extra')
              ? (t.includes('extra off') || t.includes('extra'))
              : (t.includes('day off') || t.includes('dayoff'));
              if (!isTypeMatch) return false;

            const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']).trim().toLowerCase();
            return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
          });

          usedCandidates.sort((a, b) => {
            const uA = getPropCaseInsensitive(a, ['Used Date', 'used_date', 'UsedDate', 'tanggal_digunakan']);
            const uB = getPropCaseInsensitive(b, ['Used Date', 'used_date', 'UsedDate', 'tanggal_digunakan']);
            if (uA === fromDate && uB !== fromDate) return -1;
            if (uB === fromDate && uA !== fromDate) return 1;
            return 0;
          });

          if (usedCandidates.length > 0) {
            const targetUsedHol = usedCandidates[0];
            const holCols = Object.keys(targetUsedHol);
            const holStatusCol = resolveTableColumn(holCols, ['Status', 'status', 'STATUS']) || 'Status';
            const holUsedDateCol = resolveTableColumn(holCols, ['Used Date', 'used_date', 'UsedDate', 'tanggal_digunakan']) || 'Used Date';
            const holIdCol = resolveTableColumn(holCols, ['UID', 'uid', 'id', 'ID', 'Id', '_id', 'Holiday ID', 'holiday_id', 'no', 'No']);

            const holRevertPayload = {
              [holStatusCol]: 'Unused',
              [holUsedDateCol]: null
            };

            if (holIdCol && targetUsedHol[holIdCol] !== undefined && targetUsedHol[holIdCol] !== null) {
              await supabase.from('holiday_balance').update(holRevertPayload).eq(holIdCol, targetUsedHol[holIdCol]);
            } else {
              const holEmpCol = resolveTableColumn(holCols, ['Employee', 'employee', 'user_uid', 'email']) || 'Employee';
              const holTypeCol = resolveTableColumn(holCols, ['Type Holiday', 'type_holiday', 'Type', 'type']) || 'Type Holiday';
              const holExpDateCol = resolveTableColumn(holCols, ['Expiration Date', 'expiration_date', 'Expired Date']) || 'Expiration Date';

              await supabase.from('holiday_balance').update(holRevertPayload)
                .eq(holEmpCol, targetUsedHol[holEmpCol])
                .eq(holTypeCol, targetUsedHol[holTypeCol])
                .eq(holStatusCol, targetUsedHol[holStatusCol])
                .eq(holExpDateCol, targetUsedHol[holExpDateCol]);
            }
          }

          await supabase.from('schedule').update({
            [schedTypeCol]: 'Working Day'
          })
          .ilike(schedEmpCol, `%${empEmail}%`)
          .eq(schedDateCol, fromDate);

          let recheckQuery = supabase.from('holiday_balance').select('*').limit(5000);
          if (orConditions) {
            recheckQuery = recheckQuery.or(orConditions);
          }
          const { data: recheckHolidays } = await recheckQuery;
          let unusedCount = 0;
          if (recheckHolidays) {
            unusedCount = recheckHolidays.filter(row => {
              const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
              if (s !== 'unused') return false;
              const t = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
              const isTypeMatch = leaveType.toLowerCase().includes('extra')
                ? (t.includes('extra off') || t.includes('extra'))
                : (t.includes('day off') || t.includes('dayoff'));
              if (!isTypeMatch) return false;
              const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']).trim().toLowerCase();
              return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
            }).length;
          }

          const balColCandidates = leaveType.toLowerCase().includes('extra')
            ? ['Extra Off Balance', 'extra_off_balance', 'Extra Off', 'extraoffbalance']
            : ['Day Off Payment Balance', 'day_off_payment_balance', 'Day Off Payment', 'dayoffbalance'];
          const balCol = resolveTableColumn(dirCols, balColCandidates) || balColCandidates[0];

          await supabase.from('employee_directory').update({
            [balCol]: unusedCount
          }).ilike(dirEmailCol, empEmail);
        } else if (leaveType === 'Annual Leave') {
          await supabase.from('schedule').update({
            [schedTypeCol]: 'Working Day'
          })
          .ilike(schedEmpCol, `%${empEmail}%`)
          .gte(schedDateCol, fromDate)
          .lte(schedDateCol, toDate);

          const { data: emps } = await supabase.from('employee_directory').select('*').ilike(dirEmailCol, empEmail).limit(1);
          if (emps && emps.length > 0) {
            const empData = emps[0];
            const annBalCol = resolveTableColumn(dirCols, ['Annual Leave Balance', 'annual_leave_balance', 'Annual Leave', 'annualleave']) || 'Annual Leave Balance';
            const currBal = parseFloat(empData[annBalCol]) || 0;
            await supabase.from('employee_directory').update({
              [annBalCol]: currBal + totalDays
            }).ilike(dirEmailCol, empEmail);
          }
        } else if (['Sick Leave', 'Maternity Leave', 'Compassionate Leave', 'Unpaid Leave'].includes(leaveType)) {
          await supabase.from('schedule').update({
            [schedTypeCol]: 'Working Day'
          })
          .ilike(schedEmpCol, `%${empEmail}%`)
          .gte(schedDateCol, fromDate)
          .lte(schedDateCol, toDate);
        }
      }

      await sendNotificationEmail(item, 'Cancelled', 'Persetujuan cuti telah dibatalkan oleh Line Manager dan kuota/saldo telah dikembalikan.');

      alert('Persetujuan berhasil dibatalkan!');
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Gagal membatalkan persetujuan: ' + err.message);
    }
    setIsProcessing(false);
  };

  const openDetailModal = (item) => {
    setSelectedRequest(item);
    setIsDetailModalOpen(true);
  };

  const openRejectDialog = (item, e) => {
    if (e) e.stopPropagation();
    setItemToReject(item);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!itemToReject) return;
    handleUpdateStatus(itemToReject, 'Rejected', rejectReason);
  };

  // Counts for Badges
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length;
  }, [leaveRequests]);

  const approvedLeavesCount = useMemo(() => {
    return leaveRequests.filter(r => isApprovedStatus(getRowStatus(r))).length;
  }, [leaveRequests]);

  const pendingAttCount = useMemo(() => {
    return attendanceRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length;
  }, [attendanceRequests]);

  // Handler pergantian tab kategori
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    // Because attendance does not have status dropdown, we don't need to check and switch
  };

  // Filtered List based on status tab, category tab, and selected employee
  const combinedList = useMemo(() => {
    let list = activeTab === 'leave' ? [...leaveRequests] : [...attendanceRequests];

    if (activeTab === 'leave') {
      if (statusTab === 'pending') {
        list = list.filter(item => isPendingApprovalStatus(getRowStatus(item)));
      } else if (statusTab === 'approved') {
        list = list.filter(item => isApprovedStatus(getRowStatus(item)));
      }
    } else {
      // For attendance, it always behaves like 'pending' (no approved ones shown)
      // Since it's already filtered in refreshAllData, we just use the list.
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      const target = selectedEmployee.toLowerCase();
      list = list.filter(item => {
        const empEmail = (getPropCaseInsensitive(item, [
          'Employee',
          'employee',
          'email',
          'user_uid',
          'employee_email',
          'work_email',
          'Employee work email'
        ]) || '').toLowerCase();

        return empEmail === target;
      });
    }

    return list.sort((a, b) => {
      const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'Time', 'time', 'created_at'])) || new Date(0);
      const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'Time', 'time', 'created_at'])) || new Date(0);
      return dtB.getTime() - dtA.getTime();
    });
  }, [statusTab, activeTab, leaveRequests, attendanceRequests, selectedEmployee]);

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* 1. Unified Main Card: Controls, Filters, and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 w-full">
        
        {/* Top Header Row & Filters */}
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
                <span className="font-semibold text-gray-700">{actualUserWorkEmail || sessionIdentifier || 'Not Logged In'}</span>
              </div>

              <button
                onClick={refreshAllData}
                disabled={loading}
                className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                title="Refresh Data"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Filters: Category & Employee Dropdown */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4 pt-3 border-t border-gray-100">
            
            {/* Category Tabs + Status Dropdown */}
            <div className="flex flex-row justify-between items-center gap-2 w-full sm:w-auto">
              
              {/* Category Filter Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-xl space-x-1 shrink-0">
                <button
                  onClick={() => handleSelectTab('leave')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'leave' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Leave ({leaveRequests.length})
                </button>
                <button
                  onClick={() => handleSelectTab('attendance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'attendance' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Attendance ({attendanceRequests.length})
                </button>
              </div>

              {/* Status Dropdown Filter: Show ONLY if activeTab is leave */}
              {activeTab === 'leave' && (
                <div className="relative flex-1 sm:flex-none sm:min-w-[170px]">
                  <select
                    value={statusTab}
                    onChange={(e) => setStatusTab(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition h-full"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="pending">
                      Pending ({pendingLeavesCount})
                    </option>
                    <option value="approved">
                      Approved ({approvedLeavesCount})
                    </option>
                    <option value="all">
                      All Status ({leaveRequests.length})
                    </option>
                  </select>
                </div>
              )}
            </div>

            {/* Dropdown filter Employee */}
            <div className="relative w-full sm:w-auto sm:min-w-[240px]">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition h-full"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="all">All Team Members ({teamMembers.length})</option>
                {teamMembers.map((member) => (
                  <option key={member.email} value={member.email}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main List Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Request / Action</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 animate-spin text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <p className="text-xs">Loading requests...</p>
                    </div>
                  </td>
                </tr>
              ) : combinedList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-semibold text-gray-600 text-sm">No requests found.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        There are no records matching your current filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                combinedList.map((item, idx) => {
                  const isLeave = item._category === 'Leave';
                  const employeeName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'], 'No Name');
                  const employeeEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email'], '-');
                  
                  const reqType = isLeave
                    ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], 'Leave')
                    : getPropCaseInsensitive(item, ['Action', 'action', 'Type', 'type', 'Attendance Type', 'attendance_type', 'Request Type'], 'Attendance');

                  const status = getRowStatus(item) || 'Approved';
                  let dateInfo = '-';
                  if (isLeave) {
                    const fromDate = formatDateDisplay(getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']), lang);
                    const toDate = formatDateDisplay(getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']), lang);
                    dateInfo = `${fromDate} - ${toDate}`;
                  } else {
                    const attDate = formatDateDisplay(getPropCaseInsensitive(item, ['Date', 'date', 'attendance_date', 'CreatedDate', 'created_date', 'Tanggal']), lang);
                    const attTime = formatTimeDisplay(getPropCaseInsensitive(item, ['Time', 'time', 'Clock In', 'Clock Out', 'time_in', 'time_out']));
                    dateInfo = attTime ? `${attDate} (${attTime})` : attDate;
                  }

                  return (
                    <tr
                      key={idx}
                      onClick={() => openDetailModal(item)}
                      className="hover:bg-blue-50/40 transition cursor-pointer text-xs sm:text-sm border-b border-gray-100"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${isLeave ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {item._category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{employeeName}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[150px]">{employeeEmail}</div>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span className="font-semibold text-gray-800">{reqType}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                        {dateInfo}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {(() => {
                          let badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                          if (isApprovedStatus(status)) {
                            badgeClass = 'bg-green-100 text-green-700 border-green-200';
                          } else if (status.toLowerCase().includes('reject') || status.toLowerCase().includes('cancel')) {
                            badgeClass = 'bg-red-100 text-red-700 border-red-200';
                          }
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                              {status}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const s = getRowStatus(item);
                          if (isApprovedStatus(s)) {
                            return (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleCancelApproved(item)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer mx-auto"
                                title="Cancel Approval"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                <span>Cancel</span>
                              </button>
                            );
                          }
                          if (s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel') {
                            return (
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleCancelApproved(item)}
                                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Approve Cancellation"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                  <span>Approve Cancel</span>
                                </button>
                                <button
                                  disabled={isProcessing}
                                  onClick={(e) => openRejectDialog(item, e)}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 border border-gray-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Reject Cancel Request"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                  <span>Reject</span>
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                disabled={isProcessing}
                                onClick={() => {
                                  if (window.confirm(`Approve request from ${employeeName}?`)) {
                                    handleUpdateStatus(item, 'Approved');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                                title="Approve"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                <span>Approve</span>
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={(e) => openRejectDialog(item, e)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Reject"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                <span>Reject</span>
                              </button>
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

      {/* 2. Team Working Calendar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 w-full">
        <div className="flex flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-gray-100 gap-2 sm:gap-3">
          <div className="flex-1 pr-2 sm:pr-3">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <svg className="w-5 h-5 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Team Calendar
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 break-words">
              {selectedEmployee === 'all' 
                ? 'Showing schedules for all team members' 
                : `Showing schedule for: ${teamMembers.find(m => m.email === selectedEmployee)?.name || selectedEmployee}`}
            </p>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={prevMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Previous Month">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[10px] sm:text-base font-bold text-gray-800 min-w-[65px] sm:min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Next Month">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={setThisMonth} className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-sm active:scale-95 ml-1">
              This Month
            </button>
          </div>
        </div>

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
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 sm:h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl opacity-40"></div>
          ))}

          {calendarDays.map((d) => (
            <div 
              key={`day-${d.day}`}
              onClick={() => {
                if (d.teamData.length > 0) {
                  setTeamScheduleModalData({ date: d.dateToPass, records: d.teamData });
                }
              }}
              className={`relative h-20 sm:h-24 p-1 sm:p-2 rounded-xl border transition flex flex-col overflow-hidden bg-white ${d.teamData.length > 0 ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''} ${d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-300' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`text-xs sm:text-sm font-extrabold leading-none ${d.isToday ? 'text-blue-600' : d.isSunday ? 'text-red-500' : 'text-gray-800'}`}>
                  {d.day}
                </span>
              </div>

              <div className="w-full flex flex-col items-center justify-center my-auto gap-0.5 sm:gap-1 mt-1">
                {d.counts.workingCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-green-600 text-white shadow-sm">{d.counts.workingCount} Work</span>}
                {d.counts.sickCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-pink-500 text-white shadow-sm">{d.counts.sickCount} Sick</span>}
                {d.counts.leaveCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-orange-500 text-white shadow-sm">{d.counts.leaveCount} Leave</span>}
                {d.counts.offCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-red-600 text-white shadow-sm">{d.counts.offCount} Off</span>}
                
                {d.teamData.length === 0 && <span className="text-[10px] text-gray-300">-</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Team Schedule Date Detail Modal */}
      {teamScheduleModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setTeamScheduleModalData(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Team Schedule: <span className="text-blue-600">{teamScheduleModalData.date}</span>
              </h3>
              <button onClick={() => setTeamScheduleModalData(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {teamScheduleModalData.records.map((emp, idx) => {
                const empName = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'employee_name', 'Employee'], 'Employee');
                const t = getPropCaseInsensitive(emp, ['type', 'Type', 'status'], '-');
                const shift = getPropCaseInsensitive(emp, ['shift', 'jam kerja'], '-');
                
                let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
                const tLower = t.toLowerCase();
                if (tLower.includes('working') || tLower === 'work' || tLower.includes('kerja')) badgeClass = 'bg-green-50 text-green-700 border-green-200';
                else if (tLower.includes('sick') || tLower.includes('sakit')) badgeClass = 'bg-pink-50 text-pink-700 border-pink-200';
                else if (tLower.includes('off') || tLower.includes('libur')) badgeClass = 'bg-red-50 text-red-700 border-red-200';
                else if (tLower.includes('leave') || tLower.includes('cuti')) badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';

                return (
                  <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-white shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-gray-800">{empName}</div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">Shift: {shift}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                      {t}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail Request Modal */}
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
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Employee Information</span>
              <div className="text-sm font-bold text-gray-800">
                {getPropCaseInsensitive(selectedRequest, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                Email: {getPropCaseInsensitive(selectedRequest, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                Line Manager: {getPropCaseInsensitive(selectedRequest, ['Line Manager', 'line_manager', 'Line Manager Email', 'line_manager_email', 'Line Manager work email', 'manager_email', 'Approver'], '-')}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Request / Action</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">
                    {selectedRequest._category === 'Leave'
                      ? getPropCaseInsensitive(selectedRequest, ['Leave Type', 'leave_type', 'Type', 'type'], '-')
                      : getPropCaseInsensitive(selectedRequest, ['Action', 'action', 'Type', 'type', 'Attendance Type'], 'Attendance')}
                  </span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Current Status</span>
                  <span className="text-xs sm:text-sm font-bold text-green-700">
                    {getRowStatus(selectedRequest) || 'Approved'}
                  </span>
                </div>
              </div>

              {selectedRequest._category === 'Leave' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">From Date</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">
                        {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['From Date', 'from_date', 'Start Date', 'start_date']), lang)}
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">To Date</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">
                        {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['To Date', 'to_date', 'End Date', 'end_date']), lang)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Total Days Requested</span>
                      <span className="text-xs sm:text-sm font-black text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration'], '1')} Day(s)
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Remaining / Final Balance</span>
                      <span className="text-xs sm:text-sm font-black text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Final balance', 'final_balance', 'Final Balance'], '-')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">Attendance Date & Time</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['Date', 'date', 'attendance_date', 'CreatedDate']), lang)}{' '}
                      ({formatTimeDisplay(getPropCaseInsensitive(selectedRequest, ['Time', 'time', 'CreatedDate'])) || '--:--'})
                    </span>
                  </div>

                  {getPropCaseInsensitive(selectedRequest, ['Location', 'location']) && (
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">GPS Location</span>
                      <span className="text-xs font-semibold text-blue-600">
                        {getPropCaseInsensitive(selectedRequest, ['Location', 'location'])}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <span className="text-[10px] text-gray-400 font-semibold block">Reason / Request Notes</span>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                  {getPropCaseInsensitive(selectedRequest, ['Reason', 'reason', 'Description', 'description', 'notes', 'Notes', 'keterangan'], 'No additional notes provided.')}
                </p>
              </div>

              {/* Attachment Preview with Link priority */}
              {getPropCaseInsensitive(selectedRequest, ['Link', 'link', 'Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']) && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block mb-2">Attachment / Proof</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={getPropCaseInsensitive(selectedRequest, ['Link', 'link', 'Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo'])}
                      alt="Attachment"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                      onClick={() => {
                        setPhotoPreviewUrl(getPropCaseInsensitive(selectedRequest, ['Link', 'link', 'Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']));
                        setIsPhotoModalOpen(true);
                      }}
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/128/337/337946.png'; }}
                    />
                    <div>
                      <button
                        onClick={() => {
                          setPhotoPreviewUrl(getPropCaseInsensitive(selectedRequest, ['Link', 'link', 'Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']));
                          setIsPhotoModalOpen(true);
                        }}
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        Click to enlarge preview
                      </button>
                      <p className="text-[10px] text-gray-400 mt-0.5">Attendance photo / document preview</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              {(() => {
                const s = getRowStatus(selectedRequest);
                if (isApprovedStatus(s) || s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel') {
                  return (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleCancelApproved(selectedRequest)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      {s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel' ? 'Approve Cancellation' : 'Cancel Approval'}
                    </button>
                  );
                }
                return (
                  <>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => openRejectDialog(selectedRequest)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to approve this request?')) {
                          handleUpdateStatus(selectedRequest, 'Approved');
                        }
                      }}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {isProcessing ? 'Saving...' : 'Approve'}
                    </button>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Reject Modal Dialog */}
      {isRejectModalOpen && itemToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Confirm Request Rejection</h3>
            <p className="text-xs text-gray-500 mb-3">
              You are about to reject the <strong>{itemToReject._category}</strong> request from{' '}
              <strong>{getPropCaseInsensitive(itemToReject, ['Name', 'name', 'nama', 'fullname'])}</strong>.
            </p>

            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows="3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete proof / conflict with schedule..."
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                disabled={isProcessing}
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setItemToReject(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof / Image Preview Modal */}
      {isPhotoModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-700">Attachment / Proof Preview</span>
              <button 
                onClick={() => setIsPhotoModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 flex justify-center bg-gray-50 max-h-[80vh] overflow-auto">
              <img 
                src={photoPreviewUrl} 
                referrerPolicy="no-referrer" 
                alt="Proof Attachment" 
                className="max-h-[70vh] w-auto object-contain rounded-lg" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}