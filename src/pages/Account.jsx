import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Account() {
  const [activeTab, setActiveTab] = useState('personal');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const saved = localStorage.getItem('hris_session_data');
    if (saved) {
      try {
        setUserData(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="w-full text-gray-800 font-sans">
      
      {/* Account Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        
        {/* Top Header Row with Refresh Button */}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Employee Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">Detail information of your account</p>
          </div>
          <button 
            onClick={refreshData} 
            disabled={loading}
            className="p-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl shadow-xs transition shrink-0 ml-3 flex items-center justify-center active:scale-95"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Mobile View: Dropdown */}
        <div className="sm:hidden mb-4">
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23374151'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.85rem center',
              backgroundSize: '1rem'
            }}
          >
            <option value="personal">Personal Information</option>
            <option value="employee">Employee Details</option>
            <option value="bank">Bank & Benefit</option>
          </select>
        </div>

        {/* Desktop View: Tabs */}
        <div className="hidden sm:flex border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap text-xs font-semibold text-center">
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('personal')}
                className={`py-3 px-4 inline-block ${activeTab === 'personal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Personal
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('employee')}
                className={`py-3 px-4 inline-block ${activeTab === 'employee' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Employee
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('bank')}
                className={`py-3 px-4 inline-block ${activeTab === 'bank' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Bank & Benefit
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                <img src={userData?.link || userData?.photo || 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'} alt="Profile" className="w-28 h-28 rounded-full border-4 border-blue-500 object-cover shadow-md mb-2 bg-blue-50" />
                <h2 className="text-lg font-bold text-gray-800">{userData?.Name || userData?.name || 'Employee Name'}</h2>
              </div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Known As</span><span className="text-xs font-semibold text-gray-800">{userData?.['Known As'] || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Personal Email</span><span className="text-xs font-semibold text-gray-800">{userData?.email || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Phone</span><span className="text-xs font-semibold text-gray-800">{userData?.Phone || userData?.phone || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Gender</span><span className="text-xs font-semibold text-gray-800">{userData?.Gender || userData?.gender || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Date of Birth</span><span className="text-xs font-semibold text-gray-800">{formatIndoDateOnly(userData?.['Date of Birth'] || userData?.dob)}</span></div>
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Employee ID</span><span className="text-xs font-semibold text-gray-800">{userData?.['Employee ID'] || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Department</span><span className="text-xs font-semibold text-gray-800">{userData?.Department || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Job Title</span><span className="text-xs font-semibold text-gray-800">{userData?.['Job Title'] || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Join Date</span><span className="text-xs font-semibold text-gray-800">{formatIndoDateOnly(userData?.['Join Date'])}</span></div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div className="col-span-1 md:col-span-2 bg-blue-50 p-2 rounded-lg mb-2"><h4 className="font-bold text-blue-800 text-xs">Bank Information</h4></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Bank Name</span><span className="text-xs font-semibold text-gray-800">{userData?.['Bank Name'] || '-'}</span></div>
              <div className="py-2 border-b border-gray-100 flex justify-between"><span className="text-xs text-gray-500">Account Number</span><span className="text-xs font-semibold text-gray-800">{userData?.['Bank Account Number'] || '-'}</span></div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
