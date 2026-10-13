import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Image as ImageIcon, Save, CheckCircle2, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || '');
  const [language, setLanguage] = useState(profile?.preferredLanguage || i18n.language || 'id');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setLogoUrl(profile.logoUrl || '');
      setLanguage(profile.preferredLanguage || i18n.language || 'id');
    }
  }, [profile, i18n.language]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 500) { // 500KB limit for Base64 in Firestore
      Swal.fire('Error', 'Image size too large. Please use a logo smaller than 500KB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        logoUrl,
        preferredLanguage: language
      });
      
      i18n.changeLanguage(language);
      
      Swal.fire({
        title: t('settings.success'),
        icon: 'success',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire(t('settings.error'), '', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="space-y-2 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('settings.title')}
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base">{t('settings.title')} - LMS_TIF Control Panel</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-8 px-4 sm:px-0">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
            {/* Logo Configuration */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {t('settings.logo')}
                </label>
              </div>
              
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 sm:p-8 transition-all bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  {logoUrl ? (
                    <div className="relative group">
                      <img src={logoUrl} alt="Logo Preview" className="max-h-20 sm:max-h-24 object-contain" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors rounded-lg flex items-center justify-center">
                        <Upload className="w-6 h-6 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors mb-3" />
                      <p className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">Click to upload logo</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Recommended: Square SVG or PNG</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="url"
                    value={logoUrl.startsWith('data:') ? '' : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="...or paste absolute URL path"
                    className="flex-grow px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 outline-none transition-all dark:text-white font-bold placeholder:text-slate-300 text-xs sm:text-sm"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl sm:rounded-2xl hover:bg-red-100 transition-colors shrink-0"
                      title="Clear logo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {t('settings.language')}
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-5 sm:px-6 py-4 sm:py-5 rounded-2xl font-black transition-all flex items-center justify-between gap-2 ${
                    language === 'en'
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xl sm:text-2xl">🇺🇸</span>
                    <span className="tracking-tight uppercase text-xs sm:text-sm">English Dialect</span>
                  </div>
                  {language === 'en' && <CheckCircle2 className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={`px-5 sm:px-6 py-4 sm:py-5 rounded-2xl font-black transition-all flex items-center justify-between gap-2 ${
                    language === 'id'
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xl sm:text-2xl">🇮🇩</span>
                    <span className="tracking-tight uppercase text-xs sm:text-sm">Bahasa Indonesia</span>
                  </div>
                  {language === 'id' && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 sm:mt-12 flex justify-end">
            <button
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 sm:py-5 bg-blue-600 text-white font-black rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
              ) : (
                <Save className="w-4 h-4 mr-3" />
              )}
              {t('settings.save')}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
