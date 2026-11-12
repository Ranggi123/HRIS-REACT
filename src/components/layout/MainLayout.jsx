import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { supabase } from '../../lib/supabase';

const TABLE_EMPLOYEES = ['employee_directory', 'employee directory', 'Employee Directory', 'employees'];

const i18n = {
  en: {
    greeting: 'Hello',
    deptLabel: 'Department',
    jobTitleLabel: 'Job Title',
    statusLabel: 'Account Status:',
    modulesTitle: 'HRIS Module Access',
    moduleNames: { dashboard: 'Dashboard', empDir: 'Employee Directory', attendance: 'Attendance Requests', leave: 'Leave Requests', payslip: 'Payslip' },
  },
  id: {
    greeting: 'Halo',
    deptLabel: 'Departemen',
    jobTitleLabel: 'Jabatan',
    statusLabel: 'Status Akun:',
    modulesTitle: 'Akses Modul HRIS',
    moduleNames: { dashboard: 'Dasbor', empDir: 'Direktori Karyawan', attendance: 'Permintaan Absensi', leave: 'Pengajuan Cuti', payslip: 'Slip Gaji' },
  }
};

export default function MainLayout() {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [approvalCount, setApprovalCount] = useState(0); 
  const [attendanceBadge, setAttendanceBadge] = useState(false);
  const [leaveBadgeCount, setLeaveBadgeCount] = useState(0);
  
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('hris_lang') || 'en');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(localStorage.getItem('hris_super_admin_active') === 'true');
  const [isSuperAdminEligible, setIsSuperAdminEligible] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFullscreenBarcodeOpen, setIsFullscreenBarcodeOpen] = useState(false);

  const getCleanProp = (obj, targetNames) => {
    if (!obj) return '';
    const keys = Object.keys(obj);
    for (const target of targetNames) {
      const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget);
      if (foundKey && obj[foundKey] !== null && obj[foundKey] !== undefined && String(obj[foundKey]).trim() !== '') {
        return String(obj[foundKey]).trim();
      }
    }
    return '';
  };

  const checkSuperAdmin = (user) => {
    if (!user) return false;
    const email = String(getCleanProp(user, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
    const saRawVal = getCleanProp(user, [
      'Super Admin?', 'super_admin?', 'Super_Admin?', 
      'Super Admin', 'super_admin', 'Super_Admin', 
      'is_super_admin', 'is_superadmin'
    ]);

    const isTrue = (
      saRawVal === true || 
      ['TRUE', '1', 'T', 'YES'].includes(String(saRawVal).trim().toUpperCase())
    );
    return isTrue;
  };

  const normalizeText = (val) => String(val || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const getValidProp = (obj, targetNames, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const target of targetNames) {
      const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget);
      if (foundKey && obj[foundKey] !== null && obj[foundKey] !== undefined) {
        const val = String(obj[foundKey]).trim();
        const lowerVal = val.toLowerCase();
        if (val !== '' && lowerVal !== '-' && lowerVal !== 'null' && lowerVal !== 'undefined') {
          return val;
        }
      }
    }
    return fallback;
  };

  const fetchAllRowsFromTable = async (tableName, maxRows = 10000) => {
    const pageSize = 1000;
    let allData = [];
    let from = 0;
    while (from < maxRows) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return allData;
  };

  const checkDeptHead = (user) => {
    if (!user) return false;
    const rawVal = getCleanProp(user, ['department head', 'departmenthead', 'is department head']);
    return ['true', '1', 't', 'yes', 'y'].includes(String(rawVal).trim().toLowerCase());
  };

  const checkHrManagerProfile = (user) => {
    if (!user) return false;
    const dept = normalizeText(getValidProp(user, ['Department', 'department', 'dept', 'Dept'], ''));
    const jobLevel = normalizeText(getValidProp(user, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
    const status = normalizeText(getValidProp(user, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
    return (dept === 'human resources' || dept === 'human resource') && jobLevel === 'manager' && status === 'active';
  };

  const checkIsApprovalEligible = (user) => {
    return checkDeptHead(user) || checkHrManagerProfile(user);
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

  const hasExplicitLineManager = (row) => {
    if (!row) return false;
    const val = getValidProp(row, [
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
        if (isPendingApprovalStatus(val)) {
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

  const fetchApprovalCount = async (user) => {
    if (!user) return;

    try {
      const [dirRes, compRes, lvRes, attRes] = await Promise.allSettled([
        fetchAllRowsFromTable('employee_directory', 10000),
        fetchAllRowsFromTable('company', 2000),
        fetchAllRowsFromTable('leave_requests', 10000),
        fetchAllRowsFromTable('attendance', 10000)
      ]);

      const rawDirEmployees = dirRes.status === 'fulfilled' && Array.isArray(dirRes.value) ? dirRes.value : [];
      const rawCompanies = compRes.status === 'fulfilled' && Array.isArray(compRes.value) ? compRes.value : [];
      const rawLeaves = lvRes.status === 'fulfilled' && Array.isArray(lvRes.value) ? lvRes.value : [];
      let rawAttendance = attRes.status === 'fulfilled' && Array.isArray(attRes.value) ? [...attRes.value] : [];

      try {
        const { data: pendingAttRows } = await supabase
          .from('attendance')
          .select('*')
          .ilike('Status', '%Pending%')
          .limit(1000);

        if (pendingAttRows && pendingAttRows.length > 0) {
          const existingIds = new Set(rawAttendance.map(r => r.id ?? `${r.Employee}_${r.Date}_${r.Status}`));
          pendingAttRows.forEach(r => {
            const rowKey = r.id ?? `${r.Employee}_${r.Date}_${r.Status}`;
            if (!existingIds.has(rowKey)) {
              rawAttendance.unshift(r);
              existingIds.add(rowKey);
            }
          });
        }
      } catch (e) {}

      const userWorkEmail = (
        getValidProp(user, [
          'Employee work email',
          'employee_work_email',
          'work_email',
          'work email',
          'Work Email'
        ]) || ''
      ).trim().toLowerCase();

      const topNavEmail = (
        user?.email ||
        user?.Email ||
        user?.USER_UID ||
        user?.['Employee work email'] ||
        user?.employee_work_email ||
        userWorkEmail ||
        ''
      ).trim().toLowerCase();

      const cleanLoginEmail = (topNavEmail || userWorkEmail || '').trim().toLowerCase();
      const loginPrefix = cleanLoginEmail.includes('@') ? cleanLoginEmail.split('@')[0] : cleanLoginEmail;
      const currentEmpId = normalizeText(getValidProp(user, ['Employee ID', 'employee_id', 'Barcode', 'barcode'], ''));
      const userNameRaw = getValidProp(user, ['Name', 'name', 'nama', 'fullname', 'full_name'], '');

      let effectiveWorkEmail = userWorkEmail;
      let profileDept = normalizeText(getValidProp(user, ['Department', 'department', 'dept', 'Dept'], ''));
      let profileJobLevel = normalizeText(getValidProp(user, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
      let profileStatus = normalizeText(getValidProp(user, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));

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
      let profileCompany = getValidProp(user, companyCandidateKeys, '').replace(/\s+/g, ' ').trim();

      const myProfile = rawDirEmployees.find(emp => {
        const empEmail = (getValidProp(emp, ['Email', 'email', 'Email Address', 'email_address', 'user_uid']) || '').trim().toLowerCase();
        const empWorkEmail = (getValidProp(emp, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']) || '').trim().toLowerCase();
        const empName = normalizeText(getValidProp(emp, ['Name', 'name', 'nama', 'fullname', 'full_name']));
        const empId = normalizeText(getValidProp(emp, ['Employee ID', 'employee_id', 'Barcode', 'barcode']));

        const empEmailPrefix = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;
        const empWorkPrefix = empWorkEmail.includes('@') ? empWorkEmail.split('@')[0] : empWorkEmail;

        if (cleanLoginEmail) {
          if (empEmail === cleanLoginEmail || empWorkEmail === cleanLoginEmail) return true;
          if (loginPrefix && (empEmailPrefix === loginPrefix || empWorkPrefix === loginPrefix)) return true;
        }
        if (currentEmpId && empId && empId === currentEmpId) return true;
        if (userNameRaw && empName === normalizeText(userNameRaw)) return true;
        return false;
      });

      if (myProfile) {
        const foundWorkEmail = getValidProp(myProfile, ['Employee work email', 'employee_work_email', 'work_email', 'Work Email']).trim().toLowerCase();
        effectiveWorkEmail = foundWorkEmail || '';

        const foundDept = normalizeText(getValidProp(myProfile, ['Department', 'department', 'dept', 'Dept'], ''));
        if (foundDept) profileDept = foundDept;

        const foundJobLevel = normalizeText(getValidProp(myProfile, ['Job Level', 'job_level', 'joblevel', 'Job_Level', 'level', 'Level'], ''));
        if (foundJobLevel) profileJobLevel = foundJobLevel;

        const foundStatus = normalizeText(getValidProp(myProfile, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
        if (foundStatus) profileStatus = foundStatus;

        const foundCompany = getValidProp(myProfile, companyCandidateKeys, '').replace(/\s+/g, ' ').trim();
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
            const val = normalizeText(getValidProp(c, [k], ''));
            return val && val === targetNorm;
          })
        );
        if (matchedComp) {
          compLookupKeys.forEach(k => {
            const val = normalizeText(getValidProp(matchedComp, [k], ''));
            if (val) userCompanyKeys.add(val);
          });
        }
      }

      const isHrDept = profileDept === 'human resources' || profileDept === 'human resource';
      const isManagerJobLevel = profileJobLevel === 'manager';
      const isStatusActive = profileStatus === 'active';
      const isHrManagerActive = isHrDept && isManagerJobLevel && isStatusActive && userCompanyKeys.size > 0;

      if (!checkDeptHead(myProfile || user) && !isHrManagerActive) {
        setApprovalCount(0);
        return;
      }

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

      const rowMatchesCompany = (obj) => {
        if (!obj || userCompanyKeys.size === 0) return false;
        const vals = getRowCompanyValues(obj);
        return vals.some(v => userCompanyKeys.has(v));
      };

      const rowBelongsToUserCompany = (obj, fallbackMatchFn) => {
        if (!obj || userCompanyKeys.size === 0) return false;
        const vals = getRowCompanyValues(obj);
        if (vals.length > 0) {
          return vals.some(v => userCompanyKeys.has(v));
        }
        return typeof fallbackMatchFn === 'function' ? fallbackMatchFn(obj) : false;
      };

      const activeDirEmailSet = new Set();
      const activeDirIdentifierSet = new Set();
      const nonActiveDirIdentifierSet = new Set();

      rawDirEmployees.forEach(emp => {
        const statusRaw = normalizeText(getValidProp(emp, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
        const isEmpActive = statusRaw === 'active';

        const wMail = (getValidProp(emp, ['Employee work email', 'employee_work_email', 'work_email', 'work email', 'Work Email']) || '').trim().toLowerCase();
        const pMail = (getValidProp(emp, ['email', 'Email', 'Email Address', 'email_address', 'user_uid']) || '').trim().toLowerCase();
        const bCode = normalizeText(getValidProp(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id', 'nik', 'nip'], ''));
        const eName = normalizeText(getValidProp(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], ''));

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
        const empVal = normalizeText(getValidProp(row, [
          'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
          'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
          'Barcode', 'barcode', 'Employee ID', 'employee_id'
        ]));
        const rowNameVal = normalizeText(getValidProp(row, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name']));

        if (empVal && (activeDirEmailSet.has(empVal) || activeDirIdentifierSet.has(empVal))) return true;
        if (rowNameVal && activeDirIdentifierSet.has(rowNameVal)) return true;

        if (empVal && nonActiveDirIdentifierSet.has(empVal)) return false;
        if (rowNameVal && nonActiveDirIdentifierSet.has(rowNameVal)) return false;

        return false;
      };

      const subordinates = rawDirEmployees.filter(row => {
        const statusRaw = normalizeText(getValidProp(row, ['Status', 'status', 'STATUS', 'Account Status', 'account_status', 'accountstatus'], ''));
        if (statusRaw !== 'active') return false;

        if (isHrManagerActive) {
          return rowMatchesCompany(row);
        }

        if (!hasValidWorkEmail) return false;
        if (!hasExplicitLineManager(row)) return false;
        return matchesLineManagerWorkEmail(row, cleanEffectiveWorkEmail);
      });

      const subordinateEmailSet = new Set();
      const subordinateIdentifiers = new Set();

      subordinates.forEach(emp => {
        const workMail = (getValidProp(emp, [
          'Employee work email',
          'employee_work_email',
          'work_email',
          'work email',
          'Work Email'
        ]) || '').trim().toLowerCase();

        const personalMail = (getValidProp(emp, [
          'email',
          'Email',
          'Email Address',
          'user_uid'
        ]) || '').trim().toLowerCase();

        const barcodeVal = (getValidProp(emp, ['Barcode', 'barcode', 'Employee ID', 'employee_id', 'id', 'nik', 'nip']) || '').trim();
        const name = getValidProp(emp, ['Name', 'name', 'nama', 'fullname', 'full_name', 'Employee Name'], '');
        const empAllEmails = Array.from(new Set([workMail, personalMail, barcodeVal.toLowerCase()].filter(Boolean)));

        empAllEmails.forEach(m => {
          subordinateEmailSet.add(m);
          subordinateIdentifiers.add(m);
        });
        if (name) subordinateIdentifiers.add(normalizeText(name));
        if (barcodeVal) subordinateIdentifiers.add(normalizeText(barcodeVal));
      });

      const matchesScopedEmployee = (row) => {
        const empVal = normalizeText(getValidProp(row, [
          'Employee', 'employee', 'Employee Email', 'employee_email', 'email', 'Email',
          'user_uid', 'work_email', 'work email', 'Employee work email', 'user_email',
          'Barcode', 'barcode', 'Employee ID', 'employee_id'
        ]));
        const rowNameVal = normalizeText(getValidProp(row, ['Name', 'name', 'nama', 'fullname', 'full_name', 'employee_name']));
        if (empVal && (subordinateEmailSet.has(empVal) || subordinateIdentifiers.has(empVal))) return true;
        if (rowNameVal && subordinateIdentifiers.has(rowNameVal)) return true;
        return false;
      };

      const pendingLeaves = rawLeaves.filter(row => {
        const status = getRowStatus(row);
        if (!isPendingApprovalStatus(status)) return false;
        if (!isRowEmployeeActive(row)) return false;

        if (isHrManagerActive) {
          return rowBelongsToUserCompany(row, matchesScopedEmployee);
        }

        if (!hasValidWorkEmail) return false;
        const empVal = normalizeText(getValidProp(row, [
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
      });

      const pendingAttendance = rawAttendance.filter(row => {
        const status = getRowStatus(row);
        if (!isPendingApprovalStatus(status)) return false;
        if (!isRowEmployeeActive(row)) return false;

        if (isHrManagerActive) {
          return rowBelongsToUserCompany(row, matchesScopedEmployee);
        }

        if (!hasValidWorkEmail) return false;
        const empEmail = normalizeText(getValidProp(row, [
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
      });

      setApprovalCount(pendingLeaves.length + pendingAttendance.length);
    } catch (error) {
      console.warn("Error calculating approval count from database:", error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      let activeUser = null;
      let saved = localStorage.getItem('hris_session_data');
      if (saved) {
        try { activeUser = JSON.parse(saved); } catch (e) {}
      }

      let emailToMatch = activeUser 
        ? String(getCleanProp(activeUser, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase()
        : '';

      if (!emailToMatch) {
        const { data: sData } = await supabase.auth.getSession();
        if (sData?.session?.user?.email) {
          emailToMatch = sData.session.user.email.trim().toLowerCase();
        }
      }

      if (emailToMatch) {
        try {
          for (const tbl of TABLE_EMPLOYEES) {
            const data = await fetchAllRowsFromTable(tbl, 10000);
            if (data && data.length > 0) {
              const matched = data.find(row => {
                const rowEmail = String(getCleanProp(row, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
                return rowEmail === emailToMatch;
              });

              if (matched) {
                activeUser = matched;
                localStorage.setItem('hris_session_data', JSON.stringify(matched));
                break;
              }
            }
          }
        } catch (err) {
          console.warn("Error fetching user profile:", err);
        }
      }

      if (activeUser) {
        setCurrentUser(activeUser);
        setIsSuperAdminEligible(checkSuperAdmin(activeUser));
        await fetchApprovalCount(activeUser);
      } else {
        setCurrentUser(null);
        setIsSuperAdminEligible(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const handleRealtimeChange = (payload) => {
      console.log('Realtime change detected, refreshing approval count...', payload);
      fetchApprovalCount(currentUser);
    };

    const leaveChannel = supabase
      .channel('public:leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, handleRealtimeChange)
      .subscribe();
      
    const attendanceChannel = supabase
      .channel('public:attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, handleRealtimeChange)
      .subscribe();

    return () => {
      supabase.removeChannel(leaveChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [currentUser]);

  const handleToggleSuperAdmin = async (active) => {
    if (active) {
      setIsSuperAdminMode(true);
      localStorage.setItem('hris_super_admin_active', 'true');
      if (currentUser) {
        localStorage.setItem('hris_original_super_admin', JSON.stringify(currentUser));
      }
      alert(currentLang === 'id' ? "Mode Super Admin diaktifkan." : "Super Admin Mode enabled.");
    } else {
      setIsSuperAdminMode(false);
      localStorage.removeItem('hris_super_admin_active');
      
      let targetUser = null;
      const savedOriginal = localStorage.getItem('hris_original_super_admin');
      if (savedOriginal) {
        try { targetUser = JSON.parse(savedOriginal); } catch (e) {}
      }

      if (!targetUser) {
        for (const tbl of TABLE_EMPLOYEES) {
          try {
            const { data } = await supabase.from(tbl).select('*').limit(100);
            if (data && data.length > 0) {
              targetUser = data.find(row => 
                Object.values(row).some(val => typeof val === 'string' && val.trim().toLowerCase() === 'ranggiit@gmail.com')
              );
              if (targetUser) break;
            }
          } catch (e) {}
        }
      }

      localStorage.removeItem('hris_original_super_admin');

      if (targetUser) {
        localStorage.setItem('hris_session_data', JSON.stringify(targetUser));
        setCurrentUser(targetUser);
        const nameOrEmail = targetUser.Name || targetUser.name || targetUser.fullname || 'ranggiit@gmail.com';
        alert(currentLang === 'id' 
          ? `Super Admin Mode dinonaktifkan. Kembali ke akun asli (${nameOrEmail}).` 
          : `Super Admin Mode disabled. Reverted to original account (${nameOrEmail}).`);
        window.location.reload();
      } else {
        alert(currentLang === 'id' 
          ? "Mode Super Admin telah dinonaktifkan. Silakan login kembali." 
          : "Super Admin Mode disabled. Please log in again.");
        window.location.reload();
      }
    }
  };

  const handleSwitchAccount = async () => {
    if (currentUser) {
      const existingOriginal = localStorage.getItem('hris_original_super_admin');
      if (!existingOriginal) {
        localStorage.setItem('hris_original_super_admin', JSON.stringify(currentUser));
      }
    }
    
    await supabase.auth.signOut();
    localStorage.removeItem('hris_session_data');
    localStorage.setItem('hris_super_admin_active', 'true');
    setIsSuperAdminMode(true);
    navigate('/login');
  };

  const getProp = (keys, fallback) => getCleanProp(currentUser, keys) || fallback;
  const displayName = getProp(['name', 'nama', 'fullname', 'full_name'], currentLang === 'id' ? 'Tamu' : 'Guest');
  const deptName = getProp(['department', 'dept'], '-');
  const jobTitle = getProp(['job title', 'job_title', 'position'], currentLang === 'id' ? 'Tamu' : 'Guest');
  const jobLevel = getProp(['job level', 'job_level', 'level', 'Job Level'], '-');
  const empId = getProp(['employee id', 'employee_id', 'id'], '-');
  const companyName = getProp(['company', 'Company Name'], '-');
  const email = getProp(['email', 'email address', 'user_uid'], '-');
  const workEmail = getProp(['Employee work email', 'work_email', 'work email', 'Work Email'], '-');
  const phone = getProp(['Phone Number', 'phone_number', 'phone'], '-');
  const userStatus = String(getProp(['status', 'Status', 'STATUS'], 'Active') || 'Active');
  const photo = getProp(['link', 'Link', 'photo', 'avatar'], 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png');
  const barcodeRaw = getProp(['Barcode URL', 'barcode_url', 'barcode'], '');
  const barcode = barcodeRaw || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(empId)}`;

  const monthsMap = {
    jan: 1, feb: 2, mar: 3, apr: 4,
    may: 5, mei: 5,
    jun: 6, jul: 7,
    aug: 8, agu: 8, agt: 8,
    sep: 9, okt: 10, oct: 10,
    nov: 11, dec: 12, des: 12
  };

  const parseRowTimestamp = (row) => {
    if (!row) return { timestamp: 0, y: 0, m: 0, d: 0 };

    const createdStr = row.created_at || row.createddate || row.created_date;
    if (createdStr) {
      const parsedIso = new Date(createdStr);
      if (!isNaN(parsedIso.getTime())) {
        return { timestamp: parsedIso.getTime(), y: parsedIso.getFullYear(), m: parsedIso.getMonth() + 1, d: parsedIso.getDate() };
      }
    }

    let dateStr = '';
    let timeStr = '';

    for (const [k, v] of Object.entries(row)) {
      const lowerK = k.toLowerCase().trim();
      if (!dateStr && (lowerK.includes('date') || lowerK.includes('schedule') || lowerK.includes('tanggal'))) {
        dateStr = String(v || '').trim();
      }
      if (!timeStr && (lowerK === 'time' || lowerK === 'waktu' || lowerK === 'jam')) {
        timeStr = String(v || '').trim();
      }
    }

    const combined = `${dateStr} ${timeStr}`.trim();
    let hh = 0, mm = 0, ss = 0;
    const timeMatch = combined.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hh = parseInt(timeMatch[1], 10);
      mm = parseInt(timeMatch[2], 10);
      if (timeMatch[3]) ss = parseInt(timeMatch[3], 10);
    }

    let y = 0, m = 0, d = 0;
    const mText = combined.match(/(\d{1,2})[-\s/]+([a-zA-Z]{3,10})[-\s/]+(\d{4})/i);
    if (mText) {
      d = parseInt(mText[1], 10);
      const monStr = mText[2].toLowerCase().slice(0, 3);
      y = parseInt(mText[3], 10);
      if (monthsMap[monStr]) m = monthsMap[monStr];
    }

    if (!y || !m || !d) {
      const mDmy = combined.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (mDmy) { d = parseInt(mDmy[1], 10); m = parseInt(mDmy[2], 10); y = parseInt(mDmy[3], 10); }
    }

    if (!y || !m || !d) {
      const mIso = combined.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (mIso) { y = parseInt(mIso[1], 10); m = parseInt(mIso[2], 10); d = parseInt(mIso[3], 10); }
    }

    if (y && m && d) {
      const dateObj = new Date(y, m - 1, d, hh, mm, ss);
      return { timestamp: dateObj.getTime(), y, m, d };
    }
    return { timestamp: 0, y: 0, m: 0, d: 0 };
  };

  const getPropCaseInsensitive = (obj, candidateNames, fallback = '') => {
    if (!obj) return fallback;
    const keys = Object.keys(obj);
    for (const cand of candidateNames) {
      const normalizedCand = cand.toLowerCase().replace(/[\s_-]/g, '');
      const found = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedCand);
      if (found && obj[found] !== null && obj[found] !== undefined && String(obj[found]).trim() !== '') {
        return String(obj[found]).trim();
      }
    }
    return fallback;
  };

  useEffect(() => {
    const fetchBadges = async () => {
      if (!currentUser) return;
      const userEmail = String(getPropCaseInsensitive(currentUser, ['email', 'email address', 'user_uid']) || '').trim().toLowerCase();
      const empIdStr = String(getPropCaseInsensitive(currentUser, ['employee id', 'employee_id', 'id']) || '').trim().toLowerCase();
      const empNameStr = String(getPropCaseInsensitive(currentUser, ['name', 'nama', 'fullname', 'full_name']) || '').trim().toLowerCase();
      const validUserKeys = [userEmail, empIdStr, empNameStr].filter(Boolean);

      if (validUserKeys.length === 0) return;

      try {
        const { data: sampleAtt } = await supabase.from('attendance').select('*').limit(1);
        let empCol = 'employee';
        let typeCol = 'Are you checking out or Checking in?';

        if (sampleAtt && sampleAtt.length > 0) {
          const keys = Object.keys(sampleAtt[0]);
          empCol = keys.find(k => k.toLowerCase().trim() === 'employee')
                || keys.find(k => ['email', 'user_uid', 'employee_id'].includes(k.toLowerCase().trim()))
                || keys.find(k => k.toLowerCase().includes('employee'))
                || empCol;

          typeCol = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '') === 'areyoucheckingoutorcheckingin')
                 || keys.find(k => k.toLowerCase().includes('checking out') || k.toLowerCase().includes('checking in'))
                 || keys.find(k => ['type', 'action', 'status'].includes(k.toLowerCase().trim())) 
                 || typeCol;
        }

        let myAttendance = [];
        const { data: qData, error: qErr } = await supabase
          .from('attendance')
          .select('*')
          .ilike(empCol, `%${userEmail}%`)
          .limit(100);

        if (!qErr && qData && qData.length > 0) {
          myAttendance = qData;
        } else {
          for (const key of validUserKeys) {
            if (key === userEmail) continue;
            const { data: altData } = await supabase.from('attendance').select('*').ilike(empCol, `%${key}%`).limit(100);
            if (altData && altData.length > 0) {
              myAttendance = altData;
              break;
            }
          }
        }

        if (myAttendance.length > 0) {
          myAttendance.sort((a, b) => {
            const timeA = parseRowTimestamp(a).timestamp;
            const timeB = parseRowTimestamp(b).timestamp;
            if (timeA !== timeB) return timeB - timeA;
            if (a.id && b.id && typeof a.id === 'number') return b.id - a.id;
            return 0;
          });

          const latestRecord = myAttendance[0];
          const typeVal = String(latestRecord[typeCol] || latestRecord['Are you checking out or Checking in?'] || '').trim().toLowerCase();
          const isCheckOut = typeVal.includes('out') || typeVal.includes('pulang');
          const isCheckIn = (typeVal.includes('in') || typeVal.includes('masuk')) && !isCheckOut;

          const parsedLatest = parseRowTimestamp(latestRecord);
          let isLessThanToday = false;

          if (parsedLatest.y > 0 && parsedLatest.m > 0 && parsedLatest.d > 0) {
            const now = new Date();
            const todayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
            const recordNum = parsedLatest.y * 10000 + parsedLatest.m * 100 + parsedLatest.d;
            isLessThanToday = recordNum < todayNum;
          }

          setAttendanceBadge(isCheckIn && isLessThanToday);
        } else {
          setAttendanceBadge(false);
        }
      } catch (e) {
        console.warn('Error fetching attendance badge:', e);
        setAttendanceBadge(false);
      }

      try {
        const { data: holidayData, error } = await supabase.from('holiday_balance').select('*').limit(1000);
        if (!error && holidayData) {
          const myHolidays = holidayData.filter(row => {
            const rowEmp = String(getPropCaseInsensitive(row, ['employee', 'Employee', 'user_uid', 'email', 'employee_id']) || '').trim().toLowerCase();
            return validUserKeys.some(key => rowEmp === key || rowEmp.includes(key) || key.includes(rowEmp));
          });

          const now = new Date();
          const fifteenDaysLater = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));
          let expiringCount = 0;

          myHolidays.forEach(row => {
            const status = String(getPropCaseInsensitive(row, ['status', 'Status', 'STATUS']) || '').toLowerCase();
            if (status === 'unused') {
              const expDateRaw = getPropCaseInsensitive(row, ['Expiration Date', 'expiration_date', 'exp_date', 'Expired', 'expired']);
              if (expDateRaw) {
                const expDate = new Date(expDateRaw);
                if (!isNaN(expDate.getTime()) && expDate >= now && expDate <= fifteenDaysLater) {
                  expiringCount++;
                }
              }
            }
          });
          setLeaveBadgeCount(expiringCount);
        }
      } catch (e) {
        console.warn('Error fetching leave badge:', e);
      }
    };

    fetchBadges();
  }, [currentUser]);

  const t = i18n[currentLang] || i18n.en;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <TopNav 
        currentUser={currentUser} 
        approvalCount={approvalCount} 
        currentLang={currentLang}
        isSuperAdminMode={isSuperAdminMode}
        isSuperAdminEligible={isSuperAdminEligible}
        onToggleSuperAdmin={handleToggleSuperAdmin}
        onSwitchAccount={handleSwitchAccount}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLangChange={(lang) => {
          setCurrentLang(lang);
          localStorage.setItem('hris_lang', lang);
        }}
      />
      
      <main className="container mx-auto mt-2 sm:mt-6 px-2 sm:px-6 flex-1 flex flex-col space-y-3 sm:space-y-6">
        
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {t.greeting}, <span className="text-blue-600 font-extrabold">{displayName}</span>!
              </h2>
              {isSuperAdminMode && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  SUPER ADMIN
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
              {t.deptLabel}: <strong className="text-gray-900 font-semibold">{deptName}</strong>
              <span className="hidden sm:inline"> | </span>
              <br className="block sm:hidden" />
              {t.jobTitleLabel}: <strong className="text-gray-900 font-semibold">{jobTitle}</strong>
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-1 sm:mt-0">
            <span className="text-xs sm:text-sm text-gray-500">{t.statusLabel}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              (userStatus || '').toLowerCase().includes('inactive') || 
              (userStatus || '').toLowerCase().includes('tidak') || 
              (userStatus || '').toLowerCase().includes('resign')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {userStatus}
            </span>
          </div>
        </div>

        <div className="hidden md:block">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">{t.modulesTitle}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Link 
              to="/" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <svg className={`w-8 h-8 ${currentPath === '/' ? 'text-blue-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </div>
              <span className={`text-xs font-bold ${currentPath === '/' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.dashboard}</span>
            </Link>

            <Link 
              to="/directory" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/directory' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10691/10691841.png" alt="Directory" className="w-8 h-8 object-contain" />
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/directory' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.empDir}</span>
            </Link>

            <Link 
              to="/attendance" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center relative ${currentPath === '/attendance' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/3125/3125856.png" alt="Attendance" className="w-8 h-8 object-contain" />
                {attendanceBadge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-pulse">!</span>
                )}
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/attendance' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.attendance}</span>
            </Link>

            <Link 
              to="/leave" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center relative ${currentPath === '/leave' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10963/10963675.png" alt="Leave" className="w-8 h-8 object-contain" />
                {leaveBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">{leaveBadgeCount}</span>
                )}
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/leave' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.leave}</span>
            </Link>

            <Link 
              to="/account" 
              className={`p-4 rounded-2xl border transition flex flex-col items-center text-center ${currentPath === '/account' ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-2 ring-blue-400 ring-opacity-30' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
            >
              <div className="relative mb-2">
                <img src="https://cdn-icons-png.flaticon.com/128/10695/10695051.png" alt="Payslip" className="w-8 h-8 object-contain" />
              </div>
              <span className={`text-xs font-semibold ${currentPath === '/account' ? 'text-blue-700' : 'text-gray-700'}`}>{t.moduleNames.payslip}</span>
            </Link>
          </div>
        </div>

        <Outlet context={{ currentUser, currentLang, isSuperAdminMode, onApprovalCountChange: setApprovalCount }} />

      </main>
      
      <BottomNav attendanceBadge={attendanceBadge} leaveBadgeCount={leaveBadgeCount} currentLang={currentLang} />

      {isProfileModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 relative max-h-[90vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">
                {currentLang === 'id' ? 'Profil Saya' : 'My Profile'}
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="flex flex-col items-center mb-4">
              <img 
                src={photo} 
                alt="Profile" 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4 bg-blue-50"
                onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png'; }}
              />
              
              <div className="w-full flex flex-col items-center justify-center p-3.5 bg-gray-50/70 rounded-2xl border border-gray-200">
                <div className="w-full flex justify-between items-center mb-2 px-1 text-xs">
                  <span className="text-gray-600 font-semibold text-xs">
                    {currentLang === 'id' ? 'Barcode Karyawan' : 'Employee Barcode'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setIsFullscreenBarcodeOpen(true);
                    }}
                    className="text-blue-600 font-semibold hover:underline text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    </svg>
                    <span>{currentLang === 'id' ? 'Layar Penuh' : 'Full Screen'}</span>
                  </button>
                </div>

                <div 
                  className="w-full flex justify-center bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs cursor-pointer group hover:scale-[1.01] transition-transform"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setIsFullscreenBarcodeOpen(true);
                  }}
                  title={currentLang === 'id' ? 'Klik untuk layar penuh' : 'Click to view full screen'}
                >
                  <img 
                    src={barcode} 
                    alt="Barcode" 
                    className="w-full max-w-[190px] aspect-square object-contain" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600 divide-y divide-gray-100">
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'ID Karyawan' : 'Employee ID'}</span>
                <strong className="text-gray-800 font-bold">{empId}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Nama' : 'Name'}</span>
                <strong className="text-gray-800 font-bold">{displayName}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Perusahaan' : 'Company'}</span>
                <strong className="text-gray-800 font-bold">{companyName}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Departemen' : 'Department'}</span>
                <span className="font-semibold text-gray-700">{deptName}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Jabatan' : 'Job Title'}</span>
                <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[11px]">
                  {jobTitle}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Tingkat Pekerjaan' : 'Job Level'}</span>
                <strong className="text-gray-800 font-semibold">{jobLevel}</strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Kepala Departemen?' : 'Department Head?'}</span>
                <strong className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${checkDeptHead(currentUser) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {checkDeptHead(currentUser) ? (currentLang === 'id' ? 'Ya' : 'Yes') : (currentLang === 'id' ? 'Tidak' : 'No')}
                </strong>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">Email</span>
                <span className="text-gray-700 font-mono text-xs">{email}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Email Kantor' : 'Work Email'}</span>
                <span className="text-gray-700 font-mono text-xs">{workEmail}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 font-medium">{currentLang === 'id' ? 'Nomor Telepon' : 'Phone Number'}</span>
                <span className="text-gray-700 font-mono text-xs">{phone}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <button 
                type="button"
                onClick={() => setIsProfileModalOpen(false)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {currentLang === 'id' ? 'Tutup' : 'Close'}
              </button>
              
              <Link 
                to="/account" 
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <span>{currentLang === 'id' ? 'Detail Lengkap' : 'More Detail'}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </Link>
            </div>

          </div>
        </div>
      )}

      {isFullscreenBarcodeOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 p-4" 
          onClick={() => setIsFullscreenBarcodeOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[92vh] flex flex-col items-center justify-center" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsFullscreenBarcodeOpen(false)} 
              className="absolute -top-11 right-0 text-white hover:text-red-400 p-2 text-2xl transition cursor-pointer"
              title="Close Fullscreen"
            >
              ✕
            </button>
            <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-100">
              <img src={barcode} alt="Barcode Fullscreen" className="max-h-[65vh] max-w-[80vw] object-contain" />
              <p className="mt-4 text-xs text-gray-400 font-medium">
                {currentLang === 'id' ? 'Klik di mana saja di luar area untuk keluar' : 'Click anywhere outside to exit'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
