import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Approval from './pages/Approval';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  useEffect(() => {
    // Fungsi untuk mencegah klik kanan (context menu)
    const handleContextMenu = (e) => {
      const isSuperAdmin = localStorage.getItem('hris_super_admin_active') === 'true';
      if (!isSuperAdmin) {
        e.preventDefault();
      }
    };

    // Fungsi untuk mencegah shortcut Developer Tools
    const handleKeyDown = (e) => {
      const isSuperAdmin = localStorage.getItem('hris_super_admin_active') === 'true';
      if (isSuperAdmin) return; // Bebas akses jika mode super admin

      // Cegah F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Cegah Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
      }
      
      // Cegah Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
      }
      
      // Cegah Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
      }

      // Cegah Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
      }
    };

    // Daftarkan event listener
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Bersihkan event listener saat komponen unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Rute Publik (Bisa diakses tanpa login) */}
        <Route path="/login" element={<Login />} />
        
        {/* Rute Terproteksi (Wajib login untuk mengakses Dashboard dkk) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="approval" element={<Approval />} />
            <Route path="directory" element={<EmployeeDirectory />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Route>
        
        {/* Fallback ke halaman utama jika URL tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
