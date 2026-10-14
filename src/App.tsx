/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/Layout';
import MobileBackHandler from './components/MobileBackHandler';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QuizCreatePage from './pages/QuizCreatePage';
import QuizTakePage from './pages/QuizTakePage';
import CalendarPage from './pages/CalendarPage';
import QuizAnalyticsPage from './pages/QuizAnalyticsPage';
import QuizLeaderboardPage from './pages/QuizLeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <MobileBackHandler />
          <Layout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Teacher Routes */}
              <Route path="/quizzes/create" element={<QuizCreatePage />} />
              <Route path="/quizzes/edit/:id" element={<QuizCreatePage />} />
              <Route path="/quizzes/analytics/:id" element={<QuizAnalyticsPage />} />
              <Route path="/user-management" element={<UserManagementPage />} />

              {/* Student Routes */}
              <Route path="/quizzes/take/:id" element={<QuizTakePage />} />
              <Route path="/quizzes/leaderboard/:id" element={<QuizLeaderboardPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
