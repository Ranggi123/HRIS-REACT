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
    if (!dateVal || dateVal === '-') return '-';
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

  // Helper function to extract data case-insensitively like in account.html
  const getVal = (keys, fallback = '-') => {
    if (!userData) return fallback;
    const dataKeys = Object.keys(userData);
    
    // Exact/Case-insensitive match
    for (const key of keys) {
      const match = dataKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (match && userData[match] !== null && userData[match] !== '') return String(userData[match]);
    }
    
    // Ignore space/underscore match
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
      const match = dataKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedKey);
      if (match && userData[match] !== null && userData[match] !== '') return String(userData[match]);
    }
    
    return fallback;
  };

  // Reusable UI Components for layout consistency
  const DetailRow = ({ label, value }) => (
    <div className="py-2 border-b border-gray-100 flex justify-between items-center">
      <span className="text-xs text-gray-500 block mb-0.5">{label}</span>
      <span className="text-xs font-semibold text-gray-800 text-right ml-4">{value}</span>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <div className="col-span-1 md:col-span-2 mt-5 mb-1 pb-1 border-b border-gray-200">
      <h4 className="text-sm font-semibold text-blue-700">{title}</h4>
    </div>
  );

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                <img src={getVal(['link', 'photo', 'picture', 'avatar'], 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png')} alt="Profile" className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover shadow-md mb-2 bg-blue-50" />
                <h2 className="text-xl font-bold text-gray-800">{getVal(['name', 'nama', 'fullname', 'full_name'], 'Employee Name')}</h2>
              </div>
              
              <DetailRow label="Known As" value={getVal(['known as', 'nama panggilan'])} />
              <DetailRow label="Email Pribadi" value={getVal(['personal email', 'email pribadi', 'email'])} />
              <DetailRow label="Phone" value={getVal(['phone number', 'phone', 'mobile', 'no hp'])} />
              <DetailRow label="Gender" value={getVal(['gender', 'jenis kelamin'])} />
              <DetailRow label="Date of Birth" value={formatIndoDateOnly(getVal(['date of birth', 'dob', 'tanggal lahir']))} />
              <DetailRow label="Place of Birth" value={getVal(['place of birth', 'pob', 'tempat lahir'])} />
              <DetailRow label="Religion" value={getVal(['religion', 'agama'])} />
              <DetailRow label="Blood Type" value={getVal(['blood type', 'golongan darah'])} />
              <DetailRow label="Marital Status" value={getVal(['marital status', 'status pernikahan'])} />
              <DetailRow label="Residential Address" value={getVal(['residential address', 'alamat domisili'])} />
              <DetailRow label="Size T-Shirt" value={getVal(['size t-shirt', 't-shirt size', 'ukuran baju'])} />
              <DetailRow label="Size Shoes" value={getVal(['size shoes', 'shoe size', 'ukuran sepatu'])} />
              <DetailRow label="Education Level" value={getVal(['education level', 'pendidikan'])} />
              
              <SectionHeader title="ID Card" />
              <DetailRow label="KTP Number" value={getVal(['KTP Number', 'ktp number', 'ktp_number', 'no ktp', 'nomor ktp'])} />
              <DetailRow label="KK Number" value={getVal(['KK Number', 'kk number', 'kk_number', 'no kk', 'nomor kk'])} />
              <DetailRow label="Citizen ID Address" value={getVal(['citizen id address', 'alamat ktp'])} />
              <DetailRow label="NPWP Number" value={getVal(['NPWP Number', 'npwp number', 'npwp_number', 'no npwp', 'nomor npwp'])} />
              <DetailRow label="NPWP Address" value={getVal(['npwp address', 'alamat npwp'])} />

              <SectionHeader title="Emergency Contact" />
              <DetailRow label="Emergency Contact Name" value={getVal(['Emergency Contact Name', 'emergency contact name', 'nama kontak darurat'])} />
              <DetailRow label="Emergency Relationship" value={getVal(['Emergency Relationship', 'emergency relationship', 'hubungan kontak darurat'])} />
              <DetailRow label="Emergency Contact Number" value={getVal(['Emergency Contact Number', 'emergency contact number', 'no kontak darurat'])} />
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <DetailRow label="Employee ID" value={getVal(['employee id', 'employeeid', 'id'])} />
              <DetailRow label="Department" value={getVal(['department', 'dept'])} />
              <DetailRow label="Job Title" value={getVal(['job title', 'job_title', 'position'])} />
              <DetailRow label="Job Level" value={getVal(['job level'])} />
              <DetailRow label="Job Grade" value={getVal(['job grade'])} />
              <DetailRow label="Join Date" value={formatIndoDateOnly(getVal(['join date', 'tanggal masuk']))} />
              <DetailRow label="Job Description" value={getVal(['job description'])} />
              <DetailRow label="Employee Work Email" value={getVal(['employee work email', 'work email', 'employee_work_email', 'email'])} />
              <DetailRow label="Direct Reporting Line" value={getVal(['direct reporting line', 'direct line report', 'bawahan langsung'])} />
              <DetailRow label="Line Manager" value={getVal(['line manager', 'atasan'])} />
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <div className="col-span-1 md:col-span-2 flex items-center mb-1 mt-2">
                 <h4 className="font-bold text-gray-700 bg-blue-100 px-3 py-1 rounded text-sm w-full">Bank Information</h4>
              </div>
              <DetailRow label="Bank Name" value={getVal(['bank name', 'nama bank'])} />
              <DetailRow label="Bank Code" value={getVal(['bank code', 'kode bank'])} />
              <DetailRow label="Bank Account Name" value={getVal(['bank account name', 'nama rekening'])} />
              <DetailRow label="Bank Account Number" value={getVal(['bank account number', 'no rekening'])} />

              <SectionHeader title="Bpjs" />
              <DetailRow 
                label="Bpjs Ketenagakerjaan Number" 
                value={`${getVal(['bpjs ketenagakerjaan number', 'no bpjs tk'])} ${getVal(['bpjs ketenagakerjaan status', 'status bpjs tk']) !== '-' ? `(${getVal(['bpjs ketenagakerjaan status', 'status bpjs tk'])})` : ''}`} 
              />
              <DetailRow 
                label="Bpjs Health Number" 
                value={`${getVal(['bpjs health number', 'bpjs kesehatan number', 'no bpjs kes'])} ${getVal(['bpjs health status', 'bpjs kesehatan status', 'status bpjs kes']) !== '-' ? `(${getVal(['bpjs health status', 'bpjs kesehatan status', 'status bpjs kes'])})` : ''}`} 
              />

              <SectionHeader title="Salary" />
              <DetailRow label="Basic Salary" value={getVal(['basic salary', 'gaji pokok'])} />
              <DetailRow label="Position Allowance" value={getVal(['position allowance', 'tunjangan jabatan'])} />
              <DetailRow label="Travel & Communication Allowance" value={getVal(['travel & communication allowance', 'tunjangan transport'])} />
              <DetailRow label="Meal Allowance" value={getVal(['meal allowance', 'meals allowance', 'tunjangan makan'])} />
              <DetailRow label="Other Allowance" value={getVal(['other allowance', 'tunjangan lain'])} />

              <SectionHeader title="Income Tax" />
              <DetailRow label="Ter" value={getVal(['ter'])} />
              <DetailRow label="Description Code" value={getVal(['description code', 'kode deskripsi'])} />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}