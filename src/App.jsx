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