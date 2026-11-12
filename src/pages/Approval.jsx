import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router-dom';

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

const formatDateTimeDisplay = (dateVal, lang = 'en') => {
  const parsed = parseFlexibleDate(dateVal);
  if (!parsed) return (dateVal && dateVal !== '-') ? String(dateVal) : '-';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const d = String(parsed.getDate()).padStart(2, '0');
  const m = parsed.toLocaleDateString(locale, { month: 'short' });
  const y = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y} ${hh}:${mm}`;
};

const formatDateDisplay = (dateVal, lang = 'en') => {
  const parsed = parseFlexibleDate(dateVal);
  if (!parsed) return (dateVal && dateVal !== '-') ? String(dateVal) : '-';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const d = String(parsed.getDate()).padStart(2, '0');
  const m = parsed.toLocaleDateString(locale, { month: 'short' });
  const y = parsed.getFullYear();
  return `${d} ${m} ${y}`;
};

const formatTimeDisplay = (timeVal) => {
  if (!timeVal || timeVal === '-') return '';
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

const getAttendanceLocation = (req) => {
  if (!req) return null;

  const latVal = getPropCaseInsensitive(req, [
    'latitude', 'lat', 'Latitude', 'Lat', 'clock_in_latitude', 'clock_out_latitude', 'lat_in', 'lat_out'
  ]);
  const lngVal = getPropCaseInsensitive(req, [
    'longitude', 'long', 'lng', 'Longitude', 'Long', 'Lng', 'clock_in_longitude', 'clock_out_longitude', 'long_in', 'long_out', 'lng_in', 'lng_out'
  ]);

  if (latVal && lngVal && !isNaN(parseFloat(latVal)) && !isNaN(parseFloat(lngVal))) {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    return {
      lat,
      lng,
      query: `${lat}, ${lng}`,
      embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&hl=id&z=15&output=embed`,
      directUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };
  }

  const locStr = getPropCaseInsensitive(req, [
    'Location', 'location', 'lokasi', 'Lokasi',
    'Coordinates', 'coordinates', 'koordinat', 'Koordinat',
    'maps', 'Maps', 'maps_url', 'Maps URL', 'google_maps', 'Google Maps',
    'map', 'Map', 'gps', 'GPS'
  ]);

  if (locStr && locStr !== '-' && locStr !== 'null' && locStr !== 'undefined') {
    const coordMatch = locStr.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      return {
        lat,
        lng,
        query: `${lat}, ${lng}`,
        embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&hl=id&z=15&output=embed`,
        directUrl: `https://www.google.com/maps?q=${lat},${lng}`
      };
    }

    if (locStr.startsWith('http://') || locStr.startsWith('https://')) {
      return {
        query: locStr,
        embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(locStr)}&hl=id&z=15&output=embed`,
        directUrl: locStr
      };
    }

    return {
      query: locStr,
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(locStr)}&hl=id&z=15&output=embed`,
      directUrl: `https://www.google.com/maps?q=${encodeURIComponent(locStr)}`
    };
  }

  return null;
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

const getMinutesFromMidnight = (timeVal, baseDateObj) => {
  if (!timeVal) return null;
  const str = String(timeVal).trim();
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[4].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const timeMatch = str.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$)/);
  if (timeMatch && !str.includes('T')) {
    return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  }
  const parsed = parseFlexibleDate(str);
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.getHours() * 60 + parsed.getMinutes();
  }
  return null;
};

const calculateDurationWorked = (inVal, outVal, baseDate) => {
  const inMins = getMinutesFromMidnight(inVal, baseDate);
  const outMins = getMinutesFromMidnight(outVal, baseDate);
  if (inMins === null || outMins === null) return null;
  let diffMins = outMins - inMins;
  if (diffMins < 0) diffMins += 24 * 60;
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  return { hours, minutes, totalMinutes: diffMins };
};

const calculateMinuteDiff = (outVal, endVal, baseDate) => {
  const outMins = getMinutesFromMidnight(outVal, baseDate);
  const endMins = getMinutesFromMidnight(endVal, baseDate);
  if (outMins === null || endMins === null) return 0;
  let diff = outMins - endMins;
  if (diff < -720) diff += 24 * 60;
  return Math.max(0, diff);
};

const isPendingApprovalStatus = (status) => {
  if (!status || status === '-' || status === 'null') return false;
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
  if (!status || status === '-' || status === 'null') return false;
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

const isRejectedStatus = (status) => {
  if (!status || status === '-' || status === 'null') return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return (
    s === 'rejected' ||
    s === 'reject' ||
    s === 'tolak' ||
    s === 'ditolak' ||
    s === 'cancelled' ||
    s === 'cancel' ||
    s === 'batal' ||
    s === 'dibatalkan' ||
    s.includes('reject') ||
    s.includes('cancel') ||
    s.includes('tolak') ||
    s.includes('batal')
  );
};

const getReqTypeColor = (reqType, category) => {
  if (!reqType) return 'text-gray-800';
  const typeLower = String(reqType).toLowerCase();
  
  if (category === 'Leave') {
    if (typeLower.includes('day off') || typeLower.includes('extra off') || typeLower.includes('annual leave')) {
      return 'text-orange-600';
    } else if (typeLower.includes('sick') || typeLower.includes('maternity') || typeLower.includes('compassionate')) {
      return 'text-purple-600';
    }
  } else if (category === 'Attendance') {
    if (typeLower.includes('in')) {
      return 'text-green-600';
    } else if (typeLower.includes('out')) {
      return 'text-orange-600';
    }
  }
  return 'text-blue-700';
};

const getRowStatus = (row) => {
  if (!row) return '';
  const candidateKeys = [
    'Status',
    'status',
    'Approval Status',
    'approval_status',
    'Status Approval',
    'status_approval',
    'Approval',
    'approval',
    'Request Status',
    'request_status',
    'Status Pengajuan',
    'status_pengajuan',
    'attendance_status',
    'Attendance Status'
  ];

  for (const k of candidateKeys) {
    const val = getPropCaseInsensitive(row, [k], '');
    if (val && val !== '-' && val !== 'null' && val !== 'undefined') {
      if (isPendingApprovalStatus(val) || isApprovedStatus(val) || isRejectedStatus(val)) {
        return val;
      }
    }
  }

  for (const k of candidateKeys) {
    const val = getPropCaseInsensitive(row, [k], '');
    if (val && val !== '-' && val !== 'null' && val !== 'undefined') {
      return val;
    }
  }

  return '';
};

const matchesLineManager = (record, targetEmail, targetName = '', extraKeys = []) => {
  if (!record) return false;
  const mgrVal = getPropCaseInsensitive(record, [
    'Line Manager work email',
    'line_manager_work_email',
    'Line Manager Email',
    'line_manager_email',
    'Line Manager',
    'line_manager',
    'Line_Manager',
    'linemanager',
    'manager_email',
    'Manager Email',
    'Manager',
    'manager',
    'Approver Email',
    'approver_email',
    'Approver',
    'approver',
    'Atasan Email',
    'atasan_email',
    'Atasan',
    'atasan',
    'atasan_langsung',
    'Atasan Langsung',
    'approval_line_manager'
  ], '').trim().toLowerCase();

  if (!mgrVal || mgrVal === '-' || mgrVal === 'null' || mgrVal === 'undefined') {
    return false;
  }

  const cleanMgrVal = mgrVal.replace(/<|>|\(|\)/g, ' ').trim();

  const allKeys = new Set([
    (targetEmail || '').trim().toLowerCase(),
    (targetName || '').trim().toLowerCase(),
    (targetEmail || '').includes('@') ? (targetEmail || '').split('@')[0].trim().toLowerCase() : '',
    ...extraKeys.map(k => (k || '').trim().toLowerCase())
  ]);

  for (const key of allKeys) {
    if (key && key.length >= 2) {
      if (
        cleanMgrVal === key ||
        mgrVal === key ||
        (key.includes('@') && cleanMgrVal.includes(key)) ||
        (cleanMgrVal.includes('@') && key.includes(cleanMgrVal))
      ) {
        return true;
      }
    }
  }

  return false;
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

const SHIFT_OPTIONS = [
  { label: "M1", value: "M1", start: "01:00" },
  { label: "M2", value: "M2", start: "02:00" },
  { label: "M3", value: "M3", start: "03:00" },
  { label: "M4", value: "M4", start: "04:00" },
  { label: "M5", value: "M5", start: "05:00" },
  { label: "M6", value: "M6", start: "06:00" },
  { label: "M7", value: "M7", start: "07:00" },
  { label: "M8", value: "M8", start: "08:00" },
  { label: "M9", value: "M9", start: "09:00" },
  { label: "M10", value: "M10", start: "10:00" },
  { label: "M11", value: "M11", start: "11:00" },
  { label: "A12", value: "A12", start: "12:00" },
  { label: "A13", value: "A13", start: "13:00" },
  { label: "A14", value: "A14", start: "14:00" },
  { label: "A15", value: "A15", start: "15:00" },
  { label: "A16", value: "A16", start: "16:00" },
  { label: "A17", value: "A17", start: "17:00" },
  { label: "E18", value: "E18", start: "18:00" },
  { label: "E19", value: "E19", start: "19:00" },
  { label: "E20", value: "E20", start: "20:00" },
  { label: "E21", value: "E21", start: "21:00" },
  { label: "E22", value: "E22", start: "22:00" },
  { label: "E23", value: "E23", start: "23:00" }
];

export default function Approval({ currentUser: propCurrentUser }) {
  const context = useOutletContext() || {};
  const currentLang = context.currentLang || 'en';
  const lang = currentLang; // Fix for ReferenceError: lang is not defined

  const t = currentLang === 'id' ? {
    title: 'Permintaan Persetujuan',
    manager: 'Atasan Langsung:',
    refresh: 'Muat Ulang',
    loading: 'Memuat...',
    tabLeave: 'Cuti',
    tabAttendance: 'Absensi',
    filterPending: 'Menunggu',
    filterApproved: 'Disetujui',
    filterRejected: 'Ditolak',
    filterAll: 'Semua Status',
    empFilterAll: 'Semua Karyawan',
    colEmp: 'Karyawan',
    colReq: 'Tipe Permintaan',
    colLeavePeriod: 'Periode Cuti',
    colAttTime: 'Waktu Absensi',
    colStatus: 'Status',
    colAction: 'Aksi',
    noRequests: 'Tidak ada permintaan yang ditemukan',
    noRecordsDesc: 'Tidak ada catatan yang sesuai dengan filter Anda.',
    btnCancel: 'Batal',
    btnApproveCancel: 'Setujui Pembatalan',
    btnReject: 'Tolak',
    btnApprove: 'Setujui',
    sumAnn: 'Cuti Tahunan:',
    sumDop: 'Pembayaran Libur:',
    sumEo: 'Libur Ekstra:',
    calTitle: 'Kalender Tim',
    calDescAll: 'Menampilkan jadwal semua anggota tim',
    calDescOne: 'Menampilkan jadwal untuk:',
    btnThisMonth: 'Bulan Ini',
    statOff: 'Libur',
    statWork: 'Kerja',
    statSick: 'Sakit/Lain',
    statLeave: 'Cuti',
    daysOfWeek: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
    monthsFull: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    btnBulkEdit: 'Edit Masal (1 Bulan)',
    bulkTitle: 'Edit Jadwal Masal',
    bulkEmp: 'Karyawan:',
    bulkMonth: 'Bulan:',
    bulkTypeWork: 'Hari Kerja',
    bulkTypeOff: 'Libur',
    bulkLocked: 'Dikunci',
    bulkCannotEdit: 'Tidak bisa mengedit cuti yang dijadwalkan.',
    bulkAutoInfo8: 'Waktu selesai otomatis (berdasarkan 8 jam).',
    bulkAutoInfo9: 'Waktu selesai otomatis (berdasarkan 9 jam).',
    btnSaveSchedule: 'Simpan Jadwal',
    btnSaving: 'Menyimpan...',
    teamModalTitle: 'Jadwal Tim:',
    badgeWork: 'Hari Kerja',
    badgeSick: 'Sakit / Melahirkan',
    badgeOff: 'Hari Libur',
    badgeLeave: 'Cuti Tahunan',
    editModalTitle: 'Edit Jadwal Tanggal',
    editModalSub: 'Perbarui shift atau tipe kerja karyawan',
    lblDate: 'Tanggal (Hanya Baca)',
    lblBarcode: 'Barcode Karyawan',
    lblName: 'Nama Karyawan',
    lblType: 'Tipe Hari',
    lblShift: 'Shift Kerja',
    lblShiftHint: 'Angka belakang menunjukkan jam mulai',
    lblAutoCalc: 'Kalkulasi Jam Kerja Otomatis',
    lblStart: 'Waktu Mulai:',
    lblEnd: 'Waktu Selesai:',
    msgOffDay: 'Status Libur tidak memerlukan jam kerja (Mulai & Selesai diisi \'-\').',
    reqDetailTitle: 'Detail Permintaan',
    reqEmpInfo: 'Informasi Karyawan',
    reqCurrentStatus: 'Status Saat Ini',
    reqAttTime: 'Waktu Absensi',
    reqFromDate: 'Dari Tanggal',
    reqToDate: 'Sampai Tanggal',
    reqLastEdit: 'Terakhir Diedit',
    reqTotalDays: 'Total Hari Diminta',
    reqFinalBal: 'Sisa Saldo Final',
    reqReason: 'Alasan / Catatan',
    reqAttLoc: 'Lokasi / Peta Absensi',
    reqOpenMap: 'Buka di Google Maps',
    reqNoLoc: 'Tidak ada koordinat lokasi untuk absensi ini',
    reqProof: 'Lampiran / Bukti',
    reqClickEnlarge: 'Klik untuk memperbesar gambar',
    reqProofDesc: 'Pratinjau foto absensi / dokumen',
    confRejectTitle: 'Konfirmasi Penolakan Permintaan',
    confRejectDesc: 'Anda akan menolak permintaan',
    confRejectFrom: 'dari',
    confReasonLbl: 'Alasan Penolakan',
    confReasonOpt: '(opsional)',
    confReasonPh: 'misal: Bukti tidak lengkap / konflik jadwal...',
    btnRejectReq: 'Tolak Permintaan',
    previewTitle: 'Pratinjau Lampiran',
    errFilterFirst: 'Silakan pilih satu karyawan dari filter (bukan Semua Karyawan) untuk mengedit jadwal masal.'
  } : {
    title: 'Approval Requests',
    manager: 'Line Manager:',
    refresh: 'Refresh',
    loading: 'Loading...',
    tabLeave: 'Leave',
    tabAttendance: 'Attendance',
    filterPending: 'Pending',
    filterApproved: 'Approved',
    filterRejected: 'Rejected',
    filterAll: 'All Status',
    empFilterAll: 'All Employees',
    colEmp: 'Employee',
    colReq: 'Request Type',
    colLeavePeriod: 'Leave Period',
    colAttTime: 'Attendance Time',
    colStatus: 'Status',
    colAction: 'Action',
    noRequests: 'No requests found',
    noRecordsDesc: 'There are no records matching your current filter.',
    btnCancel: 'Cancel',
    btnApproveCancel: 'Approve Cancel',
    btnReject: 'Reject',
    btnApprove: 'Approve',
    sumAnn: 'Annual Leave:',
    sumDop: 'Day Off Payment:',
    sumEo: 'Extra Off:',
    calTitle: 'Team Calendar',
    calDescAll: 'Showing schedules for all team members',
    calDescOne: 'Showing schedule for:',
    btnThisMonth: 'This Month',
    statOff: 'Day Off',
    statWork: 'Work',
    statSick: 'Sick/Oth',
    statLeave: 'Leave',
    daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthsFull: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    btnBulkEdit: 'Bulk Edit (1 Month)',
    bulkTitle: 'Bulk Edit Schedule',
    bulkEmp: 'Employee:',
    bulkMonth: 'Month:',
    bulkTypeWork: 'Working Day',
    bulkTypeOff: 'Day Off',
    bulkLocked: 'Locked',
    bulkCannotEdit: 'Cannot edit scheduled leave.',
    bulkAutoInfo8: 'End time auto-calculates (8 hours).',
    bulkAutoInfo9: 'End time auto-calculates (9 hours).',
    btnSaveSchedule: 'Save Schedule',
    btnSaving: 'Saving...',
    teamModalTitle: 'Team Schedule:',
    badgeWork: 'Working Day',
    badgeSick: 'Sick / Maternity',
    badgeOff: 'Day Off',
    badgeLeave: 'Leave',
    editModalTitle: 'Edit Schedule Date',
    editModalSub: 'Update employee shift or type',
    lblDate: 'Date (Read-Only)',
    lblBarcode: 'Employee Barcode',
    lblName: 'Employee Name',
    lblType: 'Day Type',
    lblShift: 'Work Shift',
    lblShiftHint: 'Trailing number indicates start hour',
    lblAutoCalc: 'Auto Calculate Work Hours',
    lblStart: 'Start Time:',
    lblEnd: 'End Time:',
    msgOffDay: 'Day Off status requires no hours (Start & End set to \'-\').',
    reqDetailTitle: 'Request Detail',
    reqEmpInfo: 'Employee Information',
    reqCurrentStatus: 'Current Status',
    reqAttTime: 'Attendance Time',
    reqFromDate: 'From Date',
    reqToDate: 'To Date',
    reqLastEdit: 'Last Edit Date',
    reqTotalDays: 'Total Days Requested',
    reqFinalBal: 'Remaining / Final Balance',
    reqReason: 'Reason / Request Notes',
    reqAttLoc: 'Attendance Location / Map',
    reqOpenMap: 'Open in Google Maps',
    reqNoLoc: 'No location coordinates recorded for this attendance',
    reqProof: 'Attachment / Proof',
    reqClickEnlarge: 'Click to enlarge preview',
    reqProofDesc: 'Attendance photo / document preview',
    confRejectTitle: 'Confirm Request Rejection',
    confRejectDesc: 'You are about to reject the',
    confRejectFrom: 'from',
    confReasonLbl: 'Rejection Reason',
    confReasonOpt: '(optional)',
    confReasonPh: 'e.g. Incomplete proof / conflict with schedule...',
    btnRejectReq: 'Reject Request',
    previewTitle: 'Attachment Preview',
    errFilterFirst: 'Please select a specific employee from the filter (not All Employees) to edit bulk schedule.'
  };

  const [sessionUser] = useState(() => {
    const possibleKeys = ['hris_session_data', 'currentUser', 'user', 'hris_user'];
    for (const k of possibleKeys) {
      const saved = localStorage.getItem(k);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
      }
    }
    return null;
  });

  const currentUser = propCurrentUser || sessionUser;

  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('leave');

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamScheduleRecords, setTeamScheduleRecords] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [teamScheduleModalData, setTeamScheduleModalData] = useState(null);

  const [statusTab, setStatusTab] = useState('pending');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const employeeDropdownRef = useRef(null); 
  const [showFilterAlert, setShowFilterAlert] = useState(false); 

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [itemToReject, setItemToReject] = useState(null);
  
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditEmployee, setBulkEditEmployee] = useState(null);
  const [bulkEditData, setBulkEditData] = useState([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const [singleScheduleEdit, setSingleScheduleEdit] = useState(null);
  const [isSavingSingleSchedule, setIsSavingSingleSchedule] = useState(false);

  const userWorkEmail = useMemo(() => {
    return (
      getPropCaseInsensitive(currentUser, [
        'Employee work email',
        'employee_work_email',
        'work_email',
        'work email',
        'Work Email',
        'email',
        'Email',
        'user_uid',
        'USER_UID'
      ]) || ''
    ).trim().toLowerCase();
  }, [currentUser]);

  const topNavEmail = useMemo(() => {
    return (
      currentUser?.email ||
      currentUser?.Email ||
      currentUser?.USER_UID ||
      currentUser?.['Employee work email'] ||
      currentUser?.employee_work_email ||
      userWorkEmail ||
      ''
    ).trim().toLowerCase();
  }, [currentUser, userWorkEmail]);

  const userName = useMemo(() => {
    return getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name'], userWorkEmail.split('@')[0] || 'Manager');
  }, [currentUser, userWorkEmail]);

  const [actualUserWorkEmail, setActualUserWorkEmail] = useState('');
  const [actualUserName, setActualUserName] = useState('');

  const refreshAllData = useCallback(async () => {
    if (!userWorkEmail && !topNavEmail && !userName) return;
    setLoading(true);

    try {
      let subordinateEmails = [];
      const subordinateIdentifiers = new Set();
      const employeeDirectoryMap = new Map();
      let realWorkEmail = userWorkEmail || topNavEmail;
      let realName = userName;

      try {
        const { data: dirData, error: dirErr } = await supabase
          .from('employee_directory')
          .select('*')
          .limit(2500);

        if (dirErr) {
          console.warn("[Approval] Error fetching employee_directory:", dirErr.message);
        } else if (dirData) {
          const cleanUserWorkEmail = (userWorkEmail || topNavEmail || '').trim().toLowerCase();
          const userPrefix = cleanUserWorkEmail.includes('@') ? cleanUserWorkEmail.split('@')[0] : cleanUserWorkEmail;

          const myProfile = dirData.find(emp => {
            const empEmail = (getPropCaseInsensitive(emp, ['Email', 'email', 'user_uid']) || '').trim().toLowerCase();
            const empWorkEmail = (getPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']) || '').trim().toLowerCase();
            const empName = (getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name']) || '').trim().toLowerCase();

            const empEmailPrefix = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;
            const empWorkPrefix = empWorkEmail.includes('@') ? empWorkEmail.split('@')[0] : empWorkEmail;

            if (cleanUserWorkEmail) {
              if (empEmail === cleanUserWorkEmail || empWorkEmail === cleanUserWorkEmail) return true;
              if (userPrefix && (empEmailPrefix === userPrefix || empWorkPrefix === userPrefix)) return true;
            }
            if (userName && empName === userName.toLowerCase()) return true;
            return false;
          });

          if (myProfile) {
            const foundWorkEmail = getPropCaseInsensitive(myProfile, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']).trim().toLowerCase();
            if (foundWorkEmail) realWorkEmail = foundWorkEmail;

            const foundName = getPropCaseInsensitive(myProfile, ['Name', 'name', 'nama', 'fullname', 'full_name']);
            if (foundName) realName = foundName;
          }

          setActualUserWorkEmail(realWorkEmail);
          setActualUserName(realName);

          const cleanRealWorkEmail = (realWorkEmail || '').trim().toLowerCase();
          const realPrefix = cleanRealWorkEmail.includes('@') ? cleanRealWorkEmail.split('@')[0] : cleanRealWorkEmail;

          const managerKeys = Array.from(new Set([
            userWorkEmail,
            topNavEmail,
            realWorkEmail,
            userPrefix,
            realPrefix,
            userName.toLowerCase(),
            realName.toLowerCase()
          ])).filter(k => k && k.length >= 2);

          dirData.forEach(emp => {
            const email = (getPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Email', 'email']) || '').trim().toLowerCase();
            const name = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], email);
            if (email) employeeDirectoryMap.set(email, name);
          });

                    const subordinates = dirData.filter(row => {
            const isManagerMatch = matchesLineManager(row, realWorkEmail, realName, managerKeys);
            const statusRaw = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
            const isStatusValid = statusRaw === 'active' || statusRaw === 'off-boarding' || statusRaw === 'off boarding';
            return isManagerMatch && isStatusValid;
          });
          
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
                uniqueMap.set(email, { 
                  email, 
                  name,
                  annual_leave_balance: getPropCaseInsensitive(emp, ['Annual Leave Balance', 'annual_leave_balance', 'Annual Leave', 'annualleave']),
                  day_off_payment_balance: getPropCaseInsensitive(emp, ['Day Off Payment Balance', 'day_off_payment_balance', 'Day Off Payment', 'dayoffbalance']),
                  extra_off_balance: getPropCaseInsensitive(emp, ['Extra Off Balance', 'extra_off_balance', 'Extra Off', 'extraoffbalance'])
                });
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

      const cleanRealWorkEmail = (realWorkEmail || '').trim().toLowerCase();
      const realPrefix = cleanRealWorkEmail.includes('@') ? cleanRealWorkEmail.split('@')[0] : cleanRealWorkEmail;
      const cleanUserWorkEmail = (userWorkEmail || topNavEmail || '').trim().toLowerCase();
      const userPrefix = cleanUserWorkEmail.includes('@') ? cleanUserWorkEmail.split('@')[0] : cleanUserWorkEmail;

      const allManagerKeys = Array.from(new Set([
        userWorkEmail,
        topNavEmail,
        realWorkEmail,
        userPrefix,
        realPrefix,
        userName.toLowerCase(),
        realName.toLowerCase()
      ])).filter(k => k && k.length >= 2);

      let myLeaves = [];
      try {
        const { data: lvData, error: lvError } = await supabase
          .from('leave_requests')
          .select('*')
          .limit(3000);

        if (lvError) {
          console.warn("[Approval] Error fetching leave_requests:", lvError.message);
        } else if (lvData) {
          myLeaves = lvData
            .filter(row => {
              const status = getRowStatus(row);
              const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status) || isRejectedStatus(status);
              const hasDirectMgr = matchesLineManager(row, realWorkEmail, realName, allManagerKeys);

              const empVal = (getPropCaseInsensitive(row, [
                'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
                'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email'
              ]) || '').trim().toLowerCase();
              const isSelf = cleanUserWorkEmail && (empVal === cleanUserWorkEmail);

              return isRelevant && hasDirectMgr && !isSelf;
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

      let myAttendance = [];
      try {
        let attData = [];

        try {
          const { data: defAtt, error: attErr } = await supabase
            .from('attendance')
            .select('*')
            .limit(3000);

          if (!attErr && defAtt) {
            attData = defAtt;
          }
        } catch (e) {
          console.warn("Failed fetching attendance data:", e);
        }

        try {
          const { data: pendingAttRows } = await supabase
            .from('attendance')
            .select('*')
            .ilike('Status', '%Pending%')
            .limit(1000);

          if (pendingAttRows && pendingAttRows.length > 0) {
            const existingIds = new Set(attData.map(r => r.id ?? `${r.Employee}_${r.Date}_${r.Status}`));
            pendingAttRows.forEach(r => {
              const rowKey = r.id ?? `${r.Employee}_${r.Date}_${r.Status}`;
              if (!existingIds.has(rowKey)) {
                attData.unshift(r);
                existingIds.add(rowKey);
              }
            });
          }
        } catch (e) {}

        if (attData && attData.length > 0) {
          myAttendance = attData
            .filter(row => {
              const status = getRowStatus(row);
              const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status) || isRejectedStatus(status);

              const empEmail = (getPropCaseInsensitive(row, [
                'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
                'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email'
              ]) || '').trim().toLowerCase();

              const hasDirectMgr = 
                matchesLineManager(row, realWorkEmail, realName, allManagerKeys) ||
                (empEmail && subordinateEmails.includes(empEmail)) ||
                (empEmail && subordinateEmails.some(sub => sub && (sub === empEmail || empEmail.includes(sub) || sub.includes(empEmail))));

              return isRelevant && hasDirectMgr;
            })
            .map(row => ({
              ...row,
              _category: 'Attendance',
              _sourceTable: 'attendance'
            }));
        }
      } catch (e) {
        console.warn("[Approval] Failed fetching attendance:", e);
      }

      let teamSched = [];
      try {
        const { data: schedData, error: schedErr } = await supabase
          .from('schedule')
          .select('*')
          .limit(5000);

        if (!schedErr && schedData) {
          teamSched = schedData.filter(row => {
            const empEmail = (getPropCaseInsensitive(row, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email', 'Employee work email']) || '').trim().toLowerCase();
            return subordinateEmails.includes(empEmail) || subordinateEmails.some(sub => empEmail.includes(sub));
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
  }, [userWorkEmail, topNavEmail, userName]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Effect to handle automatic dropdown opening and focusing
  useEffect(() => {
      if (showFilterAlert && employeeDropdownRef.current) {
          // Temporarily add a highlight to draw attention
          employeeDropdownRef.current.classList.add('ring-2', 'ring-red-400', 'ring-offset-1');
          
          // Focus the dropdown so it's ready for interaction
          employeeDropdownRef.current.focus();

          // Try to programmatically open the dropdown (standard HTML select)
          try {
             // In standard HTML, you cannot reliably trigger the visual drop-down to open programmatically
             // via JS for security/UX reasons across all browsers, but focusing it and simulating a click helps in some.
             employeeDropdownRef.current.click();
             
             // Alternatively, dispatching events sometimes helps on specific browser implementations
             const event = new MouseEvent('mousedown', {
                 view: window,
                 bubbles: true,
                 cancelable: true
             });
             employeeDropdownRef.current.dispatchEvent(event);
          } catch(e) {}
          
          // Remove the highlight after a short delay
          const timer = setTimeout(() => {
              if (employeeDropdownRef.current) {
                  employeeDropdownRef.current.classList.remove('ring-2', 'ring-red-400', 'ring-offset-1');
              }
              setShowFilterAlert(false);
          }, 2500);

          return () => clearTimeout(timer);
      }
  }, [showFilterAlert]);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const setThisMonth = () => setCalendarDate(new Date());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const employeeSummary = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') {
      return { annual: '-', dayOff: '-', extraOff: '-' };
    }
    const profile = teamMembers.find(m => m.email.toLowerCase() === selectedEmployee.toLowerCase()) || {};
    return {
       annual: profile.annual_leave_balance || '0',
       dayOff: profile.day_off_payment_balance || '0',
       extraOff: profile.extra_off_balance || '0'
    };
  }, [selectedEmployee, teamMembers]);

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
        const typ = (getPropCaseInsensitive(item, ['type', 'Type', 'status']) || '').toLowerCase();
        if (typ.includes('working') || typ === 'work' || typ.includes('kerja')) workingCount++;
        else if (typ.includes('sick') || typ.includes('maternity') || typ.includes('sakit') || typ.includes('melahirkan')) sickCount++;
        else if (typ.includes('day off') || typ === 'off' || typ.includes('holiday') || typ.includes('libur')) offCount++;
        else if (typ) leaveCount++;
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

  
  const getShiftTimes = (shiftVal, stdWorkingDay = 'BACKOFFICE52') => {
    const shiftInfo = SHIFT_OPTIONS.find(s => s.value === shiftVal) || SHIFT_OPTIONS[8];
    const startTime = shiftInfo.start;
    const startHour = parseInt(startTime.split(':')[0], 10);
    const workingHours = stdWorkingDay?.toUpperCase().includes('OPERATIONAL') ? 8 : 9;
    const endHour = (startHour + workingHours) % 24;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    return { startTime, endTime, workingHours };
  };

  const openSingleScheduleEdit = (emp, dateStr) => {
    const empEmail = (getPropCaseInsensitive(emp, ['Employee', 'employee', 'email', 'user_uid', 'employee_email']) || '').trim().toLowerCase();
    const memberProfile = teamMembers.find(m => m.email.toLowerCase() === empEmail) || {};
    
    const empName = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'employee_name'], memberProfile.name || empEmail);
    const barcode = memberProfile.barcode || getPropCaseInsensitive(emp, ['barcode', 'Barcode', 'nik', 'nip', 'id', 'employee_id']) || '-';
    const stdWorkingDay = memberProfile.standart_working_day || 'BACKOFFICE52';
    
    const currentTypeRaw = getPropCaseInsensitive(emp, ['type', 'Type', 'status'], 'Working Day');
    const isOff = currentTypeRaw.toLowerCase().includes('off') || currentTypeRaw.toLowerCase().includes('libur');
    const initialType = isOff ? 'Day Off' : 'Working Day';
    const initialShift = getPropCaseInsensitive(emp, ['shift', 'Shift', 'jam kerja'], 'M9');
    
    setSingleScheduleEdit({
      id: emp.id || getPropCaseInsensitive(emp, ['id', 'ID', 'uid', '_id']),
      date: dateStr,
      email: empEmail,
      name: empName,
      barcode: barcode,
      standart_working_day: stdWorkingDay,
      type: initialType,
      shift: initialShift,
      rawRecord: emp
    });
  };

  const saveSingleScheduleEdit = async () => {
    if (!singleScheduleEdit) return;
    setIsSavingSingleSchedule(true);
    try {
      const { startTime, endTime } = getShiftTimes(singleScheduleEdit.shift, singleScheduleEdit.standart_working_day);
      
      const payload = {
        Employee: singleScheduleEdit.email,
        Date: singleScheduleEdit.date,
        Type: singleScheduleEdit.type,
        Shift: singleScheduleEdit.type === 'Working Day' ? singleScheduleEdit.shift : '-',
        'Start Time': singleScheduleEdit.type === 'Working Day' ? startTime : '-',
        'End Time': singleScheduleEdit.type === 'Working Day' ? endTime : '-'
      };
      
      const rawKeys = Object.keys(singleScheduleEdit.rawRecord || {});
      const schedTypeCol = resolveTableColumn(rawKeys, ['Type', 'type', 'schedule_type']) || 'Type';
      const schedShiftCol = resolveTableColumn(rawKeys, ['Shift', 'shift', 'jam kerja']) || 'Shift';
      const schedStartCol = resolveTableColumn(rawKeys, ['Start Time', 'start_time', 'starttime']) || 'Start Time';
      const schedEndCol = resolveTableColumn(rawKeys, ['End Time', 'end_time', 'endtime']) || 'End Time';
      
      const dbPayload = {
        [schedTypeCol]: payload.Type,
        [schedShiftCol]: payload.Shift,
        [schedStartCol]: payload['Start Time'],
        [schedEndCol]: payload['End Time']
      };

      if (singleScheduleEdit.id) {
        const { error: saveErr } = await supabase.from('schedule').update(dbPayload).eq('id', singleScheduleEdit.id);
        if (saveErr) throw saveErr;
      } else {
        const schedEmpCol = resolveTableColumn(rawKeys, ['Employee', 'employee', 'email']) || 'Employee';
        const schedDateCol = resolveTableColumn(rawKeys, ['Date', 'date', 'Tanggal', 'scheduledate', 'schedule_date']) || 'Date';
        
        const { data: existingCheck } = await supabase.from('schedule')
          .select('*')
          .ilike(schedEmpCol, singleScheduleEdit.email)
          .eq(schedDateCol, singleScheduleEdit.date)
          .limit(1);
          
        if (existingCheck && existingCheck.length > 0) {
          const rowId = existingCheck[0].id;
          if (rowId) {
            const { error: saveErr } = await supabase.from('schedule').update(dbPayload).eq('id', rowId);
            if (saveErr) throw saveErr;
          } else {
            const { error: saveErr } = await supabase.from('schedule').update(dbPayload)
              .ilike(schedEmpCol, singleScheduleEdit.email)
              .eq(schedDateCol, singleScheduleEdit.date);
            if (saveErr) throw saveErr;
          }
        } else {
          const { error: saveErr } = await supabase.from('schedule').insert([{
            [schedEmpCol]: singleScheduleEdit.email,
            [schedDateCol]: singleScheduleEdit.date,
            ...dbPayload
          }]);
          if (saveErr) throw saveErr;
        }
      }

      alert(currentLang === 'id' ? 'Jadwal berhasil diperbarui!' : 'Schedule updated successfully!');
      setSingleScheduleEdit(null);
      setTeamScheduleModalData(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert((currentLang === 'id' ? 'Gagal memperbarui jadwal: ' : 'Failed to save schedule: ') + err.message);
    }
    setIsSavingSingleSchedule(false);
  };

  const openBulkEditModal = () => {
    if (!selectedEmployee || selectedEmployee === 'all') {
      setShowFilterAlert(true);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to make sure dropdown is visible
      return;
    }
    
    const empData = teamMembers.find(m => m.email.toLowerCase() === selectedEmployee.toLowerCase());
    if (!empData) return;
    setBulkEditEmployee(empData);

    const newBulkData = calendarDays.map(d => {
      const existing = d.teamData.find(r => {
         const rEmail = (getPropCaseInsensitive(r, ['Employee', 'employee', 'email', 'user_uid', 'employee_email']) || '').toLowerCase();
         return rEmail === selectedEmployee.toLowerCase();
      });
      
      const defaultShift = existing ? getPropCaseInsensitive(existing, ['shift', 'jam kerja'], 'M9') : 'M9';
      const defaultType = existing ? getPropCaseInsensitive(existing, ['type', 'Type', 'status'], 'Working Day') : 'Working Day';
      const existingId = existing ? getPropCaseInsensitive(existing, ['id', 'ID', 'uid']) : null;
      
      return {
        id: existingId,
        date: d.dateToPass,
        dateDisplay: `${d.day} ${t.monthsFull[month]} ${year}`,
        type: defaultType,
        shift: defaultShift,
        dbRecord: existing || null
      };
    });
    
    setBulkEditData(newBulkData);
    setIsBulkEditModalOpen(true);
  };

  const handleBulkChange = (index, field, value) => {
    const updated = [...bulkEditData];
    updated[index][field] = value;
    setBulkEditData(updated);
  };

  const saveBulkEdit = async () => {
    if (!bulkEditEmployee) return;
    setIsSavingBulk(true);
    
    try {
      const workingHours = bulkEditEmployee.standart_working_day?.toUpperCase().includes('OPERATIONAL') ? 8 : 9;
      
      for (const row of bulkEditData) {
        let startTime = "";
        let endTime = "";
        
        if (row.type === 'Working Day') {
            const shiftInfo = SHIFT_OPTIONS.find(s => s.value === row.shift);
            if (shiftInfo) {
              startTime = shiftInfo.start;
              const startHour = parseInt(startTime.split(':')[0], 10);
              const endHour = (startHour + workingHours) % 24;
              endTime = `${String(endHour).padStart(2, '0')}:00`;
            }
        }
        
        const payload = {
          Employee: bulkEditEmployee.email,
          Date: row.date,
          Type: row.type,
          Shift: row.type === 'Working Day' ? row.shift : '-',
          'Start Time': row.type === 'Working Day' ? startTime : '-',
          'End Time': row.type === 'Working Day' ? endTime : '-'
        };

        if (row.id) {
           await supabase.from('schedule').update(payload).eq('id', row.id);
        } else {
           await supabase.from('schedule').insert([payload]);
        }
      }
      alert(currentLang === 'id' ? 'Jadwal berhasil diperbarui!' : 'Schedule updated successfully!');
      setIsBulkEditModalOpen(false);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert((currentLang === 'id' ? 'Gagal menyimpan jadwal: ' : 'Failed to save schedule: ') + err.message);
    }
    setIsSavingBulk(false);
  };

  const sendNotificationEmail = async (item, newStatus, reason = '') => {
    const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email']);
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'employee_name'], 'Employee');
    const reqType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type', 'Action', 'action', 'Status Type', 'Attendance Type'], item._category || 'Request');
    
    const isLeave = item._category === 'Leave';

    // Get formatted date strings
    let dateStr = '';
    if (isLeave) {
        const fromDateRaw = getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date', 'Date', 'date']);
        const toDateRaw = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
        const fromDateStr = formatDateDisplay(fromDateRaw, 'en');
        
        if (toDateRaw && toDateRaw !== fromDateRaw) {
             const toDateStr = formatDateDisplay(toDateRaw, 'en');
             dateStr = `${fromDateStr} to ${toDateStr}`;
        } else {
             dateStr = fromDateStr;
        }
    } else {
        const rawDate = getPropCaseInsensitive(item, ['Time', 'time', 'created_at', 'CreatedDate', 'From Date', 'from_date', 'Start Date', 'start_date', 'Date', 'date', 'Tanggal', 'attendance_date']);
        dateStr = formatDateTimeDisplay(rawDate, 'en');
    }

    if (!empEmail || !empEmail.includes('@')) return;

    let statusColor = '#16a34a';
    if (newStatus === 'Rejected' || newStatus === 'Cancelled') statusColor = '#dc2626';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: ${statusColor}; margin-top: 0; font-size: 18px;">Request ${newStatus}</h2>
        <p style="font-size: 14px;">Hello <strong>${empName}</strong>,</p>
        <p style="font-size: 14px;">Your <strong>${reqType} (${item._category})</strong> request for <strong>${dateStr}</strong> has been updated to <strong>${newStatus}</strong> by your Line Manager (<strong>${userName}</strong>).</p>
        ${reason ? `<p style="font-size: 14px; background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;"><strong>Notes:</strong> ${reason}</p>` : ''}
        <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
        </div>
      </div>
    `;

    // Only force "Leave Request" as subject if it's a leave request, otherwise default behavior
    const subjectTitle = isLeave ? `Leave Request - ${newStatus}` : `[${newStatus}] ${item._category} Request - ${empName}`;

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "sendEmail",
          to: empEmail,
          subject: subjectTitle,
          body: emailHtml,
          htmlBody: emailHtml,
          fromEmail: actualUserWorkEmail || topNavEmail || userWorkEmail // Use the correct user email as the sender
        })
      });
    } catch (e) {
      console.warn("Notice email could not be sent:", e);
    }
  };

  const handleUpdateStatus = async (item, newStatus, reason = '') => {
    setIsProcessing(true);
    try {
      const table = item._sourceTable || (item._category === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);

      const statusCol = resolveTableColumn(cols, [
        'Approval Status', 'approval_status', 'Status Approval', 'status_approval',
        'Status', 'status', 'Approval', 'approval', 'Request Status', 'request_status'
      ]) || 'Status';

      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'Leave ID', 'Leave_ID', 'no', '_id']);
      const nowIso = new Date().toISOString();
      
      let targetStatus = newStatus;
      const payload = {};
      let scheduleUpdatePayload = {};
      let schedRow = null;

      if (item._category === 'Attendance') {
        const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'user_uid', 'email']);
        const attDate = getPropCaseInsensitive(item, ['Date', 'date', 'Tanggal', 'attendance_date', 'CreatedDate']);
        
        if (empEmail && attDate) {
          const { data: schedData } = await supabase.from('schedule').select('*').ilike('Employee', `%${empEmail}%`).eq('Date', attDate).limit(1);
          if (schedData && schedData.length > 0) {
            schedRow = schedData[0];
          }
        }

        const checkInOutRaw = getPropCaseInsensitive(item, ['Are you checking out or Checking in?', 'Are you checking out or Checking in', 'Check In/Out', 'Check Type', 'Action', 'action'], '');
        const isCheckout = checkInOutRaw.toLowerCase().includes('out');
        const isCheckin = checkInOutRaw.toLowerCase().includes('in');

        const checkoutTimeVal = getPropCaseInsensitive(item, ['Checkout Time', 'checkout_time', 'Time Out', 'time_out', 'Time', 'time']);
        const checkinTimeVal = getPropCaseInsensitive(item, ['Time', 'time', 'Time In', 'time_in']);
        
        const attActionCol = resolveTableColumn(cols, ['Action', 'action', 'Attendance Action', 'attendance_action']) || 'Action';
        const attTimeCol = resolveTableColumn(cols, ['Time', 'time', 'Attendance Time', 'attendance_time']) || 'Time';

        let schedCheckedIn = schedRow ? getPropCaseInsensitive(schedRow, ['Checked In At', 'checked_in_at', 'Time In']) : null;
        let schedCheckedOut = schedRow ? getPropCaseInsensitive(schedRow, ['Checked Out At', 'checked_out_at', 'Time Out']) : null;
        let schedStartTime = schedRow ? getPropCaseInsensitive(schedRow, ['Start Time', 'start_time']) : null;
        let schedEndTime = schedRow ? getPropCaseInsensitive(schedRow, ['End Time', 'end_time']) : null;
        let schedOvertime = schedRow ? getPropCaseInsensitive(schedRow, ['Overtime?', 'overtime', 'is_overtime']) : false;

        if (newStatus === 'Approved') {
          if (isCheckout) {
            payload[attActionCol] = 'Checked Out';
            if (checkoutTimeVal) payload[attTimeCol] = checkoutTimeVal;
            targetStatus = 'Approved';
            
            schedCheckedOut = checkoutTimeVal;
            scheduleUpdatePayload['Checked Out At'] = checkoutTimeVal;
            scheduleUpdatePayload['LastEditDate'] = nowIso;
            scheduleUpdatePayload['LastEditBy'] = actualUserName || userName;
            
            if (schedCheckedIn && schedCheckedOut) {
              const dur = calculateDurationWorked(schedCheckedIn, schedCheckedOut, attDate);
              if (dur) {
                scheduleUpdatePayload['Total Hrs Worked'] = dur.hours;
                scheduleUpdatePayload['Total Minutes Worked'] = dur.totalMinutes;
              }
            }
            if (schedOvertime === true || schedOvertime === 'TRUE' || schedOvertime === 'true') {
              scheduleUpdatePayload['Overtime?'] = true;
              scheduleUpdatePayload['OvertimeDuration'] = calculateMinuteDiff(schedCheckedOut, schedEndTime, attDate);
            }
          } else if (isCheckin) {
            payload[attActionCol] = 'Checked In';
            targetStatus = 'Approved';
            
            schedCheckedIn = checkinTimeVal;
            scheduleUpdatePayload['Checked In At'] = checkinTimeVal;
            scheduleUpdatePayload['LastEditDate'] = nowIso;
            scheduleUpdatePayload['LastEditBy'] = actualUserName || userName;
            
            if (schedCheckedIn && schedCheckedOut) {
              const dur = calculateDurationWorked(schedCheckedIn, schedCheckedOut, attDate);
              if (dur) {
                scheduleUpdatePayload['Total Hrs Worked'] = dur.hours;
                scheduleUpdatePayload['Total Minutes Worked'] = dur.totalMinutes;
              }
            }
            if (schedCheckedIn && schedStartTime) {
              const lateDiff = calculateMinuteDiff(schedCheckedIn, schedStartTime, attDate);
              if (lateDiff > 0) scheduleUpdatePayload['Late Minutes'] = lateDiff;
            }
          }
        } else if (newStatus === 'Rejected') {
          if (isCheckout) {
            payload[attActionCol] = 'Checked Out';
            if (checkoutTimeVal) payload[attTimeCol] = checkoutTimeVal;
            targetStatus = 'Approved';
            
            schedCheckedOut = checkoutTimeVal;
            scheduleUpdatePayload['Checked Out At'] = checkoutTimeVal;
            scheduleUpdatePayload['LastEditDate'] = nowIso;
            scheduleUpdatePayload['LastEditBy'] = actualUserName || userName;
            
            if (schedCheckedIn && schedCheckedOut) {
              const dur = calculateDurationWorked(schedCheckedIn, schedCheckedOut, attDate);
              if (dur) {
                scheduleUpdatePayload['Total Hrs Worked'] = dur.hours;
                scheduleUpdatePayload['Total Minutes Worked'] = dur.totalMinutes;
              }
            }
            scheduleUpdatePayload['Overtime?'] = false;
          } else {
            targetStatus = 'Rejected';
          }
        }
      }

      payload[statusCol] = targetStatus;
      if (statusCol.toLowerCase() !== 'status') {
        const altStatusCol = resolveTableColumn(cols, ['Status', 'status']);
        if (altStatusCol) payload[altStatusCol] = targetStatus;
      } else {
        const altApprovalCol = resolveTableColumn(cols, ['Approval Status', 'approval_status', 'Status Approval', 'status_approval', 'Approval']);
        if (altApprovalCol) payload[altApprovalCol] = targetStatus;
      }

      const approverCol = resolveTableColumn(cols, ['approved_by', 'Approved By', 'action_by', 'Action By', 'lasteditby', 'last_edit_by']);
      if (approverCol) payload[approverCol] = actualUserWorkEmail || topNavEmail || userWorkEmail;

      const dateCol = resolveTableColumn(cols, ['approved_date', 'Approved Date', 'approved_at', 'lasteditdate', 'last_editdate', 'last_edit_date']);
      if (dateCol) payload[dateCol] = nowIso;

      if (targetStatus === 'Rejected' && reason) {
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
      
      if (item._category === 'Attendance' && Object.keys(scheduleUpdatePayload).length > 0 && schedRow) {
        const rowKeys = Object.keys(schedRow);
        const pkCol = rowKeys.find(k => k.toLowerCase() === 'id' || k === 'ID' || k === '_id');
        
        let schedQuery = supabase.from('schedule').update(scheduleUpdatePayload);
        
        if (pkCol && schedRow[pkCol] !== undefined && schedRow[pkCol] !== null) {
          schedQuery = schedQuery.eq(pkCol, schedRow[pkCol]);
        } else {
          const empCol = rowKeys.find(k => ['employee', 'email', 'user_uid'].includes(k.toLowerCase())) || 'Employee';
          const dateCol = rowKeys.find(k => ['date', 'tanggal'].includes(k.toLowerCase())) || 'Date';
          schedQuery = schedQuery.eq(empCol, schedRow[empCol]).eq(dateCol, schedRow[dateCol]);
        }
        
        const { error: schedErr } = await schedQuery;
        if (schedErr) console.warn("[Approval] Failed updating schedule:", schedErr.message);
      }

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

            if (holFetchErr) throw new Error("Failed read holiday_balance: " + holFetchErr.message);

            const candidateHolidays = (allHolidays || []).filter(row => {
              const s = getPropCaseInsensitive(row, ['status', 'Status', 'STATUS'], '').trim().toLowerCase();
              if (s !== 'unused') return false;

              const typ = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
              let isTypeMatch = false;
            if (leaveType === 'Day Off Payment') {
              isTypeMatch = (typ === 'day off payment');
            } else if (leaveType === 'Extra Off') {
              isTypeMatch = (typ === 'extra off');
            }
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

            await supabase.from('schedule').update({
              [schedTypeCol]: leaveType
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
                const typ = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
                let isTypeMatch = false;
            if (leaveType === 'Day Off Payment') {
              isTypeMatch = (typ === 'day off payment');
            } else if (leaveType === 'Extra Off') {
              isTypeMatch = (typ === 'extra off');
            }
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
          alert((currentLang === 'id' ? 'Catatan Sinkronisasi: ' : 'Sync Note: ') + sideErr.message);
        }
      }

      await sendNotificationEmail(item, newStatus, reason);

      alert(currentLang === 'id' ? `Permintaan berhasil ${newStatus === 'Approved' ? 'disetujui' : 'ditolak'}!` : `Request successfully ${newStatus === 'Approved' ? 'approved' : 'rejected'}!`);
      setIsDetailModalOpen(false);
      setIsRejectModalOpen(false);
      setItemToReject(null);
      setRejectReason('');
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert((currentLang === 'id' ? 'Gagal memproses permintaan: ' : 'Failed to process request: ') + err.message);
    }
    setIsProcessing(false);
  };

  const handleCancelApproved = async (item) => {
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name'], 'Employee');
    const reqCategory = item._category || 'Leave';
    const reqType = getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Action', 'action', 'Type', 'type', 'Attendance Type'], reqCategory);

    if (!window.confirm(currentLang === 'id' ? `Batalkan persetujuan ${reqType} untuk ${empName}?` : `Cancel ${reqType} approval for ${empName}?`)) {
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
        'Status',
        'status',
        'Approval',
        'approval',
        'Request Status',
        'request_status'
      ]) || 'Status';

      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'Leave ID', 'Leave_ID', 'no', '_id']);

      const nowIso = new Date().toISOString();
      const payload = {
        [statusCol]: 'Cancelled'
      };

      if (statusCol.toLowerCase() !== 'status') {
        const altStatusCol = resolveTableColumn(cols, ['Status', 'status']);
        if (altStatusCol) payload[altStatusCol] = 'Cancelled';
      } else {
        const altApprovalCol = resolveTableColumn(cols, ['Approval Status', 'approval_status', 'Status Approval', 'status_approval', 'Approval']);
        if (altApprovalCol) payload[altApprovalCol] = 'Cancelled';
      }

      const approverCol = resolveTableColumn(cols, ['approved_by', 'Approved By', 'action_by', 'Action By', 'lasteditby', 'last_edit_by']);
      if (approverCol) payload[approverCol] = actualUserWorkEmail || topNavEmail || userWorkEmail;

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

            const typ = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
            let isTypeMatch = false;
            if (leaveType === 'Day Off Payment') {
              isTypeMatch = (typ === 'day off payment');
            } else if (leaveType === 'Extra Off') {
              isTypeMatch = (typ === 'extra off');
            }
            if (!isTypeMatch) return false;

            const empVal = getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']).trim().toLowerCase();
            return validKeys.some(k => empVal === k || empVal.includes(k) || k.includes(empVal));
          });

          usedCandidates.sort((a, b) => {
            const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired Date', 'expired'])) || new Date(0);
            const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired Date', 'expired'])) || new Date(0);
            return dtB.getTime() - dtA.getTime();
          });

          const daysToRestore = Math.min(totalDays, usedCandidates.length);
          for (let i = 0; i < daysToRestore; i++) {
            const targetUsedHol = usedCandidates[i];
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
          .gte(schedDateCol, fromDate)
          .lte(schedDateCol, toDate);

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
              const typ = getPropCaseInsensitive(row, ['Type Holiday', 'type_holiday', 'Type', 'type'], '').trim().toLowerCase();
              let isTypeMatch = false;
            if (leaveType === 'Day Off Payment') {
              isTypeMatch = (typ === 'day off payment');
            } else if (leaveType === 'Extra Off') {
              isTypeMatch = (typ === 'extra off');
            }
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

      const reasonStr = currentLang === 'id' 
        ? 'Persetujuan request telah dibatalkan oleh Line Manager dan kuota/saldo telah dikembalikan (jika ada).'
        : 'Approval request cancelled by Line Manager and balances have been reverted (if applicable).';

      await sendNotificationEmail(item, 'Cancelled', reasonStr);

      alert(currentLang === 'id' ? 'Persetujuan berhasil dibatalkan!' : 'Approval successfully cancelled!');
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert((currentLang === 'id' ? 'Gagal membatalkan persetujuan: ' : 'Failed to cancel approval: ') + err.message);
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

  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length;
  }, [leaveRequests]);

  const pendingAttendanceCount = useMemo(() => {
    return attendanceRequests.filter(r => isPendingApprovalStatus(getRowStatus(r))).length;
  }, [attendanceRequests]);

  const activeCategoryList = useMemo(() => {
    return activeCategoryTab === 'attendance' ? attendanceRequests : leaveRequests;
  }, [activeCategoryTab, attendanceRequests, leaveRequests]);

  const displayList = useMemo(() => {
    let list = [...activeCategoryList];

    if (activeCategoryTab === 'attendance') {
      list = list.filter(item => isPendingApprovalStatus(getRowStatus(item)));
    } else {
      if (statusTab === 'pending') {
        list = list.filter(item => isPendingApprovalStatus(getRowStatus(item)));
      } else if (statusTab === 'approved') {
        list = list.filter(item => isApprovedStatus(getRowStatus(item)));
      } else if (statusTab === 'rejected') {
        list = list.filter(item => isRejectedStatus(getRowStatus(item)));
      }
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
  }, [activeCategoryList, activeCategoryTab, statusTab, selectedEmployee]);

  const pendingStatusCount = activeCategoryList.filter(r => isPendingApprovalStatus(getRowStatus(r))).length;
  const approvedStatusCount = activeCategoryList.filter(r => isApprovedStatus(getRowStatus(r))).length;
  const rejectedStatusCount = activeCategoryList.filter(r => isRejectedStatus(getRowStatus(r))).length;

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* 1. Unified Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 w-full">
        
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t.title}</h2>
          </div>
          
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-gray-400 mr-1.5 font-medium">{t.manager}</span>
              <span className="font-semibold text-gray-700">{actualUserWorkEmail || topNavEmail || userWorkEmail || '-'}</span>
            </div>
            <button
              onClick={refreshAllData}
              disabled={loading}
              className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
              title={t.refresh}
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:px-5 sm:py-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-nowrap overflow-x-auto">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
              <button
                onClick={() => setActiveCategoryTab('leave')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-colors whitespace-nowrap ${
                  activeCategoryTab === 'leave'
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {t.tabLeave} ({pendingLeavesCount})
              </button>
              <button
                onClick={() => setActiveCategoryTab('attendance')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-colors whitespace-nowrap ${
                  activeCategoryTab === 'attendance'
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {t.tabAttendance} ({pendingAttendanceCount})
              </button>
            </div>

            {activeCategoryTab !== 'attendance' && (
              <div className="relative shrink-0 flex-1 sm:flex-initial sm:w-[170px]">
                <select
                  value={statusTab}
                  onChange={(e) => setStatusTab(e.target.value)}
                  className="w-full pl-3 pr-7 sm:pl-3.5 sm:pr-8 py-1.5 text-xs sm:text-[13px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer transition whitespace-nowrap"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.6rem center',
                    backgroundSize: '0.85rem'
                  }}
                >
                  <option value="pending">{t.filterPending} ({pendingStatusCount})</option>
                  <option value="approved">{t.filterApproved} ({approvedStatusCount})</option>
                  <option value="rejected">{t.filterRejected} ({rejectedStatusCount})</option>
                  <option value="all">{t.filterAll}</option>
                </select>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-[200px] shrink-0">
            {showFilterAlert && (
               <div className="absolute -top-10 left-0 right-0 bg-red-100 text-red-700 text-[10px] font-bold py-1 px-2 rounded shadow-sm text-center animate-bounce z-10 whitespace-nowrap">
                  {t.errFilterFirst}
               </div>
            )}
            <select
              ref={employeeDropdownRef}
              value={selectedEmployee}
              onChange={(e) => {
                 setSelectedEmployee(e.target.value);
                 if (showFilterAlert) setShowFilterAlert(false);
              }}
              className="w-full pl-3.5 pr-8 py-1.5 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer transition relative z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="all">{t.empFilterAll}</option>
              {teamMembers.map((member) => (
                <option key={member.email} value={member.email}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5 font-semibold">{t.colEmp}</th>
                <th className="px-5 py-3.5 font-semibold">{t.colReq}</th>
                <th className="px-5 py-3.5 font-semibold">{activeCategoryTab === 'attendance' ? t.colAttTime : t.colLeavePeriod}</th>
                <th className="px-5 py-3.5 font-semibold text-center">{t.colStatus}</th>
                <th className="px-5 py-3.5 font-semibold text-center">{t.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 animate-spin text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <p className="text-xs">{t.loading}</p>
                    </div>
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-semibold text-gray-600 text-sm">{t.noRequests}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t.noRecordsDesc}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayList.map((item, idx) => {
                  const employeeEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email'], '-');
                  const employeeName = getPropCaseInsensitive(
                    item, 
                    ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'], 
                    teamMembers.find(m => m.email.toLowerCase() === employeeEmail.toLowerCase())?.name || employeeEmail
                  );
                  let reqType = getPropCaseInsensitive(
                    item, 
                    ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype', 'Action', 'action', 'Status Type', 'Attendance Type', 'attendance_type', 'Request Type', 'request_type', 'keterangan'], 
                    item._category === 'Attendance' ? 'Attendance' : 'Leave'
                  );
                  
                  if (item._category === 'Attendance') {
                    const checkInOut = getPropCaseInsensitive(item, ['Are you checking out or Checking in?', 'Are you checking out or Checking in', 'Check In/Out', 'Check Type']);
                    if (checkInOut && checkInOut !== '-') {
                      reqType = checkInOut;
                    }
                  }
                  const status = getRowStatus(item) || 'Approved';
                  
                  const rawDate = getPropCaseInsensitive(item, ['Time', 'time', 'created_at', 'CreatedDate', 'From Date', 'from_date', 'Start Date', 'start_date', 'Date', 'date', 'Tanggal', 'attendance_date']);
                  const fromDate = formatDateDisplay(rawDate, lang);
                  const toDateRaw = getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']);
                  
                  let dateInfo = toDateRaw ? `${fromDate} - ${formatDateDisplay(toDateRaw, lang)}` : fromDate;
                  if (item._category === 'Attendance') {
                     dateInfo = formatDateTimeDisplay(rawDate, lang);
                  }

                  return (
                    <tr
                      key={idx}
                      onClick={() => openDetailModal(item)}
                      className="hover:bg-gray-50/80 transition cursor-pointer text-xs sm:text-sm"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{employeeName}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{employeeEmail}</div>
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-800">
                        <span className={`font-bold ${getReqTypeColor(reqType, item._category)}`}>{reqType}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-600">
                        {dateInfo}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {(() => {
                          let badgeClass = 'bg-yellow-100/80 text-yellow-700 border-yellow-200/60';
                          if (isApprovedStatus(status)) {
                            badgeClass = 'bg-green-100/80 text-green-700 border-green-200/60';
                          } else if (status.toLowerCase().includes('reject') || status.toLowerCase().includes('cancel')) {
                            badgeClass = 'bg-red-100/80 text-red-700 border-red-200/60';
                          }
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                              {status}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const s = getRowStatus(item);
                          if (isRejectedStatus(s) || s.toLowerCase().replace(/[\s_-]/g, '') === 'cancelled') {
                            return <span className="text-[11px] text-gray-400 italic font-semibold px-2 py-1 bg-gray-50 rounded-md">No Action</span>;
                          }
                          if (isApprovedStatus(s)) {
                            return (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleCancelApproved(item)}
                                className="px-2.5 py-1.5 bg-white hover:bg-red-50 active:scale-95 text-red-600 border border-gray-200 hover:border-red-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer mx-auto shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                <span>{t.btnCancel}</span>
                              </button>
                            );
                          }
                          if (s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel') {
                            return (
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleCancelApproved(item)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-purple-50 active:scale-95 text-purple-700 border border-gray-200 hover:border-purple-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                  <span>{t.btnApproveCancel}</span>
                                </button>
                                <button
                                  disabled={isProcessing}
                                  onClick={(e) => openRejectDialog(item, e)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 border border-gray-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                  <span>{t.btnReject}</span>
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                disabled={isProcessing}
                                onClick={() => {
                                  if (window.confirm(currentLang === 'id' ? `Setujui permintaan dari ${employeeName}?` : `Approve request from ${employeeName}?`)) {
                                    handleUpdateStatus(item, 'Approved');
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                <span>{t.btnApprove}</span>
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={(e) => openRejectDialog(item, e)}
                                className="px-3 py-1.5 bg-white hover:bg-red-50 active:scale-95 text-red-600 border border-gray-200 hover:border-red-200 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                <span>{t.btnReject}</span>
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

      
      {/* 1.5 Summary Balance Cards */}
      <div className="mb-6 flex overflow-x-auto">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200/50">
             <span className="text-xs sm:text-[13px] font-bold text-gray-500">{t.sumAnn}</span>
             <span className="text-xs sm:text-[13px] font-black text-blue-700">{employeeSummary.annual}</span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200/50">
             <span className="text-xs sm:text-[13px] font-bold text-gray-500">{t.sumDop}</span>
             <span className="text-xs sm:text-[13px] font-black text-blue-700">{employeeSummary.dayOff}</span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200/50">
             <span className="text-xs sm:text-[13px] font-bold text-gray-500">{t.sumEo}</span>
             <span className="text-xs sm:text-[13px] font-black text-blue-700">{employeeSummary.extraOff}</span>
          </div>
        </div>
      </div>

      {/* 2. Team Working Calendar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 w-full">
        <div className="flex flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-gray-100 gap-2 sm:gap-3">
          <div className="flex-1 pr-2 sm:pr-3">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <svg className="w-5 h-5 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {t.calTitle}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 break-words">
              {selectedEmployee === 'all' 
                ? t.calDescAll 
                : `${t.calDescOne} ${teamMembers.find(m => m.email === selectedEmployee)?.name || selectedEmployee}`}
            </p>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={prevMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Previous Month">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-[10px] sm:text-base font-bold text-gray-800 min-w-[65px] sm:min-w-[120px] text-center">
              {t.monthsFull[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Next Month">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={setThisMonth} className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-sm active:scale-95 ml-1">
              {t.btnThisMonth}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-bold pt-1 mb-1">
          {t.daysOfWeek.map((day, idx) => (
            <span key={idx} className={idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-600' : 'text-gray-700'}>
              {day}
            </span>
          ))}
        </div>

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
                } else if (selectedEmployee && selectedEmployee !== 'all') {
                  const empData = teamMembers.find(m => m.email.toLowerCase() === selectedEmployee.toLowerCase());
                  if (empData) {
                    openSingleScheduleEdit({
                      Employee: empData.email,
                      Name: empData.name,
                      type: 'Working Day',
                      shift: 'M9'
                    }, d.dateToPass);
                  }
                }
              }}
              className={`relative h-20 sm:h-24 p-1 sm:p-2 rounded-xl border transition flex flex-col overflow-hidden bg-white ${d.teamData.length > 0 || (selectedEmployee && selectedEmployee !== 'all') ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''} ${d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-300' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start w-full">
                <span className={`text-xs sm:text-sm font-extrabold leading-none ${d.isToday ? 'text-blue-600' : d.isSunday ? 'text-red-500' : 'text-gray-800'}`}>
                  {d.day}
                </span>
              </div>

              <div className="w-full flex flex-col items-center justify-center my-auto gap-0.5 sm:gap-1 mt-1">
                {d.counts.workingCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-green-600 text-white shadow-sm">{d.counts.workingCount} {t.statWork}</span>}
                {d.counts.sickCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-pink-500 text-white shadow-sm">{d.counts.sickCount} {t.statSick}</span>}
                {d.counts.leaveCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-orange-500 text-white shadow-sm">{d.counts.leaveCount} {t.statLeave}</span>}
                {d.counts.offCount > 0 && <span className="w-full py-0.5 px-1 rounded sm:rounded-md text-[9px] font-bold text-center truncate bg-red-600 text-white shadow-sm">{d.counts.offCount} {t.statOff}</span>}
                
                {d.teamData.length === 0 && <span className="text-[10px] text-gray-300">-</span>}
              </div>
            </div>
          ))}
        
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
           <button 
             onClick={openBulkEditModal}
             className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl shadow-sm transition border border-indigo-200 flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
             {t.btnBulkEdit}
           </button>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && bulkEditEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => !isSavingBulk && setIsBulkEditModalOpen(false)}>
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-0 border border-gray-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.bulkTitle}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t.bulkEmp} <strong className="text-gray-800">{bulkEditEmployee.name}</strong> | Barcode: <strong className="text-gray-800">{bulkEditEmployee.barcode || '-'}</strong>
                </p>
                <p className="text-xs text-gray-500">{t.bulkMonth} {t.monthsFull[month]} {year}</p>
              </div>
              <button disabled={isSavingBulk} onClick={() => setIsBulkEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
               <div className="space-y-3">
                  {bulkEditData.map((row, idx) => {
                    const isLockedType = row.type !== 'Working Day' && row.type !== 'Day Off';
                    return (
                      <div key={idx} className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl border shadow-sm ${isLockedType ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-white border-gray-200'}`}>
                         <div className={`w-full sm:w-1/4 font-semibold text-sm flex items-center gap-2 ${isLockedType ? 'text-gray-500' : 'text-gray-700'}`}>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {row.dateDisplay}
                         </div>
                         <div className="w-full sm:w-1/4">
                            {isLockedType ? (
                              <div className="w-full p-2 text-xs font-bold text-gray-600 border border-gray-300 rounded-lg bg-gray-200">
                                {row.type} ({t.bulkLocked})
                              </div>
                            ) : (
                              <select
                                 value={row.type}
                                 onChange={(e) => handleBulkChange(idx, 'type', e.target.value)}
                                 className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                              >
                                 <option value="Working Day">{t.bulkTypeWork}</option>
                                 <option value="Day Off">{t.bulkTypeOff}</option>
                              </select>
                            )}
                         </div>
                         <div className="w-full sm:w-1/2 flex items-center gap-2">
                            <select
                               value={row.shift}
                               disabled={row.type !== 'Working Day' || isLockedType}
                               onChange={(e) => handleBulkChange(idx, 'shift', e.target.value)}
                               className={`w-full sm:w-40 p-2 text-xs border border-gray-300 rounded-lg focus:outline-none disabled:text-gray-400 ${row.type === 'Working Day' && !isLockedType ? 'focus:ring-2 focus:ring-blue-500 bg-white' : 'bg-gray-200'}`}
                            >
                               {SHIFT_OPTIONS.map(opt => (
                                 <option key={opt.value} value={opt.value}>{opt.label} (Start {opt.start})</option>
                               ))}
                            </select>
                            
                            {row.type === 'Working Day' && !isLockedType && (
                              <span className="text-[10px] text-gray-400 italic">
                                {bulkEditEmployee.standart_working_day?.toUpperCase().includes('OPERATIONAL') ? t.bulkAutoInfo8 : t.bulkAutoInfo9}
                              </span>
                            )}
                            {isLockedType && (
                              <span className="text-[10px] text-gray-400 font-medium italic">
                                {t.bulkCannotEdit}
                              </span>
                            )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
              <button
                disabled={isSavingBulk}
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                disabled={isSavingBulk}
                onClick={saveBulkEdit}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2"
              >
                {isSavingBulk ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> {t.btnSaving}</>
                ) : (
                  t.btnSaveSchedule
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Schedule Date Detail Modal */}
      {teamScheduleModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setTeamScheduleModalData(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {t.teamModalTitle} <span className="text-blue-600">{teamScheduleModalData.date}</span>
              </h3>
              <button onClick={() => setTeamScheduleModalData(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {teamScheduleModalData.records.map((emp, idx) => {
                const empName = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'employee_name', 'Employee'], 'Employee');
                const typ = getPropCaseInsensitive(emp, ['type', 'Type', 'status'], '-');
                const shift = getPropCaseInsensitive(emp, ['shift', 'jam kerja'], '-');
                
                let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
                let displayType = typ;
                
                const tLower = typ.toLowerCase();
                const isWorking = tLower.includes('working') || tLower === 'work' || tLower.includes('kerja');
                const isOff = tLower.includes('day off') || tLower === 'off' || tLower.includes('libur');
                
                const isLeave = tLower.includes('leave') || tLower.includes('cuti') || tLower.includes('sick') || tLower.includes('sakit') || tLower.includes('maternity');
                
                const isEditable = (isWorking || isOff) && !isLeave;

                if (isWorking) {
                  badgeClass = 'bg-green-50 text-green-700 border-green-200';
                  displayType = t.badgeWork;
                } else if (tLower.includes('sick') || tLower.includes('sakit')) {
                  badgeClass = 'bg-pink-50 text-pink-700 border-pink-200';
                  displayType = t.badgeSick;
                } else if (isOff) {
                  badgeClass = 'bg-red-50 text-red-700 border-red-200';
                  displayType = t.badgeOff;
                } else if (tLower.includes('leave') || tLower.includes('cuti')) {
                  badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                  displayType = t.badgeLeave;
                }

                return (
                  <div 
                    key={idx} 
                    className={`flex justify-between items-center p-3 border rounded-xl bg-white shadow-xs transition ${isEditable ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <span>{empName}</span>
                        {isEditable && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                            Editable
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                        Shift: {shift !== '-' ? shift : (isOff ? t.badgeOff : '-')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                        {displayType}
                      </span>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSingleScheduleEdit(emp, teamScheduleModalData.date);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Single Schedule Edit Modal */}
      {singleScheduleEdit && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !isSavingSingleSchedule && setSingleScheduleEdit(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-0 border border-gray-100 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{t.editModalTitle}</h3>
                  <p className="text-xs text-gray-500">{t.editModalSub}</p>
                </div>
              </div>
              <button 
                disabled={isSavingSingleSchedule}
                onClick={() => setSingleScheduleEdit(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  1. {t.lblDate}
                </label>
                <input 
                  type="text"
                  readOnly
                  value={singleScheduleEdit.date}
                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed select-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    2. {t.lblBarcode}
                  </label>
                  <input 
                    type="text"
                    readOnly
                    value={singleScheduleEdit.barcode || '-'}
                    className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed select-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    3. {t.lblName}
                  </label>
                  <input 
                    type="text"
                    readOnly
                    value={singleScheduleEdit.name}
                    className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed select-none truncate"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  4. {t.lblType}
                </label>
                <select
                  value={singleScheduleEdit.type}
                  onChange={(e) => setSingleScheduleEdit({ ...singleScheduleEdit, type: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="Working Day">{t.bulkTypeWork}</option>
                  <option value="Day Off">{t.bulkTypeOff}</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    5. {t.lblShift}
                  </label>
                  <span className="text-[10px] text-gray-400 italic">
                    {t.lblShiftHint}
                  </span>
                </div>
                <select
                  value={singleScheduleEdit.shift}
                  disabled={singleScheduleEdit.type !== 'Working Day'}
                  onChange={(e) => setSingleScheduleEdit({ ...singleScheduleEdit, shift: e.target.value })}
                  className={`w-full px-3 py-2 text-xs font-bold text-gray-800 border rounded-xl focus:outline-none ${singleScheduleEdit.type === 'Working Day' ? 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500/20 cursor-pointer' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {SHIFT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — Start {opt.start}
                    </option>
                  ))}
                </select>
              </div>

              {singleScheduleEdit.type === 'Working Day' ? (() => {
                const times = getShiftTimes(singleScheduleEdit.shift, singleScheduleEdit.standart_working_day);
                return (
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1.5">
                      6 & 7. {t.lblAutoCalc}
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-gray-500 block">{t.lblStart}</span>
                        <span className="font-extrabold text-blue-700 text-sm">{times.startTime}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-gray-500 block">{t.lblEnd}</span>
                        <span className="font-extrabold text-blue-700 text-sm">{times.endTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500 italic">
                  {t.msgOffDay}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingSingleSchedule}
                onClick={() => setSingleScheduleEdit(null)}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                disabled={isSavingSingleSchedule}
                onClick={saveSingleScheduleEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                {isSavingSingleSchedule ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <span>{t.btnSaving}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span>{t.btnSaveSchedule}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Request Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${selectedRequest._category === 'Attendance' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {selectedRequest._category === 'Attendance' ? t.tabAttendance : t.tabLeave}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">{t.reqDetailTitle}</h3>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{t.reqEmpInfo}</span>
              <div className="text-sm font-bold text-gray-800">
                {getPropCaseInsensitive(selectedRequest, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                Email: {getPropCaseInsensitive(selectedRequest, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                {t.manager} {getPropCaseInsensitive(selectedRequest, ['Line Manager', 'line_manager', 'Line Manager Email', 'manager_email', 'Approver'], '-')}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">{t.colReq}</span>
                  {(() => {
                    const modalReqType = selectedRequest._category === 'Attendance' 
                      ? (getPropCaseInsensitive(selectedRequest, ['Are you checking out or Checking in?', 'Are you checking out or Checking in', 'Check In/Out', 'Check Type']) || 'Attendance') 
                      : getPropCaseInsensitive(selectedRequest, ['Leave Type', 'leave_type', 'Type', 'type', 'Action', 'action', 'Status Type', 'Attendance Type'], '-');
                    return (
                      <span className={`text-xs sm:text-sm font-bold ${getReqTypeColor(modalReqType, selectedRequest._category)}`}>
                        {modalReqType}
                      </span>
                    );
                  })()}
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">{t.reqCurrentStatus}</span>
                  <span className={`text-xs sm:text-sm font-bold ${isRejectedStatus(getRowStatus(selectedRequest)) || (getRowStatus(selectedRequest) || '').toLowerCase().replace(/[\s_-]/g, '') === 'cancelled' ? 'text-red-600' : isApprovedStatus(getRowStatus(selectedRequest)) ? 'text-green-700' : 'text-yellow-600'}`}>
                    {getRowStatus(selectedRequest) || 'Approved'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">{selectedRequest._category === 'Attendance' ? t.reqAttTime : t.reqFromDate}</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800">
                    {selectedRequest._category === 'Attendance'
                       ? formatDateTimeDisplay(getPropCaseInsensitive(selectedRequest, ['Time', 'time', 'created_at', 'CreatedDate', 'From Date', 'from_date', 'Start Date', 'start_date', 'Date', 'date', 'Tanggal', 'attendance_date']), lang)
                       : formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['From Date', 'from_date', 'Start Date', 'start_date', 'Date', 'date', 'Tanggal', 'attendance_date', 'created_at', 'CreatedDate']), lang)}
                  </span>
                </div>
                
                {selectedRequest._category === 'Leave' ? (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">{t.reqToDate}</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['To Date', 'to_date', 'End Date', 'end_date']), lang)}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">{t.reqLastEdit}</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDateTimeDisplay(getPropCaseInsensitive(selectedRequest, ['lasteditdate', 'last_edit_date', 'last_editdate', 'updated_at', 'Time', 'time', 'Time In', 'time_in', 'Clock In', 'Clock Out', 'Shift', 'shift']), lang)}
                    </span>
                  </div>
                )}
              </div>

              {selectedRequest._category === 'Leave' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">{t.reqTotalDays}</span>
                    <span className="text-xs sm:text-sm font-black text-gray-800">
                      {getPropCaseInsensitive(selectedRequest, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration'], '1')} Day(s)
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">{t.reqFinalBal}</span>
                    <span className="text-xs sm:text-sm font-black text-gray-800">
                      {getPropCaseInsensitive(selectedRequest, ['Final balance', 'final_balance', 'Final Balance'], '-')}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <span className="text-[10px] text-gray-400 font-semibold block">{t.reqReason}</span>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                  {getPropCaseInsensitive(selectedRequest, ['Reason', 'reason', 'Description', 'description', 'notes', 'Notes', 'keterangan'], '-')}
                </p>
              </div>

              {selectedRequest._category === 'Attendance' && (() => {
                const locData = getAttendanceLocation(selectedRequest);
                return (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t.reqAttLoc}
                      </span>
                      {locData && (
                        <a
                          href={locData.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-bold flex items-center gap-1"
                        >
                          <span>{t.reqOpenMap}</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {locData ? (
                      <>
                        <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                          <iframe
                            title="Attendance Location Map"
                            src={locData.embedUrl}
                            width="100%"
                            height="100%"
                            className="border-0 w-full h-full"
                            loading="lazy"
                            allowFullScreen
                          />
                        </div>
                        {locData.query && (
                          <div className="text-[11px] text-gray-500 font-medium mt-1.5 flex items-center justify-between">
                            <span className="truncate">Coordinates / Location: <span className="font-semibold text-gray-700">{locData.query}</span></span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-6 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <svg className="w-8 h-8 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs">{t.reqNoLoc}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {getPropCaseInsensitive(selectedRequest, ['Link', 'link', 'Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']) && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block mb-2">{t.reqProof}</span>
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
                        {t.reqClickEnlarge}
                      </button>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.reqProofDesc}</p>
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
                {t.btnCancel}
              </button>
              {(() => {
                const s = getRowStatus(selectedRequest);
                if (isRejectedStatus(s) || s.toLowerCase().replace(/[\s_-]/g, '') === 'cancelled') {
                  return null;
                }
                if (isApprovedStatus(s) || s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel') {
                  return (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleCancelApproved(selectedRequest)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      {s.toLowerCase().replace(/[\s_-]/g, '') === 'requesttocancel' ? t.btnApproveCancel : 'Cancel Approval'}
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
                      {t.btnReject}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        if (window.confirm(currentLang === 'id' ? 'Anda yakin ingin menyetujui permintaan ini?' : 'Are you sure you want to approve this request?')) {
                          handleUpdateStatus(selectedRequest, 'Approved');
                        }
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {isProcessing ? t.btnSaving : t.btnApprove}
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
            <h3 className="text-base font-bold text-gray-900 mb-1">{t.confRejectTitle}</h3>
            <p className="text-xs text-gray-500 mb-3">
              {t.confRejectDesc} <strong>{itemToReject._category || 'Leave'}</strong> {t.confRejectFrom}{' '}
              <strong>{getPropCaseInsensitive(itemToReject, ['Name', 'name', 'nama', 'fullname'])}</strong>.
            </p>

            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.confReasonLbl} <span className="text-gray-400 font-normal">{t.confReasonOpt}</span>
            </label>
            <textarea
              rows="3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.confReasonPh}
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
                {t.btnCancel}
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isProcessing ? t.btnSaving : t.btnRejectReq}
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
              <span className="text-xs font-bold text-gray-700">{t.previewTitle}</span>
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
