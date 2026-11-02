import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Leave() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Format Helper: dd-mm-yyyy
  const formatIndoDateOnly = (dateVal) => {
    if (!dateVal) return '-';
    let d = null;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      const str = String(dateVal).trim();
      const m = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      if (m) {
        d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      } else {
        d = new Date(str);
      }
    }
    if (!d || isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getPropCaseInsensitive = (obj, candidateKeys, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateKeys) {
      const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
      if (found && obj[found]) return String(obj[found]).trim();
    }
    return fallback;
  };

  const userEmail = useMemo(() => {
    return (getPropCaseInsensitive(currentUser, ['email', 'Email', 'user_uid', 'USER_UID']) || '').trim().toLowerCase();
  }, [currentUser]);

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .ilike('Employee', `%${userEmail}%`)
        .order('CreatedDate', { ascending: false })
        .limit(100);
      if (data) setLeaveRecords(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Leave Records Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        
        {/* Top Header Row with Refresh Button at top right */}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Leave Records</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage and track your leave submissions</p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Desktop Action Button */}
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="hidden sm:flex px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition items-center gap-1.5 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Request Leave</span>
            </button>
            {/* Refresh Button at Top Right */}
            <button 
              onClick={refreshAllData} 
              disabled={loading}
              className="p-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl shadow-xs transition flex items-center justify-center active:scale-95"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile View: Action Button Full Width Under Header */}
        <div className="sm:hidden mb-4">
          <button 
            onClick={() => setIsLeaveModalOpen(true)}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span>Request Leave</span>
          </button>
        </div>

        {/* Balances Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Annual Leave</span>
            <span className="text-lg sm:text-xl font-black text-blue-900">12</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase">Day Off Payment</span>
            <span className="text-lg sm:text-xl font-black text-purple-900">0</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase">Extra Off</span>
            <span className="text-lg sm:text-xl font-black text-gray-900">0</span>
          </div>
        </div>

        {/* Leave Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3">Leave Type</th>
                <th className="px-3 py-3">From Date</th>
                <th className="px-3 py-3">To Date</th>
                <th className="px-3 py-3 text-center">Days</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400 italic">Loading records...</td></tr>
              ) : leaveRecords.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400 italic">No leave records found.</td></tr>
              ) : (
                leaveRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 text-xs sm:text-sm">
                    <td className="px-3 py-3 font-semibold text-gray-800">{r['Leave Type'] || r.leave_type || '-'}</td>
                    <td className="px-3 py-3 text-gray-700">{formatIndoDateOnly(r['From Date'] || r.start_date)}</td>
                    <td className="px-3 py-3 text-gray-700">{formatIndoDateOnly(r['To Date'] || r.end_date)}</td>
                    <td className="px-3 py-3 text-center font-bold">{r['Total Days'] || 1}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        {r['Status'] || r.status || 'Approved'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Request Leave Simple */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Request Leave</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leave Type</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Day Off Payment</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
