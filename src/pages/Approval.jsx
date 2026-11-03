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

const isPendingApprovalStatus = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s_-]/g, '');
  return s === 'pendingapproval' || s === 'pending';
};

const matchesLineManager = (record, targetEmail) => {
  if (!targetEmail) return false;
  const mgrVal = getPropCaseInsensitive(record, [
    'Line Manager',
    'line_manager',
    'Line Manager Email',
    'line_manager_email',
    'Line Manager work email',
    'line_manager_work_email',
    'manager_email',
    'Manager Email',
    'Approver',
    'approver',
    'Manager',
    'manager',
    'Atasan Email',
    'atasan_email'
  ], '').trim().toLowerCase();

  return mgrVal === targetEmail || mgrVal.includes(targetEmail);
};

export default function Approval() {
  const [currentUser] = useState(() => {
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const lang = localStorage.getItem('hris_lang') || 'id';

  // State Data
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceRequests, setAttendanceRequests] = useState([]);

  // Filter & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'leave' | 'attendance'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [itemToReject, setItemToReject] = useState(null);
  
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Line Manager Work Email dari akun yang sedang login
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

  const userName = useMemo(() => {
    return getPropCaseInsensitive(currentUser, ['Name', 'name', 'nama', 'fullname', 'full_name'], userWorkEmail.split('@')[0] || 'Manager');
  }, [currentUser, userWorkEmail]);

  // Fetch Leave & Attendance yang berstatus Pending Approval untuk Line Manager yang bersangkutan
  const refreshAllData = useCallback(async () => {
    if (!userWorkEmail) return;
    setLoading(true);

    try {
      // 1. Fetch Leave Requests
      const { data: lvData, error: lvError } = await supabase
        .from('leave_requests')
        .select('*')
        .limit(1000);

      let pendingLeaves = [];
      if (!lvError && lvData) {
        pendingLeaves = lvData
          .filter(row => {
            const status = getPropCaseInsensitive(row, ['Status', 'status', 'Approval Status', 'approval_status'], '');
            return isPendingApprovalStatus(status) && matchesLineManager(row, userWorkEmail);
          })
          .map(row => ({
            ...row,
            _category: 'Leave',
            _sourceTable: 'leave_requests'
          }));
      }

      // 2. Fetch Attendance (langsung dari tabel 'attendance')
      let pendingAttendance = [];
      try {
        const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('*')
          .limit(1000);

        if (!attErr && attData && attData.length > 0) {
          pendingAttendance = attData
            .filter(row => {
              const status = getPropCaseInsensitive(row, ['Status', 'status', 'Approval Status', 'approval_status'], '');
              return isPendingApprovalStatus(status) && matchesLineManager(row, userWorkEmail);
            })
            .map(row => ({
              ...row,
              _category: 'Attendance',
              _sourceTable: 'attendance'
            }));
        }
      } catch (e) {
        console.warn("Could not query attendance table:", e);
      }

      setLeaveRequests(pendingLeaves);
      setAttendanceRequests(pendingAttendance);
    } catch (err) {
      console.error('Error fetching approval records:', err);
    }
    setLoading(false);
  }, [userWorkEmail]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Kirim email notifikasi ke karyawan saat di-approve / di-reject
  const sendNotificationEmail = async (item, newStatus, reason = '') => {
    const empEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid', 'employee_email', 'work_email']);
    const empName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'employee_name'], 'Employee');
    const reqType = item._category === 'Leave'
      ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type'], 'Leave')
      : (getPropCaseInsensitive(item, ['Type', 'type', 'Attendance Type', 'attendance_type'], 'Attendance'));

    if (!empEmail || !empEmail.includes('@')) return;

    const statusColor = newStatus === 'Approved' ? '#16a34a' : '#dc2626';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: ${statusColor}; margin-top: 0; font-size: 18px;">Request ${newStatus}</h2>
        <p style="font-size: 14px;">Halo <strong>${empName}</strong>,</p>
        <p style="font-size: 14px;">Pengajuan <strong>${reqType} (${item._category})</strong> Anda telah <strong>${newStatus.toLowerCase()}</strong> oleh Line Manager (<strong>${userName}</strong>).</p>
        ${reason ? `<p style="font-size: 14px; background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;"><strong>Alasan Penolakan:</strong> ${reason}</p>` : ''}
        <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></p>
          <p style="margin: 4px 0;"><strong>Line Manager:</strong> ${userWorkEmail}</p>
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
          fromEmail: userWorkEmail
        })
      });
    } catch (e) {
      console.warn("Notice email could not be sent:", e);
    }
  };

  // Fungsi Action: Approve atau Reject
  const handleUpdateStatus = async (item, newStatus, reason = '') => {
    setIsProcessing(true);
    try {
      const table = item._sourceTable || (item._category === 'Attendance' ? 'attendance' : 'leave_requests');
      const cols = Object.keys(item);

      const statusCol = resolveTableColumn(cols, ['Status', 'status', 'Approval Status', 'approval_status']) || 'Status';
      const idCol = resolveTableColumn(cols, ['id', 'ID', 'Id', 'request_id', 'leave_id', 'Leave ID', 'Leave_ID', 'attendance_id', 'Attendance ID', 'no', '_id']);

      const nowIso = new Date().toISOString();
      const payload = {
        [statusCol]: newStatus
      };

      const approverCol = resolveTableColumn(cols, ['approved_by', 'Approved By', 'action_by', 'Action By', 'lasteditby', 'last_edit_by']);
      if (approverCol) payload[approverCol] = userWorkEmail;

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

      await sendNotificationEmail(item, newStatus, reason);

      alert(`Permintaan berhasil di-${newStatus === 'Approved' ? 'setujui (Approved)' : 'tolak (Rejected)'}!`);
      setIsDetailModalOpen(false);
      setIsRejectModalOpen(false);
      setItemToReject(null);
      setRejectReason('');
      setSelectedRequest(null);
      refreshAllData();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses permintaan: ' + err.message);
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

  // Filtered List
  const combinedList = useMemo(() => {
    let list = [];
    if (activeTab === 'all' || activeTab === 'leave') {
      list.push(...leaveRequests);
    }
    if (activeTab === 'all' || activeTab === 'attendance') {
      list.push(...attendanceRequests);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => {
        const name = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name']).toLowerCase();
        const emp = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid']).toLowerCase();
        const type = (item._category === 'Leave' 
          ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type']) 
          : getPropCaseInsensitive(item, ['Type', 'type', 'Attendance Type', 'attendance_type'])
        ).toLowerCase();

        return name.includes(q) || emp.includes(q) || type.includes(q);
      });
    }

    return list.sort((a, b) => {
      const dtA = parseFlexibleDate(getPropCaseInsensitive(a, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'created_at'])) || new Date(0);
      const dtB = parseFlexibleDate(getPropCaseInsensitive(b, ['CreatedDate', 'created_date', 'From Date', 'Date', 'date', 'created_at'])) || new Date(0);
      return dtB.getTime() - dtA.getTime();
    });
  }, [activeTab, leaveRequests, attendanceRequests, searchTerm]);

  return (
    <div className="w-full text-gray-800 font-sans p-2 sm:p-4 md:p-6">
      
      {/* Header Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-100 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Approval Requests</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tinjau dan setujui pengajuan Cuti & Kehadiran dari tim Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-gray-400 mr-1.5 font-medium">Line Manager:</span>
              <span className="font-semibold text-gray-700">{userWorkEmail || 'Belum Login'}</span>
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
              <span>{loading ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Cards (Matching Image Style) */}
        <div className="mt-5 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex items-center divide-x divide-gray-100">
          <div 
            onClick={() => setActiveTab('all')} 
            className={`flex-1 flex flex-col items-center justify-center py-4 cursor-pointer transition ${activeTab === 'all' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">TOTAL PENDING</span>
            <span className="text-xl sm:text-2xl font-black text-[#d32f2f]">{leaveRequests.length + attendanceRequests.length}</span>
          </div>
          
          <div 
            onClick={() => setActiveTab('leave')} 
            className={`flex-1 flex flex-col items-center justify-center py-4 cursor-pointer transition ${activeTab === 'leave' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">LEAVE</span>
            <span className="text-xl sm:text-2xl font-black text-[#388e3c]">{leaveRequests.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('attendance')} 
            className={`flex-1 flex flex-col items-center justify-center py-4 cursor-pointer transition ${activeTab === 'attendance' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">ATTENDANCE</span>
            <span className="text-xl sm:text-2xl font-black text-[#d81b60]">{attendanceRequests.length}</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4 cursor-default">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">PROCESSED</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800">0</span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          <div className="flex p-1 bg-gray-100 rounded-xl space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semua ({leaveRequests.length + attendanceRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'leave' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cuti / Leave ({leaveRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'attendance' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Absensi ({attendanceRequests.length})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Cari karyawan, tipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Karyawan</th>
                <th className="px-4 py-3">Tipe Pengajuan</th>
                <th className="px-4 py-3">Tanggal / Periode</th>
                <th className="px-4 py-3 text-center">Durasi / Jam</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Bukti / Lampiran</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 animate-spin text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <p className="text-xs">Memuat daftar pengajuan pending...</p>
                    </div>
                  </td>
                </tr>
              ) : combinedList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-semibold text-gray-600 text-sm">Tidak ada permintaan yang menunggu persetujuan.</p>
                      <p className="text-xs text-gray-400 mt-1">Semua pengajuan cuti dan absensi tim Anda telah diproses.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                combinedList.map((item, idx) => {
                  const isLeave = item._category === 'Leave';
                  const employeeName = getPropCaseInsensitive(item, ['Name', 'name', 'nama', 'fullname', 'full_name'], 'Tanpa Nama');
                  const employeeEmail = getPropCaseInsensitive(item, ['Employee', 'employee', 'email', 'user_uid'], '-');
                  
                  const reqType = isLeave
                    ? getPropCaseInsensitive(item, ['Leave Type', 'leave_type', 'Type', 'type', 'leavetype'], 'Cuti')
                    : getPropCaseInsensitive(item, ['Type', 'type', 'Attendance Type', 'attendance_type', 'Request Type'], 'Attendance');

                  const status = getPropCaseInsensitive(item, ['Status', 'status', 'Approval Status'], 'Pending Approval');
                  const attachmentUrl = getPropCaseInsensitive(item, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo', 'Link', 'link'], '');

                  // Date range / info
                  let dateInfo = '-';
                  let durationInfo = '-';

                  if (isLeave) {
                    const fromDate = formatDateDisplay(getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']), lang);
                    const toDate = formatDateDisplay(getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']), lang);
                    dateInfo = `${fromDate} - ${toDate}`;
                    
                    let dur = getPropCaseInsensitive(item, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration', 'duration', 'Days', 'days'], '');
                    if (!dur) {
                      const dS = parseFlexibleDate(getPropCaseInsensitive(item, ['From Date', 'from_date', 'Start Date', 'start_date']));
                      const dE = parseFlexibleDate(getPropCaseInsensitive(item, ['To Date', 'to_date', 'End Date', 'end_date']));
                      dur = (dS && dE) ? Math.ceil(Math.abs(dE - dS) / (1000 * 60 * 60 * 24)) + 1 : '1';
                    }
                    durationInfo = `${dur} Hari`;
                  } else {
                    const attDate = formatDateDisplay(getPropCaseInsensitive(item, ['Date', 'date', 'attendance_date', 'CreatedDate', 'created_date']), lang);
                    dateInfo = attDate;
                    const clockIn = getPropCaseInsensitive(item, ['Clock In', 'clock_in', 'In Time', 'in_time'], '');
                    const clockOut = getPropCaseInsensitive(item, ['Clock Out', 'clock_out', 'Out Time', 'out_time'], '');
                    if (clockIn || clockOut) {
                      durationInfo = `${clockIn || '--:--'} s/d ${clockOut || '--:--'}`;
                    } else {
                      durationInfo = 'Presensi';
                    }
                  }

                  return (
                    <tr
                      key={idx}
                      onClick={() => openDetailModal(item)}
                      className="hover:bg-blue-50/40 transition cursor-pointer text-xs sm:text-sm border-b border-gray-100"
                    >
                      {/* Kategori Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold border ${isLeave ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {item._category}
                        </span>
                      </td>

                      {/* Karyawan */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{employeeName}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[150px]">{employeeEmail}</div>
                      </td>

                      {/* Tipe Pengajuan */}
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <span className="font-semibold text-gray-800">{reqType}</span>
                      </td>

                      {/* Tanggal / Periode */}
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                        {dateInfo}
                      </td>

                      {/* Durasi */}
                      <td className="px-4 py-3 text-center font-bold text-gray-800 whitespace-nowrap">
                        {durationInfo}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          {status}
                        </span>
                      </td>

                      {/* Attachment */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {attachmentUrl && attachmentUrl.startsWith('http') ? (
                          <button
                            onClick={() => {
                              setPhotoPreviewUrl(attachmentUrl);
                              setIsPhotoModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Aksi Button */}
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            disabled={isProcessing}
                            onClick={() => {
                              if (window.confirm(`Setujui (Approve) pengajuan dari ${employeeName}?`)) {
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Request */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${selectedRequest._category === 'Leave' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  {selectedRequest._category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">Detail Pengajuan</h3>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Informasi Karyawan */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Informasi Karyawan</span>
              <div className="text-sm font-bold text-gray-800">
                {getPropCaseInsensitive(selectedRequest, ['Name', 'name', 'nama', 'fullname', 'full_name'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                Email: {getPropCaseInsensitive(selectedRequest, ['Employee', 'employee', 'email', 'user_uid'], '-')}
              </div>
              <div className="text-xs text-gray-500">
                Line Manager: {getPropCaseInsensitive(selectedRequest, ['Line Manager', 'line_manager', 'Line Manager Email', 'manager_email'], '-')}
              </div>
            </div>

            {/* Parameter Detail Sesuai Cuti / Attendance */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Tipe Pengajuan</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">
                    {selectedRequest._category === 'Leave'
                      ? getPropCaseInsensitive(selectedRequest, ['Leave Type', 'leave_type', 'Type', 'type'], '-')
                      : getPropCaseInsensitive(selectedRequest, ['Type', 'type', 'Attendance Type', 'attendance_type'], '-')}
                  </span>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block">Status Saat Ini</span>
                  <span className="text-xs sm:text-sm font-bold text-yellow-600">
                    {getPropCaseInsensitive(selectedRequest, ['Status', 'status', 'Approval Status'], 'Pending Approval')}
                  </span>
                </div>
              </div>

              {selectedRequest._category === 'Leave' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Dari Tanggal</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">
                        {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['From Date', 'from_date', 'Start Date', 'start_date']), lang)}
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Sampai Tanggal</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800">
                        {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['To Date', 'to_date', 'End Date', 'end_date']), lang)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Total Hari Pengajuan</span>
                      <span className="text-xs sm:text-sm font-black text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Total Days Count', 'total_days_count', 'Total Days', 'total_days', 'Duration', 'duration'], '1')} Hari
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Sisa / Final Balance</span>
                      <span className="text-xs sm:text-sm font-black text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Final balance', 'final_balance', 'Final Balance'], '-')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold block">Tanggal Presensi</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDateDisplay(getPropCaseInsensitive(selectedRequest, ['Date', 'date', 'attendance_date', 'CreatedDate']), lang)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Clock In</span>
                      <span className="text-xs sm:text-sm font-bold text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Clock In', 'clock_in', 'In Time'], '--:--')}
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-semibold block">Clock Out</span>
                      <span className="text-xs sm:text-sm font-bold text-gray-800">
                        {getPropCaseInsensitive(selectedRequest, ['Clock Out', 'clock_out', 'Out Time'], '--:--')}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Catatan / Alasan */}
              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <span className="text-[10px] text-gray-400 font-semibold block">Alasan / Catatan Pengajuan</span>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                  {getPropCaseInsensitive(selectedRequest, ['Reason', 'reason', 'Description', 'description', 'notes', 'Notes', 'keterangan'], 'Tidak ada keterangan tambahan.')}
                </p>
              </div>

              {/* Lampiran / Dokumen */}
              {getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo', 'Link']) && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold block mb-2">Lampiran / Bukti</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo'])}
                      alt="Attachment"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                      onClick={() => {
                        setPhotoPreviewUrl(getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']));
                        setIsPhotoModalOpen(true);
                      }}
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/128/337/337946.png'; }}
                    />
                    <div>
                      <button
                        onClick={() => {
                          setPhotoPreviewUrl(getPropCaseInsensitive(selectedRequest, ['Attachment', 'attachment', 'Proof', 'proof', 'Image', 'image', 'photo']));
                          setIsPhotoModalOpen(true);
                        }}
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        Klik untuk memperbesar preview
                      </button>
                      <p className="text-[10px] text-gray-400 mt-0.5">Surat dokter / foto presensi / berkas pendukung</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => openRejectDialog(selectedRequest)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tolak (Reject)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin menyetujui (Approve) permintaan ini?')) {
                    handleUpdateStatus(selectedRequest, 'Approved');
                  }
                }}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                {isProcessing ? 'Menyimpan...' : 'Setujui (Approve)'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Dialog Reject dengan Input Alasan */}
      {isRejectModalOpen && itemToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Tolak Permintaan</h3>
            <p className="text-xs text-gray-500 mb-3">
              Anda akan menolak pengajuan <strong>{itemToReject._category}</strong> dari{' '}
              <strong>{getPropCaseInsensitive(itemToReject, ['Name', 'name', 'nama', 'fullname'])}</strong>.
            </p>

            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Alasan Penolakan <span className="text-gray-400 font-normal">(opsional / dikirim ke karyawan)</span>
            </label>
            <textarea
              rows="3"
              value={rejectReason}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Contoh: Jadwal bertabrakan dengan shift lain / bukti tidak lengkap..."
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                disabled={isProcessing}
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setItemToReject(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isProcessing ? 'Memproses...' : 'Tolak Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar / Dokumen */}
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
              <span className="text-xs font-bold text-gray-700">Preview Lampiran / Bukti</span>
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
                alt="Bukti Lampiran" 
                className="max-h-[70vh] w-auto object-contain rounded-lg" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}