import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const [missedCheckoutList, setMissedCheckoutList] = useState([]);
  const [lateCheckoutWarning, setLateCheckoutWarning] = useState(false);
  
  const [isTodayCheckInActive, setIsTodayCheckInActive] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);

  const [lastCheckInTime, setLastCheckInTime] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [locationText, setLocationText] = useState('');
  const [isOvertime, setIsOvertime] = useState('No');
  const [reason, setReason] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [isFakeLocation, setIsFakeLocation] = useState(false);

  const [overtimeDate, setOvertimeDate] = useState('');
  const [overtimeTime, setOvertimeTime] = useState('');

  const [todaySchedule, setTodaySchedule] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(attendanceRecords.length / itemsPerPage) || 1;

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return attendanceRecords.slice(start, start + itemsPerPage);
  }, [attendanceRecords, currentPage]);

  const getPropCaseInsensitive = (obj, candidateKeys, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateKeys) {
      const normalizedCand = cand.toLowerCase().replace(/[\s_?-]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[\s_?-]/g, '') === normalizedCand);
      if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
        return String(obj[found]).trim();
      }
    }
    return fallback;
  };

  const findExistingColumnName = (candidateKeys) => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return candidateKeys[0];
    }
    const sampleRecord = attendanceRecords[0];
    const existingKeys = Object.keys(sampleRecord);
    
    for (const cand of candidateKeys) {
      if (existingKeys.includes(cand)) return cand;
    }
    for (const cand of candidateKeys) {
      const normCand = cand.toLowerCase().replace(/[\s_?-]/g, '');
      const matched = existingKeys.find(k => k.toLowerCase().replace(/[\s_?-]/g, '') === normCand);
      if (matched) return matched;
    }
    return null;
  };

  const formatScheduleDate = (rawDate) => {
    if (!rawDate || rawDate === '-' || rawDate === 'null' || rawDate === 'undefined') return '-';
    let d = null;
    if (rawDate instanceof Date) {
      d = rawDate;
    } else {
      const s = String(rawDate).trim();
      const m1 = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      const m2 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
      if (m1) {
        d = new Date(parseInt(m1[1]), parseInt(m1[2]) - 1, parseInt(m1[3]));
      } else if (m2) {
        let y = parseInt(m2[3]);
        if (y < 100) y += 2000;
        d = new Date(y, parseInt(m2[2]) - 1, parseInt(m2[1]));
      } else {
        d = new Date(s);
      }
    }
    if (!d || isNaN(d.getTime())) return String(rawDate);

    const lang = localStorage.getItem('hris_lang') || 'id';
    const dayNamesId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayNames = lang === 'en' ? dayNamesEn : dayNamesId;
    const monthNames = lang === 'en' ? monthNamesEn : monthNamesId;

    const dayName = dayNames[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    return `${dayName}, ${day}-${month}-${year}`;
  };

  const formatIndoDateTime = (rowOrVal) => {
    if (!rowOrVal || rowOrVal === '-' || rowOrVal === 'null' || rowOrVal === 'undefined') return '-';
    let rawTime = '';
    let rawDate = '';
    if (typeof rowOrVal === 'object' && !(rowOrVal instanceof Date)) {
      rawTime = getPropCaseInsensitive(rowOrVal, ['Time', 'time', 'jam', 'waktu'], '');
      rawDate = getPropCaseInsensitive(rowOrVal, ['Date', 'date', 'tanggal', 'CreatedDate', 'created_at'], '');
    } else {
      rawTime = String(rowOrVal).trim();
    }
    let hh = '';
    let mm = '';
    const matchTime = rawTime.match(/(\d{1,2})[:.](\d{1,2})(?:[:.]\d{1,2})?/);
    if (matchTime) {
      hh = matchTime[1].padStart(2, '0');
      mm = matchTime[2].padStart(2, '0');
    }
    let dStr = '';
    let mStr = '';
    let yStr = '';
    const dateSource = rawDate || rawTime;
    const mIso = dateSource.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    const mSlash = dateSource.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (mIso) {
      yStr = mIso[1];
      mStr = mIso[2].padStart(2, '0');
      dStr = mIso[3].padStart(2, '0');
    } else if (mSlash) {
      dStr = mSlash[1].padStart(2, '0');
      mStr = mSlash[2].padStart(2, '0');
      let y = parseInt(mSlash[3]);
      if (y < 100) y += 2000;
      yStr = String(y);
    } else {
      const parsed = new Date(dateSource);
      if (!isNaN(parsed.getTime())) {
        dStr = String(parsed.getDate()).padStart(2, '0');
        mStr = String(parsed.getMonth() + 1).padStart(2, '0');
        yStr = String(parsed.getFullYear());
        if (!hh) {
          hh = String(parsed.getHours()).padStart(2, '0');
          mm = String(parsed.getMinutes()).padStart(2, '0');
        }
      }
    }
    if (dStr && hh) return `${dStr}-${mStr}-${yStr} ${hh}:${mm}`;
    if (hh) return `${hh}:${mm}`;
    if (dStr) return `${dStr}-${mStr}-${yStr}`;
    return rawTime;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('hris_session_data');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setActiveUser(parsed);
        fetchAttendanceData(parsed);
        fetchTodaySchedule(parsed);
      } catch (e) {}
    } else {
      setLoading(false);
    }
  }, []);

  const fetchTodaySchedule = async (user) => {
    const userEmail = getPropCaseInsensitive(user, ['email', 'user_uid']);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayDate = `${y}-${m}-${d}`;

    try {
      const { data } = await supabase
        .from('schedule')
        .select('*')
        .ilike('Employee', `%${userEmail}%`)
        .eq('Date', todayDate)
        .limit(1);

      if (data && data.length > 0) {
        setTodaySchedule(data[0]);
      } else {
        setTodaySchedule({ type: 'No Schedule' });
      }
    } catch (err) {
      setTodaySchedule({ type: 'Error' });
    }
  };

  const fetchAttendanceData = async (user) => {
    setLoading(true);
    const userEmail = getPropCaseInsensitive(user, ['email', 'user_uid']);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .ilike('Employee', `%${userEmail}%`)
      .order('CreatedDate', { ascending: false })
      .limit(100);
    if (data) {
      setAttendanceRecords(data);
      evaluateAttendanceState(data);
    }
    setLoading(false);
  };

  const updateAttendanceRequestsBadgeState = (shouldHide) => {
    try {
      if (shouldHide) {
        localStorage.setItem('hide_attendance_requests_badge', 'true');
        localStorage.setItem('attendance_requests_badge', '0');
        localStorage.setItem('has_missed_checkout', 'false');
      } else {
        localStorage.setItem('hide_attendance_requests_badge', 'false');
        localStorage.setItem('has_missed_checkout', 'true');
      }
      window.dispatchEvent(new CustomEvent('attendanceBadgeUpdate', { detail: { hideBadge: shouldHide } }));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {}
  };

  const evaluateAttendanceState = (records) => {
    if (!records || records.length === 0) {
      setMissedCheckoutList([]);
      setLateCheckoutWarning(false);
      setIsTodayCheckInActive(false);
      setHasCheckedOutToday(false);
      updateAttendanceRequestsBadgeState(true);
      return;
    }
    
    const latestRecord = records[0];
    const latestType = (latestRecord['Are you checking out or Checking in?'] || '').toLowerCase();
    const isCheckOut = latestType.includes('out') || latestType.includes('pulang');

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    const todayDateString = `${y}-${m}-${dStr}`;
    
    const extractDateString = (rawDate) => {
      if (!rawDate) return null;
      let dObj = new Date(rawDate);
      if (!isNaN(dObj.getTime())) {
        const ry = dObj.getFullYear();
        const rm = String(dObj.getMonth() + 1).padStart(2, '0');
        const rd = String(dObj.getDate()).padStart(2, '0');
        return `${ry}-${rm}-${rd}`;
      }
      const txt = String(rawDate);
      const m1 = txt.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      const m2 = txt.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
      if (m1) {
        return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
      } else if (m2) {
        let yr = parseInt(m2[3]);
        if (yr < 100) yr += 2000;
        return `${yr}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
      }
      return txt.slice(0, 10);
    };

    const recordDateStr = extractDateString(latestRecord['Date'] || latestRecord['date'] || latestRecord['CreatedDate']);
    
    const isPastDate = recordDateStr && (recordDateStr < todayDateString);
    const isTodayDate = recordDateStr === todayDateString;

    if (isCheckOut) {
      setMissedCheckoutList([]);
      setLateCheckoutWarning(false);
      setIsTodayCheckInActive(false);
      updateAttendanceRequestsBadgeState(true);
      
      if (isTodayDate) {
        setHasCheckedOutToday(true);
      } else {
        setHasCheckedOutToday(false);
      }
      return;
    }

    setHasCheckedOutToday(false);
    setLastCheckInTime(formatIndoDateTime(latestRecord));

    if (isPastDate) {
      setMissedCheckoutList([{ date: recordDateStr }]);
      setLateCheckoutWarning(true);
      setIsTodayCheckInActive(false);
      updateAttendanceRequestsBadgeState(false);
    } else if (isTodayDate) {
      setMissedCheckoutList([]);
      setLateCheckoutWarning(false);
      setIsTodayCheckInActive(true);
      updateAttendanceRequestsBadgeState(true);
    } else {
      setMissedCheckoutList([]);
      setLateCheckoutWarning(false);
      setIsTodayCheckInActive(false);
      updateAttendanceRequestsBadgeState(true);
    }
  };

  const fetchOvertimeDefaults = async () => {
    if (attendanceRecords.length > 0 && activeUser) {
      const latestRecord = attendanceRecords[0];
      const lastDateRaw = getPropCaseInsensitive(latestRecord, ['Date', 'date', 'tanggal', 'CreatedDate']);
      
      let formattedDate = '';
      try {
        const d = new Date(lastDateRaw);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          formattedDate = `${y}-${m}-${day}`;
        }
      } catch(e) {}
      
      const finalDate = formattedDate || lastDateRaw;
      setOvertimeDate(finalDate);

      const userEmail = getPropCaseInsensitive(activeUser, ['email', 'user_uid']);
      try {
        const { data } = await supabase
          .from('schedule')
          .select('*')
          .ilike('Employee', `%${userEmail}%`)
          .eq('Date', finalDate)
          .limit(1);
          
        if (data && data.length > 0) {
          setOvertimeTime(getPropCaseInsensitive(data[0], ['Schedule End Time', 'End Time', 'end_time'], '17:00'));
        } else {
          setOvertimeTime('17:00');
        }
      } catch (err) {
        setOvertimeTime('17:00');
      }
    }
  };

  useEffect(() => {
    if (isOvertime === 'Yes' || lateCheckoutWarning) {
      fetchOvertimeDefaults();
    }
  }, [isOvertime, lateCheckoutWarning]);

  const autoFetchLocation = () => {
    setLocationText('Waiting for location access...');
    setIsFakeLocation(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const isMocked = pos.coords.mocked || pos.coords.isMocked || (pos.coords.accuracy < 10 && pos.coords.altitude === 0 && pos.coords.altitudeAccuracy === 0 && pos.coords.heading === NaN && pos.coords.speed === NaN);
          
          if (isMocked) {
             setIsFakeLocation(true);
             setLocationText('Fake/Mock Location detected. Please disable it.');
          } else {
             setLocationText(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
          }
        },
        () => setLocationText('Failed to access GPS'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      setLocationText('GPS not supported');
    }
  };

  const startCamera = async () => {
    setPhotoData(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const handleOpenModal = () => {
    if (hasCheckedOutToday) return;
    setIsModalOpen(true);
    startCamera();
    autoFetchLocation();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const scaleFactor = 0.5; 
      canvas.width = video.videoWidth * scaleFactor;
      canvas.height = video.videoHeight * scaleFactor;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      setPhotoData(dataUrl);
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  const handleAttendanceSubmit = async (e) => {
    if (e) e.preventDefault();

    if (isFakeLocation) {
       alert('Terdeteksi penggunaan Fake GPS. Silakan matikan aplikasi Fake GPS Anda untuk melakukan absensi.');
       return;
    }

    if (!locationText || locationText.includes('Waiting') || locationText.includes('Failed')) {
      alert('Harap pastikan izin GPS diaktifkan dan lokasi berhasil terkunci.');
      return;
    }

    if (!photoData) {
      alert('Harap ambil foto selfie sebagai bukti presensi.');
      return;
    }

    if (!reason.trim()) {
      alert('Alasan (reason) wajib diisi.');
      return;
    }

    setFormSubmitting(true);

    try {
      const base64Data = photoData.split(',')[1];
      
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const todayDateStr = `${y}-${m}-${d}`;
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const timeStr = `${hh}:${mm}:${ss}`;
      const fullTimestamp = `${todayDateStr} ${timeStr}`;

      const empEmail = getPropCaseInsensitive(activeUser, ['email', 'user_uid']);
      const empName = activeUser?.Name || activeUser?.name || 'Employee';

      let isLastRecordCheckingIn = false;
      let lastRecordDateFormatted = '';
      let prevAttendanceId = '';
      let isCheckoutFromPrevShift = false;

      if (attendanceRecords && attendanceRecords.length > 0) {
        const latestRecord = attendanceRecords[0];
        const latestType = (getPropCaseInsensitive(latestRecord, ['Are you checking out or Checking in?', 'Type', 'type', 'status']) || '').toLowerCase();
        isLastRecordCheckingIn = latestType.includes('in') && !latestType.includes('out');

        prevAttendanceId = getPropCaseInsensitive(latestRecord, ['UID', 'uid', 'id', 'ID', 'attendance_id']);

        const rawDate = getPropCaseInsensitive(latestRecord, ['Date', 'date', 'tanggal', 'CreatedDate']);
        if (rawDate) {
          try {
            const parsedD = new Date(rawDate);
            if (!isNaN(parsedD.getTime())) {
              const py = parsedD.getFullYear();
              const pm = String(parsedD.getMonth() + 1).padStart(2, '0');
              const pd = String(parsedD.getDate()).padStart(2, '0');
              lastRecordDateFormatted = `${py}-${pm}-${pd}`;
            } else {
              lastRecordDateFormatted = String(rawDate).slice(0, 10);
            }
          } catch(e) {
            lastRecordDateFormatted = String(rawDate).slice(0, 10);
          }
        }

        if (isLastRecordCheckingIn && lastRecordDateFormatted && (lastRecordDateFormatted < todayDateStr)) {
          isCheckoutFromPrevShift = true;
        }
      }

      const attendanceType = isLastRecordCheckingIn ? "Checking out" : "Checking in";
      const finalSubmissionDate = isCheckoutFromPrevShift ? lastRecordDateFormatted : todayDateStr;

      let otEmailText = '';
      let otEmailHtml = '';
      
      let lineManager = getPropCaseInsensitive(activeUser, ['Line Manager', 'line_manager', 'Manager Email', 'Approver', 'Atasan Email'], 'ranggi@vivre-group.com');
      
      try {
        const { data: empData } = await supabase
          .from('employee_directory')
          .select('*')
          .eq('Email', empEmail)
          .limit(1);
        if (empData && empData.length > 0 && empData[0]['Line Manager']) {
          lineManager = empData[0]['Line Manager'];
        }
      } catch(e) {}

      const safeAssign = (targetObj, candidateKeys, value) => {
        const actualColName = findExistingColumnName(candidateKeys);
        if (actualColName) {
          targetObj[actualColName] = value;
        }
      };

      const isException = isCheckoutFromPrevShift || (attendanceType === 'Checking out' && isOvertime === 'Yes');
      const recordStatus = isException ? 'Pending Approval' : 'Approved';

      let payload = {
        Employee: empEmail,
        Date: finalSubmissionDate,
        Time: fullTimestamp,
        Location: locationText,
        'Are you checking out or Checking in?': attendanceType,
        Reason: reason,
        Status: recordStatus,
        Name: empName
      };

      safeAssign(payload, ['LastEditBy', 'last_edit_by', 'lasteditby'], empEmail);
      safeAssign(payload, ['CreatedBy', 'created_by', 'createdby'], empEmail);
      
      const empId = getPropCaseInsensitive(activeUser, ['Employee ID', 'employee_id']);
      if (empId) {
        safeAssign(payload, ['Barcode', 'barcode'], empId);
      } else {
        const userBarcode = getPropCaseInsensitive(activeUser, ['Barcode', 'barcode']);
        if (userBarcode) {
          safeAssign(payload, ['Barcode', 'barcode'], userBarcode);
        }
      }

      safeAssign(payload, ['Line Manager', 'line_manager', 'LineManager'], lineManager);

      if (attendanceType === "Checking in") {
        let prevScheduleId = '';
        if (lastRecordDateFormatted) {
          try {
            const { data: schedData } = await supabase
              .from('schedule')
              .select('*')
              .ilike('Employee', `%${empEmail}%`)
              .eq('Date', lastRecordDateFormatted)
              .limit(1);
            if (schedData && schedData.length > 0) {
              prevScheduleId = getPropCaseInsensitive(schedData[0], ['UID', 'uid', 'id', 'ID', 'schedule_id']);
            }
          } catch(e) {}
        }
        safeAssign(payload, ['Previous Attendance ID', 'previous_attendance_id', 'Previous Attendance UID', 'previous_attendance_uid'], prevAttendanceId);
        safeAssign(payload, ['Previous Schedule ID', 'previous_schedule_id', 'Previous Schedule UID', 'previous_schedule_uid'], prevScheduleId);
      }

      safeAssign(payload, [
        'Checking out from Previous Shift?',
        'Checking out from Previous Shift',
        'Checkout from previous shift?', 
        'Checkout from previous shift', 
        'checkout_from_previous_shift', 
        'checking_out_from_previous_shift'
      ], isCheckoutFromPrevShift);

      if (isCheckoutFromPrevShift) {
        let prevScheduleId = '';
        try {
          const { data: schedData } = await supabase
            .from('schedule')
            .select('*')
            .ilike('Employee', `%${empEmail}%`)
            .eq('Date', finalSubmissionDate)
            .limit(1);
          if (schedData && schedData.length > 0) {
             prevScheduleId = getPropCaseInsensitive(schedData[0], ['UID', 'uid', 'id', 'ID', 'schedule_id']);
          }
        } catch(e) {}

        safeAssign(payload, ['Previous Attendance UID', 'previous_attendance_uid', 'Previous Attendance Id', 'previous_attendance_id'], prevAttendanceId);
        safeAssign(payload, ['Previous Schedule ID', 'previous_schedule_id', 'Previous Schedule UID', 'previous_schedule_uid'], prevScheduleId);
      }

      if (attendanceType === 'Checking out') {


        if (isOvertime === 'Yes') {


          const otDateToUse = overtimeDate || finalSubmissionDate;


          const otTimeToUse = `${overtimeTime}:00`;


          


          otEmailText = `
Overtime : User requesting overtime
Real check out at : ${todayDateStr}, ${timeStr}`;


          otEmailHtml = `<strong>Overtime :</strong> User requesting overtime<br><strong>Real check out at :</strong> ${todayDateStr}, ${timeStr}<br>`;


          


          safeAssign(payload, ['Checkout Time', 'checkout_time', 'Check Out Time'], `${otDateToUse} ${otTimeToUse}`);


          safeAssign(payload, ['Overtime', 'overtime', 'is_overtime'], true);


        } else if (lateCheckoutWarning && isOvertime === 'No') {


          const manualDateToUse = overtimeDate || finalSubmissionDate;


          const manualTimeToUse = `${overtimeTime}:00`;


          


          safeAssign(payload, ['Checkout Time', 'checkout_time', 'Check Out Time'], `${manualDateToUse} ${manualTimeToUse}`);


        }


      }

      const gasUploadPromise = fetch('https://script.google.com/macros/s/AKfycby28F424Ikd21T4yf0MkGFXdQvgSBKJWXYO5-dQ582lOSxH-kxau6myCtGjulEUleo0RA/exec', {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          fileName: `${empEmail.split('@')[0]}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          base64: base64Data,
          folderId: '1U3UqXug82LJNCjvJgPLs1KLsh9Q6xrf4'
        })
      }).then(res => res.json());

      const gasUploadResult = await gasUploadPromise;
      const photoUrl = (gasUploadResult.url || gasUploadResult.id)
        ? `https://drive.google.com/thumbnail?id=${gasUploadResult.id || gasUploadResult.url.match(/id=([^&]+)/)?.[1]}&sz=w1000`
        : '';
        
      const rawShareLink = gasUploadResult.url || photoUrl;
      payload.Image = photoUrl;
      safeAssign(payload, ['Link', 'link', 'Link Google Drive'], rawShareLink);

      const mailtoSubject = `Attendance Request ${finalSubmissionDate} - ${empName}`;
      const emailBodyText = `Hi,

Please see below the Attendance Request.

Request Details:
-----------------
Employee name : ${empName}
Date : ${finalSubmissionDate}
Time : ${timeStr}
Action : ${attendanceType}
Reason: ${reason}
${otEmailText}
Photo : ${photoUrl}`;
      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hris.arratechs.com';
      const approvalUrl = `${originUrl}/approval.html`;
      
      const emailBodyHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
            <p>Hi,</p>
            <p>Please see below the Attendance Request.</p>
            <p><strong>Request Details:</strong><br>-----------------</p>
            <p>
                <strong>Employee name :</strong> ${empName}<br>
                <strong>Date :</strong> ${finalSubmissionDate}<br>
                <strong>Time :</strong> ${timeStr}<br>
                <strong>Action :</strong> ${attendanceType}<br>
                <strong>Reason:</strong> ${reason}<br>
                ${otEmailHtml}<strong>Photo :</strong> <a href="${photoUrl}">View Photo</a>
            </p>
            <p style="margin-top: 20px;">
                <a href="${approvalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Go to Approval Page
                </a>
            </p>
        </div>
      `;

      const supabasePromise = supabase.from('attendance').insert([payload]);
      
      const emailPromise = fetch('https://script.google.com/macros/s/AKfycby28F424Ikd21T4yf0MkGFXdQvgSBKJWXYO5-dQ582lOSxH-kxau6myCtGjulEUleo0RA/exec', {
        method: 'POST',
        body: JSON.stringify({
          action: "sendEmail",
          to: lineManager,
          fromEmail: empEmail, 
          subject: mailtoSubject,
          body: emailBodyText,
          htmlBody: emailBodyHtml
        })
      });

      const [supabaseResult] = await Promise.all([supabasePromise, emailPromise]);
      if (supabaseResult.error) throw supabaseResult.error;

      if (attendanceType === 'Checking out') {
        updateAttendanceRequestsBadgeState(true);
      }

      alert('Presensi berhasil dicatat dan permohonan telah terkirim!');
      closeModal();
      setReason('');
      setIsOvertime('No');
      fetchAttendanceData(activeUser);

    } catch (err) {
      alert('Gagal mencatat presensi: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const renderScheduleText = () => {
    if (hasCheckedOutToday) {
      return (
        <>
          Attendance disabled: You have <strong className="text-red-500 font-bold">already checked out</strong> today.
        </>
      );
    }

    if (lateCheckoutWarning && missedCheckoutList.length > 0) {
      return `Notice: You haven't checked out from previous shift (${formatScheduleDate(missedCheckoutList[0].date)}).`;
    }
    
    if (isTodayCheckInActive) {
      return (
        <>
          Latest record today is <strong className="text-teal-600 font-bold">Checking In</strong>. Button is active for <strong className="text-blue-600 font-bold">Checking Out</strong>.
        </>
      );
    }

    if (!todaySchedule) {
      return "Checking today's work schedule status...";
    }
    if (todaySchedule.type === 'No Schedule' || todaySchedule.type === 'Error') {
      return "No schedule found for today.";
    }
    const shiftType = getPropCaseInsensitive(todaySchedule, ['Schedule Type', 'schedule_type', 'tipe'], 'Working Day');
    const shiftCode = getPropCaseInsensitive(todaySchedule, ['Shift', 'shift_code'], 'M9');
    const startTime = getPropCaseInsensitive(todaySchedule, ['Schedule Start Time', 'start_time'], '09:00');
    const endTime = getPropCaseInsensitive(todaySchedule, ['Schedule End Time', 'end_time'], '18:00');

    return (
      <>
        Today is <strong className="text-teal-600 font-bold">{shiftType}</strong>. Shift: {shiftCode}, <strong className="text-teal-600 font-bold">Start Time: {startTime}, End Time: {endTime}</strong>. You can record attendance.
      </>
    );
  };

  const getAttendanceTypeLabel = () => {
    if (lateCheckoutWarning) return "Checking out";
    if (isTodayCheckInActive) return "Checking out";
    if (attendanceRecords.length > 0) {
      const latestType = (getPropCaseInsensitive(attendanceRecords[0], ['Are you checking out or Checking in?', 'Type', 'type', 'status']) || '').toLowerCase();
      if (latestType.includes('in') && !latestType.includes('out')) return "Checking out";
    }
    return "Checking in";
  };

  // CHECK LOGIC FOR BUTTON RENDERING
  const isWorkingDay = todaySchedule && todaySchedule.type !== 'No Schedule' && todaySchedule.type !== 'Error' && getPropCaseInsensitive(todaySchedule, ['Schedule Type', 'schedule_type', 'tipe'], 'Working Day').toLowerCase() === 'working day';

  let latestIsCheckingIn = false;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const latestType = (getPropCaseInsensitive(attendanceRecords[0], ['Are you checking out or Checking in?', 'Type', 'type', 'status']) || '').toLowerCase();
    latestIsCheckingIn = latestType.includes('in') && !latestType.includes('out');
  }

  const canShowRecordButton = isWorkingDay || latestIsCheckingIn;

  return (
    <div className="w-full text-gray-800 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 sm:mb-5 border-b border-gray-200 gap-3 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Attendance Records</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {renderScheduleText()}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {canShowRecordButton && (
              <button 
                onClick={handleOpenModal} 
                disabled={hasCheckedOutToday}
                className={`hidden sm:flex px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition items-center gap-1.5 active:scale-95 ${
                  hasCheckedOutToday 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Record Attendance
              </button>
            )}
            <button 
              onClick={() => { fetchAttendanceData(activeUser); fetchTodaySchedule(activeUser); }} 
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

        {canShowRecordButton && (
          <div className="sm:hidden mb-4">
            <button 
              onClick={handleOpenModal} 
              disabled={hasCheckedOutToday}
              className={`w-full py-2.5 px-4 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 ${
                hasCheckedOutToday 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Record Attendance
            </button>
          </div>
        )}

        {missedCheckoutList.length > 0 && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-xs">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-bold text-red-800">Action Required: Missed Checkout</h4>
                <p className="mt-0.5 text-xs text-red-700 mb-1.5">Your latest past attendance is :</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-red-700">
                  {missedCheckoutList.map((m, idx) => (
                    <li key={idx}>
                      <strong>{formatScheduleDate(m.date)}</strong> - <span className="font-bold underline text-red-600">(Missing Checkout)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-end items-center mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs font-medium text-gray-500 mr-1 sm:mr-2">
                Page <strong className="text-gray-800">{currentPage}</strong> of <strong className="text-gray-800">{totalPages}</strong>
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-2.5 py-1.5 bg-white border border-gray-300 text-gray-600 font-semibold text-[10px] sm:text-xs rounded-lg shadow-sm transition flex items-center gap-1 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:text-blue-600'}`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-2.5 py-1.5 bg-white border border-gray-300 text-gray-600 font-semibold text-[10px] sm:text-xs rounded-lg shadow-sm transition flex items-center gap-1 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:text-blue-600'}`}
              >
                Next
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 table-fixed">
            <thead className="bg-gray-50 text-[11px] font-semibold uppercase text-gray-700 border-b border-gray-200">
              <tr>
                <th className="w-[60%] sm:w-[40%] px-4 py-3 sm:px-6 sm:py-3.5">Schedule Date</th>
                <th className="w-[40%] sm:w-[30%] px-3 py-3 sm:px-6 sm:py-3.5 text-center">Check In / Out</th>
                <th className="hidden sm:table-cell w-[30%] px-3 py-3 sm:px-6 sm:py-3.5 text-center">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="3" className="text-center py-8 text-gray-400 italic">Loading records...</td></tr>
              ) : attendanceRecords.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-8 text-gray-400 italic">No attendance records found.</td></tr>
              ) : (
                currentRecords.map((r, i) => {
                  const typeVal = getPropCaseInsensitive(r, ['Are you checking out or Checking in?', 'Type', 'type', 'status'], 'Checking in');
                  const isCheckOut = typeVal.toLowerCase().includes('out') || typeVal.toLowerCase().includes('pulang');
                  
                  const badgeClass = isCheckOut 
                    ? "bg-red-100 text-red-700 border border-red-200" 
                    : "bg-green-100 text-green-700 border border-green-200";

                  return (
                    <tr key={i} onClick={() => setSelectedRecord(r)} className="hover:bg-blue-50/60 transition cursor-pointer text-xs sm:text-sm">
                      <td className="px-4 py-3.5 sm:px-6 sm:py-4 font-semibold text-gray-800 truncate">
                        {formatScheduleDate(getPropCaseInsensitive(r, ['Date', 'date', 'tanggal', 'CreatedDate']))}
                      </td>
                      <td className="px-3 py-3.5 sm:px-6 sm:py-4 text-center truncate">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${badgeClass} inline-block shadow-xs`}>
                          {typeVal}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-3.5 sm:px-6 sm:py-4 text-center text-gray-800 font-medium truncate">
                        {formatIndoDateTime(r)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && !hasCheckedOutToday && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Attendance Form</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
              {lateCheckoutWarning && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 shadow-xs mb-3">
                  <strong className="font-bold flex items-center gap-1 mb-1">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> 
                    Notice:
                  </strong>
                  <p className="mb-1">You haven't checked out from the previous shift. This checkout will be automatically linked to your last check-in.</p>
                  <p className="font-bold">Last Checking In: {lastCheckInTime}</p>
                </div>
              )}

              {getAttendanceTypeLabel() === 'Checking out' && (
                <div className="mb-3 p-3 border border-gray-200 rounded-xl bg-gray-50 shadow-xs">
                  <p className="text-xs font-bold text-gray-700 mb-2">Are you overtime?</p>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1 cursor-pointer text-xs">
                      <input type="radio" name="ot" value="Yes" checked={isOvertime === 'Yes'} onChange={() => setIsOvertime('Yes')} className="text-blue-600 focus:ring-blue-500" /> Yes
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-xs">
                      <input type="radio" name="ot" value="No" checked={isOvertime === 'No'} onChange={() => setIsOvertime('No')} className="text-blue-600 focus:ring-blue-500" /> No
                    </label>
                  </div>
                  
                  {(isOvertime === 'Yes' || (isOvertime === 'No' && lateCheckoutWarning)) && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          {isOvertime === 'Yes' ? 'Overtime Date' : 'Actual Checkout Date'}
                        </label>
                        <input type="date" value={overtimeDate} onChange={e => setOvertimeDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          {isOvertime === 'Yes' ? 'Overtime Time' : 'Actual Checkout Time'}
                        </label>
                        <input type="time" value={overtimeTime} onChange={e => setOvertimeTime(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Attendance Type</label>
                <input 
                  type="text" 
                  readOnly 
                  value={getAttendanceTypeLabel()} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold text-sm focus:outline-none shadow-xs ${
                    getAttendanceTypeLabel() === 'Checking out' ? 'text-blue-600' : 'text-green-700'
                  }`} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Time</label>
                <input type="text" readOnly value={formatIndoDateTime(new Date())} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm focus:outline-none shadow-xs" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Current Location <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={autoFetchLocation} 
                      className="p-1 hover:bg-gray-100 rounded text-blue-600 transition" 
                      title="Refresh Location"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <span className="text-[10px] font-bold text-gray-500">GPS Required</span>
                  </div>
                </div>
                {isFakeLocation && <p className="text-[10px] text-red-500 mb-1 font-bold">Fake/Mock location detected! Please use real GPS.</p>}
                {!locationText.includes(',') && !isFakeLocation && <p className="text-[10px] text-red-500 mb-1">Please enable device location (GPS) on your browser.</p>}
                <input type="text" readOnly value={locationText} placeholder="Waiting for location access..." className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-xs focus:outline-none shadow-xs ${isFakeLocation ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-600'}`} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Selfie Photo Proof (Camera) <span className="text-red-500">*</span></label>
                <div className="relative w-full h-48 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  {!photoData ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                  ) : (
                    <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
                  )}
                  <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                <div className="mt-2">
                  {!photoData ? (
                    <button type="button" onClick={capturePhoto} className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold border border-blue-200 rounded-lg text-xs flex justify-center items-center gap-1.5 shadow-xs transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Take Photo
                    </button>
                  ) : (
                    <button type="button" onClick={startCamera} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold border border-gray-200 rounded-lg text-xs flex justify-center items-center gap-1.5 shadow-xs transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      Retake Photo
                    </button>
                  )}
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-1.5">Live camera capture is strictly required to submit attendance.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea rows="2" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason (required)..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"></textarea>
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={closeModal} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-xs hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAttendanceSubmit} disabled={formSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center min-w-[120px] disabled:opacity-50">
                {formSubmitting ? "Submitting..." : "Submit Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedRecord(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="mb-3">
              {(() => {
                const statusVal = selectedRecord.Status || 'Pending Approval';
                const isApproved = statusVal.toLowerCase() === 'approved';
                const statusClass = isApproved 
                  ? "bg-green-100 text-green-700 border-green-200" 
                  : "bg-orange-100 text-orange-600 border-orange-200";
                return (
                  <span className={`font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${statusClass}`}>
                    {statusVal}
                  </span>
                );
              })()}
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500">Employee ID: <strong className="text-gray-800">{activeUser?.['Employee ID'] || activeUser?.employee_id || '-'}</strong></p>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">{activeUser?.Name || activeUser?.name || 'Employee Name'}</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Date</span>
                <strong className="text-gray-900">{formatScheduleDate(getPropCaseInsensitive(selectedRecord, ['Date', 'date', 'tanggal', 'CreatedDate']))}</strong>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Shift</span>
                <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded text-[11px]">{selectedRecord.Shift || 'M9'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Are you checking out or Checking in?</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  getPropCaseInsensitive(selectedRecord, ['Are you checking out or Checking in?', 'Type', 'type', 'status']).toLowerCase().includes('out') ||
                  getPropCaseInsensitive(selectedRecord, ['Are you checking out or Checking in?', 'Type', 'type', 'status']).toLowerCase().includes('pulang')
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {getPropCaseInsensitive(selectedRecord, ['Are you checking out or Checking in?', 'Type', 'type', 'status'], 'Checking in')}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Time</span>
                <strong className="text-gray-900 text-sm tracking-tight">{formatIndoDateTime(selectedRecord)}</strong>
              </div>
              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Location</span>
                <span className="text-blue-600 flex items-center gap-1 text-[11px] text-right max-w-[60%]">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {getPropCaseInsensitive(selectedRecord, ['Location', 'location', 'lokasi', 'alamat'], '-')}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-gray-500 font-medium block mb-2">Photo</span>
                <div className="flex justify-center">
                  {(() => {
                    const imgSrc = getPropCaseInsensitive(selectedRecord, ['Image', 'image', 'Photo', 'photo']);
                    const fallbackLink = getPropCaseInsensitive(selectedRecord, ['Link', 'link', 'Link Google Drive']);
                    const targetSrc = imgSrc || fallbackLink;

                    if (targetSrc) {
                      return (
                        <a href={fallbackLink || targetSrc} target="_blank" rel="noopener noreferrer" className="block text-center hover:opacity-80 transition">
                          <img 
                            src={targetSrc} 
                            alt="Proof" 
                            className="w-40 h-auto object-cover rounded-xl shadow-xs border border-gray-200 mx-auto" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'block';
                              }
                            }}
                          />
                          <span className="hidden text-blue-600 font-bold underline text-[11px] mt-2">
                            Image blocked by Drive. Click to view.
                          </span>
                        </a>
                      );
                    }
                    return <span className="text-gray-400 italic text-[11px]">No photo proof</span>;
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={() => setSelectedRecord(null)} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}