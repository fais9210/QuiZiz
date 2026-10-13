import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz, Result } from '../types';
import QuizCard from '../components/QuizCard';
import { Trophy, Clock, Target, Calendar as CalendarIcon, CheckCircle2, Search, Filter, SortAsc, SortDesc, ChevronDown, Sparkles, BookOpen, GraduationCap, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch all quizzes
        const quizSnap = await getDocs(collection(db, 'quizzes'));
        const quizList: Quiz[] = [];
        quizSnap.forEach((doc) => {
          quizList.push({ id: doc.id, ...doc.data() } as Quiz);
        });
        setAvailableQuizzes(quizList);

        // Fetch user results
        const resQuery = query(
          collection(db, 'results'), 
          where('studentId', '==', user.uid)
        );
        const resSnap = await getDocs(resQuery);
        const resList: Result[] = [];
        resSnap.forEach((doc) => {
          resList.push({ id: doc.id, ...doc.data() } as Result);
        });
        // Sort by completedAt desc
        resList.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setResults(resList);
      } catch (error) {
        console.error("Error fetching student data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) 
    : 0;

  const totalTimeSeconds = results.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0);
  const totalMinutes = Math.floor(totalTimeSeconds / 60);
  const totalSeconds = totalTimeSeconds % 60;
  const formattedTime = totalMinutes > 0 ? `${totalMinutes}m ${totalSeconds}s` : `${totalSeconds}s`;

  const filteredQuizzes = availableQuizzes
    .filter(quiz => {
      const isCompleted = results.some(r => r.quizId === quiz.id);
      const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'pending') return !isCompleted && matchesSearch;
      if (filterStatus === 'completed') return isCompleted && matchesSearch;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);
  const paginatedQuizzes = filteredQuizzes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-10">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col min-[900px]:flex-row justify-between items-start min-[900px]:items-center gap-6">
          <div className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-blue-100 border border-white/10">
              🎓 Student Academic Hub
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none uppercase">
              {t('dashboard.welcome') || 'WELCOME BACK'}, <span className="text-yellow-300">{profile?.displayName || user?.displayName || 'Scholar'}</span>
            </h1>
            <p className="text-blue-100/80 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
              Supercharge your trajectory, engage in high-precision interactive trials, and track real-time competitive leaderboard rankings.
            </p>
          </div>
          <div className="hidden min-[1100px]:flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Current Standing</p>
              <p className="text-lg font-black">{results.length > 0 ? `${avgScore}% AVG SCORE` : 'READY FOR TEST'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/10 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-500">
            <Target className="w-40 h-40" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex justify-between items-start">
              <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black bg-white/20 px-3 py-1 rounded-full text-white uppercase tracking-widest">Global Rank</span>
            </div>
            <div>
              <div className="flex items-baseline space-x-1">
                <h2 className="text-4xl sm:text-6xl font-black">{avgScore}</h2>
                <span className="text-xl sm:text-2xl font-bold opacity-60">%</span>
              </div>
              <p className="text-white/60 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-2">{t('dashboard.stats') || 'Average Performance'}</p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-emerald-500/5 pointer-events-none transition-transform group-hover:scale-110 duration-500">
            <CheckCircle2 className="w-40 h-40" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex justify-between items-start">
              <div className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessments</span>
            </div>
            <div>
              <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{results.length}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-2">Quizzes Successfully Completed</p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-[2rem] text-white shadow-xl shadow-slate-200 dark:shadow-none sm:col-span-2 lg:col-span-1 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/5 pointer-events-none transition-transform group-hover:scale-110 duration-500">
            <Clock className="w-40 h-40" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex justify-between items-start">
              <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl border border-white/5">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Spent</span>
            </div>
            <div>
              <h2 className="text-3xl sm:text-5xl font-mono font-black text-white tracking-tight">
                {formattedTime !== '0s' ? formattedTime : `${results.length * 15}m`}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-2">{results.length === 0 ? 'ESTIMATED LIMIT' : 'EXACT CONVERGENCE DURATION'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 pt-4">
        {/* Quiz Management Section */}
        <div className="flex-1 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Quiz Inventory</h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all outline-none w-full md:w-64"
                />
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-2xl border transition-all ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-600'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sort by Date/Title</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'newest', icon: SortDesc, label: 'Newest' },
                      { id: 'oldest', icon: SortAsc, label: 'Oldest' },
                      { id: 'title', icon: null, label: 'A-Z' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${sortBy === opt.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-600'}`}
                      >
                        {opt.icon && <opt.icon className="w-3 h-3" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Status</label>
                  <div className="flex gap-2">
                    {['all', 'pending', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status as any)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black capitalize transition-all ${filterStatus === status ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-600'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {paginatedQuizzes.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">No Quizzes Found</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Try adjusting your search or filters.</p>
              </div>
            ) : (
              paginatedQuizzes.map((quiz) => {
                const isCompleted = results.some(r => r.quizId === quiz.id);
                return (
                  <div key={quiz.id} className="relative">
                    {isCompleted && (
                      <div className="absolute top-4 right-4 z-10 p-2 bg-emerald-500 text-white rounded-xl shadow-lg ring-4 ring-white dark:ring-slate-900">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <QuizCard 
                      quiz={quiz} 
                      href={`/quizzes/take/${quiz.id}`} 
                      actionText={isCompleted ? "Retake Quiz" : "Begin Test"}
                      secondaryHref={`/quizzes/leaderboard/${quiz.id}`}
                      secondaryText="Ranking"
                    />
                  </div>
                );
              })
            )}
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
        </div>

        {/* Recent Activity */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
          <div className="space-y-4">
            {results.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic font-medium">No recent activity detected.</p>
            ) : (
              results.slice(0, 5).map((result) => (
                <div key={result.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-slate-800 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{result.quizTitle}</h4>
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${result.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {result.score}%
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {format(new Date(result.completedAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
