import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const session = localStorage.getItem('hris_session_data');

  // Jika data login belum ada, alihkan paksa ke halaman login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Jika sudah login, izinkan akses ke komponen halaman di dalamnya
  return <Outlet />;
}