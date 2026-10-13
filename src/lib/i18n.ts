import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "dashboard": "Dashboard",
        "settings": "Settings",
        "createQuiz": "Create Quiz",
        "logout": "Logout"
      },
      "dashboard": {
        "welcome": "Welcome back",
        "stats": "Current Metrics",
        "recent": "Recent Activity",
        "myQuizzes": "Registry Records",
        "takeQuiz": "Initiate Trial",
        "reviews": "Review Results"
      },
      "quiz": {
        "title": "Quiz Title",
        "description": "Detailed Description",
        "timeLimit": "Temporal Threshold (Minutes)",
        "availability": "Availability Window",
        "startTime": "Start Time",
        "endTime": "End Time",
        "notStarted": "Assessment Not Commenced",
        "notStartedDesc": "This trial is scheduled to begin at",
        "ended": "Assessment Terminated",
        "endedDesc": "The acquisition window for this trial closed at",
        "save": "Commit Changes",
        "saveTemplate": "Save Template"
      },
      "leaderboard": {
        "title": "Performance Leaderboard",
        "rank": "Rank",
        "student": "Asset/Student",
        "score": "Precision Score",
        "duration": "Temporal Duration",
        "speed": "Acquisition Velocity",
        "empty": "No assessment data available for this sector."
      },
      "settings": {
        "title": "System Configuration",
        "logo": "Brand Identity (Logo URL)",
        "language": "Primary Dialect",
        "save": "Persist Changes",
        "success": "Configuration synchronized successfully",
        "error": "Failed to synchronize configuration"
      }
    }
  },
  id: {
    translation: {
      "nav": {
        "dashboard": "Dasbor",
        "settings": "Pengaturan",
        "createQuiz": "Buat Kuis",
        "logout": "Keluar"
      },
      "dashboard": {
        "welcome": "Selamat datang kembali",
        "stats": "Metrik Saat Ini",
        "recent": "Aktivitas Terbaru",
        "myQuizzes": "Catatan Registri",
        "takeQuiz": "Mulai Ujian",
        "reviews": "Tinjau Hasil"
      },
      "quiz": {
        "title": "Judul Kuis",
        "description": "Deskripsi Detail",
        "timeLimit": "Ambang Temporal (Menit)",
        "availability": "Jendela Ketersediaan",
        "startTime": "Waktu Mulai",
        "endTime": "Waktu Selesai",
        "notStarted": "Asesmen Belum Dimulai",
        "notStartedDesc": "Ujian ini dijadwalkan untuk dimulai pada",
        "ended": "Asesmen Telah Berakhir",
        "endedDesc": "Jendela akuisisi untuk ujian ini ditutup pada",
        "save": "Komit Perubahan",
        "saveTemplate": "Simpan Templat"
      },
      "leaderboard": {
        "title": "Papan Peringkat Performa",
        "rank": "Peringkat",
        "student": "Aset/Siswa",
        "score": "Skor Presisi",
        "duration": "Durasi Temporal",
        "speed": "Kecepatan Akuisisi",
        "empty": "Tidak ada data asesmen yang tersedia untuk sektor ini."
      },
      "settings": {
        "title": "Konfigurasi Sistem",
        "logo": "Identitas Merek (URL Logo)",
        "language": "Bahasa Utama",
        "save": "Simpan Perubahan",
        "success": "Konfigurasi berhasil disinkronkan",
        "error": "Gagal menyinkronkan konfigurasi"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
