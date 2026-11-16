import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router-dom';

const SUPABASE_URL = 'https://lfexpyqmjfkymvbacweo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXhweXFtamZreW12YmFjd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzA3OTEsImV4cCI6MjEwNjIwNjc5MX0._e53PLDxsbN0aYM1mqSxLkVGnS0X85D9FYBvb1sQIWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// HELPER: GENERATOR PDF TERKUNCI (READ-ONLY / ANTI-EDIT)
// ============================================================================
const PDF_PADDING = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
]);

function md5Bytes(input) {
  const origLen = input.length;
  const bitLen = origLen * 8;
  const padLen = (((origLen + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(padLen);
  buf.set(input);
  buf[origLen] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, bitLen >>> 0, true);
  view.setUint32(padLen - 4, Math.floor(bitLen / 0x100000000), true);

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padLen; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const temp = D;
      D = C;
      C = B;
      const x = (A + F + K[i] + M[g]) >>> 0;
      const rot = ((x << S[i]) | (x >>> (32 - S[i]))) >>> 0;
      B = (B + rot) >>> 0;
      A = temp;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

function rc4Crypt(key, data) {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
    out[k] = data[k] ^ S[(S[i] + S[j]) & 0xff];
  }
  return out;
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildLockedPdfFromCanvas(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = dataUrl.split(',')[1];
  const rawBinary = atob(base64);
  const jpegBytes = new Uint8Array(rawBinary.length);
  for (let i = 0; i < rawBinary.length; i++) {
    jpegBytes[i] = rawBinary.charCodeAt(i);
  }

  const ownerPwdStr = `HRIS_LOCK_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const ownerPadded = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    ownerPadded[i] = i < ownerPwdStr.length ? ownerPwdStr.charCodeAt(i) : PDF_PADDING[i - ownerPwdStr.length];
  }
  const ownerKey = md5Bytes(ownerPadded).slice(0, 5);
  const O_bytes = rc4Crypt(ownerKey, PDF_PADDING);

  // Permission -3900: Read-Only / Kunci Edit & Copy
  const P_val = -3900;
  const P_bytes = new Uint8Array(4);
  new DataView(P_bytes.buffer).setInt32(0, P_val, true);

  const docId = md5Bytes(new TextEncoder().encode(`PAYSLIP_${Date.now()}_${Math.random()}`));

  const keyInput = new Uint8Array(32 + 32 + 4 + 16);
  keyInput.set(PDF_PADDING, 0);
  keyInput.set(O_bytes, 32);
  keyInput.set(P_bytes, 64);
  keyInput.set(docId, 68);
  const fileKey = md5Bytes(keyInput).slice(0, 5);
  const U_bytes = rc4Crypt(fileKey, PDF_PADDING);

  const encryptObjectStream = (objNum, plainBytes) => {
    const objKeyInput = new Uint8Array(10);
    objKeyInput.set(fileKey, 0);
    objKeyInput[5] = objNum & 0xff;
    objKeyInput[6] = (objNum >> 8) & 0xff;
    objKeyInput[7] = (objNum >> 16) & 0xff;
    objKeyInput[8] = 0;
    objKeyInput[9] = 0;
    const objKey = md5Bytes(objKeyInput).slice(0, 10);
    return rc4Crypt(objKey, plainBytes);
  };

  const encJpeg = encryptObjectStream(4, jpegBytes);
  const contentStr = `q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`;
  const encContent = encryptObjectStream(5, new TextEncoder().encode(contentStr));

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let currentLength = 0;

  const pushStr = (str) => {
    const b = encoder.encode(str);
    chunks.push(b);
    currentLength += b.length;
  };
  const pushBytes = (b) => {
    chunks.push(b);
    currentLength += b.length;
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  offsets[1] = currentLength;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = currentLength;
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = currentLength;
  pushStr(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] ' +
    '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
  );

  offsets[4] = currentLength;
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${encJpeg.length} >>\nstream\n`
  );
  pushBytes(encJpeg);
  pushStr('\nendstream\nendobj\n');

  offsets[5] = currentLength;
  pushStr(`5 0 obj\n<< /Length ${encContent.length} >>\nstream\n`);
  pushBytes(encContent);
  pushStr('\nendstream\nendobj\n');

  offsets[6] = currentLength;
  pushStr(
    `6 0 obj\n<< /Filter /Standard /V 1 /R 2 /O <${toHex(O_bytes)}> /U <${toHex(U_bytes)}> /P ${P_val} >>\nendobj\n`
  );

  const xrefOffset = currentLength;
  pushStr('xref\n0 7\n0000000000 65535 f \n');
  for (let i = 1; i <= 6; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  const idHex = toHex(docId);
  pushStr(
    `trailer\n<< /Size 7 /Root 1 0 R /Encrypt 6 0 R /ID [<${idHex}> <${idHex}>] >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`
  );

  const totalPdf = new Uint8Array(currentLength);
  let pos = 0;
  for (const c of chunks) {
    totalPdf.set(c, pos);
    pos += c.length;
  }

  return new Blob([totalPdf], { type: 'application/pdf' });
}

// ============================================================================
// KOMPONEN UTAMA ACCOUNT
// ============================================================================
export default function Account() {
  const context = useOutletContext() || {};
  const currentLang = context.currentLang || 'en';
  
  const [activeTab, setActiveTab] = useState('personal');
  const [userData, setUserData] = useState(null);
  const [directoryData, setDirectoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // State Barcode Zoom Modal
  const [isBarcodeZoomed, setIsBarcodeZoomed] = useState(false);
  const [barcodeImgError, setBarcodeImgError] = useState(false);

  // State Payslip & Company Directory
  const [payslips, setPayslips] = useState([]);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipError, setPayslipError] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [companyByEmail, setCompanyByEmail] = useState({});
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
    barcodeTitle: 'Barcode Karyawan',
    barcodeHint: 'Klik gambar barcode untuk memperbesar',
    barcodeEmpty: 'Gambar barcode belum tersedia',
    clickToZoom: 'Perbesar',
    clickOutsideClose: 'Klik di area luar untuk menutup',
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
    // Payslip List & Actions
    payslipListTitle: 'Daftar Slip Gaji',
    periodCol: 'Periode',
    payDateCol: 'Payroll Cut Off',
    basicCol: 'Basic Salary',
    grossCol: 'Total Earnings',
    deductionCol: 'Total Deductions',
    netCol: 'Take Home Pay',
    actionCol: 'Aksi',
    viewDetail: 'Lihat Detail',
    closeModal: 'Tutup',
    printPayslip: 'Download Locked PDF',
    generatingPdfLabel: 'Mengunci PDF...',
    viewFile: 'Buka Dokumen',
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
    barcodeTitle: 'Employee Barcode',
    barcodeHint: 'Click barcode image to enlarge',
    barcodeEmpty: 'Barcode image is not available yet',
    clickToZoom: 'Enlarge',
    clickOutsideClose: 'Click anywhere outside to close',
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
    // Payslip List & Actions
    payslipListTitle: 'Payslip List',
    periodCol: 'Period',
    payDateCol: 'Payroll Cut Off',
    basicCol: 'Basic Salary',
    grossCol: 'Total Earnings',
    deductionCol: 'Total Deductions',
    netCol: 'Take Home Pay',
    actionCol: 'Action',
    viewDetail: 'View Detail',
    closeModal: 'Close',
    printPayslip: 'Download Locked PDF',
    generatingPdfLabel: 'Locking PDF...',
    viewFile: 'Open Document',
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

  const getVal = (keys, fallback = '-') => {
    const fromSession = getValFromObj(userData, keys, '');
    if (fromSession && fromSession !== '-') return fromSession;
    return getValFromObj(directoryData, keys, fallback);
  };

  const normalizeImageUrl = (rawUrl) => {
    if (!rawUrl || rawUrl === '-') return '';
    const trimmed = String(rawUrl).trim();
    const driveMatch =
      trimmed.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i) ||
      trimmed.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    return trimmed;
  };

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

  const formatRateDisplay = (rawVal) => {
    if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === '-') return '0%';
    const str = String(rawVal).trim();
    if (str.includes('%') || str.toLowerCase().includes('rp')) return str;
    const num = parseNumeric(str);
    if (num > 0 && num < 1) {
      return `${+(num * 100).toFixed(2)}%`;
    }
    if (num >= 0 && num <= 100) {
      return `${num}%`;
    }
    return formatCurrency(num);
  };

  // Cek apakah kolom Tax Allowance? bernilai TRUE
  const isTaxAllowanceTrue = (slip) => {
    if (!slip) return false;
    const rawFlag = getValFromObj(
      slip,
      ['Tax Allowance?', 'tax_allowance?', 'Tax Allowance Flag', 'is_tax_allowance'],
      ''
    );
    const normalized = String(rawFlag).trim().toLowerCase();
    return (
      rawFlag === true ||
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'y' ||
      normalized === '1'
    );
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

  // Ambil data employee_directory (company & Barcode URL) secara aman
  const fetchDirectoryInfo = async (emailsList, fallbackSessionUser) => {
    const map = {};
    let matchedUserRow = null;

    const normalizedTargets = emailsList
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean);

    const sessionEmpId =
      fallbackSessionUser && typeof fallbackSessionUser === 'object'
        ? getValFromObj(fallbackSessionUser, ['Employee ID', 'employee id', 'employeeid', 'id'], '').trim().toLowerCase()
        : '';

    // 1. Cek terlebih dahulu dari data sesi pengguna yang sudah tersimpan
    if (fallbackSessionUser && typeof fallbackSessionUser === 'object') {
      const sessionComp = getValFromObj(
        fallbackSessionUser,
        ['company', 'Company', 'company_name', 'Company Name'],
        ''
      );
      if (sessionComp && sessionComp !== '-') {
        normalizedTargets.forEach((em) => {
          map[em] = sessionComp;
        });
      }
    }

    // 2. Query employee_directory secara aman
    try {
      const { data, error } = await supabase
        .from('employee_directory')
        .select('*');

      if (!error && Array.isArray(data) && data.length > 0) {
        for (const targetEmail of normalizedTargets) {
          const matchedRow = data.find((row) => {
            const candidateEmails = [
              getValFromObj(row, ['Personal Email', 'personal_email'], ''),
              getValFromObj(row, ['Employee Email', 'employee_email'], ''),
              getValFromObj(row, ['Employee Work Email', 'work_email'], ''),
              getValFromObj(row, ['Email', 'email'], '')
            ]
              .map((v) => String(v || '').trim().toLowerCase())
              .filter((v) => v && v !== '-');

            return candidateEmails.includes(targetEmail);
          });

          if (matchedRow) {
            if (!matchedUserRow) {
              matchedUserRow = matchedRow;
            }
            const compVal = getValFromObj(
              matchedRow,
              ['company', 'Company', 'company_name', 'Company Name'],
              ''
            );
            if (compVal && compVal !== '-') {
              map[targetEmail] = compVal;
            }
          }
        }

        // Fallback pencocokan berdasarkan Employee ID jika email belum cocok
        if (!matchedUserRow && sessionEmpId && sessionEmpId !== '-') {
          matchedUserRow =
            data.find((row) => {
              const rowId = getValFromObj(row, ['Employee ID', 'employee id', 'employeeid', 'id'], '')
                .trim()
                .toLowerCase();
              return rowId === sessionEmpId;
            }) || null;
        }
      }
    } catch (err) {
      console.error('Error fetching employee_directory:', err);
    }

    return { companyMap: map, matchedUserRow };
  };

  const fetchPayslips = useCallback(async (sessionUser, outletCtx) => {
    setPayslipLoading(true);
    setPayslipError(null);

    try {
      const userEmail = await getLoggedInUserEmail(sessionUser, outletCtx);
      setLoginEmail(userEmail);

      // Tetap ambil data employee_directory (untuk Barcode URL & Company) meskipun belum ada payslip
      const { companyMap: initialCompanies, matchedUserRow } = await fetchDirectoryInfo(
        userEmail ? [userEmail] : [],
        sessionUser
      );
      if (matchedUserRow) {
        setDirectoryData(matchedUserRow);
        setBarcodeImgError(false);
      }
      setCompanyByEmail(initialCompanies);

      if (!userEmail) {
        setPayslips([]);
        setPayslipLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .ilike('Employee Email', `%${userEmail}%`);

      if (error) throw error;

      const matched = (data || []).filter((row) => {
        const rowEmail = getValFromObj(row, ['Employee Email', 'employee_email'], '').trim().toLowerCase();
        return rowEmail === userEmail.toLowerCase();
      });

      const sorted = matched.sort((a, b) => {
        const yearA = parseInt(getValFromObj(a, ['Year', 'Tahun'], '0'), 10) || 0;
        const yearB = parseInt(getValFromObj(b, ['Year', 'Tahun'], '0'), 10) || 0;
        if (yearB !== yearA) return yearB - yearA;

        const monthA = parseInt(getValFromObj(a, ['Month', 'Bulan'], '0'), 10) || 0;
        const monthB = parseInt(getValFromObj(b, ['Month', 'Bulan'], '0'), 10) || 0;
        if (monthB !== monthA) return monthB - monthA;

        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      setPayslips(sorted);

      const uniqueEmails = Array.from(
        new Set(
          [
            userEmail,
            ...sorted.map((row) => getValFromObj(row, ['Employee Email', 'employee_email'], ''))
          ].filter((e) => e && e !== '-')
        )
      );
      const { companyMap: resolvedCompanies, matchedUserRow: resolvedRow } = await fetchDirectoryInfo(
        uniqueEmails,
        sessionUser
      );
      if (resolvedRow) {
        setDirectoryData(resolvedRow);
        setBarcodeImgError(false);
      }
      setCompanyByEmail(resolvedCompanies);
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

  // Tutup modal zoom barcode ketika menekan tombol Escape
  useEffect(() => {
    if (!isBarcodeZoomed) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsBarcodeZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBarcodeZoomed]);

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

  // Ambil URL Barcode dari database employee_directory kolom "Barcode URL"
  const rawBarcodeUrl =
    getValFromObj(directoryData, ['Barcode URL', 'barcode url', 'barcode_url', 'barcode'], '') ||
    getValFromObj(userData, ['Barcode URL', 'barcode url', 'barcode_url', 'barcode'], '');
  const barcodeUrl = normalizeImageUrl(rawBarcodeUrl);

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

  // ============================================================================
  // PEMETAAN LENGKAP FORMAT TEMPLATE PAYSLIP (TANPA LOGO, NAMA COMPANY DINAMIS)
  // ============================================================================
  const getTemplatePayslipData = (slip) => {
    const slipEmpEmail = getValFromObj(slip, ['Employee Email', 'employee_email'], loginEmail)
      .trim()
      .toLowerCase();

    const companyName =
      companyByEmail[slipEmpEmail] ||
      companyByEmail[String(loginEmail || '').trim().toLowerCase()] ||
      getValFromObj(slip, ['company', 'Company'], '') ||
      getVal(['company', 'Company', 'company_name', 'Company Name'], '-');

    const monthVal = getValFromObj(slip, ['Month', 'Bulan'], '');
    const yearVal = getValFromObj(slip, ['Year', 'Tahun'], '');
    const periodFallback = getValFromObj(slip, ['Period', 'Payroll Period', 'Periode'], '');

    const payrollCutOff =
      monthVal && yearVal
        ? `20 / ${monthVal} / ${yearVal}`
        : periodFallback
        ? `20 / ${periodFallback}`
        : formatIndoDateOnly(getValFromObj(slip, ['Payment Date', 'Pay Date', 'created_at'], '-'));

    const periodShort =
      monthVal && yearVal
        ? `${monthVal} / ${yearVal}`
        : periodFallback || payrollCutOff;

    const empId = getValFromObj(slip, ['Employee ID', 'NIK', 'ID'], getVal(['employee id', 'employeeid', 'id']));
    const empName = getValFromObj(slip, ['Employee Name', 'Name', 'Nama'], getVal(['name', 'nama', 'fullname']));
    const idAndName = `${empId} / ${empName}`;

    const jobPosition = getValFromObj(slip, ['Job Title', 'job_title', 'Position'], getVal(['job title', 'job_title', 'position']));
    const department = getValFromObj(slip, ['Department', 'Dept'], getVal(['department', 'dept']));

    const jobGrade = getValFromObj(slip, ['Job Grade', 'job_grade'], getVal(['job grade']));
    const jobLevel = getValFromObj(slip, ['Job Level', 'job_level'], getVal(['job level']));
    const gradeAndLevel = `${jobGrade} / ${jobLevel}`;

    const ptkp = getValFromObj(slip, ['Description Code', 'description_code', 'PTKP'], getVal(['description code', 'kode deskripsi']));
    const npwp = getValFromObj(slip, ['NPWP Tax Number', 'NPWP Number', 'npwp_number', 'NPWP'], getVal(['NPWP Number', 'npwp number', 'npwp_number']));

    // 1. EARNINGS
    const basicSalary = parseNumeric(getValFromObj(slip, ['Basic Salary', 'Gaji Pokok'], '0'));
    const mealAllowance = parseNumeric(getValFromObj(slip, ['Meal Allowance', 'Meals Allowance', 'Tunjangan Makan'], '0'));
    const transportComm = parseNumeric(
      getValFromObj(slip, ['Travel & Communication Allowance', 'Transport & Communication', 'Transport Allowance'], '0')
    );
    const serviceCharge = parseNumeric(getValFromObj(slip, ['Service Charge'], '0'));
    const otherAllowance = parseNumeric(getValFromObj(slip, ['Other Allowances', 'Other Allowance', 'Tunjangan Lainnya'], '0'));

    // Tax Allowance HANYA muncul & dihitung jika kolom "Tax Allowance?" = TRUE
    const showTaxAllowance = isTaxAllowanceTrue(slip);
    const taxAllowance = showTaxAllowance
      ? parseNumeric(getValFromObj(slip, ['Tax Allowance'], '0'))
      : 0;

    const earnings = [
      { label: 'Basic Salary', amount: basicSalary },
      { label: 'Meal Allowance', amount: mealAllowance },
      { label: 'Transport & Communication', amount: transportComm },
      { label: 'Service Charge', amount: serviceCharge },
      { label: 'Other Allowance', amount: otherAllowance },
      ...(showTaxAllowance ? [{ label: 'Tax Allowance', amount: taxAllowance }] : [])
    ];

    const calculatedTotalEarnings =
      basicSalary + mealAllowance + transportComm + serviceCharge + otherAllowance + taxAllowance;
    const rawTotalEarnings = getValFromObj(slip, ['Total Earnings', 'Gross Salary'], '');
    const totalEarnings =
      calculatedTotalEarnings > 0 || rawTotalEarnings === '' || rawTotalEarnings === '-'
        ? calculatedTotalEarnings
        : parseNumeric(rawTotalEarnings);

    // 2. DEDUCTIONS
    const bpjsKesEmployee = parseNumeric(
      getValFromObj(
        slip,
        [
          'BPJS Health/Jaminan Kesehatan Employee',
          'BPJS Kesehatan Employee',
          'BPJS Health Employee',
          'BPJS Kesehatan'
        ],
        '0'
      )
    );
    const jhtEmployee = parseNumeric(
      getValFromObj(slip, ['JHT Employee', 'BPJS Ketenagakerjaan Employee', 'JHT'], '0')
    );
    const jpEmployee = parseNumeric(
      getValFromObj(slip, ['JP Employee', 'Jaminan Pensiun Employee', 'JP'], '0')
    );
    const pph21 = parseNumeric(
      getValFromObj(slip, ['Income Tax Art. 21', 'PPH21', 'PPh 21', 'PPh21', 'Income Tax'], '0')
    );

    const deductions = [
      { label: 'BPJS Kesehatan Employee', amount: bpjsKesEmployee },
      { label: 'JHT Employee', amount: jhtEmployee },
      { label: 'Jaminan Pensiun Employee', amount: jpEmployee },
      { label: 'PPH21', amount: pph21 }
    ];

    const calculatedTotalDeductions = bpjsKesEmployee + jhtEmployee + jpEmployee + pph21;
    const rawTotalDeductions = getValFromObj(slip, ['Total Deductions', 'Total Deduction'], '');
    const totalDeductions =
      calculatedTotalDeductions > 0 || rawTotalDeductions === '' || rawTotalDeductions === '-'
        ? calculatedTotalDeductions
        : parseNumeric(rawTotalDeductions);

    // 3. TAKE HOME PAY
    const rawThp = getValFromObj(slip, ['TAKE HOME PAY', 'Take Home Pay', 'Net Salary', 'THP'], '');
    const takeHomePay =
      rawThp !== '' && rawThp !== '-'
        ? parseNumeric(rawThp)
        : totalEarnings - totalDeductions;

    // 4. BENEFITS*
    const bpjsTkRate = formatRateDisplay(getValFromObj(slip, ['BPJS Ketenagakerjaan Rate'], '0%'));
    const bpjsKesRate = formatRateDisplay(getValFromObj(slip, ['BPJS Kesehatan Rate', 'BPJS Health Rate'], '0%'));
    const jkk = parseNumeric(getValFromObj(slip, ['JKK (Jaminan Kecelakaan Kerja)', 'JKK'], '0'));
    const jkm = parseNumeric(getValFromObj(slip, ['JKM (Jaminan Kematian)', 'JKM'], '0'));
    const jhtCompany = parseNumeric(getValFromObj(slip, ['JHT Company'], '0'));
    const jpCompany = parseNumeric(getValFromObj(slip, ['JP Company', 'Jaminan Pensiun Company'], '0'));
    const bpjsKesCompany = parseNumeric(
      getValFromObj(
        slip,
        ['BPJS Health/Jaminan Kesehatan Company', 'BPJS Kesehatan Company', 'BPJS Health Company'],
        '0'
      )
    );

    const benefits = [
      { label: 'BPJS Ketenagakerjaan Rate', displayValue: bpjsTkRate },
      { label: 'BPJS Kesehatan Rate', displayValue: bpjsKesRate },
      { label: 'JKK', displayValue: formatCurrency(jkk) },
      { label: 'JKM', displayValue: formatCurrency(jkm) },
      { label: 'JHT Company', displayValue: formatCurrency(jhtCompany) },
      { label: 'Jaminan Pensiun Company', displayValue: formatCurrency(jpCompany) },
      { label: 'BPJS Kesehatan Company', displayValue: formatCurrency(bpjsKesCompany) }
    ];

    const calculatedTotalBenefits = jkk + jkm + jhtCompany + jpCompany + bpjsKesCompany;
    const rawTotalBenefits = getValFromObj(slip, ['Total Benefits'], '');
    const totalBenefits =
      calculatedTotalBenefits > 0 || rawTotalBenefits === '' || rawTotalBenefits === '-'
        ? calculatedTotalBenefits
        : parseNumeric(rawTotalBenefits);

    return {
      companyName,
      payrollCutOff,
      periodShort,
      empName,
      idAndName,
      jobPosition,
      department,
      gradeAndLevel,
      ptkp,
      npwp,
      basicSalary,
      earnings,
      totalEarnings,
      deductions,
      totalDeductions,
      takeHomePay,
      benefits,
      totalBenefits
    };
  };

  // ============================================================================
  // GENERATOR LOCKED PDF (TANPA LOGO, MENGGUNAKAN NAMA COMPANY DARI DIRECTORY)
  // ============================================================================
  const handleDownloadLockedPdf = (slip) => {
    if (!slip) return;
    setGeneratingPdf(true);

    setTimeout(() => {
      try {
        const d = getTemplatePayslipData(slip);

        // Canvas A4 @ 150 DPI (1240 x 1754)
        const canvas = document.createElement('canvas');
        canvas.width = 1240;
        canvas.height = 1754;
        const ctx = canvas.getContext('2d');

        // 1. Background Putih Bersih
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Top Right: *CONFIDENTIAL (Merah)
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('*CONFIDENTIAL', 1152, 76);
        ctx.textAlign = 'left';

        // 3. Top Left: Nama Company dari employee_directory (Menggantikan Logo)
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(String(d.companyName || '-'), 88, 120);

        // Top Right: PAYSLIP Title
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('PAYSLIP', 1152, 120);
        ctx.textAlign = 'left';

        // Garis Pembatas Header
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(88, 146);
        ctx.lineTo(1152, 146);
        ctx.stroke();

        // 4. Metadata Karyawan (2 Kolom)
        const metaLeft = [
          ['Payroll cut off', d.payrollCutOff],
          ['ID / Name', d.idAndName],
          ['Job position', d.jobPosition],
          ['Department', d.department]
        ];

        const metaRight = [
          ['Grade / Level', d.gradeAndLevel],
          ['PTKP', d.ptkp],
          ['NPWP', d.npwp]
        ];

        metaLeft.forEach(([label, val], idx) => {
          const y = 196 + idx * 44;
          ctx.fillStyle = '#1F2937';
          ctx.font = '16px sans-serif';
          ctx.fillText(label, 88, y);

          ctx.textAlign = 'right';
          ctx.fillText(String(val).slice(0, 34), 604, y);
          ctx.textAlign = 'left';
        });

        metaRight.forEach(([label, val], idx) => {
          const y = 196 + idx * 44;
          ctx.fillStyle = '#1F2937';
          ctx.font = '16px sans-serif';
          ctx.fillText(label, 636, y);

          ctx.textAlign = 'right';
          ctx.fillText(String(val).slice(0, 34), 1152, y);
          ctx.textAlign = 'left';
        });

        // 5. Header Bar Abu-abu: Earnings | Deductions
        const tableHeaderY = 388;
        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(88, tableHeaderY, 526, 44);
        ctx.fillRect(626, tableHeaderY, 526, 44);

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('Earnings', 96, tableHeaderY + 28);
        ctx.fillText('Deductions', 634, tableHeaderY + 28);

        // 6. Isi Baris Earnings (Kiri) & Deductions (Kanan)
        const rowStartY = tableHeaderY + 80;
        const rowStepY = 48;

        d.earnings.forEach((item, idx) => {
          const y = rowStartY + idx * rowStepY;
          ctx.fillStyle = '#1F2937';
          ctx.font = '16px sans-serif';
          ctx.fillText(item.label, 96, y);

          ctx.textAlign = 'right';
          ctx.fillText(formatCurrency(item.amount), 604, y);
          ctx.textAlign = 'left';
        });

        d.deductions.forEach((item, idx) => {
          const y = rowStartY + idx * rowStepY;
          ctx.fillStyle = '#1F2937';
          ctx.font = '16px sans-serif';
          ctx.fillText(item.label, 634, y);

          ctx.textAlign = 'right';
          ctx.fillText(formatCurrency(item.amount), 1144, y);
          ctx.textAlign = 'left';
        });

        // Garis Pembatas Total Earnings & Total Deductions
        const maxRows = Math.max(d.earnings.length, d.deductions.length);
        const dividerY = rowStartY + (maxRows - 1) * rowStepY + 26;
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(88, dividerY);
        ctx.lineTo(1152, dividerY);
        ctx.stroke();

        // Baris Total Earnings & Total Deductions
        const totalRowY = dividerY + 38;
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('Total Earnings', 96, totalRowY);
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(d.totalEarnings), 604, totalRowY);
        ctx.textAlign = 'left';

        ctx.fillText('Total Deductions', 634, totalRowY);
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(d.totalDeductions), 1144, totalRowY);
        ctx.textAlign = 'left';

        // 7. Take Home Pay (Kanan Bawah)
        const thpY = totalRowY + 86;
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Take Home Pay', 634, thpY);

        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(d.takeHomePay), 1144, thpY);
        ctx.textAlign = 'left';

        // 8. Bagian Benefits* (Kolom Kiri Bawah)
        const benefitsStartY = thpY + 62;
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('Benefits*', 96, benefitsStartY);

        d.benefits.forEach((bItem, idx) => {
          const y = benefitsStartY + 44 + idx * 44;
          ctx.fillStyle = '#1F2937';
          ctx.font = '16px sans-serif';
          ctx.fillText(bItem.label, 96, y);

          ctx.textAlign = 'right';
          ctx.fillText(bItem.displayValue, 604, y);
          ctx.textAlign = 'left';
        });

        const totalBenefitsY = benefitsStartY + 44 + d.benefits.length * 44 + 8;
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText('Total Benefits', 96, totalBenefitsY);

        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(d.totalBenefits), 604, totalBenefitsY);
        ctx.textAlign = 'left';

        // 9. WATERMARK CONFIDENTIAL MIRING DI TENGAH BACKGROUND
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-32 * Math.PI) / 180);

        ctx.strokeStyle = 'rgba(220, 38, 38, 0.14)';
        ctx.lineWidth = 5;
        ctx.strokeRect(-470, -76, 940, 152);

        ctx.fillStyle = 'rgba(220, 38, 38, 0.11)';
        ctx.font = 'bold 112px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CONFIDENTIAL', 0, 4);
        ctx.restore();

        // 10. Footer Keamanan Dokumen Terkunci
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(88, 1665);
        ctx.lineTo(1152, 1665);
        ctx.stroke();

        ctx.fillStyle = '#6B7280';
        ctx.font = '13px sans-serif';
        ctx.fillText(
          `${d.companyName} • Locked Read-Only Payslip Document (CONFIDENTIAL)`,
          88,
          1695
        );

        ctx.textAlign = 'right';
        ctx.fillText(`Generated: ${new Date().toLocaleString('id-ID')}`, 1152, 1695);
        ctx.textAlign = 'left';

        // 11. Export ke Locked PDF
        const pdfBlob = buildLockedPdfFromCanvas(canvas);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        const safeName = String(d.empName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safePeriod = String(d.periodShort || 'Payslip').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.href = url;
        a.download = `Payslip_${safeName}_${safePeriod}_CONFIDENTIAL.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (err) {
        console.error('Failed to generate locked PDF:', err);
        window.print();
      } finally {
        setGeneratingPdf(false);
      }
    }, 50);
  };

  return (
    <div className="w-full text-gray-800 font-sans">
      {/* CSS Khusus Print Browser agar tetap rapi & tidak terpotong */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #payslip-print-modal,
          #payslip-print-modal * {
            visibility: visible !important;
          }
          #payslip-print-modal {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            padding: 16px !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
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
            <div className="space-y-5">
              {/* Kartu Gambar Barcode Karyawan dari employee_directory -> Barcode URL */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h4 className="text-sm font-bold text-gray-800">{t.barcodeTitle}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {barcodeUrl && !barcodeImgError ? t.barcodeHint : t.barcodeEmpty}
                  </p>
                </div>

                {barcodeUrl && !barcodeImgError ? (
                  <button
                    type="button"
                    onClick={() => setIsBarcodeZoomed(true)}
                    className="group bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-3 shadow-2xs transition cursor-zoom-in flex flex-col items-center"
                    title={t.barcodeHint}
                  >
                    <img
                      src={barcodeUrl}
                      alt="Employee Barcode"
                      onError={() => setBarcodeImgError(true)}
                      className="h-32 sm:h-44 w-auto max-w-[300px] object-contain"
                    />
                    <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15zM10 7v6m-3-3h6" />
                      </svg>
                      {t.clickToZoom}
                    </span>
                  </button>
                ) : (
                  <div className="px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-white text-xs text-gray-400">
                    -
                  </div>
                )}
              </div>

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
                          <th className="py-3 px-4 text-center">{t.actionCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {payslips.map((slip, idx) => {
                          const d = getTemplatePayslipData(slip);

                          return (
                            <tr
                              key={slip.id || idx}
                              onClick={() => setSelectedPayslip(slip)}
                              className="hover:bg-blue-50/50 transition cursor-pointer"
                            >
                              <td className="py-3 px-4 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-gray-900">{d.periodShort}</td>
                              <td className="py-3 px-4 text-gray-600">{d.payrollCutOff}</td>
                              <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(d.basicSalary)}</td>
                              <td className="py-3 px-4 text-right text-emerald-700 font-medium">{formatCurrency(d.totalEarnings)}</td>
                              <td className="py-3 px-4 text-right text-rose-600">{formatCurrency(d.totalDeductions)}</td>
                              <td className="py-3 px-4 text-right font-bold text-blue-700">{formatCurrency(d.takeHomePay)}</td>
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
                      const d = getTemplatePayslipData(slip);

                      return (
                        <div
                          key={slip.id || idx}
                          onClick={() => setSelectedPayslip(slip)}
                          className="p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 shadow-2xs transition cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-bold text-gray-900 block">{d.periodShort}</span>
                              <span className="text-[11px] text-gray-500">{t.payDateCol}: {d.payrollCutOff}</span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                              *CONFIDENTIAL
                            </span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                            <div>
                              <span className="text-[11px] text-gray-500 block">{t.netCol}</span>
                              <span className="text-sm font-bold text-blue-700">{formatCurrency(d.takeHomePay)}</span>
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

      {/* ========================================================================
          MODAL PERBESAR BARCODE (KLIK DI TEMPAT LAIN / LUAR AKAN KELUAR)
          ======================================================================== */}
      {isBarcodeZoomed && barcodeUrl && (
        <div
          onClick={() => setIsBarcodeZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 sm:p-8 flex flex-col items-center text-center cursor-default"
          >
            <button
              type="button"
              onClick={() => setIsBarcodeZoomed(false)}
              aria-label={t.closeModal}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h4 className="text-base font-bold text-gray-900">{t.barcodeTitle}</h4>
            <p className="text-xs text-gray-500 mt-0.5 mb-4">
              {getVal(['name', 'nama', 'fullname', 'full_name'], '')}
              {getVal(['employee id', 'employeeid', 'id'], '') !== '-' && (
                <span> • {getVal(['employee id', 'employeeid', 'id'], '')}</span>
              )}
            </p>

            <div className="w-full bg-white border border-gray-200 rounded-xl p-5 sm:p-6 flex items-center justify-center">
              <img
                src={barcodeUrl}
                alt="Employee Barcode Enlarged"
                className="w-full max-h-72 object-contain"
              />
            </div>

            <p className="text-[11px] text-gray-400 mt-4">{t.clickOutsideClose}</p>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL DETAIL SLIP GAJI (KLIK DI LUAR MODAL OTOMATIS CLOSE)
          ======================================================================== */}
      {selectedPayslip && (() => {
        const d = getTemplatePayslipData(selectedPayslip);
        const pdfLink = getValFromObj(selectedPayslip, ['Payslip Link', 'Link', 'PDF', 'File', 'Url'], '');

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPayslip(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 overflow-y-auto cursor-pointer"
          >
            <div
              id="payslip-print-modal"
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-10 text-gray-900 cursor-default"
            >
              {/* Watermark Miring CONFIDENTIAL di Tengah Background */}
              <div
                aria-hidden="true"
                className="pointer-events-none select-none fixed sm:absolute inset-0 flex items-center justify-center z-20 overflow-hidden"
              >
                <span className="-rotate-30 border-4 border-red-600/15 px-6 py-2 rounded-lg text-4xl sm:text-6xl font-extrabold tracking-[0.22em] text-red-600/10 uppercase whitespace-nowrap">
                  CONFIDENTIAL
                </span>
              </div>

              {/* Action Buttons Bar (Tidak ikut ter-print) */}
              <div className="relative z-30 flex flex-wrap justify-end items-center gap-2 pb-4 mb-5 border-b border-gray-100 no-print">
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
                  disabled={generatingPdf}
                  onClick={() => handleDownloadLockedPdf(selectedPayslip)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{generatingPdf ? t.generatingPdfLabel : t.printPayslip}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {t.closeModal}
                </button>
              </div>

              {/* 1. Top Header: Nama Company (dari employee_directory) & *CONFIDENTIAL + PAYSLIP */}
              <div className="relative z-10 flex justify-between items-start pb-4 mb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {d.companyName}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold text-red-500 tracking-wide block">
                    *CONFIDENTIAL
                  </span>
                  <span className="text-sm sm:text-base font-bold text-gray-900 tracking-wide mt-1 block">
                    PAYSLIP
                  </span>
                </div>
              </div>

              {/* 2. Metadata Karyawan (2 Kolom) */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs mb-7">
                {/* Kolom Kiri */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">Payroll cut off</span>
                    <span className="text-gray-900 text-right">{d.payrollCutOff}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">ID / Name</span>
                    <span className="text-gray-900 text-right">{d.idAndName}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">Job position</span>
                    <span className="text-gray-900 text-right">{d.jobPosition}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">Department</span>
                    <span className="text-gray-900 text-right">{d.department}</span>
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">Grade / Level</span>
                    <span className="text-gray-900 text-right">{d.gradeAndLevel}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">PTKP</span>
                    <span className="text-gray-900 text-right">{d.ptkp}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-gray-700">NPWP</span>
                    <span className="text-gray-900 text-right">{d.npwp}</span>
                  </div>
                </div>
              </div>

              {/* 3. Tabel Earnings (Kiri) & Deductions (Kanan) */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 text-xs">
                {/* Kolom Earnings */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="bg-gray-200/90 px-3 py-2 font-bold text-gray-900 mb-3">
                      Earnings
                    </div>
                    <div className="space-y-3 px-1">
                      {d.earnings.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-4">
                          <span className="text-gray-800">{item.label}</span>
                          <span className="text-gray-900 text-right tabular-nums">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kolom Deductions */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="bg-gray-200/90 px-3 py-2 font-bold text-gray-900 mb-3">
                      Deductions
                    </div>
                    <div className="space-y-3 px-1">
                      {d.deductions.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-4">
                          <span className="text-gray-800">{item.label}</span>
                          <span className="text-gray-900 text-right tabular-nums">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Baris Total Earnings & Total Deductions */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs mt-4 pt-3.5 border-t border-gray-200">
                <div className="flex justify-between items-center px-1 font-bold text-gray-900">
                  <span>Total Earnings</span>
                  <span className="tabular-nums">{formatCurrency(d.totalEarnings)}</span>
                </div>
                <div className="flex justify-between items-center px-1 font-bold text-gray-900">
                  <span>Total Deductions</span>
                  <span className="tabular-nums">{formatCurrency(d.totalDeductions)}</span>
                </div>
              </div>

              {/* 5. Take Home Pay (Kanan Bawah) */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-8">
                <div className="hidden md:block" />
                <div className="flex justify-between items-center px-1">
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    Take Home Pay
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gray-900 tabular-nums">
                    {formatCurrency(d.takeHomePay)}
                  </span>
                </div>
              </div>

              {/* 6. Benefits* (Kolom Kiri Bawah) */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-8 text-xs">
                <div className="px-1">
                  <h4 className="font-bold text-gray-900 mb-3">Benefits*</h4>
                  <div className="space-y-2.5">
                    {d.benefits.map((bItem, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-4">
                        <span className="text-gray-800">{bItem.label}</span>
                        <span className="text-gray-900 text-right tabular-nums">
                          {bItem.displayValue}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center gap-4 mt-4 pt-2 font-bold text-gray-900">
                    <span>Total Benefits</span>
                    <span className="tabular-nums">{formatCurrency(d.totalBenefits)}</span>
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
