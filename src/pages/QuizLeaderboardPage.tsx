import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Quiz, Result } from '../types';
import { ArrowLeft, Trophy, Medal, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Leaderboard from '../components/Leaderboard';
import { motion } from 'motion/react';

export default function QuizLeaderboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', id!));
        if (!quizDoc.exists()) {
          navigate('/dashboard');
          return;
        }
        setQuiz({ id: quizDoc.id, ...quizDoc.data() } as Quiz);

        const resQuery = query(
          collection(db, 'results'),
          where('quizId', '==', id)
        );
        const resSnap = await getDocs(resQuery);
        const resList: Result[] = [];
        resSnap.forEach(d => resList.push({ id: d.id, ...d.data() } as Result));
        setResults(resList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 font-medium">Calibrating Leaderboard...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <Medal className="w-6 h-6 text-yellow-500" />
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              {t('leaderboard.title')}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest px-1">
            {quiz?.title} — Global Ranking Stream
          </p>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-600 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200 dark:shadow-none"
      >
        <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">Scoring Protocol</h2>
          <p className="text-white/80 font-medium leading-relaxed italic border-l-4 border-white/20 pl-6">
            "Ranking is dynamically computed prioritizing Precision Accuracy (Score), followed by Acquisition Velocity (Time Duration). Every second is a variable in the success equation."
          </p>
          <div className="flex items-center gap-4 mt-8">
             <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                 <div key={i} className="w-10 h-10 rounded-full border-4 border-blue-600 bg-blue-400 flex items-center justify-center text-[10px] font-black">
                   {String.fromCharCode(64 + i)}
                 </div>
               ))}
             </div>
             <span className="text-xs font-black uppercase tracking-widest text-white/60">
               {results.length} Active Participants
             </span>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <Info className="w-4 h-4 text-slate-400" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Ranking Environment</p>
        </div>
        <Leaderboard results={results} />
      </div>

      <div className="flex justify-center pt-10">
        <button
          onClick={() => navigate(`/quizzes/take/${id}`)}
          className="px-10 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest text-xs"
        >
          {t('dashboard.takeQuiz')}
        </button>
      </div>
    </div>
  );
}
