import React, { useState, useEffect, useCallback } from 'react';
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

  // State Payslip
  const [payslips, setPayslips] = useState([]);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipError, setPayslipError] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const t = currentLang === 'id' ? {
    title: 'Detail Karyawan',
    subtitle: 'Informasi detail akun Anda',
    refresh: 'Muat Ulang',
    loading: 'Memuat...',
    tabPersonal: 'Informasi Pribadi',
    tabEmployee: 'Detail Pekerjaan',
    tabBank: 'Bank & Manfaat',
    tabPayslip: 'Slip Gaji',
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
    descCode: 'Kode Deskripsi',
    // Payslip
    payslipListTitle: 'Daftar Slip Gaji',
    payslipDetailTitle: 'Detail Slip Gaji',
    periodCol: 'Periode',
    payDateCol: 'Tanggal Bayar',
    basicCol: 'Gaji Pokok',
    grossCol: 'Total Pendapatan',
    deductionCol: 'Total Potongan',
    netCol: 'Gaji Bersih (THP)',
    statusCol: 'Status',
    actionCol: 'Aksi',
    viewDetail: 'Lihat Detail',
    closeModal: 'Tutup',
    printPayslip: 'Cetak / PDF',
    viewFile: 'Buka Dokumen',
    takeHomePay: 'Gaji Bersih (Take Home Pay)',
    earningsTitle: 'Pendapatan (Earnings)',
    deductionsTitle: 'Potongan (Deductions)',
    otherFieldsTitle: 'Informasi Tambahan',
    overtime: 'Lembur',
    bonusIncentive: 'Bonus / Insentif / THR',
    totalEarnings: 'Total Pendapatan',
    bpjsTkDeduction: 'Potongan BPJS Ketenagakerjaan',
    bpjsKesDeduction: 'Potongan BPJS Kesehatan',
    taxDeduction: 'Potongan Pajak (PPh 21 / TER)',
    lateAbsentDeduction: 'Potongan Keterlambatan / Absen',
    otherDeduction: 'Potongan Lainnya',
    totalDeductions: 'Total Potongan',
    noPayslipTitle: 'Data Slip Gaji Tidak Ditemukan',
    noPayslipDesc: 'Belum ada data di tabel payroll dengan "Employee Email" untuk akun'
  } : {
    title: 'Employee Details',
    subtitle: 'Detail information of your account',
    refresh: 'Refresh',
    loading: 'Loading...',
    tabPersonal: 'Personal Information',
    tabEmployee: 'Employee Details',
    tabBank: 'Bank & Benefit',
    tabPayslip: 'Payslip',
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
    descCode: 'Description Code',
    // Payslip
    payslipListTitle: 'Payslip List',
    payslipDetailTitle: 'Payslip Detail',
    periodCol: 'Period',
    payDateCol: 'Payment Date',
    basicCol: 'Basic Salary',
    grossCol: 'Total Earnings',
    deductionCol: 'Total Deductions',
    netCol: 'Take Home Pay',
    statusCol: 'Status',
    actionCol: 'Action',
    viewDetail: 'View Detail',
    closeModal: 'Close',
    printPayslip: 'Print / PDF',
    viewFile: 'Open Document',
    takeHomePay: 'Take Home Pay (Net Salary)',
    earningsTitle: 'Earnings',
    deductionsTitle: 'Deductions',
    otherFieldsTitle: 'Additional Information',
    overtime: 'Overtime',
    bonusIncentive: 'Bonus / Incentive / THR',
    totalEarnings: 'Total Earnings',
    bpjsTkDeduction: 'BPJS Ketenagakerjaan Deduction',
    bpjsKesDeduction: 'BPJS Health Deduction',
    taxDeduction: 'Income Tax (PPh 21 / TER)',
    lateAbsentDeduction: 'Late / Absent Deduction',
    otherDeduction: 'Other Deduction',
    totalDeductions: 'Total Deductions',
    noPayslipTitle: 'No Payslip Records Found',
    noPayslipDesc: 'No payroll record matched "Employee Email" for'
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
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getValFromObj = (obj, keys, fallback = '-') => {
    if (!obj) return fallback;
    const dataKeys = Object.keys(obj);
    
    for (const key of keys) {
      const match = dataKeys.find(k => k.trim().toLowerCase() === key.trim().toLowerCase());
      if (match && obj[match] !== null && obj[match] !== '') return String(obj[match]);
    }
    
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
      const match = dataKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedKey);
      if (match && obj[match] !== null && obj[match] !== '') return String(obj[match]);
    }
    
    return fallback;
  };

  const getVal = (keys, fallback = '-') => getValFromObj(userData, keys, fallback);

  const parseNumeric = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
    const cleaned = str.replace(/[^0-9,-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return 'Rp 0';
    const num = parseNumeric(val);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Ambil hanya email user yang login (BUKAN Employee Work Email)
  const getLoggedInUserEmail = async (sessionUser, outletCtx) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.email) {
        return authData.user.email.trim();
      }
    } catch (e) {}

    if (outletCtx?.session?.user?.email) {
      return String(outletCtx.session.user.email).trim();
    }
    if (outletCtx?.user?.email) {
      return String(outletCtx.user.email).trim();
    }

    if (sessionUser && typeof sessionUser === 'object') {
      const userAccountEmail = getValFromObj(
        sessionUser,
        ['email', 'Email', 'Personal Email', 'personal email', 'personal_email', 'email pribadi'],
        ''
      );
      if (userAccountEmail && userAccountEmail !== '-' && userAccountEmail.includes('@')) {
        return userAccountEmail.trim();
      }
    }

    return '';
  };

  const fetchPayslips = useCallback(async (sessionUser, outletCtx) => {
    setPayslipLoading(true);
    setPayslipError(null);

    try {
      const userEmail = await getLoggedInUserEmail(sessionUser, outletCtx);
      setLoginEmail(userEmail);

      if (!userEmail) {
        setPayslips([]);
        setPayslipLoading(false);
        return;
      }

      // Ambil dari tabel payroll di mana "Employee Email" = email user yang login
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .ilike('Employee Email', `%${userEmail}%`);

      if (error) throw error;

      const matched = (data || []).filter((row) => {
        const rowEmail = getValFromObj(row, ['Employee Email', 'employee_email'], '').trim().toLowerCase();
        return rowEmail === userEmail.toLowerCase();
      });

      // Urutkan dari periode / tanggal terbaru
      const sorted = matched.sort((a, b) => {
        const dateStrA = getValFromObj(a, ['Payment Date', 'Pay Date', 'Tanggal Pembayaran', 'created_at'], '');
        const dateStrB = getValFromObj(b, ['Payment Date', 'Pay Date', 'Tanggal Pembayaran', 'created_at'], '');
        const timeA = dateStrA ? new Date(dateStrA).getTime() : 0;
        const timeB = dateStrB ? new Date(dateStrB).getTime() : 0;
        if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) {
          return timeB - timeA;
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      setPayslips(sorted);
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setPayslipError(err.message || 'Gagal memuat data payroll');
    } finally {
      setPayslipLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('hris_session_data');
    let parsed = null;
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        setUserData(parsed);
      } catch (e) {}
    }
    fetchPayslips(parsed, context);
  }, [fetchPayslips]);

  const refreshData = () => {
    setLoading(true);
    const saved = localStorage.getItem('hris_session_data');
    let parsed = userData;
    if (saved) {
      try {
        parsed = JSON.parse(saved);
        setUserData(parsed);
      } catch (e) {}
    }
    fetchPayslips(parsed, context).finally(() => {
      setTimeout(() => setLoading(false), 300);
    });
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

  const getPayslipSummary = (slip) => {
    if (!slip) {
      return { basicSalary: 0, earnings: [], deductions: [], totalEarnings: 0, totalDeductions: 0, netSalary: 0, extraFields: [] };
    }

    const mappedKeys = new Set([
      'id', 'created_at', 'updated_at',
      'employee email', 'employee_email', 'email',
      'employee name', 'name', 'nama',
      'employee id', 'nik',
      'department', 'dept',
      'job title', 'position',
      'bank name', 'nama bank',
      'bank account number', 'no rekening',
      'period', 'payroll period', 'month', 'periode', 'bulan',
      'payment date', 'pay date', 'tanggal pembayaran',
      'status', 'payment status',
      'payslip link', 'link', 'pdf', 'file', 'url'
    ]);

    const earningDefs = [
      { label: t.basicSalary, keys: ['Basic Salary', 'Gaji Pokok'], alwaysShow: true },
      { label: t.posAllowance, keys: ['Position Allowance', 'Tunjangan Jabatan'], alwaysShow: false },
      { label: t.travelAllowance, keys: ['Travel & Communication Allowance', 'Transport Allowance', 'Tunjangan Transportasi'], alwaysShow: false },
      { label: t.mealAllowance, keys: ['Meal Allowance', 'Meals Allowance', 'Tunjangan Makan'], alwaysShow: false },
      { label: t.overtime, keys: ['Overtime', 'Overtime Pay', 'Lembur'], alwaysShow: false },
      { label: t.bonusIncentive, keys: ['Bonus', 'Incentive', 'THR', 'Service Charge'], alwaysShow: false },
      { label: t.otherAllowance, keys: ['Other Allowance', 'Tunjangan Lainnya'], alwaysShow: false }
    ];

    const deductionDefs = [
      { label: t.bpjsTkDeduction, keys: ['BPJS Ketenagakerjaan', 'BPJS TK', 'JHT', 'Potongan BPJS TK'], alwaysShow: true },
      { label: t.bpjsKesDeduction, keys: ['BPJS Kesehatan', 'BPJS Health', 'Potongan BPJS Kesehatan'], alwaysShow: true },
      { label: t.taxDeduction, keys: ['Income Tax', 'PPh 21', 'PPh21', 'Tax', 'TER', 'Potongan Pajak'], alwaysShow: true },
      { label: t.lateAbsentDeduction, keys: ['Late Deduction', 'Absent Deduction', 'Unpaid Leave', 'Potongan Absen', 'Potongan Keterlambatan'], alwaysShow: false },
      { label: t.otherDeduction, keys: ['Other Deduction', 'Other Deductions', 'Loan', 'Kasbon', 'Potongan Lainnya'], alwaysShow: false }
    ];

    [...earningDefs, ...deductionDefs].forEach(def => {
      def.keys.forEach(k => mappedKeys.add(k.toLowerCase()));
    });
    ['total earnings', 'gross salary', 'total income', 'total pendapatan', 'gaji kotor',
     'total deductions', 'total deduction', 'total potongan',
     'net salary', 'take home pay', 'thp', 'net pay', 'gaji bersih'].forEach(k => mappedKeys.add(k));

    const earnings = earningDefs
      .map((item) => {
        const raw = getValFromObj(slip, item.keys, '');
        return { label: item.label, amount: parseNumeric(raw), alwaysShow: item.alwaysShow };
      })
      .filter((item) => item.alwaysShow || item.amount > 0);

    const deductions = deductionDefs
      .map((item) => {
        const raw = getValFromObj(slip, item.keys, '');
        return { label: item.label, amount: parseNumeric(raw), alwaysShow: item.alwaysShow };
      })
      .filter((item) => item.alwaysShow || item.amount > 0);

    const basicSalary = parseNumeric(getValFromObj(slip, ['Basic Salary', 'Gaji Pokok'], '0'));

    const rawTotalEarnings = getValFromObj(slip, ['Total Earnings', 'Gross Salary', 'Total Income', 'Total Pendapatan', 'Gaji Kotor'], '');
    const totalEarnings = rawTotalEarnings !== '' && rawTotalEarnings !== '-'
      ? parseNumeric(rawTotalEarnings)
      : earnings.reduce((sum, item) => sum + item.amount, 0);

    const rawTotalDeductions = getValFromObj(slip, ['Total Deductions', 'Total Deduction', 'Total Potongan'], '');
    const totalDeductions = rawTotalDeductions !== '' && rawTotalDeductions !== '-'
      ? parseNumeric(rawTotalDeductions)
      : deductions.reduce((sum, item) => sum + item.amount, 0);

    const rawNet = getValFromObj(slip, ['Net Salary', 'Take Home Pay', 'THP', 'Net Pay', 'Gaji Bersih'], '');
    const netSalary = rawNet !== '' && rawNet !== '-'
      ? parseNumeric(rawNet)
      : totalEarnings - totalDeductions;

    const extraFields = Object.entries(slip)
      .filter(([key, val]) => !mappedKeys.has(key.trim().toLowerCase()) && val !== null && val !== '')
      .map(([key, val]) => ({
        label: key,
        value: typeof val === 'number' ? formatCurrency(val) : String(val)
      }));

    return { basicSalary, earnings, deductions, totalEarnings, totalDeductions, netSalary, extraFields };
  };

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
            disabled={loading || payslipLoading}
            className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 ml-3"
            title={t.refresh}
          >
            <svg className={`w-4 h-4 ${loading || payslipLoading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading || payslipLoading ? t.loading : t.refresh}</span>
          </button>
        </div>

        {/* Mobile Dropdown */}
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
            <option value="payslip">{t.tabPayslip}</option>
          </select>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:flex border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap text-xs font-semibold text-center">
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('personal')}
                className={`py-3 px-4 inline-block cursor-pointer ${activeTab === 'personal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabPersonal}
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('employee')}
                className={`py-3 px-4 inline-block cursor-pointer ${activeTab === 'employee' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabEmployee}
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('bank')}
                className={`py-3 px-4 inline-block cursor-pointer ${activeTab === 'bank' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabBank}
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('payslip')}
                className={`py-3 px-4 inline-block cursor-pointer ${activeTab === 'payslip' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.tabPayslip}
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

          {activeTab === 'payslip' && (
            <div>
              {payslipLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <svg className="w-7 h-7 animate-spin text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs font-medium">{t.loading}</span>
                </div>
              ) : payslipError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {payslipError}
                </div>
              ) : payslips.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <p className="text-sm font-semibold text-gray-700">{t.noPayslipTitle}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.noPayslipDesc} <span className="font-semibold text-gray-700">{loginEmail || '-'}</span>.
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3">{t.payslipListTitle}</h4>

                  {/* Tampilan List Tabel Desktop */}
                  <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                          <th className="py-3 px-4 w-12">No</th>
                          <th className="py-3 px-4">{t.periodCol}</th>
                          <th className="py-3 px-4">{t.payDateCol}</th>
                          <th className="py-3 px-4 text-right">{t.basicCol}</th>
                          <th className="py-3 px-4 text-right">{t.grossCol}</th>
                          <th className="py-3 px-4 text-right">{t.deductionCol}</th>
                          <th className="py-3 px-4 text-right">{t.netCol}</th>
                          <th className="py-3 px-4 text-center">{t.statusCol}</th>
                          <th className="py-3 px-4 text-center">{t.actionCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {payslips.map((slip, idx) => {
                          const summary = getPayslipSummary(slip);
                          const periodLabel = getValFromObj(
                            slip,
                            ['Period', 'Payroll Period', 'Month', 'Periode', 'Bulan'],
                            formatIndoDateOnly(getValFromObj(slip, ['Payment Date', 'Pay Date', 'created_at'], `#${idx + 1}`))
                          );
                          const payDateLabel = formatIndoDateOnly(
                            getValFromObj(slip, ['Payment Date', 'Pay Date', 'Tanggal Pembayaran', 'created_at'], '-')
                          );
                          const statusLabel = getValFromObj(slip, ['Status', 'Payment Status'], 'Paid');

                          return (
                            <tr
                              key={slip.id || idx}
                              onClick={() => setSelectedPayslip(slip)}
                              className="hover:bg-blue-50/50 transition cursor-pointer"
                            >
                              <td className="py-3 px-4 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-gray-900">{periodLabel}</td>
                              <td className="py-3 px-4 text-gray-600">{payDateLabel}</td>
                              <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(summary.basicSalary)}</td>
                              <td className="py-3 px-4 text-right text-emerald-700 font-medium">{formatCurrency(summary.totalEarnings)}</td>
                              <td className="py-3 px-4 text-right text-rose-600">{formatCurrency(summary.totalDeductions)}</td>
                              <td className="py-3 px-4 text-right font-bold text-blue-700">{formatCurrency(summary.netSalary)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPayslip(slip);
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                >
                                  {t.viewDetail}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Tampilan List Kartu Mobile */}
                  <div className="md:hidden space-y-3">
                    {payslips.map((slip, idx) => {
                      const summary = getPayslipSummary(slip);
                      const periodLabel = getValFromObj(
                        slip,
                        ['Period', 'Payroll Period', 'Month', 'Periode', 'Bulan'],
                        formatIndoDateOnly(getValFromObj(slip, ['Payment Date', 'Pay Date', 'created_at'], `#${idx + 1}`))
                      );
                      const payDateLabel = formatIndoDateOnly(
                        getValFromObj(slip, ['Payment Date', 'Pay Date', 'Tanggal Pembayaran', 'created_at'], '-')
                      );
                      const statusLabel = getValFromObj(slip, ['Status', 'Payment Status'], 'Paid');

                      return (
                        <div
                          key={slip.id || idx}
                          onClick={() => setSelectedPayslip(slip)}
                          className="p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 shadow-2xs transition cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-bold text-gray-900 block">{periodLabel}</span>
                              <span className="text-[11px] text-gray-500">{t.payDateCol}: {payDateLabel}</span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {statusLabel}
                            </span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                            <div>
                              <span className="text-[11px] text-gray-500 block">{t.netCol}</span>
                              <span className="text-sm font-bold text-blue-700">{formatCurrency(summary.netSalary)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPayslip(slip);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                            >
                              {t.viewDetail}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Modal Detail Slip Gaji */}
      {selectedPayslip && (() => {
        const { earnings, deductions, totalEarnings, totalDeductions, netSalary, extraFields } = getPayslipSummary(selectedPayslip);
        const periodLabel = getValFromObj(
          selectedPayslip,
          ['Period', 'Payroll Period', 'Month', 'Periode', 'Bulan'],
          formatIndoDateOnly(getValFromObj(selectedPayslip, ['Payment Date', 'Pay Date', 'created_at'], '-'))
        );
        const payDateLabel = formatIndoDateOnly(
          getValFromObj(selectedPayslip, ['Payment Date', 'Pay Date', 'Tanggal Pembayaran', 'created_at'], '-')
        );
        const statusLabel = getValFromObj(selectedPayslip, ['Status', 'Payment Status'], 'Paid');
        const pdfLink = getValFromObj(selectedPayslip, ['Payslip Link', 'Link', 'PDF', 'File', 'Url'], '');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{t.payslipDetailTitle}</h3>
                  <p className="text-xs text-gray-500">{periodLabel} • {t.payDateCol}: {payDateLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pdfLink && pdfLink !== '-' && (
                    <a
                      href={pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                    >
                      {t.viewFile}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    {t.printPayslip}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(null)}
                    className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    {t.closeModal}
                  </button>
                </div>
              </div>

              {/* Banner Take Home Pay */}
              <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-blue-100 font-semibold block">
                    {t.takeHomePay}
                  </span>
                  <span className="text-2xl font-bold mt-0.5 block">{formatCurrency(netSalary)}</span>
                </div>
                <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                  {statusLabel}
                </span>
              </div>

              {/* Identitas Karyawan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-5">
                <DetailRow label={t.employeeName} value={getValFromObj(selectedPayslip, ['Employee Name', 'Name', 'Nama'], getVal(['name', 'nama']))} />
                <DetailRow label={t.empId} value={getValFromObj(selectedPayslip, ['Employee ID', 'NIK', 'ID'], getVal(['employee id', 'id']))} />
                <DetailRow label={t.dept} value={getValFromObj(selectedPayslip, ['Department', 'Dept'], getVal(['department']))} />
                <DetailRow label={t.jobTitle} value={getValFromObj(selectedPayslip, ['Job Title', 'Position'], getVal(['job title']))} />
                <DetailRow label={t.bankName} value={getValFromObj(selectedPayslip, ['Bank Name', 'Nama Bank'], getVal(['bank name']))} />
                <DetailRow label={t.bankAccNum} value={getValFromObj(selectedPayslip, ['Bank Account Number', 'No Rekening'], getVal(['bank account number']))} />
              </div>

              {/* Pendapatan & Potongan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-emerald-700 pb-2 mb-2 border-b border-gray-200">{t.earningsTitle}</h4>
                  <div className="space-y-0.5">
                    {earnings.map((item, i) => (
                      <DetailRow key={i} label={item.label} value={formatCurrency(item.amount)} />
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">{t.totalEarnings}</span>
                    <span className="text-sm font-bold text-emerald-700">{formatCurrency(totalEarnings)}</span>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-rose-700 pb-2 mb-2 border-b border-gray-200">{t.deductionsTitle}</h4>
                  <div className="space-y-0.5">
                    {deductions.map((item, i) => (
                      <DetailRow key={i} label={item.label} value={formatCurrency(item.amount)} />
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">{t.totalDeductions}</span>
                    <span className="text-sm font-bold text-rose-700">{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Komponen Tambahan dari Tabel Payroll */}
              {extraFields.length > 0 && (
                <div className="mt-5 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 pb-2 mb-2 border-b border-gray-200">{t.otherFieldsTitle}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
                    {extraFields.map((field, i) => (
                      <DetailRow key={i} label={field.label} value={field.value} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

    </div>
  );
}