import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router-dom';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Account() {
  const context = useOutletContext() || {};
  const currentLang = context.currentLang || 'en';
  
  const [activeTab, setActiveTab] = useState('personal');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  const t = currentLang === 'id' ? {
    title: 'Detail Karyawan',
    subtitle: 'Informasi detail akun Anda',
    refresh: 'Muat Ulang',
    loading: 'Memuat...',
    tabPersonal: 'Informasi Pribadi',
    tabEmployee: 'Detail Pekerjaan',
    tabBank: 'Bank & Manfaat',
    employeeName: 'Nama Karyawan',
    knownAs: 'Nama Panggilan',
    personalEmail: 'Email Pribadi',
    phone: 'Nomor Telepon',
    gender: 'Jenis Kelamin',
    dob: 'Tanggal Lahir',
    pob: 'Tempat Lahir',
    religion: 'Agama',
    bloodType: 'Golongan Darah',
    maritalStatus: 'Status Pernikahan',
    resAddress: 'Alamat Domisili',
    sizeTshirt: 'Ukuran Baju',
    sizeShoes: 'Ukuran Sepatu',
    eduLevel: 'Tingkat Pendidikan',
    idCard: 'Kartu Identitas (KTP)',
    ktpNum: 'Nomor KTP',
    kkNum: 'Nomor KK',
    ktpAddress: 'Alamat KTP',
    npwpNum: 'Nomor NPWP',
    npwpAddress: 'Alamat NPWP',
    emgContactTitle: 'Kontak Darurat',
    emgName: 'Nama Kontak Darurat',
    emgRelation: 'Hubungan Darurat',
    emgPhone: 'Nomor Kontak Darurat',
    empId: 'ID Karyawan',
    dept: 'Departemen',
    jobTitle: 'Jabatan',
    jobLevel: 'Level Pekerjaan',
    jobGrade: 'Golongan Pekerjaan',
    joinDate: 'Tanggal Bergabung',
    jobDesc: 'Deskripsi Pekerjaan',
    workEmail: 'Email Kantor',
    directLine: 'Bawahan Langsung',
    lineManager: 'Atasan Langsung (Line Manager)',
    leaveBalance: 'Sisa Cuti & Libur',
    annualLeave: 'Cuti Tahunan',
    dop: 'Pembayaran Hari Libur (DOP)',
    eo: 'Libur Ekstra (EO)',
    bankInfo: 'Informasi Bank',
    bankName: 'Nama Bank',
    bankCode: 'Kode Bank',
    bankAccName: 'Nama Rekening',
    bankAccNum: 'Nomor Rekening',
    bpjsTitle: 'BPJS',
    bpjsTk: 'Nomor BPJS Ketenagakerjaan',
    bpjsKes: 'Nomor BPJS Kesehatan',
    salaryTitle: 'Gaji',
    basicSalary: 'Gaji Pokok',
    posAllowance: 'Tunjangan Jabatan',
    travelAllowance: 'Tunjangan Transportasi',
    mealAllowance: 'Tunjangan Makan',
    otherAllowance: 'Tunjangan Lainnya',
    taxTitle: 'Pajak Penghasilan',
    ter: 'TER',
    descCode: 'Kode Deskripsi'
  } : {
    title: 'Employee Details',
    subtitle: 'Detail information of your account',
    refresh: 'Refresh',
    loading: 'Loading...',
    tabPersonal: 'Personal Information',
    tabEmployee: 'Employee Details',
    tabBank: 'Bank & Benefit',
    employeeName: 'Employee Name',
    knownAs: 'Known As',
    personalEmail: 'Personal Email',
    phone: 'Phone',
    gender: 'Gender',
    dob: 'Date of Birth',
    pob: 'Place of Birth',
    religion: 'Religion',
    bloodType: 'Blood Type',
    maritalStatus: 'Marital Status',
    resAddress: 'Residential Address',
    sizeTshirt: 'Size T-Shirt',
    sizeShoes: 'Size Shoes',
    eduLevel: 'Education Level',
    idCard: 'ID Card',
    ktpNum: 'KTP Number',
    kkNum: 'KK Number',
    ktpAddress: 'Citizen ID Address',
    npwpNum: 'NPWP Number',
    npwpAddress: 'NPWP Address',
    emgContactTitle: 'Emergency Contact',
    emgName: 'Emergency Contact Name',
    emgRelation: 'Emergency Relationship',
    emgPhone: 'Emergency Contact Number',
    empId: 'Employee ID',
    dept: 'Department',
    jobTitle: 'Job Title',
    jobLevel: 'Job Level',
    jobGrade: 'Job Grade',
    joinDate: 'Join Date',
    jobDesc: 'Job Description',
    workEmail: 'Employee Work Email',
    directLine: 'Direct Reporting Line',
    lineManager: 'Line Manager',
    leaveBalance: 'Leave Balance',
    annualLeave: 'Annual Leave',
    dop: 'Day Off Payment',
    eo: 'Extra Off',
    bankInfo: 'Bank Information',
    bankName: 'Bank Name',
    bankCode: 'Bank Code',
    bankAccName: 'Bank Account Name',
    bankAccNum: 'Bank Account Number',
    bpjsTitle: 'Bpjs',
    bpjsTk: 'Bpjs Ketenagakerjaan Number',
    bpjsKes: 'Bpjs Health Number',
    salaryTitle: 'Salary',
    basicSalary: 'Basic Salary',
    posAllowance: 'Position Allowance',
    travelAllowance: 'Travel & Communication Allowance',
    mealAllowance: 'Meal Allowance',
    otherAllowance: 'Other Allowance',
    taxTitle: 'Income Tax',
    ter: 'Ter',
    descCode: 'Description Code'
  };

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
    
    // Gunakan terjemahan bulan untuk lokalisasi opsional, atau biarkan DD-MM-YYYY
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

  const getVal = (keys, fallback = '-') => {
    if (!userData) return fallback;
    const dataKeys = Object.keys(userData);
    
    for (const key of keys) {
      const match = dataKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (match && userData[match] !== null && userData[match] !== '') return String(userData[match]);
    }
    
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
      const match = dataKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedKey);
      if (match && userData[match] !== null && userData[match] !== '') return String(userData[match]);
    }
    
    return fallback;
  };

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
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{t.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
          </div>
          <button 
            onClick={refreshData} 
            disabled={loading}
            className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 ml-3"
            title={t.refresh}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? t.loading : t.refresh}</span>
          </button>
        </div>

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
            <option value="personal">{t.tabPersonal}</option>
            <option value="employee">{t.tabEmployee}</option>
            <option value="bank">{t.tabBank}</option>
          </select>
        </div>

        <div className="hidden sm:flex border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap text-xs font-semibold text-center">
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('personal')}
                className={`py-3 px-4 inline-block ${activeTab === 'personal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabPersonal}
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('employee')}
                className={`py-3 px-4 inline-block ${activeTab === 'employee' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabEmployee}
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('bank')}
                className={`py-3 px-4 inline-block ${activeTab === 'bank' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabBank}
              </button>
            </li>
          </ul>
        </div>

        <div>
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                <img src={getVal(['link', 'photo', 'picture', 'avatar'], 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png')} alt="Profile" className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover shadow-md mb-2 bg-blue-50" />
                <h2 className="text-xl font-bold text-gray-800">{getVal(['name', 'nama', 'fullname', 'full_name'], t.employeeName)}</h2>
              </div>
              
              <DetailRow label={t.knownAs} value={getVal(['known as', 'nama panggilan'])} />
              <DetailRow label={t.personalEmail} value={getVal(['personal email', 'email pribadi', 'email'])} />
              <DetailRow label={t.phone} value={getVal(['phone number', 'phone', 'mobile', 'no hp'])} />
              <DetailRow label={t.gender} value={getVal(['gender', 'jenis kelamin'])} />
              <DetailRow label={t.dob} value={formatIndoDateOnly(getVal(['date of birth', 'dob', 'tanggal lahir']))} />
              <DetailRow label={t.pob} value={getVal(['place of birth', 'pob', 'tempat lahir'])} />
              <DetailRow label={t.religion} value={getVal(['religion', 'agama'])} />
              <DetailRow label={t.bloodType} value={getVal(['blood type', 'golongan darah'])} />
              <DetailRow label={t.maritalStatus} value={getVal(['marital status', 'status pernikahan'])} />
              <DetailRow label={t.resAddress} value={getVal(['residential address', 'alamat domisili'])} />
              <DetailRow label={t.sizeTshirt} value={getVal(['size t-shirt', 't-shirt size', 'ukuran baju'])} />
              <DetailRow label={t.sizeShoes} value={getVal(['size shoes', 'shoe size', 'ukuran sepatu'])} />
              <DetailRow label={t.eduLevel} value={getVal(['education level', 'pendidikan'])} />
              
              <SectionHeader title={t.idCard} />
              <DetailRow label={t.ktpNum} value={getVal(['KTP Number', 'ktp number', 'ktp_number', 'no ktp', 'nomor ktp'])} />
              <DetailRow label={t.kkNum} value={getVal(['KK Number', 'kk number', 'kk_number', 'no kk', 'nomor kk'])} />
              <DetailRow label={t.ktpAddress} value={getVal(['citizen id address', 'alamat ktp'])} />
              <DetailRow label={t.npwpNum} value={getVal(['NPWP Number', 'npwp number', 'npwp_number', 'no npwp', 'nomor npwp'])} />
              <DetailRow label={t.npwpAddress} value={getVal(['npwp address', 'alamat npwp'])} />

              <SectionHeader title={t.emgContactTitle} />
              <DetailRow label={t.emgName} value={getVal(['Emergency Contact Name', 'emergency contact name', 'nama kontak darurat'])} />
              <DetailRow label={t.emgRelation} value={getVal(['Emergency Relationship', 'emergency relationship', 'hubungan kontak darurat'])} />
              <DetailRow label={t.emgPhone} value={getVal(['Emergency Contact Number', 'emergency contact number', 'no kontak darurat'])} />
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <DetailRow label={t.empId} value={getVal(['employee id', 'employeeid', 'id'])} />
              <DetailRow label={t.dept} value={getVal(['department', 'dept'])} />
              <DetailRow label={t.jobTitle} value={getVal(['job title', 'job_title', 'position'])} />
              <DetailRow label={t.jobLevel} value={getVal(['job level'])} />
              <DetailRow label={t.jobGrade} value={getVal(['job grade'])} />
              <DetailRow label={t.joinDate} value={formatIndoDateOnly(getVal(['join date', 'tanggal masuk']))} />
              <DetailRow label={t.jobDesc} value={getVal(['job description'])} />
              <DetailRow label={t.workEmail} value={getVal(['employee work email', 'work email', 'employee_work_email', 'email'])} />
              <DetailRow label={t.directLine} value={getVal(['direct reporting line', 'direct line report', 'bawahan langsung'])} />
              <DetailRow label={t.lineManager} value={getVal(['line manager', 'atasan'])} />

              <SectionHeader title={t.leaveBalance} />
              <DetailRow label={t.annualLeave} value={getVal(['annual leave', 'cuti tahunan'])} />
              <DetailRow label={t.dop} value={getVal(['day off payment', 'dop'])} />
              <DetailRow label={t.eo} value={getVal(['extra off', 'eo'])} />
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
              <div className="col-span-1 md:col-span-2 flex items-center mb-1 mt-2">
                 <h4 className="font-bold text-gray-700 bg-blue-100 px-3 py-1 rounded text-sm w-full">{t.bankInfo}</h4>
              </div>
              <DetailRow label={t.bankName} value={getVal(['bank name', 'nama bank'])} />
              <DetailRow label={t.bankCode} value={getVal(['bank code', 'kode bank'])} />
              <DetailRow label={t.bankAccName} value={getVal(['bank account name', 'nama rekening'])} />
              <DetailRow label={t.bankAccNum} value={getVal(['bank account number', 'no rekening'])} />

              <SectionHeader title={t.bpjsTitle} />
              <DetailRow 
                label={t.bpjsTk} 
                value={`${getVal(['bpjs ketenagakerjaan number', 'no bpjs tk'])} ${getVal(['bpjs ketenagakerjaan status', 'status bpjs tk']) !== '-' ? `(${getVal(['bpjs ketenagakerjaan status', 'status bpjs tk'])})` : ''}`} 
              />
              <DetailRow 
                label={t.bpjsKes} 
                value={`${getVal(['bpjs health number', 'bpjs kesehatan number', 'no bpjs kes'])} ${getVal(['bpjs health status', 'bpjs kesehatan status', 'status bpjs kes']) !== '-' ? `(${getVal(['bpjs health status', 'bpjs kesehatan status', 'status bpjs kes'])})` : ''}`} 
              />

              <SectionHeader title={t.salaryTitle} />
              <DetailRow label={t.basicSalary} value={getVal(['basic salary', 'gaji pokok'])} />
              <DetailRow label={t.posAllowance} value={getVal(['position allowance', 'tunjangan jabatan'])} />
              <DetailRow label={t.travelAllowance} value={getVal(['travel & communication allowance', 'tunjangan transport'])} />
              <DetailRow label={t.mealAllowance} value={getVal(['meal allowance', 'meals allowance', 'tunjangan makan'])} />
              <DetailRow label={t.otherAllowance} value={getVal(['other allowance', 'tunjangan lain'])} />

              <SectionHeader title={t.taxTitle} />
              <DetailRow label={t.ter} value={getVal(['ter'])} />
              <DetailRow label={t.descCode} value={getVal(['description code', 'kode deskripsi'])} />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
