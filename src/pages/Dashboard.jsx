import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || 'student';

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'teacher') return <TeacherDashboard />;
  if (role === 'parent') return <ParentDashboard />;
  return <StudentDashboard />;
}