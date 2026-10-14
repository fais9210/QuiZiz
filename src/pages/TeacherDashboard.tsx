import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz, Result } from '../types';
import { Plus, Trash2, Edit3, BarChart2, Users, Star, BookOpen, QrCode, X, Copy, ExternalLink, Check, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizStats, setQuizStats] = useState<Record<string, { count: number; avg: number }>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const currentUid = user.uid;
        const currentUsername = (profile?.username || (profile?.email === 'faishol16@gmail.com' ? 'fais' : '')).toLowerCase();
        const isFais = currentUid === 'fais' || currentUid === 'mock-teacher-fais' || currentUsername === 'fais' || user.email === 'faishol16@gmail.com';

        const querySnapshot = await getDocs(collection(db, 'quizzes'));
        const quizList: Quiz[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Quiz;
          const quiz = { id: doc.id, ...data };

          let belongsToUser = false;
          if (isFais) {
            belongsToUser = 
              quiz.teacherId === 'fais' || 
              quiz.teacherId === 'mock-teacher-fais' || 
              quiz.teacherId === 'z0GQp7k45ZbaBnphWJfg32cCqxo1' || 
              quiz.teacherUsername?.toLowerCase() === 'fais' || 
              quiz.teacherId === currentUid;
          } else {
            belongsToUser = 
              quiz.teacherId === currentUid || 
              quiz.teacherId === profile?.uid || 
              (Boolean(currentUsername) && quiz.teacherUsername?.toLowerCase() === currentUsername);
          }

          if (belongsToUser) {
            quizList.push(quiz);
          }
        });

        // Sort by createdAt desc
        quizList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setQuizzes(quizList);

        // Fetch results for this teacher's quizzes
        const quizIds = new Set(quizList.map(q => q.id));
        const resSnap = await getDocs(collection(db, 'results'));
        const allResults: Result[] = [];
        resSnap.forEach((d) => {
          const r = { id: d.id, ...d.data() } as Result;
          if (quizIds.has(r.quizId)) {
            allResults.push(r);
          }
        });

        // Aggregate stats
        const stats: Record<string, { count: number; avg: number }> = {};
        for (const quiz of quizList) {
          const quizResults = allResults.filter(r => r.quizId === quiz.id);
          let totalScore = 0;
          quizResults.forEach(r => totalScore += r.score);
          
          stats[quiz.id] = {
            count: quizResults.length,
            avg: quizResults.length > 0 ? Math.round(totalScore / quizResults.length) : 0
          };
        }
        setQuizStats(stats);
      } catch (error) {
        console.error("Error fetching quizzes", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  const handleDelete = async (id: string) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (isConfirmed) {
      await deleteDoc(doc(db, 'quizzes', id));
      setQuizzes(quizzes.filter(q => q.id !== id));
      Swal.fire('Deleted!', 'User quiz has been deleted.', 'success');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="space-y-10 animate-pulse">
      <div className="h-52 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-[2rem]" />
        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-[2rem]" />
        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-[2rem]" />
      </div>
      <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem]" />
    </div>
  );

  const shareUrl = sharingQuiz ? `${window.location.origin}/quizzes/take/${sharingQuiz.id}` : '';

  const totalPages = Math.ceil(quizzes.length / itemsPerPage);
  const paginatedQuizzes = quizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-10">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-400 border border-white/5">
              🛡️ Instructor Control Panel
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-none">
              {t('dashboard.welcome') || 'WELCOME BACK'}, <span className="text-blue-500">{profile?.displayName || user?.displayName || 'Instructor'}</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
              Selamat Datang Mahasiswa Teknik Informatika, Silahkan Kerjakan Quiz dengan baik dan benar, sesuai dengan arahan Bapak/Ibu Dosen. Terima kasih atas perhatiannya
            </p>
          </div>
          <Link
            to="/quizzes/create"
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/25 border border-white/5 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 mr-3" />
            {t('nav.createQuiz') || 'Deploy Quiz'}
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <BookOpen className="absolute -right-4 -bottom-4 w-28 h-28 text-blue-50 transition-colors group-hover:text-blue-100 dark:text-slate-800/20" />
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.myQuizzes')}</span>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{quizzes.length}</h2>
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase">Deployed Repositories</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <Users className="absolute -right-4 -bottom-4 w-28 h-28 text-indigo-50 transition-colors group-hover:text-indigo-100 dark:text-slate-800/20" />
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.reviews')}</span>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                {Object.values(quizStats).reduce((acc: number, s) => acc + s.count, 0)}
              </h2>
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase">Submissions Received</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-[2rem] text-white shadow-xl shadow-slate-200 dark:shadow-none group sm:col-span-2 lg:col-span-1 relative overflow-hidden">
          <Star className="absolute -right-4 -bottom-4 w-28 h-28 text-white/5 transition-opacity group-hover:opacity-10" />
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('dashboard.stats')}</span>
            <div className="flex items-baseline space-x-2 text-white">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">
                {quizzes.length > 0 
                  ? Math.round(Object.values(quizStats).reduce((acc: number, s) => acc + s.avg, 0) / quizzes.length) 
                  : 0}
              </h2>
              <span className="text-xs sm:text-sm font-bold opacity-50 uppercase">% Global Average</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Active Assessments</h2>
        {quizzes.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 font-bold uppercase tracking-widest">No active repositories identified.</p>
            <Link to="/quizzes/create" className="text-blue-600 font-black mt-4 inline-block hover:underline">Deploy Initial Quiz</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedQuizzes.map((quiz) => (
                <div key={quiz.id} className="relative group">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white line-clamp-1 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{quiz.title}</h3>
                      <div className="flex gap-1">
                         <button 
                          onClick={() => setSharingQuiz(quiz)} 
                          className="p-2 text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="Share Quiz"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        <Link to={`/quizzes/analytics/${quiz.id}`} className="p-2 text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Review Analytics">
                          <BarChart2 className="w-5 h-5" />
                        </Link>
                         <Link to={`/quizzes/leaderboard/${quiz.id}`} className="p-2 text-slate-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors" title="Global Ranking">
                          <Trophy className="w-5 h-5" />
                        </Link>
                         <Link to={`/quizzes/edit/${quiz.id}`} className="p-2 text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit Quiz">
                          <Edit3 className="w-5 h-5" />
                        </Link>
                        <button onClick={() => handleDelete(quiz.id)} className="p-2 text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete Quiz">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Metrics</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{quizStats[quiz.id]?.count || 0}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Efficiency</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{quizStats[quiz.id]?.avg || 0}%</p>
                      </div>
                    </div>

                    <Link
                      to={`/quizzes/analytics/${quiz.id}`}
                      className="w-full inline-flex items-center justify-center px-6 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                    >
                      <BarChart2 className="w-4 h-4 mr-3" />
                      Review Analytics
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:border-blue-600 transition-all font-bold text-sm"
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:border-blue-600 transition-all font-bold text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {sharingQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSharingQuiz(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setSharingQuiz(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-2">Share Assessment</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Scan QR or copy link to provide student access.</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl flex justify-center mb-8 border border-slate-100 dark:border-slate-800">
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  <QRCodeSVG value={shareUrl} size={200} level="H" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareUrl}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-500 dark:text-slate-400 truncate"
                  />
                  <button 
                    onClick={() => handleCopyLink(shareUrl)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <a 
                  href={shareUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-6 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <ExternalLink className="w-4 h-4 mr-3" />
                  Primary Access Node
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
