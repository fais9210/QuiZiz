import { Link } from 'react-router-dom';
import { Quiz } from '../types';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  href: string;
  actionText: string;
  secondaryHref?: string;
  secondaryText?: string;
}

export default function QuizCard({ quiz, href, actionText, secondaryHref, secondaryText }: QuizCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden h-full flex flex-col">
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <BookOpen className="w-24 sm:w-32 h-24 sm:h-32 text-slate-900 dark:text-white" />
      </div>
      
      <div className="flex flex-col flex-1 relative z-10">
        <div className="mb-4 sm:mb-6">
          <span className="px-2 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-3 sm:mb-4 inline-block">
            Assessment
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 line-clamp-1 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">
            {quiz.title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed font-medium">
            {quiz.description || "Comprehensive assessment covering core module topics."}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-4 sm:pt-6 border-t border-slate-50 dark:border-slate-800">
          <div className="flex items-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 mr-2 text-blue-500" />
            {quiz.timeLimit} MINS
          </div>
          <div className="flex gap-2">
            {secondaryHref && (
              <Link
                to={secondaryHref}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs font-black rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-all uppercase tracking-widest"
              >
                {secondaryText}
              </Link>
            )}
            <Link
              to={href}
              className="inline-flex items-center px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] sm:text-xs font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 dark:shadow-none uppercase tracking-widest"
            >
              {actionText}
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
