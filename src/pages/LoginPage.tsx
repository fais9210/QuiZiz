import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { GraduationCap, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';

export default function LoginPage() {
  const { user, signIn, signInWithCredentials, loading } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  if (user) return <Navigate to={from} replace />;

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Harap isi semua kolom.');
      return;
    }

    setFormLoading(true);
    setErrorMsg('');

    try {
      await signInWithCredentials(username, password);
      Swal.fire({
        title: 'Berhasil Masuk!',
        text: 'Selamat datang kembali, Dosen!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal login. Periksa username dan password Anda.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 overflow-hidden">
      {/* Background decoration elements to enhance backdrop-blur glass effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative max-w-md w-full bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-white/40 dark:border-slate-800/55 shadow-2xl"
      >
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-500/20">
            <GraduationCap className="text-white w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Identity Access</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">LMS_TIF Portal Akademik &amp; High-Fidelity Trial Hub</p>
        </div>

        {/* Credentials Form for Lecturers */}
        <form onSubmit={handleCredentialsLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Username Dosen
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="fais"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={formLoading}
                className="w-full pl-11 pr-4 py-4 bg-white/60 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400/80 text-sm font-medium focus:outline-none focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-700 transition-all focus:bg-white dark:focus:bg-slate-950/70"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={formLoading}
                className="w-full pl-11 pr-12 py-4 bg-white/60 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400/80 text-sm font-medium focus:outline-none focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-700 transition-all focus:bg-white dark:focus:bg-slate-950/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Inline Error Message */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                  {errorMsg}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50"
          >
            {formLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="flex items-center gap-1.5">
                Masuk Sebagai Dosen <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Section Divider */}
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
            <span className="bg-white/90 dark:bg-slate-900/90 px-4 text-slate-400 dark:text-slate-500 backdrop-blur-md rounded-full py-0.5 border border-slate-100 dark:border-slate-800">
              Atau
            </span>
          </div>
        </div>

        {/* Google Authentication for General/Student sign in */}
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center px-6 py-4 space-x-3 bg-white/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group shadow-sm active:scale-[0.98]"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 object-contain" />
          <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-widest text-[11px] group-hover:text-blue-500 transition-colors">
            Masuk dengan Google
          </span>
        </button>

        <p className="mt-8 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed px-4">
          Akses masuk ini dilindungi protokol enkripsi internal LMS_TIF. Dosen dapat menggunakan kredensial khusus.
        </p>
      </motion.div>
    </div>
  );
}
