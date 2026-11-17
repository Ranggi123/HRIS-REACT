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

  const mSlash = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (mSlash) {
    const n1 = parseInt(mSlash[1], 10);
    const n2 = parseInt(mSlash[2], 10);
    const y = parseInt(mSlash[3], 10);
    let hh = mSlash[4] ? parseInt(mSlash[4], 10) : 0;
    const mm = mSlash[5] ? parseInt(mSlash[5], 10) : 0;
    const ss = mSlash[6] ? parseInt(mSlash[6], 10) : 0;
    const ampm = mSlash[7] ? mSlash[7].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return new Date(y, n2 - 1, n1, hh, mm, ss);
  }

  const mIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (mIso && !str.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(
      parseInt(mIso[1], 10),
      parseInt(mIso[2], 10) - 1,
      parseInt(mIso[3], 10),
      mIso[4] ? parseInt(mIso[4], 10) : 0,
      mIso[5] ? parseInt(mIso[5], 10) : 0,
      mIso[6] ? parseInt(mIso[6], 10) : 0
    );
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
};

const toIsoTimestampString = (val, fallbackDateVal = null) => {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.replace(' ', 'T');
  }

  const mYmdSlash = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (mYmdSlash) {
    const y = mYmdSlash[1];
    const m = mYmdSlash[2].padStart(2, '0');
    const d = mYmdSlash[3].padStart(2, '0');
    let hh = mYmdSlash[4] ? parseInt(mYmdSlash[4], 10) : 0;
    const mm = mYmdSlash[5] ? mYmdSlash[5].padStart(2, '0') : '00';
    const ss = mYmdSlash[6] ? mYmdSlash[6].padStart(2, '0') : '00';
    const ampm = mYmdSlash[7] ? mYmdSlash[7].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return `${y}-${m}-${d}T${String(hh).padStart(2, '0')}:${mm}:${ss}`;
  }

  const mDmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (mDmy) {
    const d = mDmy[1].padStart(2, '0');
    const m = mDmy[2].padStart(2, '0');
    const y = mDmy[3];
    let hh = mDmy[4] ? parseInt(mDmy[4], 10) : 0;
    const mm = mDmy[5] ? mDmy[5].padStart(2, '0') : '00';
    const ss = mDmy[6] ? mDmy[6].padStart(2, '0') : '00';
    const ampm = mDmy[7] ? mDmy[7].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return `${y}-${m}-${d}T${String(hh).padStart(2, '0')}:${mm}:${ss}`;
  }

  const mTimeOnly = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (mTimeOnly && fallbackDateVal) {
    let hh = parseInt(mTimeOnly[1], 10);
    const mm = mTimeOnly[2].padStart(2, '0');
    const ss = mTimeOnly[3] ? mTimeOnly[3].padStart(2, '0') : '00';
    const ampm = mTimeOnly[4] ? mTimeOnly[4].toUpperCase() : '';
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    const fbIso = toIsoTimestampString(fallbackDateVal);
    const datePart = fbIso ? fbIso.split('T')[0] : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return `${datePart}T${String(hh).padStart(2, '0')}:${mm}:${ss}`;
    }
  }

  return str;
};

const addDaysIso = (dateVal, daysToAdd) => {
  const parsed = parseFlexibleDate(dateVal);
  if (!parsed || isNaN(parsed.getTime())) return '';
  const res = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + daysToAdd);
  const y = res.getFullYear();
  const m = String(res.getMonth() + 1).padStart(2, '0');
  const d = String(res.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toIsoDateString = (val) => {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const str = String(val).trim();
  const mIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mIso) {
    return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  }
  const mDmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (mDmy) {
    return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
  }
  const parsed = parseFlexibleDate(str);
  if (parsed && !isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
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

const getValidPropCaseInsensitive = (obj, candidateKeys, fallback = '') => {
  if (!obj) return fallback;
  const keys = Object.keys(obj);
  for (const cand of candidateKeys) {
    const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
    const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
    if (found && obj[found] !== null && obj[found] !== undefined) {
      const val = String(obj[found]).trim();
      const lowerVal = val.toLowerCase();
      if (val !== '' && lowerVal !== '-' && lowerVal !== 'null' && lowerVal !== 'undefined') {
        return val;
      }
    }
  }
  return fallback;
};

const normalizeText = (val) => String(val || '').replace(/\s+/g, ' ').trim().toLowerCase();

const fetchAllRows = async (tableName, maxRows = 100000) => {
  const pageSize = 1000;
  const batchPages = 5;
  let allData = [];
  let startPage = 0;

  while (startPage * pageSize < maxRows) {
    const promises = [];
    for (let i = 0; i < batchPages; i++) {
      const pageIdx = startPage + i;
      const from = pageIdx * pageSize;
      if (from >= maxRows) break;
      const to = from + pageSize - 1;
      promises.push(
        supabase
          .from(tableName)
          .select('*')
          .range(from, to)
      );
    }

    const results = await Promise.all(promises);
    let reachedEnd = false;

    for (let i = 0; i < results.length; i++) {
      let res = results[i];
      if (res.error) {
        const from = (startPage + i) * pageSize;
        const to = from + pageSize - 1;
        res = await supabase.from(tableName).select('*').range(from, to);
      }

      if (res.error) {
        console.warn(`[Approval] Error fetching ${tableName} page ${startPage + i}:`, res.error);
        reachedEnd = true;
        break;
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length > 0) {
        allData = allData.concat(rows);
      }
      if (rows.length < pageSize) {
        reachedEnd = true;
        break;
      }
    }

    if (reachedEnd) break;
    startPage += batchPages;
  }

  return allData;
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

const matchesLineManagerWorkEmail = (record, targetWorkEmail) => {
  if (!record) return false;
  const cleanTarget = normalizeText(targetWorkEmail);
  if (!cleanTarget || cleanTarget === '-' || cleanTarget === 'null' || cleanTarget === 'undefined') {
    return false;
  }

  const mgrCandidateKeys = [
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
  ];

  const keys = Object.keys(record);
  for (const cand of mgrCandidateKeys) {
    const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
    const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
    if (found && record[found] !== null && record[found] !== undefined) {
      const rawVal = String(record[found]).trim();
      const normVal = normalizeText(rawVal);
      if (!normVal || normVal === '-' || normVal === 'null' || normVal === 'undefined') {
        continue;
      }
      const tokens = normVal
        .split(/[,;]+/)
        .map(part => {
          const angleMatch = part.match(/<([^>]+)>/);
          return normalizeText(angleMatch ? angleMatch[1] : part);
        })
        .filter(v => v && v !== '-' && v !== 'null' && v !== 'undefined');

      if (tokens.includes(cleanTarget)) {
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
  const lang = currentLang;

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
    deptFilterAll: 'Semua Departemen',
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
    calDescAllCompany: 'Menampilkan jadwal seluruh karyawan perusahaan',
    calDescMulti: 'Menampilkan jadwal untuk {count} karyawan terpilih',
    calDescOne: 'Menampilkan jadwal untuk:',
    calFilterEmpBtn: 'Filter Karyawan',
    calFilterAllOpt: 'Semua Karyawan',
    calFilterSearchPh: 'Cari nama karyawan...',
    calFilterClear: 'Reset',
    legend: 'Legenda',
    legWorking: 'Hari Kerja',
    legSick: 'Sakit / Melahirkan',
    legOff: 'Hari Libur',
    legPublicHoliday: 'Public Holiday',
    legLeave: 'Cuti Tahunan / DP / EO',
    legNoSched: 'Tidak Ada Jadwal',
    btnThisMonth: 'Bulan Ini',
    statOff: 'Libur',
    statPublicHoliday: 'Public Holiday',
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
    btnRequestWork: 'Request Work',
    btnSubmitRequest: 'Kirim Permintaan',
    phModalTitle: 'Work on Public Holiday',
    phModalSub: 'Ajukan permintaan bekerja pada hari libur nasional',
    lblDate: 'Tanggal (Hanya Baca)',
    lblBarcode: 'Barcode Karyawan',
    lblName: 'Nama Karyawan',
    lblType: 'Tipe Hari',
    lblTypeReadOnly: 'Tipe Hari (Tidak Dapat Diubah)',
    lblShift: 'Shift Kerja',
    lblShiftHint: 'Angka belakang menunjukkan jam mulai',
    lblAutoCalc: 'Kalkulasi Jam Kerja Otomatis',
    lblStart: 'Waktu Mulai:',
    lblEnd: 'Waktu Selesai:',
    phAlreadyRequested: 'Request to Work on Public Holiday sudah diajukan',
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
    errFilterFirst: 'Silakan pilih karyawan'
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
    deptFilterAll: 'All Departments',
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
    calDescAllCompany: 'Showing schedules for all company employees',
    calDescMulti: 'Showing schedules for {count} selected employees',
    calDescOne: 'Showing schedule for:',
    calFilterEmpBtn: 'Filter Employees',
    calFilterAllOpt: 'All Employees',
    calFilterSearchPh: 'Search employee name...',
    calFilterClear: 'Reset',
    legend: 'Legend',
    legWorking: 'Working Day',
    legSick: 'Sick / Maternity',
    legOff: 'Day Off',
    legPublicHoliday: 'Public Holiday',
    legLeave: 'Annual Leave / DP / EO',
    legNoSched: 'No Schedule',
    btnThisMonth: 'This Month',
    statOff: 'Day Off',
    statPublicHoliday: 'Public Holiday',
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
    btnRequestWork: 'Request Work',
    btnSubmitRequest: 'Submit Request',
    phModalTitle: 'Work on Public Holiday',
    phModalSub: 'Submit request to work on public holiday',
    lblDate: 'Date (Read-Only)',
    lblBarcode: 'Employee Barcode',
    lblName: 'Employee Name',
    lblType: 'Day Type',
    lblTypeReadOnly: 'Day Type (Read-Only)',
    lblShift: 'Work Shift',
    lblShiftHint: 'Trailing number indicates start hour',
    lblAutoCalc: 'Auto Calculate Work Hours',
    lblStart: 'Start Time:',
    lblEnd: 'End Time:',
    phAlreadyRequested: 'Work on Public Holiday already requested',
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
    errFilterFirst: 'Please select employee'
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

  const currentUser = propCurrentUser || context.currentUser || sessionUser;

  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawDirEmployees, setRawDirEmployees] = useState([]);
  const [rawCompanies, setRawCompanies] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [rawLeaves, setRawLeaves] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawSchedules, setRawSchedules] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('leave');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [teamScheduleModalData, setTeamScheduleModalData] = useState(null);

  const [statusTab, setStatusTab] = useState('pending');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [calendarSelectedEmployees, setCalendarSelectedEmployees] = useState([]);
  const [isCalEmpDropdownOpen, setIsCalEmpDropdownOpen] = useState(false);
  const [calEmpSearch, setCalEmpSearch] = useState('');
  const calEmpDropdownRef = useRef(null);

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

  const [publicHolidayRecords, setPublicHolidayRecords] = useState([]);
  const [workOnPhModal, setWorkOnPhModal] = useState(null);
  const [isSavingWorkOnPh, setIsSavingWorkOnPh] = useState(false);

  const userWorkEmail = useMemo(() => {
    return (
      getValidPropCaseInsensitive(currentUser, [
        'Employee work email',
        'employee_work_email',
        'work_email',
        'work email',
        'Work Email'
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
      const [dirRes, compRes, holRes, lvRes, attRes, schedRes, pubHolRes] = await Promise.allSettled([
        fetchAllRows('employee_directory', 20000),
        fetchAllRows('company', 5000),
        fetchAllRows('holiday_balance', 50000),
        fetchAllRows('leave_requests', 50000),
        fetchAllRows('attendance', 100000),
        fetchAllRows('schedule', 100000),
        fetchAllRows('public_holidays', 2000)
      ]);
      const pubHolData = pubHolRes.status === 'fulfilled' && Array.isArray(pubHolRes.value) ? pubHolRes.value : [];
      setPublicHolidayRecords(pubHolData);

      const dirData = dirRes.status === 'fulfilled' && Array.isArray(dirRes.value) ? dirRes.value : [];
      const compData = compRes.status === 'fulfilled' && Array.isArray(compRes.value) ? compRes.value : [];
      const holData = holRes.status === 'fulfilled' && Array.isArray(holRes.value) ? holRes.value : [];
      const lvData = lvRes.status === 'fulfilled' && Array.isArray(lvRes.value) ? lvRes.value : [];
      let attData = attRes.status === 'fulfilled' && Array.isArray(attRes.value) ? [...attRes.value] : [];
      const schedData = schedRes.status === 'fulfilled' && Array.isArray(schedRes.value) ? schedRes.value : [];

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

      setRawDirEmployees(dirData);
      setRawCompanies(compData);
      setRawHolidays(holData);
      setRawLeaves(lvData);
      setRawAttendance(attData);
      setRawSchedules(schedData);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('[Approval] Error fetching approval records:', err);
    }
    setLoading(false);
  }, [userWorkEmail, topNavEmail, userName]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const {
    teamMembers,
    leaveRequests,
    attendanceRequests,
    teamScheduleRecords,
    resolvedUserWorkEmail,
    resolvedUserName,
    isHrActive,
    isHrManagerActive
  } = useMemo(() => {
    const cleanLoginEmail = (topNavEmail || userWorkEmail || '').trim().toLowerCase();
    const loginPrefix = cleanLoginEmail.includes('@') ? cleanLoginEmail.split('@')[0] : cleanLoginEmail;
    const currentEmpId = normalizeText(getValidPropCaseInsensitive(currentUser, ['Employee ID', 'employee_id', 'Barcode', 'barcode'], ''));

    let effectiveWorkEmail = userWorkEmail;
    let realName = userName;
    let profileDept = normalizeText(getValidPropCaseInsensitive(currentUser, ['Department', 'department', 'dept', 'Dept'], ''));
    let profileJobLevel = normalizeText(getValidPropCaseInsensitive(currentUser, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
    let profileStatus = normalizeText(getValidPropCaseInsensitive(currentUser, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));

    const companyCandidateKeys = [
      'Company', 'company', 'Company Name', 'company_name', 'companyname',
      'CompanyUID', 'companyuid', 'company_uid', 'company_id', 'Company Code', 'company_code'
    ];
    const compLookupKeys = [
      'CompanyUID', 'companyuid', 'Company UID', 'company_uid',
      'Company ID', 'company_id', 'Company Code', 'company_code',
      'id', 'uid', 'Company Name', 'company_name', 'CompanyName',
      'Company', 'company', 'name', 'Name', 'Nama Perusahaan'
    ];
    let profileCompany = getValidPropCaseInsensitive(currentUser, companyCandidateKeys, '').replace(/\s+/g, ' ').trim();

    const myProfile = rawDirEmployees.find(emp => {
      const empEmail = (getValidPropCaseInsensitive(emp, ['Email', 'email', 'Email Address', 'email_address', 'user_uid']) || '').trim().toLowerCase();
      const empWorkEmail = (getValidPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']) || '').trim().toLowerCase();
      const empName = normalizeText(getValidPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name']));
      const empId = normalizeText(getValidPropCaseInsensitive(emp, ['Employee ID', 'employee_id', 'Barcode', 'barcode']));

      const empEmailPrefix = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;
      const empWorkPrefix = empWorkEmail.includes('@') ? empWorkEmail.split('@')[0] : empWorkEmail;

      if (cleanLoginEmail) {
        if (empEmail === cleanLoginEmail || empWorkEmail === cleanLoginEmail) return true;
        if (loginPrefix && (empEmailPrefix === loginPrefix || empWorkPrefix === loginPrefix)) return true;
      }
      if (currentEmpId && empId && empId === currentEmpId) return true;
      if (userName && empName === normalizeText(userName)) return true;
      return false;
    });

    if (myProfile) {
      const foundWorkEmail = getValidPropCaseInsensitive(myProfile, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']).trim().toLowerCase();
      effectiveWorkEmail = foundWorkEmail || '';

      const foundName = getValidPropCaseInsensitive(myProfile, ['Name', 'name', 'nama', 'fullname', 'full_name']);
      if (foundName) realName = foundName;

      const foundDept = normalizeText(getValidPropCaseInsensitive(myProfile, ['Department', 'department', 'dept', 'Dept'], ''));
      if (foundDept) profileDept = foundDept;

      const foundJobLevel = normalizeText(getValidPropCaseInsensitive(myProfile, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
      if (foundJobLevel) profileJobLevel = foundJobLevel;

      const foundStatus = normalizeText(getValidPropCaseInsensitive(myProfile, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
      if (foundStatus) profileStatus = foundStatus;

      const foundCompany = getValidPropCaseInsensitive(myProfile, companyCandidateKeys, '').replace(/\s+/g, ' ').trim();
      if (foundCompany) profileCompany = foundCompany;
    }

    const cleanEffectiveWorkEmail = normalizeText(effectiveWorkEmail);
    const hasValidWorkEmail = Boolean(
      cleanEffectiveWorkEmail &&
      cleanEffectiveWorkEmail !== '-' &&
      cleanEffectiveWorkEmail !== 'null' &&
      cleanEffectiveWorkEmail !== 'undefined'
    );

    const userCompanyKeys = new Set();
    if (profileCompany && profileCompany !== '-') {
      const targetNorm = normalizeText(profileCompany);
      userCompanyKeys.add(targetNorm);
      const matchedComp = rawCompanies.find(c =>
        compLookupKeys.some(k => {
          const val = normalizeText(getValidPropCaseInsensitive(c, [k], ''));
          return val && val === targetNorm;
        })
      );
      if (matchedComp) {
        compLookupKeys.forEach(k => {
          const val = normalizeText(getValidPropCaseInsensitive(matchedComp, [k], ''));
          if (val) userCompanyKeys.add(val);
        });
      }
    }

    const isHrDept = profileDept === 'human resources' || profileDept === 'human resource' || profileDept === 'hr';
    const isManagerJobLevel = profileJobLevel === 'manager';
    const isStatusActive = profileStatus === 'active';
    const isHrActive = isHrDept && isStatusActive && userCompanyKeys.size > 0;
    const isHrManagerActive = isHrActive && isManagerJobLevel;

    const getRowCompanyValues = (obj) => {
      if (!obj) return [];
      const vals = [];
      const keys = Object.keys(obj);
      for (const cand of companyCandidateKeys) {
        const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
        const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
        if (found && obj[found] !== null && obj[found] !== undefined) {
          const normVal = normalizeText(obj[found]);
          if (normVal && normVal !== '-' && normVal !== 'null' && normVal !== 'undefined') {
            vals.push(normVal);
          }
        }
      }
      return vals;
    };

    const rowBelongsToUserCompany = (obj, fallbackMatchFn) => {
      if (!obj || userCompanyKeys.size === 0) return false;
      const vals = getRowCompanyValues(obj);
      if (vals.length > 0) {
        return vals.some(v => userCompanyKeys.has(v));
      }
      return typeof fallbackMatchFn === 'function' ? fallbackMatchFn(obj) : false;
    };

    // Track all Active employees in employee_directory
    const activeDirEmailSet = new Set();
    const activeDirIdentifierSet = new Set();
    const nonActiveDirIdentifierSet = new Set();

    rawDirEmployees.forEach(emp => {
      const statusRaw = normalizeText(getValidPropCaseInsensitive(emp, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
      const isEmpActive = statusRaw === 'active';

      const wMail = (getValidPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'work email', 'Work Email']) || '').trim().toLowerCase();
      const pMail = (getValidPropCaseInsensitive(emp, ['email', 'Email', 'Email Address', 'email_address', 'user_uid']) || '').trim().toLowerCase();
      const bCode = normalizeText(getValidPropCaseInsensitive(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id', 'nik', 'nip'], ''));
      const eName = normalizeText(getValidPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], ''));

      const keysToRegister = [wMail, pMail, bCode, eName].filter(Boolean);
      if (isEmpActive) {
        if (wMail) activeDirEmailSet.add(wMail);
        if (pMail) activeDirEmailSet.add(pMail);
        keysToRegister.forEach(k => activeDirIdentifierSet.add(k));
      } else {
        keysToRegister.forEach(k => nonActiveDirIdentifierSet.add(k));
      }
    });

    const isRowEmployeeActive = (row) => {
      if (rawDirEmployees.length === 0) return true;
      const empVal = normalizeText(getValidPropCaseInsensitive(row, [
        'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
        'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
        'Barcode', 'barcode', 'Employee ID', 'employee_id'
      ]));
      const rowNameVal = normalizeText(getValidPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name']));

      if (empVal && (activeDirEmailSet.has(empVal) || activeDirIdentifierSet.has(empVal))) return true;
      if (rowNameVal && activeDirIdentifierSet.has(rowNameVal)) return true;

      if (empVal && nonActiveDirIdentifierSet.has(empVal)) return false;
      if (rowNameVal && nonActiveDirIdentifierSet.has(rowNameVal)) return false;

      return false;
    };

    // Only employees with Status === 'active' AND (Company match for HR Manager OR Line Manager === userWorkEmail)
    const subordinates = rawDirEmployees.filter(row => {
      const statusRaw = normalizeText(getValidPropCaseInsensitive(row, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
      if (statusRaw !== 'active') return false;

      if (isHrActive) {
        return rowBelongsToUserCompany(row, (r) => matchesLineManagerWorkEmail(r, cleanEffectiveWorkEmail));
      }

      if (!hasValidWorkEmail) return false;
      
      const lineMgrEmail = normalizeText(getValidPropCaseInsensitive(row, [
        'Line Manager work email', 'line_manager_work_email',
        'Line Manager Email', 'line_manager_email',
        'Line Manager', 'line_manager', 'Line_Manager', 'linemanager',
        'manager_email', 'Manager Email', 'Manager', 'manager',
        'Approver Email', 'approver_email', 'Approver', 'approver',
        'Atasan Email', 'atasan_email', 'Atasan', 'atasan',
        'atasan_langsung', 'Atasan Langsung', 'approval_line_manager'
      ], ''));

      if (!lineMgrEmail || lineMgrEmail === '-' || lineMgrEmail === 'null' || lineMgrEmail === 'undefined') {
        return false;
      }

      return matchesLineManagerWorkEmail(row, cleanEffectiveWorkEmail);
    });

    const subordinateEmailSet = new Set();
    const subordinateIdentifiers = new Set();
    const uniqueMap = new Map();

    subordinates.forEach(emp => {
      const workMail = (getValidPropCaseInsensitive(emp, [
        'Employee work email',
        'employee_work_email',
        'work_email',
        'work email',
        'Work Email'
      ]) || '').trim().toLowerCase();

      const personalMail = (getValidPropCaseInsensitive(emp, [
        'email',
        'Email',
        'Email Address',
        'user_uid'
      ]) || '').trim().toLowerCase();

      const userUidVal = (getValidPropCaseInsensitive(emp, ['USER_UID', 'user_uid', 'uid']) || '').trim().toLowerCase();
      const barcodeVal = (getValidPropCaseInsensitive(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id', 'nik', 'nip']) || '').trim();
      const name = getValidPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], workMail || personalMail || barcodeVal);
      const email = workMail || personalMail || barcodeVal.toLowerCase();
      const empAllEmails = Array.from(new Set([workMail, personalMail, userUidVal, barcodeVal.toLowerCase()].filter(Boolean)));

      empAllEmails.forEach(m => {
        subordinateEmailSet.add(m);
        subordinateIdentifiers.add(m);
      });
      if (name) subordinateIdentifiers.add(normalizeText(name));
      if (barcodeVal) subordinateIdentifiers.add(normalizeText(barcodeVal));

      if (email && !uniqueMap.has(email)) {
        let empDayOff = 0;
        let empExtraOff = 0;
        const validKeys = [...empAllEmails, normalizeText(name), normalizeText(barcodeVal)].filter(Boolean);

        rawHolidays.forEach(hRow => {
          const hStatus = normalizeText(getValidPropCaseInsensitive(hRow, ['status', 'Status', 'STATUS'], ''));
          if (hStatus === 'unused') {
            const hEmp = normalizeText(getValidPropCaseInsensitive(hRow, ['employee', 'Employee', 'user_uid', 'email', 'employee_id', 'Name', 'name']));
            if (validKeys.some(k => hEmp === k || hEmp.includes(k) || k.includes(hEmp))) {
              const typ = normalizeText(getValidPropCaseInsensitive(hRow, ['Type Holiday', 'type_holiday', 'Type', 'type'], ''));
              let d = getValidPropCaseInsensitive(hRow, ['Days', 'days', 'Amount', 'amount', 'Total', 'total']);
              let val = (d && !isNaN(d)) ? parseFloat(d) : 1;
              if (typ === 'day off payment') empDayOff += val;
              else if (typ === 'extra off') empExtraOff += val;
            }
          }
        });

        const dept = normalizeText(getValidPropCaseInsensitive(emp, ['Department', 'department', 'dept', 'Dept'], ''));
        const empCompany = getValidPropCaseInsensitive(emp, companyCandidateKeys, '');
        const empReligion = getValidPropCaseInsensitive(emp, ['Religion', 'religion', 'Agama', 'agama'], '');
        const empLineMgr = getValidPropCaseInsensitive(emp, [
          'Line Manager work email', 'line_manager_work_email',
          'Line Manager Email', 'line_manager_email',
          'Line Manager', 'line_manager', 'Line_Manager', 'linemanager',
          'manager_email', 'Manager Email', 'Manager', 'manager'
        ], '');
        uniqueMap.set(email, {
          email,
          emails: empAllEmails,
          name,
          barcode: barcodeVal,
          department: dept,
          company: empCompany,
          religion: empReligion,
          lineManager: empLineMgr,
          standart_working_day: getValidPropCaseInsensitive(emp, ['Standart Working Day', 'standart_working_day', 'Standard Working Day', 'standard_working_day']) || 'BACKOFFICE52',
          annual_leave_balance: getValidPropCaseInsensitive(emp, ['Annual Leave Balance', 'annual_leave_balance', 'Annual Leave', 'annualleave']) || '0',
          day_off_payment_balance: empDayOff,
          extra_off_balance: empExtraOff
        });
      }
    });

    const sortedTeamMembers = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const matchesScopedEmployee = (row) => {
      const empVal = normalizeText(getValidPropCaseInsensitive(row, [
        'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
        'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
        'Barcode', 'barcode', 'Employee ID', 'employee_id'
      ]));
      const rowNameVal = normalizeText(getValidPropCaseInsensitive(row, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name']));
      if (empVal && (subordinateEmailSet.has(empVal) || subordinateIdentifiers.has(empVal))) return true;
      if (rowNameVal && subordinateIdentifiers.has(rowNameVal)) return true;
      return false;
    };

    const hasExplicitLineManager = (row) => {
      if (!row) return false;
      const val = getValidPropCaseInsensitive(row, [
        'Line Manager work email', 'line_manager_work_email',
        'Line Manager Email', 'line_manager_email',
        'Line Manager', 'line_manager', 'Line_Manager', 'linemanager',
        'manager_email', 'Manager Email', 'Manager', 'manager',
        'Approver Email', 'approver_email', 'Approver', 'approver',
        'Atasan Email', 'atasan_email', 'Atasan', 'atasan',
        'atasan_langsung', 'Atasan Langsung', 'approval_line_manager'
      ], '');
      return Boolean(val);
    };

    const filteredLeaves = rawLeaves
      .filter(row => {
        const status = getRowStatus(row);
        const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status) || isRejectedStatus(status);
        if (!isRelevant) return false;
        if (!isRowEmployeeActive(row)) return false;

        if (isHrActive) {
          return rowBelongsToUserCompany(row, matchesScopedEmployee);
        }

        if (!hasValidWorkEmail) return false;
        const empVal = normalizeText(getValidPropCaseInsensitive(row, [
          'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
          'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
          'Barcode', 'barcode', 'Employee ID', 'employee_id'
        ]));
        const isSelf = empVal && (empVal === cleanEffectiveWorkEmail || (cleanLoginEmail && empVal === cleanLoginEmail));
        if (isSelf) return false;

        if (hasExplicitLineManager(row)) {
          return matchesLineManagerWorkEmail(row, cleanEffectiveWorkEmail);
        }
        return matchesScopedEmployee(row);
      })
      .map(row => ({
        ...row,
        _category: 'Leave',
        _sourceTable: 'leave_requests'
      }));

    const filteredAttendance = rawAttendance
      .filter(row => {
        const status = getRowStatus(row);
        const isRelevant = isPendingApprovalStatus(status) || isApprovedStatus(status) || isRejectedStatus(status);
        if (!isRelevant) return false;
        if (!isRowEmployeeActive(row)) return false;

        if (isHrActive) {
          return rowBelongsToUserCompany(row, matchesScopedEmployee);
        }

        if (!hasValidWorkEmail) return false;
        const empEmail = normalizeText(getValidPropCaseInsensitive(row, [
          'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
          'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
          'Barcode', 'barcode', 'Employee ID', 'employee_id'
        ]));
        const isSelf = empEmail && (empEmail === cleanEffectiveWorkEmail || (cleanLoginEmail && empEmail === cleanLoginEmail));
        if (isSelf) return false;

        if (hasExplicitLineManager(row)) {
          return matchesLineManagerWorkEmail(row, cleanEffectiveWorkEmail);
        }
        return matchesScopedEmployee(row);
      })
      .map(row => ({
        ...row,
        _category: 'Attendance',
        _sourceTable: 'attendance'
      }));

    const filteredSchedules = rawSchedules.filter(row => {
      if (!isRowEmployeeActive(row)) return false;

      if (isHrActive) {
        return rowBelongsToUserCompany(row, matchesScopedEmployee);
      }

      if (!hasValidWorkEmail) return false;
      return matchesScopedEmployee(row);
    });

    return {
      teamMembers: sortedTeamMembers,
      leaveRequests: filteredLeaves,
      attendanceRequests: filteredAttendance,
      teamScheduleRecords: filteredSchedules,
      resolvedUserWorkEmail: hasValidWorkEmail ? cleanEffectiveWorkEmail : '',
      resolvedUserName: realName,
      isHrActive,
      isHrManagerActive
    };
  }, [
    rawDirEmployees,
    rawCompanies,
    rawHolidays,
    rawLeaves,
    rawAttendance,
    rawSchedules,
    currentUser,
    userWorkEmail,
    topNavEmail,
    userName
  ]);

  const uniqueDepartments = useMemo(() => {
    if (!teamMembers) return [];
    const depts = new Set(teamMembers.map(m => m.department).filter(d => d && d !== '-' && d !== 'null' && d !== 'undefined'));
    return Array.from(depts).sort();
  }, [teamMembers]);

  useEffect(() => {
    setActualUserWorkEmail(resolvedUserWorkEmail || '');
    setActualUserName(resolvedUserName || userName);
  }, [resolvedUserWorkEmail, resolvedUserName, userName]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (calEmpDropdownRef.current && !calEmpDropdownRef.current.contains(e.target)) {
        setIsCalEmpDropdownOpen(false);
      }
    };
    if (isCalEmpDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCalEmpDropdownOpen]);

  useEffect(() => {
      if (showFilterAlert && employeeDropdownRef.current) {
          employeeDropdownRef.current.classList.add('ring-2', 'ring-red-400', 'ring-offset-1');
          employeeDropdownRef.current.focus();

          try {
             employeeDropdownRef.current.click();
             const event = new MouseEvent('mousedown', {
                 view: window,
                 bubbles: true,
                 cancelable: true
             });
             employeeDropdownRef.current.dispatchEvent(event);
          } catch(e) {}
          
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

  const selectedMemberObj = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') return null;
    return teamMembers.find(m => m.email.toLowerCase() === selectedEmployee.toLowerCase()) || null;
  }, [selectedEmployee, teamMembers]);

  const employeeSummary = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') {
      return { annual: '-', dayOff: '-', extraOff: '-' };
    }
    const profile = selectedMemberObj || {};
    return {
       annual: profile.annual_leave_balance !== undefined && profile.annual_leave_balance !== '' ? profile.annual_leave_balance : '0',
       dayOff: profile.day_off_payment_balance !== undefined ? profile.day_off_payment_balance : '0',
       extraOff: profile.extra_off_balance !== undefined ? profile.extra_off_balance : '0'
    };
  }, [selectedEmployee, selectedMemberObj]);

  const scopedCalendarMembers = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === 'all') return teamMembers;
    const targetDept = selectedDepartment.toLowerCase();
    return teamMembers.filter(m => (m.department || '') === targetDept);
  }, [teamMembers, selectedDepartment]);

  const isSingleEmployeeCalendar = useMemo(() => {
    if (selectedEmployee && selectedEmployee !== 'all') return true;
    if (calendarSelectedEmployees.length === 1) return true;
    return false;
  }, [selectedEmployee, calendarSelectedEmployees]);

  const filteredScheduleRecords = useMemo(() => {
    let records = teamScheduleRecords;

    if (selectedDepartment && selectedDepartment !== 'all') {
      const validDeptKeys = new Set(
        scopedCalendarMembers
          .flatMap(m => [
            m.email,
            ...(m.emails || []),
            m.name ? normalizeText(m.name) : '',
            m.barcode ? normalizeText(m.barcode) : ''
          ])
          .map(v => normalizeText(v))
          .filter(Boolean)
      );
      records = records.filter(item => {
        const email = normalizeText(getPropCaseInsensitive(item, [
          'Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email', 'Employee work email'
        ]));
        return validDeptKeys.has(email);
      });
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      const target = selectedEmployee.toLowerCase();
      const validKeys = new Set([
        target,
        ...(selectedMemberObj?.emails || []),
        selectedMemberObj?.name ? normalizeText(selectedMemberObj.name) : '',
        selectedMemberObj?.barcode ? normalizeText(selectedMemberObj.barcode) : ''
      ].filter(Boolean));
      return records.filter(item => {
        const email = normalizeText(getPropCaseInsensitive(item, [
          'Employee',
          'employee',
          'email',
          'user_uid',
          'employee_email',
          'work_email',
          'Employee work email'
        ]));
        return validKeys.has(email);
      });
    }

    if (calendarSelectedEmployees.length > 0) {
      const selectedSet = new Set(calendarSelectedEmployees.map(e => e.toLowerCase()));
      const validMultiKeys = new Set(
        scopedCalendarMembers
          .filter(m => selectedSet.has(m.email.toLowerCase()))
          .flatMap(m => [
            m.email,
            ...(m.emails || []),
            m.name ? normalizeText(m.name) : '',
            m.barcode ? normalizeText(m.barcode) : ''
          ])
          .map(v => normalizeText(v))
          .filter(Boolean)
      );
      return records.filter(item => {
        const email = normalizeText(getPropCaseInsensitive(item, [
          'Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email', 'Employee work email'
        ]));
        return validMultiKeys.has(email);
      });
    }

    return records;
  }, [teamScheduleRecords, selectedDepartment, selectedEmployee, selectedMemberObj, scopedCalendarMembers, calendarSelectedEmployees]);

  const { calendarDays, calendarStats } = useMemo(() => {
    const days = [];
    let totalOff = 0;
    let totalPublicHoliday = 0;
    let totalWork = 0;
    let totalSick = 0;
    let totalLeave = 0;

    const singleTargetEmailForCal = selectedEmployee !== 'all'
      ? selectedEmployee
      : calendarSelectedEmployees.length === 1
      ? calendarSelectedEmployees[0]
      : null;
    const singleTargetMember = singleTargetEmailForCal
      ? teamMembers.find(m => m.email.toLowerCase() === singleTargetEmailForCal.toLowerCase()) || null
      : null;
    const singleTargetReligion = normalizeText(singleTargetMember?.religion || '');

    for (let day = 1; day <= totalDays; day++) {
      const currLoopDate = new Date(year, month, day);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      const teamOnThisDay = filteredScheduleRecords.filter(item => {
        const dbDate = getPropCaseInsensitive(item, ['date', 'Date', 'tanggal', 'scheduledate', 'schedule_date', 'startdate']);
        return checkDateMatch(dbDate, year, month, day);
      });

      let workingCount = 0; let sickCount = 0; let offCount = 0; let publicHolidayCount = 0; let leaveCount = 0;
      let requestedWorkOnPh = false;
      teamOnThisDay.forEach(item => {
        const typ = (getPropCaseInsensitive(item, ['type', 'Type', 'status', 'Status', 'schedule_type', 'Schedule Type']) || '').toLowerCase();
        if (typ.includes('working') || typ === 'work' || typ.includes('kerja')) workingCount++;
        else if (typ.includes('sick') || typ.includes('maternity') || typ.includes('sakit') || typ.includes('melahirkan')) sickCount++;
        else if (typ.includes('public holiday') || typ === 'holiday' || typ.includes('nasional')) publicHolidayCount++;
        else if (typ.includes('day off') || typ === 'off' || typ.includes('libur')) offCount++;
        else if (typ) leaveCount++;
        
        const reqPhVal = getPropCaseInsensitive(item, [
            'Request to Work on Public Holiday?',
            'request_to_work_on_public_holiday',
            'Request to Work on Public Holiday',
            'requesttoworkonpublicholiday'
        ], '');
        if (['true', '1', 't', 'yes', 'y'].includes(String(reqPhVal).trim().toLowerCase())) requestedWorkOnPh = true;
      });
      
      const holidaysOnDate = publicHolidayRecords.filter(item => {
        const dateVal = item.date || item.Date || item.tanggal || item.Tanggal || item.DATE;
        return checkDateMatch(dateVal, year, month, day);
      });

      let matchedHolidayForView = null;
      if (holidaysOnDate.length > 0) {
        if (isSingleEmployeeCalendar && singleTargetReligion) {
          matchedHolidayForView =
            holidaysOnDate.find(h => normalizeText(getPropCaseInsensitive(h, ['Religion', 'religion', 'Agama', 'agama'], '')) === singleTargetReligion) ||
            holidaysOnDate.find(h => {
              const r = normalizeText(getPropCaseInsensitive(h, ['Religion', 'religion', 'Agama', 'agama'], ''));
              return !r || r === '-' || r === 'all' || r === 'national' || r === 'nasional' || r === 'umum';
            }) ||
            null;
        } else {
          matchedHolidayForView = holidaysOnDate[0];
        }
      }

      const matchingHolidayName = matchedHolidayForView
        ? (matchedHolidayForView.Remarks || matchedHolidayForView.remarks || matchedHolidayForView.holiday_name || matchedHolidayForView.name || matchedHolidayForView.description || matchedHolidayForView.type || 'Public Holiday')
        : '';
        
      const isPublicHoliday = publicHolidayCount > 0 || Boolean(matchedHolidayForView);

      if (isSingleEmployeeCalendar && teamOnThisDay.length === 0 && matchedHolidayForView) {
        publicHolidayCount = 1;
      }

      totalOff += offCount;
      totalPublicHoliday += publicHolidayCount;
      totalWork += workingCount;
      totalSick += sickCount;
      totalLeave += leaveCount;

      let singleCardClass = 'bg-white border-gray-200 text-gray-700';
      let singleBadgeClass = '';
      let singleBadgeText = '';
      let singleIcon = '';
      if (isSingleEmployeeCalendar) {
        if (teamOnThisDay.length > 0) {
          const firstRec = teamOnThisDay[0];
          const rawTyp = getPropCaseInsensitive(firstRec, ['type', 'Type', 'status', 'Status', 'schedule_type', 'Schedule Type'], '');
          const shiftVal = getPropCaseInsensitive(firstRec, ['shift', 'Shift', 'jam kerja'], '');
          const tLower = rawTyp.toLowerCase();
          if (tLower.includes('working') || tLower === 'work' || tLower.includes('kerja')) {
            singleCardClass = 'bg-green-100 border-green-300 text-green-950 font-medium';
            singleBadgeClass = 'bg-green-600 text-white';
            singleBadgeText = shiftVal && shiftVal !== '-' ? `${t.badgeWork} (${shiftVal})` : t.badgeWork;
          } else if (tLower.includes('sick') || tLower.includes('maternity') || tLower.includes('sakit') || tLower.includes('melahirkan')) {
            singleCardClass = 'bg-pink-100 border-pink-300 text-pink-950 font-medium';
            singleBadgeClass = 'bg-pink-500 text-white';
            singleBadgeText = rawTyp || t.badgeSick;
            singleIcon = '💉';
          } else if (tLower.includes('public holiday') || tLower === 'holiday' || tLower.includes('nasional')) {
            singleCardClass = 'bg-purple-100 border-purple-300 text-purple-950 font-medium';
            singleBadgeClass = 'bg-purple-600 text-white';
            singleBadgeText = 'PUBLIC HOLIDAY';
            singleIcon = '🏖️';
          } else if (tLower.includes('day off') || tLower === 'off' || tLower.includes('libur')) {
            singleCardClass = 'bg-red-100 border-red-300 text-red-950 font-medium';
            singleBadgeClass = 'bg-red-600 text-white';
            singleBadgeText = rawTyp || t.badgeOff;
            singleIcon = '🏖️';
          } else if (rawTyp) {
            singleCardClass = 'bg-orange-100 border-orange-300 text-orange-950 font-medium';
            singleBadgeClass = 'bg-orange-500 text-white';
            singleBadgeText = rawTyp;
            singleIcon = '🏖️';
          }
        } else if (matchedHolidayForView) {
          singleCardClass = 'bg-purple-100 border-purple-300 text-purple-950 font-medium';
          singleBadgeClass = 'bg-purple-600 text-white';
          singleBadgeText = 'PUBLIC HOLIDAY';
          singleIcon = '🏖️';
        }
      }
      
      days.push({
        day,
        dateToPass: `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`,
        teamData: teamOnThisDay,
        counts: { workingCount, sickCount, offCount, publicHolidayCount, leaveCount },
        singleStyle: { cardClass: singleCardClass, badgeClass: singleBadgeClass, badgeText: singleBadgeText, icon: singleIcon },
        isPublicHoliday,
        requestedWorkOnPh,
        holidayRemarks: matchingHolidayName,
        isToday,
        isSunday: currLoopDate.getDay() === 0,
        isSaturday: currLoopDate.getDay() === 6
      });
    }
    return {
      calendarDays: days,
      calendarStats: { off: totalOff, publicHoliday: totalPublicHoliday, work: totalWork, sick: totalSick, leave: totalLeave }
    };
  }, [year, month, totalDays, filteredScheduleRecords, today, isSingleEmployeeCalendar, t, publicHolidayRecords, selectedEmployee, calendarSelectedEmployees, teamMembers]);

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
    const memberProfile = teamMembers.find(m => m.email.toLowerCase() === empEmail || (m.emails && m.emails.includes(empEmail))) || {};
    
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
      
      const isoSchedDate = toIsoDateString(singleScheduleEdit.date) || singleScheduleEdit.date;
      const payload = {
        Employee: singleScheduleEdit.email,
        Date: isoSchedDate,
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
          .eq(schedDateCol, isoSchedDate)
          .limit(1);
          
        if (existingCheck && existingCheck.length > 0) {
          const rowId = existingCheck[0].id;
          if (rowId) {
            const { error: saveErr } = await supabase.from('schedule').update(dbPayload).eq('id', rowId);
            if (saveErr) throw saveErr;
          } else {
            const { error: saveErr } = await supabase.from('schedule').update(dbPayload)
              .ilike(schedEmpCol, singleScheduleEdit.email)
              .eq(schedDateCol, isoSchedDate);
            if (saveErr) throw saveErr;
          }
        } else {
          const { error: saveErr } = await supabase.from('schedule').insert([{
            [schedEmpCol]: singleScheduleEdit.email,
            [schedDateCol]: isoSchedDate,
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

  const openWorkOnPublicHolidayModal = (emp, dateStr, remarks) => {
    const empEmail = (getPropCaseInsensitive(emp, ['Employee', 'employee', 'email', 'user_uid', 'employee_email']) || '').trim().toLowerCase();
    const memberProfile = teamMembers.find(m => m.email.toLowerCase() === empEmail || (m.emails && m.emails.includes(empEmail))) || {};
    const empName = getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'employee_name'], memberProfile.name || empEmail);
    const barcode = memberProfile.barcode || getPropCaseInsensitive(emp, ['barcode', 'Barcode', 'nik', 'nip', 'id', 'employee_id']) || '-';
    const stdWorkingDay = memberProfile.standart_working_day || 'BACKOFFICE52';
    const initialShift = getPropCaseInsensitive(emp, ['shift', 'Shift', 'jam kerja'], 'M9');
    const validShift = SHIFT_OPTIONS.some(s => s.value === initialShift) ? initialShift : 'M9';
    
    setWorkOnPhModal({
      id: emp.id || getPropCaseInsensitive(emp, ['id', 'ID', 'uid', '_id']),
      date: dateStr,
      email: empEmail,
      name: empName,
      barcode: barcode,
      standart_working_day: stdWorkingDay,
      type: 'Working Day',
      shift: validShift,
      holidayRemarks: remarks,
      rawRecord: emp,
      memberProfile: memberProfile
    });
    setTeamScheduleModalData(null);
  };

  const saveWorkOnPublicHoliday = async () => {
    if (!workOnPhModal) return;
    setIsSavingWorkOnPh(true);
    
    try {
      const { startTime, endTime } = getShiftTimes(workOnPhModal.shift, workOnPhModal.standart_working_day);
      const isoSchedDate = toIsoDateString(workOnPhModal.date) || workOnPhModal.date;
      const nowIso = new Date().toISOString();
      
      const loggedInEmail = getValidPropCaseInsensitive(currentUser, ['Employee work email', 'work_email', 'email', 'Email', 'USER_UID'], '');
      const loggedInName = getValidPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname'], loggedInEmail || 'Employee');

      // 1. Update/Insert Schedule row
      const payload = {
        Employee: workOnPhModal.email,
        Date: isoSchedDate,
        Type: 'Working Day',
        Shift: workOnPhModal.shift,
        'Start Time': startTime,
        'End Time': endTime,
        'Request to Work on Public Holiday?': true,
        'Request to Work on Public Holiday': true
      };
      
      const rawKeys = Object.keys(workOnPhModal.rawRecord || {});
      const schedTypeCol = resolveTableColumn(rawKeys, ['Type', 'type', 'schedule_type']) || 'Type';
      const schedShiftCol = resolveTableColumn(rawKeys, ['Shift', 'shift', 'jam kerja']) || 'Shift';
      const schedStartCol = resolveTableColumn(rawKeys, ['Start Time', 'start_time', 'starttime']) || 'Start Time';
      const schedEndCol = resolveTableColumn(rawKeys, ['End Time', 'end_time', 'endtime']) || 'End Time';
      const schedReqCol = resolveTableColumn(rawKeys, ['Request to Work on Public Holiday?', 'request_to_work_on_public_holiday', 'Request to Work on Public Holiday']) || 'Request to Work on Public Holiday?';
      const schedEmpCol = resolveTableColumn(rawKeys, ['Employee', 'employee', 'email']) || 'Employee';
      const schedDateCol = resolveTableColumn(rawKeys, ['Date', 'date', 'Tanggal', 'scheduledate', 'schedule_date']) || 'Date';
      
      const dbPayload = {
        [schedTypeCol]: 'Working Day',
        [schedShiftCol]: workOnPhModal.shift,
        [schedStartCol]: startTime,
        [schedEndCol]: endTime,
        [schedReqCol]: true
      };

      if (workOnPhModal.id) {
         const { error: saveErr } = await supabase.from('schedule').update(dbPayload).eq('id', workOnPhModal.id);
         if (saveErr) throw saveErr;
      } else {
         const { data: existingCheck } = await supabase.from('schedule').select('*').ilike(schedEmpCol, workOnPhModal.email).eq(schedDateCol, isoSchedDate).limit(1);
         if (existingCheck && existingCheck.length > 0) {
            const rowId = existingCheck[0].id;
            if (rowId) {
                const { error: saveErr } = await supabase.from('schedule').update(dbPayload).eq('id', rowId);
                if (saveErr) throw saveErr;
            } else {
                const { error: saveErr } = await supabase.from('schedule').update(dbPayload).ilike(schedEmpCol, workOnPhModal.email).eq(schedDateCol, isoSchedDate);
                if (saveErr) throw saveErr;
            }
         } else {
            const { error: saveErr } = await supabase.from('schedule').insert([{ [schedEmpCol]: workOnPhModal.email, [schedDateCol]: isoSchedDate, ...dbPayload }]);
            if (saveErr) throw saveErr;
         }
      }

      // 2. Match schedule Employee in employee_directory for Company, Religion, and Line Manager
      const cleanSchedEmp = normalizeText(workOnPhModal.email);
      const dirEmpRecord = rawDirEmployees.find(emp => {
        const wMail = normalizeText(getValidPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email'], ''));
        const pMail = normalizeText(getValidPropCaseInsensitive(emp, ['email', 'Email', 'Email Address', 'user_uid'], ''));
        const bCode = normalizeText(getValidPropCaseInsensitive(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id'], ''));
        const eName = normalizeText(getValidPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], ''));
        return [wMail, pMail, bCode, eName].filter(Boolean).includes(cleanSchedEmp);
      }) || {};

      const companyCandidateKeys = [
        'Company', 'company', 'Company Name', 'company_name', 'companyname',
        'CompanyUID', 'companyuid', 'company_uid', 'company_id', 'Company Code', 'company_code'
      ];
      const compLookupKeys = [
        'CompanyUID', 'companyuid', 'Company UID', 'company_uid',
        'Company ID', 'company_id', 'Company Code', 'company_code',
        'id', 'uid', 'Company Name', 'company_name', 'CompanyName',
        'Company', 'company', 'name', 'Name', 'Nama Perusahaan'
      ];

      const empCompRaw = getValidPropCaseInsensitive(dirEmpRecord, companyCandidateKeys, workOnPhModal.memberProfile?.company || '');
      const empCompanyKeys = new Set();
      if (empCompRaw) {
        const normComp = normalizeText(empCompRaw);
        empCompanyKeys.add(normComp);
        const matchedCompObj = rawCompanies.find(c =>
          compLookupKeys.some(k => normalizeText(getValidPropCaseInsensitive(c, [k], '')) === normComp)
        );
        if (matchedCompObj) {
          compLookupKeys.forEach(k => {
            const v = normalizeText(getValidPropCaseInsensitive(matchedCompObj, [k], ''));
            if (v) empCompanyKeys.add(v);
          });
        }
      }

      const empReligion = normalizeText(getValidPropCaseInsensitive(dirEmpRecord, ['Religion', 'religion', 'Agama', 'agama'], workOnPhModal.memberProfile?.religion || ''));

      // Lookup Remarks in public_holidays where Date = Schedule Date AND Religion = Schedule Employee Religion
      const expDateIso = addDaysIso(isoSchedDate, 90);
      let desc = workOnPhModal.holidayRemarks || 'Public Holiday';
      const parsedSchedDate = parseFlexibleDate(isoSchedDate);
      if (parsedSchedDate && publicHolidayRecords.length > 0) {
        const tY = parsedSchedDate.getFullYear();
        const tM = parsedSchedDate.getMonth();
        const tD = parsedSchedDate.getDate();
        const sameDateHols = publicHolidayRecords.filter(h => {
          const dVal = getPropCaseInsensitive(h, ['Date', 'date', 'tanggal', 'Tanggal']);
          return checkDateMatch(dVal, tY, tM, tD);
        });
        if (sameDateHols.length > 0) {
          const exactRelMatch = empReligion
            ? sameDateHols.find(h => normalizeText(getPropCaseInsensitive(h, ['Religion', 'religion', 'Agama', 'agama'], '')) === empReligion)
            : null;
          const generalMatch = sameDateHols.find(h => {
            const r = normalizeText(getPropCaseInsensitive(h, ['Religion', 'religion', 'Agama', 'agama'], ''));
            return !r || r === '-' || r === 'all' || r === 'national' || r === 'nasional' || r === 'umum';
          });
          const chosenHol = exactRelMatch || generalMatch || sameDateHols[0];
          const remarksVal = getValidPropCaseInsensitive(chosenHol, ['Remarks', 'remarks', 'holiday_name', 'name', 'description'], '');
          if (remarksVal) desc = remarksVal;
        }
      }

      const createdByVal = actualUserWorkEmail || topNavEmail || loggedInEmail || loggedInName;

      // 3. Insert into holiday_balance
      const { data: hSample } = await supabase.from('holiday_balance').select('*').limit(1);
      const hCols = hSample && hSample.length > 0 ? Object.keys(hSample[0]) : [];
      const holEmpCol = resolveTableColumn(hCols, ['Employee', 'employee', 'user_uid', 'email']) || 'Employee';
      const holEmpNameCol = resolveTableColumn(hCols, ['Employee Name', 'employee_name', 'Name', 'name']) || 'Employee Name';
      const holTypeCol = resolveTableColumn(hCols, ['Type', 'type', 'Type Holiday', 'type_holiday']) || 'Type';
      const holDateCol = resolveTableColumn(hCols, ['Date', 'date']) || 'Date';
      const holExpCol = resolveTableColumn(hCols, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired Date']) || 'Expiration Date';
      const holStatusCol = resolveTableColumn(hCols, ['Status', 'status', 'STATUS']) || 'Status';
      const holCreatedByCol = resolveTableColumn(hCols, ['CreatedBy', 'created_by', 'createdby', 'Created By']) || 'CreatedBy';
      const holCreatedDateCol = resolveTableColumn(hCols, ['CreatedDate', 'created_date', 'createddate', 'Created Date', 'created_at']) || 'CreatedDate';
      const holDescCol = resolveTableColumn(hCols, ['Description', 'description', 'Remarks', 'remarks', 'Notes', 'notes']) || 'Description';

      const holPayload = {
        [holEmpCol]: workOnPhModal.email,
        [holEmpNameCol]: workOnPhModal.name,
        [holTypeCol]: 'Day Off Payment',
        [holDateCol]: isoSchedDate,
        [holExpCol]: expDateIso,
        [holStatusCol]: 'Unused',
        [holCreatedByCol]: createdByVal,
        [holCreatedDateCol]: nowIso,
        [holDescCol]: desc
      };
      
      const { error: holErr } = await supabase.from('holiday_balance').insert([holPayload]);
      if (holErr) throw holErr;
      
      // 4. Email Notification to Line Manager & HR Managers of the matching Company
      const recipientSet = new Set();
      const lineMgrEmail = getValidPropCaseInsensitive(dirEmpRecord, [
        'Line Manager work email', 'line_manager_work_email',
        'Line Manager Email', 'line_manager_email',
        'Line Manager', 'line_manager', 'Line_Manager', 'linemanager',
        'manager_email', 'Manager Email', 'Manager', 'manager'
      ], workOnPhModal.memberProfile?.lineManager || '');
      if (lineMgrEmail && lineMgrEmail.includes('@')) recipientSet.add(lineMgrEmail.trim().toLowerCase());
      
      if (empCompanyKeys.size > 0) {
        rawDirEmployees.forEach(dirEmp => {
          const st = normalizeText(getValidPropCaseInsensitive(dirEmp, ['Status', 'status', 'STATUS', 'Account Status', 'account_status'], ''));
          const dept = normalizeText(getValidPropCaseInsensitive(dirEmp, ['Department', 'department', 'dept', 'Dept'], ''));
          const lvl = normalizeText(getValidPropCaseInsensitive(dirEmp, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
          
          if (st === 'active' && (dept === 'human resources' || dept === 'human resource' || dept === 'hr') && lvl === 'manager') {
            const rowComps = companyCandidateKeys
              .map(k => normalizeText(getValidPropCaseInsensitive(dirEmp, [k], '')))
              .filter(Boolean);
            const isSameCompany = rowComps.some(c => empCompanyKeys.has(c));
            if (isSameCompany) {
              const hrEmail = getValidPropCaseInsensitive(dirEmp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email'], '');
              if (hrEmail && hrEmail.includes('@')) recipientSet.add(hrEmail.trim().toLowerCase());
            }
          }
        });
      }
      
      if (recipientSet.size > 0) {
        const subjectTitle = `Work on Public Holiday - ${workOnPhModal.name} (${isoSchedDate})`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #7c3aed; margin-top: 0; font-size: 18px;">Work on Public Holiday Notification</h2>
            <p style="font-size: 14px;"><strong>${workOnPhModal.name}</strong> has submitted a request to work on a Public Holiday.</p>
            <div style="margin-top: 16px; padding: 14px; background: #f8fafc; border-radius: 8px; font-size: 13px; border: 1px solid #e2e8f0;">
              <p style="margin: 4px 0;"><strong>Employee:</strong> ${workOnPhModal.name} (${workOnPhModal.email})</p>
              <p style="margin: 4px 0;"><strong>Company:</strong> ${empCompRaw || '-'}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${isoSchedDate}</p>
              <p style="margin: 4px 0;"><strong>Public Holiday:</strong> ${desc}</p>
              <p style="margin: 4px 0;"><strong>Day Type:</strong> Working Day</p>
              <p style="margin: 4px 0;"><strong>Shift:</strong> ${workOnPhModal.shift} (${startTime} - ${endTime})</p>
              <p style="margin: 4px 0;"><strong>Day Off Payment Earned:</strong> 1 Day (Expires: ${expDateIso})</p>
            </div>
          </div>
        `;

        await Promise.allSettled(
          Array.from(recipientSet).map(toEmail =>
            fetch(GAS_WEB_APP_URL, {
              method: 'POST',
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "sendEmail", to: toEmail, subject: subjectTitle, body: emailHtml, htmlBody: emailHtml, fromEmail: loggedInEmail })
            })
          )
        );
      }

      alert(currentLang === 'id' ? 'Permintaan Work on Public Holiday berhasil disimpan dan Day Off Payment telah ditambahkan!' : 'Work on Public Holiday request submitted and Day Off Payment balance has been created!');
      setWorkOnPhModal(null);
      refreshAllData();
    } catch (err) {
      console.error('Error submitting Work on Public Holiday:', err);
      alert((currentLang === 'id' ? 'Gagal mengajukan Work on Public Holiday: ' : 'Failed to submit Work on Public Holiday: ') + err.message);
    }
    setIsSavingWorkOnPh(false);
  };

  const openBulkEditModal = () => {
    if (!selectedEmployee || selectedEmployee === 'all') {
      setShowFilterAlert(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const empData = teamMembers.find(m => m.email.toLowerCase() === selectedEmployee.toLowerCase());
    if (!empData) return;
    setBulkEditEmployee(empData);

    const validEmails = empData.emails || [selectedEmployee.toLowerCase()];

    const newBulkData = calendarDays.map(d => {
      const existing = d.teamData.find(r => {
         const rEmail = (getPropCaseInsensitive(r, ['Employee', 'employee', 'email', 'user_uid', 'employee_email']) || '').toLowerCase();
         return rEmail === selectedEmployee.toLowerCase() || validEmails.includes(rEmail);
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
          Date: toIsoDateString(row.date) || row.date,
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
          fromEmail: actualUserWorkEmail || topNavEmail || userWorkEmail
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
          const parsedAttDate = parseFlexibleDate(attDate);
          const cleanEmp = normalizeText(empEmail);
          const matchedMember = teamMembers.find(m =>
            m.email.toLowerCase() === cleanEmp ||
            (m.emails && m.emails.includes(cleanEmp)) ||
            normalizeText(m.name) === cleanEmp ||
            normalizeText(m.barcode) === cleanEmp
          );
          const empKeys = new Set([
            cleanEmp,
            ...(matchedMember?.emails || []),
            matchedMember?.name ? normalizeText(matchedMember.name) : '',
            matchedMember?.barcode ? normalizeText(matchedMember.barcode) : ''
          ].filter(Boolean));

          if (parsedAttDate) {
            const targetY = parsedAttDate.getFullYear();
            const targetM = parsedAttDate.getMonth();
            const targetD = parsedAttDate.getDate();

            schedRow = rawSchedules.find(r => {
              const rEmp = normalizeText(getPropCaseInsensitive(r, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'Barcode', 'barcode']));
              if (!empKeys.has(rEmp)) return false;
              const rDate = getPropCaseInsensitive(r, ['Date', 'date', 'tanggal', 'scheduledate', 'schedule_date']);
              return checkDateMatch(rDate, targetY, targetM, targetD);
            }) || null;

            if (!schedRow) {
              const { data: empSchedRows } = await supabase
                .from('schedule')
                .select('*')
                .ilike('Employee', `%${empEmail}%`)
                .limit(2000);
              if (empSchedRows && empSchedRows.length > 0) {
                schedRow = empSchedRows.find(r => {
                  const rDate = getPropCaseInsensitive(r, ['Date', 'date', 'tanggal', 'scheduledate', 'schedule_date']);
                  return checkDateMatch(rDate, targetY, targetM, targetD);
                }) || null;
              }
            }
          }
        }

        const checkInOutRaw = getPropCaseInsensitive(item, ['Are you checking out or Checking in?', 'Are you checking out or Checking in', 'Check In/Out', 'Check Type', 'Action', 'action'], '');
        const isCheckout = checkInOutRaw.toLowerCase().includes('out');
        const isCheckin = checkInOutRaw.toLowerCase().includes('in');

        const checkoutTimeVal = getPropCaseInsensitive(item, ['Checkout Time', 'checkout_time', 'Time Out', 'time_out', 'Time', 'time']);
        const checkinTimeVal = getPropCaseInsensitive(item, ['Time', 'time', 'Time In', 'time_in']);
        const isoCheckoutTime = toIsoTimestampString(checkoutTimeVal, attDate);
        const isoCheckinTime = toIsoTimestampString(checkinTimeVal, attDate);
        
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
            if (isoCheckoutTime) payload[attTimeCol] = isoCheckoutTime;
            targetStatus = 'Approved';
            
            schedCheckedOut = isoCheckoutTime || checkoutTimeVal;
            scheduleUpdatePayload['Checked Out At'] = schedCheckedOut;
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
            
            schedCheckedIn = isoCheckinTime || checkinTimeVal;
            scheduleUpdatePayload['Checked In At'] = schedCheckedIn;
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
            if (isoCheckoutTime) payload[attTimeCol] = isoCheckoutTime;
            targetStatus = 'Approved';
            
            schedCheckedOut = isoCheckoutTime || checkoutTimeVal;
            scheduleUpdatePayload['Checked Out At'] = schedCheckedOut;
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
          const schedShiftCol = resolveTableColumn(schedCols, ['Shift', 'shift', 'jam kerja']) || 'Shift';
          const schedStartCol = resolveTableColumn(schedCols, ['Start Time', 'start_time', 'starttime']) || 'Start Time';
          const schedEndCol = resolveTableColumn(schedCols, ['End Time', 'end_time', 'endtime']) || 'End Time';

          const startD = parseFlexibleDate(fromDate);
          const endD = parseFlexibleDate(toDate && toDate !== '-' && toDate !== 'null' ? toDate : fromDate) || startD;
          const targetDates = [];
          if (startD && endD) {
              let curr = new Date(startD);
              while (curr <= endD) {
                  const y = curr.getFullYear();
                  const m = String(curr.getMonth() + 1).padStart(2, '0');
                  const d = String(curr.getDate()).padStart(2, '0');
                  targetDates.push(`${y}-${m}-${d}`);
                  curr.setDate(curr.getDate() + 1);
              }
          } else {
              targetDates.push(toIsoDateString(fromDate) || fromDate);
          }

          const { data: existingScheds } = await supabase.from('schedule')
            .select('*')
            .ilike(schedEmpCol, `%${empEmail}%`)
            .in(schedDateCol, targetDates);

          const existingDates = new Set((existingScheds || []).map(r => toIsoDateString(r[schedDateCol]) || r[schedDateCol]));

          if (existingDates.size > 0) {
             await supabase.from('schedule').update({
               [schedTypeCol]: leaveType,
               [schedShiftCol]: '-',
               [schedStartCol]: '-',
               [schedEndCol]: '-'
             })
             .ilike(schedEmpCol, `%${empEmail}%`)
             .in(schedDateCol, targetDates);
          }

          const newDates = targetDates.filter(d => !existingDates.has(d) && !existingDates.has(toIsoDateString(d)));
          if (newDates.length > 0) {
             const inserts = newDates.map(d => ({
               [schedEmpCol]: empEmail,
               [schedDateCol]: d,
               [schedTypeCol]: leaveType,
               [schedShiftCol]: '-',
               [schedStartCol]: '-',
               [schedEndCol]: '-'
             }));
             await supabase.from('schedule').insert(inserts);
          }

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
            // Already handled by universal schedule upsert above
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

  useEffect(() => {
    if (hasLoadedOnce && typeof context.onApprovalCountChange === 'function') {
      context.onApprovalCountChange(pendingLeavesCount + pendingAttendanceCount);
    }
  }, [hasLoadedOnce, pendingLeavesCount, pendingAttendanceCount, context]);

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

    if (selectedDepartment && selectedDepartment !== 'all') {
      const targetDept = selectedDepartment.toLowerCase();
      const validDeptKeys = new Set(
        teamMembers
          .filter(m => (m.department || '') === targetDept)
          .flatMap(m => [
            m.email,
            ...(m.emails || []),
            m.name ? normalizeText(m.name) : '',
            m.barcode ? normalizeText(m.barcode) : ''
          ])
          .map(e => normalizeText(e))
          .filter(Boolean)
      );
      list = list.filter(item => {
        const empEmail = normalizeText(getPropCaseInsensitive(item, [
          'Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email', 'Employee work email'
        ]));
        return validDeptKeys.has(empEmail);
      });
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      const target = selectedEmployee.toLowerCase();
      const validKeys = new Set([
        target,
        ...(selectedMemberObj?.emails || []),
        selectedMemberObj?.name ? normalizeText(selectedMemberObj.name) : '',
        selectedMemberObj?.barcode ? normalizeText(selectedMemberObj.barcode) : ''
      ].filter(Boolean));
      list = list.filter(item => {
        const empEmail = normalizeText(getPropCaseInsensitive(item, [
          'Employee',
          'employee',
          'email',
          'user_uid',
          'employee_email',
          'work_email',
          'Employee work email'
        ]));
        return validKeys.has(empEmail);
      });
    }

    return list.sort((a, b) => {
      const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'Time', 'time', 'created_at'])) || new Date(0);
      const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'Time', 'time', 'created_at'])) || new Date(0);
      return dtB.getTime() - dtA.getTime();
    });
  }, [activeCategoryList, activeCategoryTab, statusTab, selectedDepartment, selectedEmployee, selectedMemberObj, teamMembers]);

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
              <span className="font-semibold text-gray-700">{actualUserWorkEmail || '-'}</span>
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
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-nowrap overflow-x-auto py-1">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
              <button
                onClick={() => setActiveCategoryTab('leave')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-colors whitespace-nowrap ${
                  activeCategoryTab === 'leave'
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <span>{t.tabLeave}</span>
                {pendingLeavesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs animate-bounce">
                    {pendingLeavesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveCategoryTab('attendance')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-colors whitespace-nowrap ${
                  activeCategoryTab === 'attendance'
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <span>{t.tabAttendance}</span>
                {pendingAttendanceCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs animate-bounce">
                    {pendingAttendanceCount}
                  </span>
                )}
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

          <div className={`grid ${isHrManagerActive ? 'grid-cols-2' : 'grid-cols-1'} sm:flex sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0`}>
            {isHrManagerActive && (
              <div className="relative w-full sm:w-[170px] shrink-0">
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                     setSelectedDepartment(e.target.value);
                     setSelectedEmployee('all');
                     if (showFilterAlert) setShowFilterAlert(false);
                  }}
                  className="w-full pl-3.5 pr-8 py-1.5 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer transition relative z-0 capitalize"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="all" className="capitalize">{t.deptFilterAll}</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept} className="capitalize">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                 setCalendarSelectedEmployees([]);
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
              {teamMembers
                .filter(member => selectedDepartment === 'all' || member.department === selectedDepartment)
                .map((member) => (
                <option key={member.email} value={member.email}>
                  {member.name}
                </option>
              ))}
            </select>
            </div>
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
            {!loading && displayList.length > 0 && (
              <tbody className="divide-y divide-gray-50">
                {displayList.map((item, idx) => {
                  const employeeEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email'], '-');
                  const employeeName = getPropCaseInsensitive(
                    item, 
                    ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'], 
                    teamMembers.find(m => m.email.toLowerCase() === employeeEmail.toLowerCase() || (m.emails && m.emails.includes(employeeEmail.toLowerCase())))?.name || employeeEmail
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
                })}
              </tbody>
            )}
          </table>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-gray-400 w-full flex flex-col items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p className="text-xs">{t.loading}</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 w-full flex flex-col items-center justify-center">
            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-gray-600 text-sm">{t.noRequests}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t.noRecordsDesc}
            </p>
          </div>
        ) : null}
      </div>

      {/* 2. Team Working Calendar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 w-full">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end pb-4 mb-4 border-b border-gray-100 gap-4">
          <div className="flex-1 min-w-0 w-full xl:w-auto flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <svg className="w-5 h-5 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {t.calTitle}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 break-words">
                  {selectedEmployee !== 'all'
                    ? `${t.calDescOne} ${teamMembers.find(m => m.email === selectedEmployee)?.name || selectedEmployee}`
                    : calendarSelectedEmployees.length > 0
                    ? t.calDescMulti.replace('{count}', calendarSelectedEmployees.length)
                    : isHrActive
                    ? `${t.calDescAllCompany} (${scopedCalendarMembers.length})`
                    : `${t.calDescAll} (${scopedCalendarMembers.length})`}
                </p>
              </div>

              {selectedEmployee === 'all' && scopedCalendarMembers.length > 1 && (
                <div className="relative" ref={calEmpDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCalEmpDropdownOpen(!isCalEmpDropdownOpen)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {calendarSelectedEmployees.length === 0
                        ? `${t.calFilterAllOpt} (${scopedCalendarMembers.length})`
                        : `${t.calFilterEmpBtn} (${calendarSelectedEmployees.length})`}
                    </span>
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCalEmpDropdownOpen && (
                    <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 p-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <input
                          type="text"
                          value={calEmpSearch}
                          onChange={(e) => setCalEmpSearch(e.target.value)}
                          placeholder={t.calFilterSearchPh}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50"
                        />
                        {calendarSelectedEmployees.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCalendarSelectedEmployees([])}
                            className="px-2 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                          >
                            {t.calFilterClear}
                          </button>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                        {scopedCalendarMembers
                          .filter(m => !calEmpSearch || m.name.toLowerCase().includes(calEmpSearch.toLowerCase()) || m.email.toLowerCase().includes(calEmpSearch.toLowerCase()))
                          .map((member) => {
                            const checked = calendarSelectedEmployees.includes(member.email);
                            return (
                              <label
                                key={member.email}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50/60 rounded-lg cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setCalendarSelectedEmployees(prev =>
                                      prev.includes(member.email)
                                        ? prev.filter(e => e !== member.email)
                                        : [...prev, member.email]
                                    );
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-800 truncate">{member.name}</div>
                                  {isHrActive && member.department && (
                                    <div className="text-[10px] text-gray-400 capitalize truncate">{member.department}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Inline Summary Balance Cards */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto max-w-full w-fit" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white shadow-sm border border-gray-200/50 whitespace-nowrap">
                <span className="text-[11px] font-bold text-gray-500">{t.sumAnn}</span>
                <span className="text-[11px] font-black text-blue-700">{employeeSummary.annual}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white shadow-sm border border-gray-200/50 whitespace-nowrap">
                <span className="text-[11px] font-bold text-gray-500">{t.sumDop}</span>
                <span className="text-[11px] font-black text-blue-700">{employeeSummary.dayOff}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white shadow-sm border border-gray-200/50 whitespace-nowrap">
                <span className="text-[11px] font-bold text-gray-500">{t.sumEo}</span>
                <span className="text-[11px] font-black text-blue-700">{employeeSummary.extraOff}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 w-full xl:w-auto justify-between xl:justify-end">
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={prevMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Previous Month">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xs sm:text-base font-bold text-gray-800 min-w-[100px] sm:min-w-[120px] text-center">
                {t.monthsFull[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1 sm:p-2 border border-gray-200 hover:bg-gray-50 rounded-lg sm:rounded-xl text-gray-600 transition shadow-sm active:scale-95" title="Next Month">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <button onClick={setThisMonth} className="px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-sm active:scale-95 ml-auto xl:ml-2">
              {t.btnThisMonth}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 border border-gray-200 rounded-xl overflow-hidden divide-x divide-y sm:divide-y-0 divide-gray-100 text-center py-2.5 bg-white shadow-xs mb-3">
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statOff}</span>
            <span className="text-base sm:text-lg font-black text-red-600 leading-tight">{calendarStats.off}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statPublicHoliday}</span>
            <span className="text-base sm:text-lg font-black text-purple-600 leading-tight">{calendarStats.publicHoliday}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statWork}</span>
            <span className="text-base sm:text-lg font-black text-green-600 leading-tight">{calendarStats.work}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statSick}</span>
            <span className="text-base sm:text-lg font-black text-pink-600 leading-tight">{calendarStats.sick}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t.statLeave}</span>
            <span className="text-base sm:text-lg font-black text-orange-600 leading-tight">{calendarStats.leave}</span>
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

          {calendarDays.map((d) => {
            const singleTargetEmail = selectedEmployee !== 'all'
              ? selectedEmployee
              : calendarSelectedEmployees.length === 1
              ? calendarSelectedEmployees[0]
              : null;

            const hasSingleBadge = isSingleEmployeeCalendar && Boolean(d.singleStyle.badgeText);
            return (
              <div 
                key={`day-${d.day}`}
                title={d.holidayRemarks || undefined}
                onClick={() => {
                  if (d.teamData.length > 0) {
                    setTeamScheduleModalData({ 
                        date: d.dateToPass, 
                        records: d.teamData, 
                        isPublicHoliday: d.isPublicHoliday, 
                        requestedWorkOnPh: d.requestedWorkOnPh,
                        holidayRemarks: d.holidayRemarks
                    });
                  } else if (singleTargetEmail) {
                    const empData = teamMembers.find(m => m.email.toLowerCase() === singleTargetEmail.toLowerCase());
                    if (empData) {
                      if (d.isPublicHoliday) {
                        setTeamScheduleModalData({
                          date: d.dateToPass,
                          records: [{
                            Employee: empData.email,
                            Name: empData.name,
                            Type: 'Public Holiday',
                            Shift: '-'
                          }],
                          isPublicHoliday: true,
                          requestedWorkOnPh: false,
                          holidayRemarks: d.holidayRemarks
                        });
                      } else {
                        openSingleScheduleEdit({
                          Employee: empData.email,
                          Name: empData.name,
                          type: 'Working Day',
                          shift: 'M9'
                        }, d.dateToPass);
                      }
                    }
                  }
                }}
                className={`relative h-20 sm:h-24 p-1 sm:p-2 rounded-xl border transition flex flex-col overflow-hidden ${hasSingleBadge ? d.singleStyle.cardClass : 'bg-white border-gray-200'} ${d.teamData.length > 0 || singleTargetEmail ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''} ${d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-300' : ''}`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`text-xs sm:text-sm font-extrabold leading-none ${d.isToday ? 'text-blue-600' : d.isSunday ? 'text-red-500' : 'text-gray-800'}`}>
                    {d.day}
                  </span>
                  {hasSingleBadge && d.singleStyle.icon && (
                    <span className="text-sm sm:text-base leading-none select-none">{d.singleStyle.icon}</span>
                  )}
                </div>

                {hasSingleBadge ? (
                  <div className="w-full flex flex-col items-center justify-center my-auto gap-0.5">
                    <span className={`w-full py-0.5 px-1 rounded-md text-[9px] sm:text-[10px] font-bold text-center truncate shadow-2xs ${d.singleStyle.badgeClass}`}>
                      {d.singleStyle.badgeText}
                    </span>
                    {d.holidayRemarks && (
                      <span className="hidden sm:block w-full text-[9px] text-purple-900 font-medium truncate text-center">
                        {d.holidayRemarks}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-0.5 sm:gap-1 my-auto mt-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {d.counts.workingCount > 0 && (
                      <div className="flex items-center justify-between bg-green-100/90 border border-green-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-green-900 uppercase tracking-tight truncate">{t.statWork}</span>
                        <span className="bg-green-600 text-white text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 rounded-sm leading-tight">{d.counts.workingCount}</span>
                      </div>
                    )}
                    {d.counts.publicHolidayCount > 0 ? (
                      <div className="flex items-center justify-between bg-purple-100/90 border border-purple-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-purple-900 uppercase tracking-tight truncate">PUBLIC HOLIDAY</span>
                        <span className="bg-purple-600 text-white text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 rounded-sm leading-tight">{d.counts.publicHolidayCount}</span>
                      </div>
                    ) : d.isPublicHoliday ? (
                      <div className="flex items-center justify-center bg-purple-100/90 border border-purple-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-purple-900 uppercase tracking-tight truncate">PUBLIC HOLIDAY</span>
                      </div>
                    ) : null}
                    {d.counts.sickCount > 0 && (
                      <div className="flex items-center justify-between bg-pink-100/90 border border-pink-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-pink-900 uppercase tracking-tight truncate">{t.statSick}</span>
                        <span className="bg-pink-500 text-white text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 rounded-sm leading-tight">{d.counts.sickCount}</span>
                      </div>
                    )}
                    {d.counts.leaveCount > 0 && (
                      <div className="flex items-center justify-between bg-orange-100/90 border border-orange-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-orange-900 uppercase tracking-tight truncate">{t.statLeave}</span>
                        <span className="bg-orange-500 text-white text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 rounded-sm leading-tight">{d.counts.leaveCount}</span>
                      </div>
                    )}
                    {d.counts.offCount > 0 && (
                      <div className="flex items-center justify-between bg-red-100/90 border border-red-300 rounded px-1 sm:px-1.5 py-0.5 w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-red-900 uppercase tracking-tight truncate">{t.statOff}</span>
                        <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 rounded-sm leading-tight">{d.counts.offCount}</span>
                      </div>
                    )}
                    {d.teamData.length === 0 && !d.isPublicHoliday && (
                      <div className="flex items-center justify-center w-full mt-2">
                        <span className="text-[10px] text-gray-300">-</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
          <h4 className="font-bold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">{t.legend}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
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
              <span className="w-3 h-3 rounded bg-purple-600 shrink-0"></span>
              <span className="text-gray-600 font-medium">{t.legPublicHoliday}</span>
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
                const rawEmpKey = normalizeText(getPropCaseInsensitive(emp, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'Barcode', 'barcode'], ''));
                const matchedMember = teamMembers.find(m =>
                  m.email.toLowerCase() === rawEmpKey ||
                  (m.emails && m.emails.includes(rawEmpKey)) ||
                  normalizeText(m.name) === rawEmpKey ||
                  normalizeText(m.barcode) === rawEmpKey
                );
                const empName = matchedMember?.name || getPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'employee_name', 'Employee'], 'Employee');
                const empDept = matchedMember?.department || '';
                const typ = getPropCaseInsensitive(emp, ['type', 'Type', 'status'], '-');
                const shift = getPropCaseInsensitive(emp, ['shift', 'jam kerja'], '-');
                
                let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
                let displayType = typ;
                
                const tLower = typ.toLowerCase();
                const isWorking = tLower.includes('working') || tLower === 'work' || tLower.includes('kerja');
                const isPublicHolidayType = tLower.includes('public holiday') || tLower === 'holiday' || tLower.includes('nasional');
                const isOff = !isPublicHolidayType && (tLower.includes('day off') || tLower === 'off' || tLower.includes('libur'));
                
                const isLeave = tLower.includes('leave') || tLower.includes('cuti') || tLower.includes('sick') || tLower.includes('sakit') || tLower.includes('maternity');
                
                const isEditable = (isWorking || isOff) && !isLeave && !isPublicHolidayType;

                const empReqPhRaw = getPropCaseInsensitive(emp, [
                  'Request to Work on Public Holiday?',
                  'request_to_work_on_public_holiday',
                  'Request to Work on Public Holiday',
                  'requesttoworkonpublicholiday'
                ], '');
                const empRequestedWorkOnPh = ['true', '1', 't', 'yes', 'y'].includes(String(empReqPhRaw).trim().toLowerCase());

                if (isWorking) {
                  badgeClass = 'bg-green-50 text-green-700 border-green-200';
                  displayType = t.badgeWork;
                } else if (tLower.includes('sick') || tLower.includes('sakit')) {
                  badgeClass = 'bg-pink-50 text-pink-700 border-pink-200';
                  displayType = t.badgeSick;
                } else if (isPublicHolidayType) {
                  badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                  displayType = 'PUBLIC HOLIDAY';
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
                      <div className="font-bold text-sm text-gray-800 flex items-center gap-2 flex-wrap">
                        <span>{empName}</span>
                        {isEditable && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                            Editable
                          </span>
                        )}
                        {empRequestedWorkOnPh && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                            Work Requested
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>Shift: {shift !== '-' ? shift : (isPublicHolidayType ? 'PUBLIC HOLIDAY' : isOff ? t.badgeOff : '-')}</span>
                        {isHrActive && empDept && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded capitalize">
                            • {empDept}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                        {displayType}
                      </span>
                      
                      {(isPublicHolidayType || teamScheduleModalData.isPublicHoliday) && !isWorking && !empRequestedWorkOnPh && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWorkOnPublicHolidayModal(emp, teamScheduleModalData.date, teamScheduleModalData.holidayRemarks);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span>{t.btnRequestWork}</span>
                        </button>
                      )}
                      
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

            {(() => {
              const reqEmpIdentifier = getValidPropCaseInsensitive(selectedRequest, [
                'Employee', 'employee', 'email', 'Email', 'user_uid', 'employee_email', 'work_email', 'Employee work email', 'Barcode', 'barcode', 'Employee ID', 'employee_id'
              ], '');
              const normReqEmpId = normalizeText(reqEmpIdentifier);
              const reqEmpNameRaw = getValidPropCaseInsensitive(selectedRequest, [
                'Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name', 'Nama Karyawan'
              ], '');
              const normReqEmpName = normalizeText(reqEmpNameRaw);

              const dirEmpProfile = rawDirEmployees.find(emp => {
                const wMail = normalizeText(getValidPropCaseInsensitive(emp, ['Employee work email', 'employee_work_email', 'work_email', 'work email', 'Work Email'], ''));
                const pMail = normalizeText(getValidPropCaseInsensitive(emp, ['email', 'Email', 'Email Address', 'email_address', 'user_uid'], ''));
                const bCode = normalizeText(getValidPropCaseInsensitive(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id'], ''));
                const eName = normalizeText(getValidPropCaseInsensitive(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], ''));

                if (normReqEmpId && (wMail === normReqEmpId || pMail === normReqEmpId || bCode === normReqEmpId)) return true;
                if (normReqEmpName && eName === normReqEmpName) return true;
                return false;
              });

              const displayEmpName = reqEmpNameRaw || (dirEmpProfile ? getValidPropCaseInsensitive(dirEmpProfile, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], '-') : '-');
              const displayEmpEmail = reqEmpIdentifier || '-';

              const lineMgrKeys = [
                'Line Manager work email', 'line_manager_work_email',
                'Line Manager', 'line_manager', 'Line_Manager', 'linemanager',
                'Line Manager Email', 'line_manager_email',
                'manager_email', 'Manager Email', 'Manager', 'manager',
                'Approver', 'approver', 'Approver Email', 'approver_email',
                'Atasan', 'atasan', 'Atasan Langsung', 'atasan_langsung', 'approval_line_manager'
              ];

              const directLineMgr = getValidPropCaseInsensitive(selectedRequest, lineMgrKeys, '');
              const dirLineMgr = dirEmpProfile ? getValidPropCaseInsensitive(dirEmpProfile, lineMgrKeys, '') : '';
              const resolvedLineMgr = directLineMgr || dirLineMgr || '-';

              return (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{t.reqEmpInfo}</span>
                  <div className="text-sm font-bold text-gray-800">
                    {displayEmpName}
                  </div>
                  <div className="text-xs text-gray-500">
                    Email: {displayEmpEmail}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.manager} {resolvedLineMgr}
                  </div>
                </div>
              );
            })()}

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

            {workOnPhModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !isSavingWorkOnPh && setWorkOnPhModal(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-0 border border-gray-100 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50/70 to-indigo-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{t.phModalTitle}</h3>
                  <p className="text-xs text-gray-500">{t.phModalSub}</p>
                </div>
              </div>
              <button 
                disabled={isSavingWorkOnPh}
                onClick={() => setWorkOnPhModal(null)}
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
                  value={workOnPhModal.date}
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
                    value={workOnPhModal.barcode || '-'}
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
                    value={workOnPhModal.name}
                    className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed select-none truncate"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  4. {t.lblTypeReadOnly}
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value="Working Day"
                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed select-none"
                />
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
                  value={workOnPhModal.shift}
                  disabled={isSavingWorkOnPh}
                  onChange={(e) => setWorkOnPhModal({ ...workOnPhModal, shift: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:outline-none cursor-pointer"
                >
                  {SHIFT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — Start {opt.start}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const times = getShiftTimes(workOnPhModal.shift, workOnPhModal.standart_working_day);
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
              })()}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingWorkOnPh}
                onClick={() => setWorkOnPhModal(null)}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                disabled={isSavingWorkOnPh}
                onClick={saveWorkOnPublicHoliday}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                {isSavingWorkOnPh ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <span>{t.btnSaving}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span>{t.btnSubmitRequest}</span>
                  </>
                )}
              </button>
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
