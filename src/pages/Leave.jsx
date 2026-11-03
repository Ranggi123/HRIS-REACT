import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby28F424Ikd21T4yf0MkGFXdQvgSBKJWXYO5-dQ582lOSxH-kxau6myCtGjulEUleo0RA/exec';

// Format Helpers
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

const formatDateDisplay = (dateVal, lang = 'id') => {
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

export default function Leave() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const lang = localStorage.getItem('hris_lang') || 'en';

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data States
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [holidayRecords, setHolidayRecords] = useState([]);
  const [expiringHolidays, setExpiringHolidays] = useState([]);

  // Stats & Balances
  const [originalBalances, setOriginalBalances] = useState({ annual: 0, dayOff: 0, extraOff: 0 });
  const [balances, setBalances] = useState({ annual: 0, dayOff: 0, extraOff: 0 });
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');

  // Form State
  const [formType, setFormType] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formDuration, setFormDuration] = useState('1 Day(s)');
  const [formFile, setFormFile] = useState(null);

  const userEmail = useMemo(() => {
    return (getPropCaseInsensitive(currentUser, ['email', 'Email', 'user_uid', 'USER_UID']) || '').trim().toLowerCase();
  }, [currentUser]);

  const userGender = useMemo(() => {
    return getPropCaseInsensitive(currentUser, ['Gender', 'gender', 'jenis_kelamin', 'Jenis Kelamin', 'sex', 'Sex'], '').trim().toLowerCase();
  }, [currentUser]);

  // Profiles
  const profileName = getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name'], userEmail.split('@')[0] || 'User');
  const profileDept = getPropCaseInsensitive(currentUser, ['department', 'Department', 'dept', 'Departemen'], '-');
  const profileJobTitle = getPropCaseInsensitive(currentUser, ['job title', 'job_title', 'Job Title', 'jobtitle', 'position'], '-');
  const profileStatus = getPropCaseInsensitive(currentUser, ['status', 'Status', 'STATUS'], 'Active');

  const refreshAllData = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);

    const empId = getPropCaseInsensitive(currentUser, ['employee id', 'employee_id', 'employeeid', 'id']);
    const empName = getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name']);
    const validKeys = [userEmail, empId, empName].filter(Boolean).map(v => String(v).trim().toLowerCase());

    try {
      // 1. Fetch Holidays
      const { data: holData, error: holError } = await supabase.from('holiday_balance').select('*').limit(1000);
      let myHolidays = [];
      let totalDayOff = 0;
      let totalExtraOff = 0;
      let expiringList = [];

      if (!holError && holData) {
        myHolidays = holData.filter(row => {
          const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id']).toLowerCase();
          return validKeys.some(key => empVal === key || empVal.includes(key) || key.includes(empVal));
        });

        const now = new Date();
        const fifteenDaysLater = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));

        myHolidays.forEach(row => {
          const status = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').toLowerCase();
          const type = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').toLowerCase();
          if (status === 'unused') {
            let d = getPropCaseInsensitive(row, ['Days', 'days', 'Amount', 'amount', 'Total', 'total']);
            let val = (d && !isNaN(d)) ? parseFloat(d) : 1;
            
            if (type.includes('day off payment') || type === 'day off') totalDayOff += val;
            else if (type.includes('extra off')) totalExtraOff += val;

            const expDateRaw = getPropCaseInsensitive(row, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired', 'expired']);
            const expDate = parseFlexibleDate(expDateRaw);
            if (expDate && expDate >= now && expDate <= fifteenDaysLater) {
              expiringList.push({
                type: getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], 'Holiday'),
                desc: getPropCaseInsensitive(row, ['Description', 'description', 'desc', 'keterangan'], '-') || '-',
                expDateStr: formatDateDisplay(expDateRaw, lang)
              });
            }
          }
        });

        myHolidays.sort((a, b) => {
          const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['Date', 'date', 'Tanggal'], '-')) || new Date(0);
          const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['Date', 'date', 'Tanggal'], '-')) || new Date(0);
          return dtB.getTime() - dtA.getTime();
        });
      }

      setHolidayRecords(myHolidays);
      setExpiringHolidays(expiringList);

      // 2. Original Balances
      const annBalRaw = getPropCaseInsensitive(currentUser, ['Annual Leave Balance', 'annual_leave_balance', 'Annual Leave', 'annualleave'], '0');
      const origAnn = parseFloat(annBalRaw) || 0;
      setOriginalBalances({ annual: origAnn, dayOff: totalDayOff, extraOff: totalExtraOff });

      // 3. Fetch Leaves
      const { data: lvData, error: lvError } = await supabase.from('leave_requests').select('*').order('CreatedDate', { ascending: false }).limit(1000);
      let myLeaves = [];
      if (!lvError && lvData) {
        myLeaves = lvData.filter(row => {
          const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'USER_UID', 'email', 'employee_id', 'name']).toLowerCase();
          return validKeys.some(key => empVal === key || empVal.includes(key) || key.includes(empVal));
        });

        myLeaves.sort((a, b) => {
          const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['CreatedDate', 'created_date', 'Created Date', 'Request Date', 'Date', 'Start Date', 'created_at'])) || new Date(0);
          const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['CreatedDate', 'created_date', 'Created Date', 'Request Date', 'Date', 'Start Date', 'created_at'])) || new Date(0);
          return dtB.getTime() - dtA.getTime();
        });
      }

      setLeaveRecords(myLeaves);

      // 4. Calculate Stats & Remaining Balances
      let app = 0, pend = 0, rej = 0;
      let pAnn = 0, pDay = 0, pExt = 0;

      myLeaves.forEach(row => {
        const s = getPropCaseInsensitive(row, ['Status', 'status', 'Approval Status', 'approval_status']).toLowerCase();
        const t = getPropCaseInsensitive(row, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '');
        
        const sdRaw = getPropCaseInsensitive(row, ['From Date', 'from_date', 'From', 'from', 'Start Date', 'start_date'], '-');
        const edRaw = getPropCaseInsensitive(row, ['To Date', 'to_date', 'To', 'to', 'End Date', 'end_date'], '-');
        let dur = getPropCaseInsensitive(row, ['Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
        
        if (!dur) {
          const dS = parseFlexibleDate(sdRaw);
          const dE = parseFlexibleDate(edRaw);
          if (dS && dE) dur = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
          else dur = 1;
        }
        const durVal = parseFloat(dur) || 0;

        if (s.includes('approve') || s.includes('setuju')) app++;
        else if (s.includes('reject') || s.includes('tolak')) rej++;
        else {
          pend++;
          if (t === 'Annual Leave') pAnn += durVal;
          if (t === 'Day Off Payment') pDay += durVal;
          if (t === 'Extra Off') pExt += durVal;
        }
      });

      setStats({ total: myLeaves.length, approved: app, pending: pend, rejected: rej });
      setBalances({
        annual: Math.max(0, origAnn - pAnn),
        dayOff: Math.max(0, totalDayOff - pDay),
        extraOff: Math.max(0, totalExtraOff - pExt)
      });

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [userEmail, currentUser, lang]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Form Handlers
  const handleOpenModal = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    setFormType('');
    setFormStart(todayStr);
    setFormEnd(todayStr);
    setFormDuration('1 Day(s)');
    setFormFile(null);
    setIsLeaveModalOpen(true);
  };

  const handleTypeChange = (e) => {
    const t = e.target.value;
    setFormType(t);
    
    if (t === 'Day Off Payment' || t === 'Extra Off') {
      setFormEnd(formStart);
    } else if (t === 'Maternity Leave' && formStart) {
      const dt = new Date(formStart);
      dt.setDate(dt.getDate() + 89);
      setFormEnd(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    }
  };

  const handleStartChange = (e) => {
    const s = e.target.value;
    setFormStart(s);

    if (formType === 'Day Off Payment' || formType === 'Extra Off') {
      setFormEnd(s);
    } else if (formType === 'Maternity Leave' && s) {
      const dt = new Date(s);
      dt.setDate(dt.getDate() + 89);
      setFormEnd(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else if (formEnd && s > formEnd) {
      setFormEnd(s);
    }
  };

  const handleEndChange = (e) => {
    const ed = e.target.value;
    if (formType === 'Day Off Payment' || formType === 'Extra Off' || formType === 'Maternity Leave') return;
    if (ed < formStart) {
      setFormEnd(formStart);
    } else {
      setFormEnd(ed);
    }
  };

  useEffect(() => {
    if (formStart && formEnd) {
      const s = new Date(formStart);
      const e = new Date(formEnd);
      if (e >= s) {
        const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
        setFormDuration(`${diff} Day(s)`);
      } else {
        setFormDuration('Invalid');
      }
    }
  }, [formStart, formEnd]);

  // Upload Logic Mock
  const uploadToGoogleDrive = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        try {
          const res = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              fileName: `Leave_${userEmail}_${Date.now()}_${file.name}`,
              mimeType: file.type,
              base64: base64Data,
              folderId: '1U3UqXug82LJNCjvJgPLs1KLsh9Q6xrf4'
            })
          });
          const textRes = await res.text();
          const result = JSON.parse(textRes);
          if (result && (result.url || result.id)) {
            let url = result.url;
            const matchId = result.id || (url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/))?.[1];
            if (matchId) url = `https://drive.google.com/thumbnail?id=${matchId}&sz=w1000`;
            resolve(url);
          } else {
            reject(new Error("Upload failed"));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formType) return alert('Please select a leave type.');
    if (new Date(formEnd) < new Date(formStart)) return alert('End date cannot be earlier than start date.');

    const dtStart = new Date(formStart);
    const dtEnd = new Date(formEnd);
    const totalDays = Math.ceil(Math.abs(dtEnd - dtStart) / (1000 * 60 * 60 * 24)) + 1;

    if ((formType === 'Day Off Payment' || formType === 'Extra Off') && totalDays > 1) {
      return alert('This leave type can only be requested for 1 day per request.');
    }
    if (formType === 'Extra Off' && totalDays > balances.extraOff) {
      return alert(`Total days (${totalDays}) exceeds your Extra Off balance (${balances.extraOff}).`);
    }
    if (formType === 'Annual Leave' && totalDays > balances.annual) {
      return alert(`Total days (${totalDays}) exceeds your Annual Leave balance (${balances.annual}).`);
    }
    if ((formType === 'Sick Leave' || formType === 'Compassionate Leave') && totalDays > 3) {
      return alert('This leave type can only be requested for a maximum of 3 consecutive days.');
    }
    if (formType === 'Maternity Leave' && totalDays !== 90) {
      return alert('Maternity Leave must be exactly 90 days.');
    }

    const needsAttachment = ['Sick Leave', 'Maternity Leave', 'Compassionate Leave'].includes(formType);
    if (needsAttachment && !formFile) {
      return alert('Attachment/Proof is required for this leave type.');
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl = "";
      if (needsAttachment && formFile) {
        attachmentUrl = await uploadToGoogleDrive(formFile);
      }

      // Payload building
      const empId = getPropCaseInsensitive(currentUser, ['employee id', 'employee_id', 'employeeid', 'id']) || userEmail;
      
      let tableCols = [];
      if (leaveRecords.length > 0) tableCols = Object.keys(leaveRecords[0]);
      else {
        const { data: sample } = await supabase.from('leave_requests').select('*').limit(1);
        if (sample && sample.length > 0) tableCols = Object.keys(sample[0]);
      }

      const colEmployee = resolveTableColumn(tableCols, ['Employee', 'employee', 'USER_UID', 'user_uid', 'email', 'employee_id']) || 'Employee';
      const colCreatedDate = resolveTableColumn(tableCols, ['CreatedDate', 'created_date', 'Created Date', 'Date', 'date']) || 'CreatedDate';
      const colLeaveType = resolveTableColumn(tableCols, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype']) || 'Leave Type';
      const colStartDate = resolveTableColumn(tableCols, ['From Date', 'from_date', 'From', 'from', 'Start Date', 'start_date']) || 'From Date';
      const colEndDate = resolveTableColumn(tableCols, ['To Date', 'to_date', 'To', 'to', 'End Date', 'end_date']) || 'To Date';
      const colStatus = resolveTableColumn(tableCols, ['Status', 'status']) || 'Status';

      const now = new Date();
      const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      let payload = {
        [colEmployee]: empId,
        [colCreatedDate]: todayFormatted,
        [colLeaveType]: formType,
        [colStartDate]: formStart,
        [colEndDate]: formEnd,
        [colStatus]: 'Pending Approval'
      };

      const addIfExist = (candidates, value) => {
        const matchedCol = resolveTableColumn(tableCols, candidates);
        if (matchedCol) payload[matchedCol] = value;
      };

      addIfExist(['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], totalDays);
      addIfExist(['Name', 'name', 'nama', 'fullname'], profileName);
      if (attachmentUrl) addIfExist(['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'Link', 'link'], attachmentUrl);
      addIfExist(['createdby', 'created_by', 'CreatedBy'], userEmail);

      const { error: insErr } = await supabase.from('leave_requests').insert([payload]);
      if (insErr) throw insErr;

      alert('Leave request submitted successfully!');
      setIsLeaveModalOpen(false);
      refreshAllData();

    } catch (err) {
      console.error(err);
      alert('Failed to submit: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const cancelPendingLeave = async (record) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      const cols = Object.keys(record);
      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'no', '_id']);
      if (idCol && /^\d+$/.test(String(record[idCol]).trim())) {
        await supabase.from('leave_requests').delete().eq(idCol, record[idCol]);
      } else {
        const colEmp = resolveTableColumn(cols, ['Employee', 'employee', 'USER_UID']) || 'Employee';
        const colCreated = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Created Date']) || 'CreatedDate';
        await supabase.from('leave_requests').delete().eq(colEmp, record[colEmp]).eq(colCreated, record[colCreated]);
      }
      alert('Request cancelled successfully.');
      refreshAllData();
    } catch (e) {
      alert('Failed to cancel: ' + e.message);
    }
  };

  const requestToCancelLeave = async (record) => {
    if (!window.confirm('Request to cancel this approved leave?')) return;
    try {
      const cols = Object.keys(record);
      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'no', '_id']);
      const colStatus = resolveTableColumn(cols, ['Status', 'status', 'Approval Status']) || 'Status';
      
      if (idCol && /^\d+$/.test(String(record[idCol]).trim())) {
        await supabase.from('leave_requests').update({ [colStatus]: 'Request to Cancel' }).eq(idCol, record[idCol]);
      } else {
        const colEmp = resolveTableColumn(cols, ['Employee', 'employee', 'USER_UID']) || 'Employee';
        const colCreated = resolveTableColumn(cols, ['CreatedDate', 'created_date', 'Created Date']) || 'CreatedDate';
        await supabase.from('leave_requests').update({ [colStatus]: 'Request to Cancel' }).eq(colEmp, record[colEmp]).eq(colCreated, record[colCreated]);
      }
      alert('Cancellation request sent successfully.');
      refreshAllData();
    } catch (e) {
      alert('Failed to send request: ' + e.message);
    }
  };

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Profile Summary Card */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Hello, <span className="text-blue-600 font-extrabold">{profileName}</span>!</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
            Department: <strong className="text-gray-900 font-semibold">{profileDept}</strong> 
            <span className="hidden sm:inline mx-1">|</span>
            <br className="block sm:hidden" /> 
            Job Title: <strong className="text-gray-900 font-semibold">{profileJobTitle}</strong>
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
          <span className="text-xs sm:text-sm text-gray-500">Account Status:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${profileStatus.toLowerCase() !== 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {profileStatus}
          </span>
        </div>
      </div>

      {/* Leave Records Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-6 relative mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 mb-3 sm:mb-5 border-b border-gray-200 gap-2 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex flex-wrap items-center gap-2 pr-10 sm:pr-0">Leave Records</h3>
            <p className="text-xs text-gray-500 mt-1">Manage and track your leave submissions</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleOpenModal}
              className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Request Leave</span>
            </button>
            <button 
              onClick={refreshAllData} 
              disabled={loading}
              className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto p-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition z-10 bg-white sm:bg-transparent shadow-sm sm:shadow-none"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expiring Warning */}
        {expiringHolidays.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-800">Action Required: Expiring Balances</h3>
                <div className="mt-1 text-xs text-red-700">
                  <p className="mb-2 font-medium">You have balances that will expire within 15 days:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {expiringHolidays.map((h, i) => (
                      <li key={i}><strong>{h.type}</strong> ({h.desc}) - Expiring on <span className="font-bold underline">{h.expDateStr}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summaries */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1">Balance Summary</h4>
            <div className="flex gap-2 w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <div className="flex-1 min-w-[30%] bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-blue-700 uppercase mr-2">Annual Leave</span>
                <span className="text-lg sm:text-xl font-black text-blue-900">{balances.annual}</span>
              </div>
              <div className="flex-1 min-w-[30%] bg-purple-50 border border-purple-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-purple-700 uppercase mr-2">Day Off Payment</span>
                <span className="text-lg sm:text-xl font-black text-purple-900">{balances.dayOff}</span>
              </div>
              <div className="flex-1 min-w-[30%] bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase mr-2">Extra Off</span>
                <span className="text-lg sm:text-xl font-black text-gray-900">{balances.extraOff}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1">Submission Summary</h4>
            <div className="grid grid-cols-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-x divide-gray-100">
              <div className="py-1.5 px-2 sm:p-3 flex flex-col items-center justify-center border-b-2 border-blue-500">
                <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase">Total</span>
                <span className="text-lg sm:text-xl font-black text-gray-800">{stats.total}</span>
              </div>
              <div className="py-1.5 px-2 sm:p-3 flex flex-col items-center justify-center border-b-2 border-green-500">
                <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase">Approved</span>
                <span className="text-lg sm:text-xl font-black text-green-600">{stats.approved}</span>
              </div>
              <div className="py-1.5 px-2 sm:p-3 flex flex-col items-center justify-center border-b-2 border-yellow-400">
                <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase">Pending</span>
                <span className="text-lg sm:text-xl font-black text-yellow-500">{stats.pending}</span>
              </div>
              <div className="py-1.5 px-2 sm:p-3 flex flex-col items-center justify-center border-b-2 border-red-500">
                <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase">Rejected</span>
                <span className="text-lg sm:text-xl font-black text-red-500">{stats.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Request Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Leave Type</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">From Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">To Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center">Days</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center">Status</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center">Attachment</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="px-5 py-8 text-center text-gray-400 italic">Loading leave records...</td></tr>
              ) : leaveRecords.length === 0 ? (
                <tr><td colSpan="8" className="px-5 py-8 text-center text-gray-400 italic">No leave records found.</td></tr>
              ) : (
                leaveRecords.map((r, i) => {
                  const status = getPropCaseInsensitive(r, ['Status', 'status', 'Approval Status', 'approval_status'], 'Pending Approval');
                  const leaveType = getPropCaseInsensitive(r, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '-');
                  const sLower = status.toLowerCase();
                  
                  let badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
                  if (sLower.includes('approve') || sLower.includes('setuju')) badgeClass = "bg-green-100 text-green-700 border-green-200";
                  else if (sLower.includes('reject') || sLower.includes('tolak')) badgeClass = "bg-red-100 text-red-700 border-red-200";

                  const attachUrl = getPropCaseInsensitive(r, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'Link', 'link'], '');
                  
                  let duration = getPropCaseInsensitive(r, ['Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
                  if (!duration) {
                    const dS = parseFlexibleDate(getPropCaseInsensitive(r, ['From Date', 'from_date', 'Start Date', 'start_date'], '-'));
                    const dE = parseFlexibleDate(getPropCaseInsensitive(r, ['To Date', 'to_date', 'End Date', 'end_date'], '-'));
                    if (dS && dE) duration = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
                    else duration = 1;
                  }

                  return (
                    <tr key={i} className="hover:bg-gray-50 transition border-b border-gray-100 text-xs sm:text-sm">
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-gray-800 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['CreatedDate', 'created_date', 'Request Date', 'Date', 'created_at'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium text-blue-700 max-w-[12rem] sm:max-w-xs truncate" title={leaveType}>{leaveType}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['From Date', 'from_date', 'Start Date', 'start_date'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['To Date', 'to_date', 'End Date', 'end_date'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-bold">{duration}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${badgeClass}`}>{status}</span>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                        {attachUrl && attachUrl.startsWith('http') ? (
                          <div className="flex justify-center">
                            <img 
                              src={attachUrl} 
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition" 
                              title="View Attachment"
                              onClick={() => { setPhotoPreviewUrl(attachUrl); setIsPhotoModalOpen(true); }}
                              onError={(e) => { e.target.onerror = null; e.target.src='https://cdn-icons-png.flaticon.com/128/337/337946.png'; }}
                              alt="Attachment"
                            />
                          </div>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                        {sLower.includes('approve') || sLower.includes('setuju') ? (
                          <button onClick={() => requestToCancelLeave(r)} className="text-[9px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded transition border border-gray-300 shadow-sm active:scale-95">Req. Cancel</button>
                        ) : !sLower.includes('reject') && !sLower.includes('tolak') && !sLower.includes('cancel') ? (
                          <button onClick={() => cancelPendingLeave(r)} className="text-[9px] font-bold bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded transition border border-red-200 shadow-sm active:scale-95">Cancel</button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holiday List Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-4">
        <div className="pb-4 mb-3 sm:mb-5 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">Holiday List</h3>
          <p className="text-xs text-gray-500 mt-1">List of available holiday balances</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Type Holiday</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Expiration Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Used Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Description</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-400 italic">Loading holiday records...</td></tr>
              ) : holidayRecords.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-400 italic">No holiday records found.</td></tr>
              ) : (
                holidayRecords.map((r, i) => {
                  const status = getPropCaseInsensitive(r, ['status', 'Status', 'STATUS'], '-');
                  let statusClass = "bg-gray-100 text-gray-700 border-gray-200";
                  if (status.toLowerCase() === 'unused') statusClass = "bg-green-100 text-green-700 border-green-200";
                  else if (status.toLowerCase() === 'used') statusClass = "bg-blue-100 text-blue-700 border-blue-200";

                  return (
                    <tr key={i} className="hover:bg-gray-50 transition border-b border-gray-100 text-xs sm:text-sm">
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-gray-800">
                        {getPropCaseInsensitive(r, ['Type Holiday', 'type_holiday', 'Type', 'type'], '-')}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['Date', 'date', 'Tanggal'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired', 'expired'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                        {formatDateDisplay(getPropCaseInsensitive(r, ['Used Date', 'used_date', 'tanggal_digunakan'], '-'), lang)}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 max-w-[10rem] truncate" title={getPropCaseInsensitive(r, ['Description', 'description', 'desc', 'keterangan'], '-')}>
                        {getPropCaseInsensitive(r, ['Description', 'description', 'desc', 'keterangan'], '-')}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${statusClass}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Request Leave */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Request Leave</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type <span className="text-red-500">*</span></label>
                <select required value={formType} onChange={handleTypeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Leave Type</option>
                  {balances.annual > 0 && <option value="Annual Leave">Annual Leave</option>}
                  <option value="Sick Leave">Sick Leave</option>
                  {(userGender === 'female' || userGender === 'wanita' || userGender === 'perempuan' || userGender === 'f') && <option value="Maternity Leave">Maternity Leave</option>}
                  <option value="Compassionate Leave">Compassionate Leave</option>
                  {balances.dayOff > 0 && <option value="Day Off Payment">Day Off Payment</option>}
                  {balances.extraOff > 0 && <option value="Extra Off">Extra Off</option>}
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
                {formType === 'Annual Leave' && balances.annual > 0 && <p className="text-[10px] text-blue-600 mt-1 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">Available Balance: {balances.annual} day(s)</p>}
                {formType === 'Day Off Payment' && balances.dayOff > 0 && <p className="text-[10px] text-blue-600 mt-1 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">Available Balance: {balances.dayOff} day(s)</p>}
                {formType === 'Extra Off' && balances.extraOff > 0 && <p className="text-[10px] text-blue-600 mt-1 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">Available Balance: {balances.extraOff} day(s)</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={formStart} onChange={handleStartChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={formEnd} onChange={handleEndChange} readOnly={['Day Off Payment', 'Extra Off', 'Maternity Leave'].includes(formType)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${['Day Off Payment', 'Extra Off', 'Maternity Leave'].includes(formType) ? 'bg-gray-100' : 'bg-white'}`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Total Days</label>
                <input type="text" readOnly value={formDuration} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-semibold text-gray-700 cursor-default" />
              </div>

              {['Sick Leave', 'Maternity Leave', 'Compassionate Leave'].includes(formType) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Attachment (Doctor Note / Proof) <span className="text-red-500">*</span></label>
                  <input type="file" required accept="image/*,application/pdf" onChange={(e) => setFormFile(e.target.files[0])} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
                  <p className="text-[10px] text-gray-500 mt-1">Images or PDF document to attach.</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-5 py-2 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-semibold rounded-lg transition`}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Photo Preview */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-700">Attachment Preview</span>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 flex justify-center bg-gray-50">
              <img src={photoPreviewUrl} referrerPolicy="no-referrer" alt="Proof Attachment" className="max-h-96 w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}