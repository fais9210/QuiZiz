import { useAuth } from '../components/AuthProvider';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  return profile?.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />;
}
