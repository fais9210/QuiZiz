import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz, Result } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  ComposedChart,
  Area,
  Line
} from 'recharts';
import { ArrowLeft, Users, Trophy, TrendingUp, User, Trash2, Clock, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import Leaderboard from '../components/Leaderboard';
import { useTranslation } from 'react-i18next';

export default function QuizAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      const quizDoc = await getDoc(doc(db, 'quizzes', id!));
      if (!quizDoc.exists()) {
        navigate('/dashboard');
        return;
      }
      const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
      setQuiz(quizData);

      // Verify ownership
      if (quizData.teacherId !== user.uid) {
        navigate('/dashboard');
        return;
      }

      const resQuery = query(
        collection(db, 'results'),
        where('quizId', '==', id),
        where('teacherId', '==', user.uid)
      );
      const resSnap = await getDocs(resQuery);
      const resList: Result[] = [];
      resSnap.forEach(d => resList.push({ id: d.id, ...d.data() } as Result));
      resList.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setResults(resList);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleDeleteResult = async (resultId: string) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Delete Result?',
      text: "This action cannot be undone and will affect the analytics.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'results', resultId));
        setResults(prev => prev.filter(r => r.id !== resultId));
        Swal.fire('Deleted!', 'The result has been removed.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete result', 'error');
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Analytics Workspace...</p>
      </div>
    </div>
  );

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) 
    : 0;

  // Average completion time metrics
  const totalSeconds = results.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0);
  const avgSec = results.length > 0 ? Math.round(totalSeconds / results.length) : 0;
  const avgMinStr = results.length > 0 
    ? `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`
    : '0m';

  // Completion Performance (Pass >= 70% vs Remedial < 70%)
  const totalSubmissions = results.length;
  const passedCount = results.filter(r => r.score >= 70).length;
  const failedCount = totalSubmissions - passedCount;
  const passingPercentage = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  const completionPerformanceData = [
    { name: 'Selesai & Lulus (≥70%)', value: passedCount, color: '#10b981' },
    { name: 'Butuh Remedial (<70%)', value: failedCount, color: '#f43f5e' }
  ];

  // Chronological progress trend tracking
  const chronologicalData = [...results].reverse().map((r, idx) => ({
    attempt: `Siswa ${idx + 1}`,
    studentName: r.studentName,
    score: r.score,
    durationMin: Number(((r.timeSpentSeconds || 0) / 60).toFixed(1)),
  }));

  const scoreDistribution = [
    { name: '0-20', count: results.filter(r => r.score <= 20).length },
    { name: '21-40', count: results.filter(r => r.score > 20 && r.score <= 40).length },
    { name: '41-60', count: results.filter(r => r.score > 40 && r.score <= 60).length },
    { name: '61-80', count: results.filter(r => r.score > 60 && r.score <= 80).length },
    { name: '81-100', count: results.filter(r => r.score > 80).length },
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className="space-y-10">
      <header className="flex items-center space-x-6">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{quiz?.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Performance Metrics & Analytical Breakdown</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
         <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center space-x-5 relative z-10">
            <div className="p-3.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submissions</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{results.length}</p>
            </div>
          </div>
        </div>
        <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-[2rem] text-white shadow-xl shadow-slate-200 dark:shadow-none group">
          <div className="flex items-center space-x-5 relative z-10">
            <div className="p-3.5 bg-white/10 text-white rounded-2xl group-hover:bg-blue-600 transition-colors">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Average Score</p>
              <p className="text-4xl font-black text-white tracking-tighter">{avgScore}%</p>
            </div>
          </div>
        </div>
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group">
          <div className="flex items-center space-x-5 relative z-10">
            <div className="p-3.5 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Score</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {results.length > 0 ? Math.max(...results.map(r => r.score)) : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group">
          <div className="flex items-center space-x-5 relative z-10">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Completion Time</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {avgMinStr}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Score Distribution</h3>
          <p className="text-xs font-semibold text-slate-400 mb-10 uppercase tracking-wider">Spread of student results</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                    padding: '12px 16px',
                    fontSize: '12px',
                    fontWeight: '900'
                  }} 
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Performance / Passing Rate Donut */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Completion Performance
            </h3>
            <p className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-wider">Pass vs Failure Ratio</p>
          </div>
          <div className="relative h-[250px] flex items-center justify-center">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionPerformanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {completionPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs font-bold text-slate-650 dark:text-slate-350">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Centered Indicator */}
            <div className="text-center z-10 pointer-events-none">
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{passingPercentage}%</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Passing Rate</p>
            </div>
          </div>
        </div>

        {/* Performance & Timeline Analysis (Twin axis Area and Line Chart) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Performance & Speed Correlation
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wide">
            tracks student scores and the duration they needed chronologically.
          </p>
          <div className="h-[300px]">
            {chronologicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chronologicalData}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="attempt" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 950, fill: '#64748b' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 950, fill: '#64748b' }} 
                    domain={[0, 100]}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fontWeight: 900, fill: '#64748b' } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 950, fill: '#64748b' }} 
                    label={{ value: 'Durasi (Min)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10, fontWeight: 900, fill: '#64748b' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #f1f5f9', 
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                      padding: '12px 16px',
                      fontSize: '11px',
                      fontWeight: '900'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area yAxisId="left" type="monotone" dataKey="score" name="Score %" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                  <Line yAxisId="right" type="monotone" dataKey="durationMin" name="Duration (Min)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold text-xs uppercase tracking-widest">
                Awaiting chronological submissions
              </div>
            )}
          </div>
        </div>

        {/* Recent Submissions List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Activity Stream</h3>
          <p className="text-xs font-semibold text-slate-400 mb-10 uppercase tracking-wide">Live student submissions log</p>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
            {results.map((res) => (
              <div key={res.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-600 group-hover:scale-110 transition-transform shadow-sm">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-1.5">{res.studentName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(res.completedAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight ${
                    res.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {res.score}%
                  </div>
                  <button 
                    onClick={() => handleDeleteResult(res.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete Result"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {results.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Awaiting telemetry...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center">
            <Trophy className="w-6 h-6 mr-3 text-blue-600" />
            {t('leaderboard.title')}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700">
            Precision Ranked Analytics
          </p>
        </div>
        <Leaderboard results={results} />
      </div>
    </div>
  );
}
