import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, LogOut, LayoutDashboard, Calendar, GraduationCap, Settings, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { user, profile, signOut, isTeacher } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = user ? [
    { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
  ] : [];

  if (isTeacher) {
    navItems.push({ name: 'Manajemen User', path: '/user-management', icon: Users });
    navItems.push({ name: t('nav.settings'), path: '/settings', icon: Settings });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="h-8 w-auto max-h-8 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-white w-5 h-5 shadow-sm" />
                </div>
              )}
              <span className="text-xl font-black tracking-tight text-slate-800 dark:text-white sm:block">
                LMS_TIF
              </span>
            </Link>
            
            {user && (
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-semibold border-b-2 transition-all ${
                      location.pathname === item.path
                        ? 'border-blue-600 text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                    {profile?.displayName}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {profile?.role}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border-2 border-slate-100 dark:border-slate-800 text-xs sm:text-sm font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-around items-center rounded-t-3xl shadow-2xl safe-area-bottom">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${
                location.pathname === item.path
                  ? 'text-blue-600'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
            </Link>
          ))}
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
          >
            <div className="p-2">
              <LogOut className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{t('nav.logout')}</span>
          </button>
        </div>
      )}
    </nav>
  );
}
