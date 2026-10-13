import React from 'react';
import { Result } from '../types';
import { Trophy, Clock, Zap, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../lib/utils';
import { motion } from 'motion/react';

interface LeaderboardProps {
  results: Result[];
}

export default function Leaderboard({ results }: LeaderboardProps) {
  const { t } = useTranslation();

  // Sort logic: Score desc, then timeSpentSeconds asc
  const sortedResults = [...results].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
  });

  if (results.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">{t('leaderboard.empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('leaderboard.rank')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('leaderboard.student')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('leaderboard.score')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('leaderboard.duration')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedResults.map((result, index) => {
              const isTopThree = index < 3;
              const medalColors = [
                'text-amber-400 bg-amber-50 dark:bg-amber-900/20',
                'text-slate-400 bg-slate-50 dark:bg-slate-800/20',
                'text-amber-700 bg-amber-50 dark:bg-amber-900/20'
              ];

              return (
                <motion.tr 
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      {isTopThree ? (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${medalColors[index]}`}>
                          <Medal className="w-5 h-5" />
                        </div>
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-sm font-black text-slate-300">
                          {index + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {result.studentName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {result.isGuest ? 'External Asset' : 'Internal Student'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                        <Zap className={`w-3.5 h-3.5 ${result.score >= 80 ? 'text-yellow-500' : 'text-slate-300'}`} />
                        <span className={`text-xl font-black ${result.score >= 80 ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                          {result.score}%
                        </span>
                      </div>
                      <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${result.score >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${result.score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-mono font-bold text-sm">
                      <Clock className="w-4 h-4 text-blue-500/50" />
                      {formatTime(result.timeSpentSeconds || 0)}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
