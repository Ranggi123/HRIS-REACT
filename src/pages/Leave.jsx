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
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [nonWorkingError, setNonWorkingError] = useState('');

  // Stats & Balances
  const [originalBalances, setOriginalBalances] = useState({ annual: 0, dayOff: 0, extraOff: 0 });
  const [balances, setBalances] = useState({ annual: 0, dayOff: 0, extraOff: 0 });
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [isHolidayDetailOpen, setIsHolidayDetailOpen] = useState(false);
  
  // New States for Modal List
  const [isHolidayListModalOpen, setIsHolidayListModalOpen] = useState(false);
  const [holidayListType, setHolidayListType] = useState('');

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState('All');

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
        const edRaw = getPropCaseInsensitive(row, ['To Date', 'to_date', 'End Date', 'end_date'], '-');
        let dur = getPropCaseInsensitive(row, ['Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
        
        if (!dur) {
          const dS = parseFlexibleDate(sdRaw);
          const dE = parseFlexibleDate(edRaw);
          if (dS && dE) dur = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
          else dur = 1;
        }
        const durVal = parseFloat(dur) || 0;

        if (s.includes('approve') || s.includes('setuju')) app++;
        else if (s.includes('reject') || s.includes('tolak') || s.includes('cancel')) rej++;
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

      // 5. Fetch Schedule Aman dari Database (Menghindari 400 Bad Request)
      // Karena nama kolom untuk email mungkin bukan tepat 'employee' (bisa email, user_uid, dll),
      // kita fetch data (limit 3000) dan memfilternya di JavaScript seperti sebelumnya
      try {
        const { data, error } = await supabase.from('schedule').select('*').limit(3000);
          
        if (!error && Array.isArray(data)) {
          const schedulesFound = data.filter(row => {
            const empVal = (getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id']) || '').toLowerCase();
            return validKeys.some(key => empVal === key || empVal.includes(key) || key.includes(empVal));
          });
          setScheduleRecords(schedulesFound);
        } else if (error) {
          console.warn('Gagal memuat tabel schedule:', error);
        }
      } catch (e) {
        console.warn('Schedule lookup skipped:', e);
      }

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
      const parts = formStart.split('-');
      const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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
      const parts = s.split('-');
      const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      dt.setDate(dt.getDate() + 89);
      setFormEnd(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else if (formEnd && s > formEnd) {
      setFormEnd(s);
    }
  };

  const handleEndChange = (e) => {
    const ed = e.target.value;
    if (['Day Off Payment', 'Extra Off', 'Maternity Leave'].includes(formType)) return;
    if (ed < formStart) {
      setFormEnd(formStart);
    } else {
      setFormEnd(ed);
    }
  };

  // Validasi Jadwal Kerja (Working Day) berdasarkan Database (Hanya Kolom Type)
  useEffect(() => {
    let durationStr = 'Invalid';
    let errorMsg = '';
    
    if (formStart && formEnd) {
      const s = parseFlexibleDate(formStart);
      const e = parseFlexibleDate(formEnd);

      if (s && e && e >= s) {
        const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
        durationStr = `${diff} Day(s)`;
        
        if (scheduleRecords.length > 0 && formType !== 'Maternity Leave') {
          let curr = new Date(s.getTime());
          let nonWorkingFound = [];
          
          while (curr <= e) {
            const yr = curr.getFullYear();
            const mo = String(curr.getMonth() + 1).padStart(2, '0');
            const dy = String(curr.getDate()).padStart(2, '0');
            const dateStr = `${yr}-${mo}-${dy}`;
            
            const match = scheduleRecords.find(row => {
              const rDate = parseFlexibleDate(getPropCaseInsensitive(row, ['date', 'Date', 'tanggal', 'Tanggal', 'schedule_date', 'working_date']));
              if (!rDate) return false;
              const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
              return rStr === dateStr;
            });

            if (match) {
              let isWorking = true;
              
              // Only check the 'type' column to determine if it is a working day
              const rawType = (getPropCaseInsensitive(match, ['type', 'Type', 'tipe', 'Tipe']) || '').trim().toLowerCase();

              // If type is not explicitly 'working day', block it
              if (rawType && rawType !== 'working day') {
                isWorking = false;
              }

              if (!isWorking) {
                nonWorkingFound.push(formatDateDisplay(dateStr, lang));
              }
            } else {
              // Jika tidak ada di schedule, bisa diatur behaviornya (default = aman)
            }
            curr.setDate(curr.getDate() + 1);
          }
          
          if (nonWorkingFound.length > 0) {
            errorMsg = `Tanggal ${nonWorkingFound.join(', ')} bukan merupakan working day (hari kerja) pada jadwal Anda.`;
          }
        }
      }
    }
    
    setFormDuration(durationStr);
    setNonWorkingError(errorMsg);
  }, [formStart, formEnd, scheduleRecords, lang, formType]);

  const { todayFormatted, minStartDate } = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const minStartObj = new Date(now);
    minStartObj.setDate(minStartObj.getDate() - 7);
    const minStart = `${minStartObj.getFullYear()}-${String(minStartObj.getMonth() + 1).padStart(2, '0')}-${String(minStartObj.getDate()).padStart(2, '0')}`;
    
    return { todayFormatted: today, minStartDate: minStart };
  }, []);

  const { minDate, maxDate } = useMemo(() => {
    let min = formStart || minStartDate;
    let max = undefined;

    if (formStart && formType) {
      const parts = formStart.split('-');
      const startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      let maxDays = 0;

      if (formType === 'Annual Leave') {
        maxDays = balances.annual;
      } else if (formType === 'Day Off Payment' || formType === 'Extra Off') {
        maxDays = 1;
      } else if (formType === 'Sick Leave' || formType === 'Compassionate Leave') {
        maxDays = 3;
      } else if (formType === 'Maternity Leave') {
        maxDays = 90;
      }

      if (maxDays > 0) {
        const maxDateObj = new Date(startDate);
        maxDateObj.setDate(maxDateObj.getDate() + (maxDays - 1));
        const y = maxDateObj.getFullYear();
        const m = String(maxDateObj.getMonth() + 1).padStart(2, '0');
        const d = String(maxDateObj.getDate()).padStart(2, '0');
        max = `${y}-${m}-${d}`;
      }
    }
    return { minDate: min, maxDate: max || '' };
  }, [formStart, formType, balances, minStartDate]);

  useEffect(() => {
    if (formEnd && maxDate && formEnd > maxDate) {
      setFormEnd(maxDate);
    } else if (formEnd && minDate && formEnd < minDate) {
      setFormEnd(minDate);
    }
  }, [formEnd, minDate, maxDate]);

  // Line manager resolver
  const getLineManagerEmail = async () => {
    if (!currentUser) return "ranggi@vivre-group.com";
    const rawMgr = getPropCaseInsensitive(currentUser, ['Line Manager Email', 'line_manager_email', 'Line Manager', 'line_manager', 'Manager Email', 'manager_email', 'Manager', 'manager', 'Reports To', 'reports_to', 'Atasan Email', 'atasan_email', 'Approver'], '').trim();
    if (!rawMgr) return "ranggi@vivre-group.com";
    if (rawMgr.includes('@')) return rawMgr.toLowerCase();

    for (const tableName of ['employee_directory', 'employees']) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(2000);
        if (!error && data && data.length > 0) {
          const matched = data.find(row => {
            const empId = getPropCaseInsensitive(row, ['employee id', 'employee_id', 'employeeid', 'id']);
            const empName = getPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'full_name']);
            const empEmail = getPropCaseInsensitive(row, ['email', 'Email', 'user_uid', 'USER_UID']);
            return (empId && empId.toLowerCase() === rawMgr.toLowerCase()) ||
                   (empName && empName.toLowerCase() === rawMgr.toLowerCase()) ||
                   (empEmail && empEmail.toLowerCase() === rawMgr.toLowerCase());
          });
          if (matched) {
            const foundEmail = getPropCaseInsensitive(matched, ['email', 'Email', 'user_uid', 'USER_UID', 'Employee work email', 'work_email']);
            if (foundEmail && foundEmail.includes('@')) return foundEmail.trim().toLowerCase();
          }
        }
      } catch (e) {}
    }
    return "ranggi@vivre-group.com";
  };

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
    if (nonWorkingError) return alert(`Pengajuan tidak dapat diproses: ${nonWorkingError}`);

    const dtStart = new Date(formStart);
    const dtEnd = new Date(formEnd);
    const totalDays = Math.ceil(Math.abs(dtEnd - dtStart) / (1000 * 60 * 60 * 24)) + 1;

    if (formType === 'Day Off Payment' && totalDays > balances.dayOff) {
      return alert(`Total days (${totalDays}) exceeds your Day Off Payment balance (${balances.dayOff}).`);
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

      let tableCols = [];
      if (leaveRecords.length > 0) {
        tableCols = Object.keys(leaveRecords[0]);
      } else {
        const { data: sample } = await supabase.from('leave_requests').select('*').limit(1);
        if (sample && sample.length > 0) {
          tableCols = Object.keys(sample[0]);
        }
      }

      const colPrimaryId = resolveTableColumn(tableCols, ['Leave ID', 'leave_id', 'Leave_ID', 'ID', 'id', 'request_id']) || 'Leave ID';
      const colEmployee = resolveTableColumn(tableCols, ['Employee', 'employee', 'USER_UID', 'user_uid', 'email', 'employee_id']) || 'Employee';
      const colName = resolveTableColumn(tableCols, ['Name', 'name', 'nama', 'fullname', 'full_name']) || 'Name';
      const colCreatedDate = resolveTableColumn(tableCols, ['CreatedDate', 'created_date', 'Created Date', 'Date', 'date']) || 'CreatedDate';
      const colLeaveType = resolveTableColumn(tableCols, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype']) || 'Leave Type';
      const colStartDate = resolveTableColumn(tableCols, ['From Date', 'from_date', 'From', 'from', 'Start Date', 'start_date']) || 'From Date';
      const colEndDate = resolveTableColumn(tableCols, ['To Date', 'to_date', 'To', 'to', 'End Date', 'end_date']) || 'To Date';
      const colStatus = resolveTableColumn(tableCols, ['Status', 'status']) || 'Status';
      const colTotalDays = resolveTableColumn(tableCols, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days']) || 'Total Days Count';
      const colFinalBalance = resolveTableColumn(tableCols, ['Final balance', 'final_balance', 'Final Balance']) || 'Final balance';

      const now = new Date();
      const currentIsoTimestamp = now.toISOString();
      const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const uniqueId = 'LV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

      let currentBalance = 0;
      if (formType === 'Annual Leave') {
        currentBalance = originalBalances.annual;
      } else if (formType === 'Day Off Payment') {
        currentBalance = originalBalances.dayOff;
      } else if (formType === 'Extra Off') {
        currentBalance = originalBalances.extraOff;
      }
      const finalBalanceValue = currentBalance - totalDays;

      const lineManager = await getLineManagerEmail();

      let payload = {
        [colPrimaryId]: uniqueId,
        [colEmployee]: userEmail,
        [colName]: profileName,
        [colCreatedDate]: todayFormatted,
        [colLeaveType]: formType,
        [colStartDate]: formStart,
        [colEndDate]: formEnd,
        [colStatus]: 'Pending Approval',
        [colTotalDays]: totalDays,
        [colFinalBalance]: finalBalanceValue
      };

      const addIfExist = (candidates, value) => {
        const matchedCol = resolveTableColumn(tableCols, candidates);
        if (matchedCol && !payload[matchedCol]) payload[matchedCol] = value;
      };

      addIfExist(['Annual leave balance', 'annual_leave_balance', 'Annual Leave Balance'], originalBalances.annual);
      addIfExist(['extra off balance', 'extra_off_balance', 'Extra Off Balance'], originalBalances.extraOff);
      addIfExist(['day off payment balance', 'day_off_payment_balance', 'Day Off Payment Balance'], originalBalances.dayOff);
      if (attachmentUrl) addIfExist(['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'Link', 'link'], attachmentUrl);
      addIfExist(['createdby', 'created_by', 'CreatedBy'], userEmail);
      addIfExist(['lasteditby', 'last_edit_by', 'Last Edit By'], userEmail);
      addIfExist(['last editdate', 'last_editdate', 'last_edit_date', 'Last Edit Date'], currentIsoTimestamp);
      addIfExist(['created date', 'created_timestamp', 'created_at', 'Created Date'], currentIsoTimestamp);
      addIfExist(['line manager', 'line_manager', 'Line Manager'], lineManager);

      const { error: insErr } = await supabase.from('leave_requests').insert([payload]);
      if (insErr) throw insErr;

      // Send Submission Email
      const formattedStart = formatDateDisplay(formStart, 'en');
      const formattedEnd = formatDateDisplay(formEnd, 'en');
      const durLabel = `${totalDays} Day(s)`;

      const emailText = `Hi,

A new leave request has been submitted:

Employee: ${profileName}
Leave Type: ${formType}
Period: ${formattedStart} - ${formattedEnd} (${durLabel})

Please review via the HRIS Portal.

go to HRIS: https://hr.arratechs.com/approval`;

      const emailHtml = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
  <p style="margin-top: 0; font-size: 15px;">Hi,</p>
  <p style="font-size: 15px;">A new leave request has been submitted:</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
    <p style="margin: 4px 0; font-size: 14px;"><strong>Employee:</strong> ${profileName}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Leave Type:</strong> ${formType}</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Period:</strong> ${formattedStart} - ${formattedEnd} (${durLabel})</p>
  </div>
  <p style="font-size: 14px; margin-bottom: 20px;">Please review via the HRIS Portal.</p>
  <div style="margin: 24px 0 10px 0;">
    <a href="https://hr.arratechs.com/approval" target="_blank" rel="noopener noreferrer" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">go to HRIS</a>
  </div>
</div>
`;

      try {
        await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "sendEmail",
            to: lineManager,
            subject: `Leave Request: ${formType} - ${profileName}`,
            body: emailHtml,
            htmlBody: emailHtml,
            plainText: emailText,
            fromEmail: userEmail
          })
        });
      } catch (mailErr) {
        console.warn("Notice email could not be sent:", mailErr);
      }

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
      
      const rType = getPropCaseInsensitive(record, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '-');
      const rStartRaw = getPropCaseInsensitive(record, ['From Date', 'from_date', 'Start Date', 'start_date'], '-');
      const rEndRaw = getPropCaseInsensitive(record, ['To Date', 'to_date', 'End Date', 'end_date'], '-');
      const rStart = formatDateDisplay(rStartRaw, 'en');
      const rEnd = formatDateDisplay(rEndRaw, 'en');
      
      let rDur = getPropCaseInsensitive(record, ['Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
      if (!rDur) {
        const dS = parseFlexibleDate(rStartRaw);
        const dE = parseFlexibleDate(rEndRaw);
        if (dS && dE) rDur = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
        else rDur = 1;
      }
      const durLabel = `${rDur} day(s)`;
      const lineManager = getPropCaseInsensitive(currentUser, ['Line Manager', 'line_manager', 'Manager Email', 'Approver', 'Atasan Email'], 'ranggiit@gmail.com');
      
      try {
        await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "sendEmail",
            to: lineManager,
            subject: `Cancel Leave Request: ${rType} - ${profileName}`,
            body: `Hi,

A pending leave request has been CANCELLED by the employee:

Employee: ${profileName}
Leave Type: ${rType}
Period: ${rStart} to ${rEnd} (${durLabel})

No further action is required.`,
            fromEmail: userEmail
          })
        });
      } catch (mailErr) {
        console.warn("Notice email could not be sent:", mailErr);
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

  const filteredLeaveRecords = useMemo(() => {
    return leaveRecords.filter(r => {
      if (statusFilter === 'All') return true;
      const sLower = getPropCaseInsensitive(r, ['Status', 'status', 'Approval Status', 'approval_status'], 'Pending Approval').toLowerCase();
      
      if (statusFilter === 'Approved') {
        return sLower.includes('approve') || sLower.includes('setuju');
      }
      if (statusFilter === 'Cancel') {
        return sLower.includes('reject') || sLower.includes('tolak') || sLower.includes('cancel');
      }
      if (statusFilter === 'Pending') {
        return !sLower.includes('approve') && !sLower.includes('setuju') && !sLower.includes('reject') && !sLower.includes('tolak') && !sLower.includes('cancel');
      }
      return true;
    });
  }, [leaveRecords, statusFilter]);

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Leave Records Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-6 relative mb-6">
        <div className="flex flex-row justify-between items-start sm:items-center pb-4 mb-3 sm:mb-5 border-b border-gray-200 gap-2 sm:gap-4">
          <div className="flex-1 pr-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex flex-wrap items-center gap-2">Leave Records</h3>
            <p className="text-xs text-gray-500 mt-1 break-words">Manage and track your leave submissions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:gap-3">
            <button 
              onClick={handleOpenModal}
              className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold transition items-center gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Request Leave</span>
            </button>
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

        {/* Mobile Request Leave Button (Matches reference image position) */}
        <button 
          onClick={handleOpenModal}
          className="sm:hidden w-full mb-5 px-4 py-3 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          <span>Request Leave</span>
        </button>

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
              <div className="flex-1 min-w-[30%] bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-blue-700 uppercase mr-2">Annual Leave</span>
                  <span className="text-lg sm:text-xl font-black text-blue-900">{balances.annual}</span>
                </div>
              </div>
              <div 
                onClick={() => { setHolidayListType('Day Off Payment'); setIsHolidayListModalOpen(true); }}
                className="flex-1 min-w-[30%] bg-purple-50 hover:bg-purple-100 cursor-pointer transition border border-purple-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex flex-col justify-center"
                title="Click to view Day Off Payment List"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-purple-700 uppercase mr-2">Day Off Payment</span>
                  <span className="text-lg sm:text-xl font-black text-purple-900">{balances.dayOff}</span>
                </div>
                <div className="mt-1 text-[10px] text-purple-600 font-semibold flex items-center justify-end">
                  Click for details
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </div>
              </div>
              <div 
                onClick={() => { setHolidayListType('Extra Off'); setIsHolidayListModalOpen(true); }}
                className="flex-1 min-w-[30%] bg-white hover:bg-gray-50 cursor-pointer transition border border-gray-200 rounded-lg py-1.5 px-2.5 sm:p-3 shadow-sm flex flex-col justify-center"
                title="Click to view Extra Off List"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase mr-2">Extra Off</span>
                  <span className="text-lg sm:text-xl font-black text-gray-900">{balances.extraOff}</span>
                </div>
                <div className="mt-1 text-[10px] text-gray-500 font-semibold flex items-center justify-end">
                  Click for details
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="inline-flex bg-slate-100 rounded-xl p-1.5 w-full sm:w-auto overflow-x-auto gap-1" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setStatusFilter('All')}
                className={`whitespace-nowrap flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm transition-all ${statusFilter === 'All' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-blue-700 font-semibold hover:bg-slate-200/60'}`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('Pending')}
                className={`whitespace-nowrap flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm transition-all ${statusFilter === 'Pending' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-blue-700 font-semibold hover:bg-slate-200/60'}`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setStatusFilter('Approved')}
                className={`whitespace-nowrap flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm transition-all ${statusFilter === 'Approved' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-blue-700 font-semibold hover:bg-slate-200/60'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('Cancel')}
                className={`whitespace-nowrap flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm transition-all ${statusFilter === 'Cancel' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-blue-700 font-semibold hover:bg-slate-200/60'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Leave Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 table-fixed min-w-[700px]">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[14%]">Request Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[18%]">Leave Type</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[14%]">From Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[14%]">To Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[10%] text-center">Days</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[15%] text-center">Status</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 w-[15%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400 italic">Loading leave records...</td></tr>
              ) : filteredLeaveRecords.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-400 italic">No leave records found.</td></tr>
              ) : (
                filteredLeaveRecords.map((r, i) => {
                  const status = getPropCaseInsensitive(r, ['Status', 'status', 'Approval Status', 'approval_status'], 'Pending Approval');
                  const leaveType = getPropCaseInsensitive(r, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '-');
                  const sLower = status.toLowerCase();
                  
                  let badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
                  if (sLower.includes('approve') || sLower.includes('setuju')) badgeClass = "bg-green-100 text-green-700 border-green-200";
                  else if (sLower.includes('reject') || sLower.includes('tolak')) badgeClass = "bg-red-100 text-red-700 border-red-200";
                  else if (sLower.includes('cancel')) badgeClass = "bg-purple-100 text-purple-700 border-purple-200";

                  let duration = getPropCaseInsensitive(r, ['Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
                  if (!duration) {
                    const dS = parseFlexibleDate(getPropCaseInsensitive(r, ['From Date', 'from_date', 'Start Date', 'start_date'], '-'));
                    const dE = parseFlexibleDate(getPropCaseInsensitive(r, ['To Date', 'to_date', 'End Date', 'end_date'], '-'));
                    if (dS && dE) duration = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
                    else duration = 1;
                  }

                  return (
                    <tr 
                      key={i} 
                      onClick={() => { setSelectedRecord(r); setIsDetailModalOpen(true); }}
                      title="Click to view details"
                      className="hover:bg-blue-50/70 cursor-pointer transition border-b border-gray-100 text-xs sm:text-sm group"
                    >
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
                      <td className="px-2 py-2 sm:px-4 sm:py-3 text-center" onClick={(e) => e.stopPropagation()}>
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

      {/* Modal Holiday List */}
      {isHolidayListModalOpen && (
        <div 
          className="fixed inset-0 z-[45] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
          onClick={() => setIsHolidayListModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 max-h-[92vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {holidayListType} List
                </h3>
                <p className="text-xs text-gray-500 mt-1">Details of your {holidayListType} balances</p>
              </div>
              <button onClick={() => setIsHolidayListModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left text-gray-600 table-fixed min-w-[700px]">
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
                  {(() => {
                    const filteredHolidays = holidayRecords.filter(r => {
                      const t = getPropCaseInsensitive(r, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').toLowerCase();
                      if (holidayListType === 'Day Off Payment') return t.includes('day off payment') || t === 'day off';
                      if (holidayListType === 'Extra Off') return t.includes('extra off');
                      return false;
                    });
                    
                    if (loading) return <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-400 italic">Loading records...</td></tr>;
                    if (filteredHolidays.length === 0) return <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-400 italic">No records found.</td></tr>;

                    return filteredHolidays.map((r, i) => {
                      const status = getPropCaseInsensitive(r, ['status', 'Status', 'STATUS'], '-');
                      let statusClass = "bg-gray-100 text-gray-700 border-gray-200";
                      if (status.toLowerCase() === 'unused') statusClass = "bg-green-100 text-green-700 border-green-200";
                      else if (status.toLowerCase() === 'used') statusClass = "bg-blue-100 text-blue-700 border-blue-200";

                      return (
                        <tr 
                          key={i} 
                          onClick={() => { setSelectedHoliday(r); setIsHolidayDetailOpen(true); }}
                          title="Click to view details"
                          className="hover:bg-purple-50/70 cursor-pointer transition border-b border-gray-100 text-xs sm:text-sm group"
                        >
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
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                {(formType === 'Day Off Payment' || formType === 'Extra Off') && <p className="text-[10px] text-orange-600 mt-1 font-semibold bg-orange-50 px-2 py-1 rounded border border-orange-100 w-fit">Note: You can only request 1 day per submission.</p>}
                {(formType === 'Sick Leave' || formType === 'Compassionate Leave') && <p className="text-[10px] text-orange-600 mt-1 font-semibold bg-orange-50 px-2 py-1 rounded border border-orange-100 w-fit">Note: Maximum 3 consecutive days allowed.</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date <span className="text-red-500">*</span></label>
                  <input type="date" required min={minStartDate} value={formStart} onChange={handleStartChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date <span className="text-red-500">*</span></label>
                  <input type="date" required min={minDate} max={maxDate} value={formEnd} onChange={handleEndChange} readOnly={['Day Off Payment', 'Extra Off', 'Maternity Leave'].includes(formType)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${['Day Off Payment', 'Extra Off', 'Maternity Leave'].includes(formType) ? 'bg-gray-100' : 'bg-white'}`} />
                </div>
              </div>
              
              {nonWorkingError && (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg mt-2 flex gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-[10px] text-red-700 font-medium">
                    Note: {nonWorkingError}
                  </p>
                </div>
              )}

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
                <button type="submit" disabled={isSubmitting || !!nonWorkingError} className={`px-5 py-2 ${(isSubmitting || !!nonWorkingError) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-semibold rounded-lg transition`}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Leave Request Details */}
      {isDetailModalOpen && selectedRecord && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 sm:p-6 border border-gray-100 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Leave Request Details</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    (() => {
                      const st = (getPropCaseInsensitive(selectedRecord, ['Status', 'status', 'Approval Status', 'approval_status'], 'Pending Approval')).toLowerCase();
                      if (st.includes('approve') || st.includes('setuju')) return 'bg-green-100 text-green-700 border-green-200';
                      if (st.includes('reject') || st.includes('tolak')) return 'bg-red-100 text-red-700 border-red-200';
                      if (st.includes('cancel')) return 'bg-purple-100 text-purple-700 border-purple-200';
                      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                    })()
                  }`}>
                    {getPropCaseInsensitive(selectedRecord, ['Status', 'status', 'Approval Status', 'approval_status'], 'Pending Approval')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  ID: <span className="font-mono font-semibold text-gray-700">{getPropCaseInsensitive(selectedRecord, ['Leave ID', 'leave_id', 'Leave_ID', 'ID', 'id', 'request_id'], '-')}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body / Information Grid */}
            <div className="space-y-3.5 text-xs">
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Leave Type</span>
                  <p className="text-base font-extrabold text-blue-900 mt-0.5">
                    {getPropCaseInsensitive(selectedRecord, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], '-')}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Duration</span>
                  <p className="text-base font-extrabold text-blue-900 mt-0.5">
                    {(() => {
                      let dur = getPropCaseInsensitive(selectedRecord, ['Total Days', 'total_days', 'Total Days Count', 'total_days_count', 'Duration', 'duration', 'Days', 'days'], '');
                      if (!dur) {
                        const dS = parseFlexibleDate(getPropCaseInsensitive(selectedRecord, ['From Date', 'from_date', 'Start Date', 'start_date'], '-'));
                        const dE = parseFlexibleDate(getPropCaseInsensitive(selectedRecord, ['To Date', 'to_date', 'End Date', 'end_date'], '-'));
                        if (dS && dE) dur = Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1;
                        else dur = 1;
                      }
                      return `${dur} Day(s)`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/70 rounded-xl border border-gray-200 divide-y divide-gray-200/70 p-3 space-y-2.5">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500 font-medium">Employee Name</span>
                  <strong className="text-gray-800 font-semibold">
                    {getPropCaseInsensitive(selectedRecord, ['Name', 'name', 'nama', 'fullname'], profileName)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Employee / Account</span>
                  <span className="font-mono text-gray-800 font-medium">
                    {getPropCaseInsensitive(selectedRecord, ['Employee', 'employee', 'USER_UID', 'user_uid', 'email'], userEmail)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">From Date</span>
                  <strong className="text-gray-800">
                    {formatDateDisplay(getPropCaseInsensitive(selectedRecord, ['From Date', 'from_date', 'Start Date', 'start_date'], '-'), lang)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">To Date</span>
                  <strong className="text-gray-800">
                    {formatDateDisplay(getPropCaseInsensitive(selectedRecord, ['To Date', 'to_date', 'End Date', 'end_date'], '-'), lang)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Request / Submission Date</span>
                  <span className="text-gray-800">
                    {formatDateDisplay(getPropCaseInsensitive(selectedRecord, ['CreatedDate', 'created_date', 'Request Date', 'Date', 'created_at'], '-'), lang)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Line Manager / Approver</span>
                  <span className="font-mono text-gray-800 text-[11px]">
                    {getPropCaseInsensitive(selectedRecord, ['Line Manager', 'line_manager', 'line_manager_email', 'Approver'], '-')}
                  </span>
                </div>

                {getPropCaseInsensitive(selectedRecord, ['Final balance', 'final_balance', 'Final Balance']) && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-500 font-medium">Remaining Balance After Leave</span>
                    <strong className="text-blue-700 font-bold">
                      {getPropCaseInsensitive(selectedRecord, ['Final balance', 'final_balance', 'Final Balance'])} Day(s)
                    </strong>
                  </div>
                )}
              </div>

              {(() => {
                const att = getPropCaseInsensitive(selectedRecord, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'Link', 'link'], '');
                if (att && att.startsWith('http')) {
                  return (
                    <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-3">
                      <span className="text-gray-600 font-semibold block mb-2">Supporting Attachment / Proof:</span>
                      <div className="flex items-center gap-3">
                        <img 
                          src={att} 
                          alt="Proof Thumbnail" 
                          referrerPolicy="no-referrer"
                          onClick={() => { setPhotoPreviewUrl(att); setIsPhotoModalOpen(true); }}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-300 shadow-xs cursor-pointer hover:opacity-80 transition"
                          onError={(e) => { e.target.onerror = null; e.target.src='https://cdn-icons-png.flaticon.com/128/337/337946.png'; }}
                        />
                        <div className="text-[11px] text-gray-500">
                          <p className="font-medium text-gray-700">Medical note or document attached</p>
                          <button 
                            type="button"
                            onClick={() => { setPhotoPreviewUrl(att); setIsPhotoModalOpen(true); }}
                            className="text-blue-600 font-bold hover:underline mt-1 inline-flex items-center gap-1"
                          >
                            <span>Click to enlarge preview</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <div>
                {(() => {
                  const s = (getPropCaseInsensitive(selectedRecord, ['Status', 'status', 'Approval Status', 'approval_status'], '')).toLowerCase();
                  if (s.includes('approve') || s.includes('setuju')) {
                    return (
                      <button 
                        type="button"
                        onClick={() => {
                          const rec = selectedRecord;
                          setIsDetailModalOpen(false);
                          requestToCancelLeave(rec);
                        }}
                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition border border-gray-300 shadow-xs active:scale-95"
                      >
                        Request Cancel
                      </button>
                    );
                  }
                  if (!s.includes('reject') && !s.includes('tolak') && !s.includes('cancel')) {
                    return (
                      <button 
                        type="button"
                        onClick={() => {
                          const rec = selectedRecord;
                          setIsDetailModalOpen(false);
                          cancelPendingLeave(rec);
                        }}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition border border-red-200 shadow-xs active:scale-95"
                      >
                        Cancel Request
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              <button 
                type="button" 
                onClick={() => setIsDetailModalOpen(false)} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Holiday Details */}
      {isHolidayDetailOpen && selectedHoliday && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
          onClick={() => setIsHolidayDetailOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 sm:p-6 border border-gray-100 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Holiday Details</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    (() => {
                      const st = (getPropCaseInsensitive(selectedHoliday, ['status', 'Status', 'STATUS'], '-')).toLowerCase();
                      if (st === 'unused') return 'bg-green-100 text-green-700 border-green-200';
                      if (st === 'used') return 'bg-blue-100 text-blue-700 border-blue-200';
                      return 'bg-gray-100 text-gray-700 border-gray-200';
                    })()
                  }`}>
                    {getPropCaseInsensitive(selectedHoliday, ['status', 'Status', 'STATUS'], '-')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Holiday Balance Information
                </p>
              </div>
              <button 
                onClick={() => setIsHolidayDetailOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-purple-50/70 border border-purple-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Type Holiday</span>
                  <p className="text-base font-extrabold text-purple-900 mt-0.5">
                    {getPropCaseInsensitive(selectedHoliday, ['Type Holiday', 'type_holiday', 'Type', 'type'], '-')}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Holiday Balance</span>
                  <p className="text-base font-extrabold text-purple-900 mt-0.5">
                    {(() => {
                      const d = getPropCaseInsensitive(selectedHoliday, ['Days', 'days', 'Amount', 'amount', 'Total', 'total'], '1');
                      return `${d} Day(s)`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/70 rounded-xl border border-gray-200 divide-y divide-gray-200/70 p-3 space-y-2.5">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500 font-medium">Earned Date</span>
                  <strong className="text-gray-800">
                    {formatDateDisplay(getPropCaseInsensitive(selectedHoliday, ['Date', 'date', 'Tanggal'], '-'), lang)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Expiration Date</span>
                  <strong className="text-gray-800">
                    {formatDateDisplay(getPropCaseInsensitive(selectedHoliday, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired', 'expired'], '-'), lang)}
                  </strong>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Used Date</span>
                  <span className="text-gray-800 font-medium">
                    {formatDateDisplay(getPropCaseInsensitive(selectedHoliday, ['Used Date', 'used_date', 'tanggal_digunakan'], '-'), lang)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="font-semibold text-gray-800">
                    {getPropCaseInsensitive(selectedHoliday, ['status', 'Status', 'STATUS'], '-')}
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-gray-500 font-medium block mb-1">Description</span>
                  <p className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-200 font-medium text-xs whitespace-pre-wrap">
                    {getPropCaseInsensitive(selectedHoliday, ['Description', 'description', 'desc', 'keterangan'], '-') || '-'}
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsHolidayDetailOpen(false)} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
              >
                Close
              </button>
            </div>

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