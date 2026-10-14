import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz } from '../types';

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Record<string, Quiz[]>>({});

  useEffect(() => {
    const fetchQuizzes = async () => {
      const q = query(collection(db, 'quizzes'));
      const snap = await getDocs(q);
      const eventMap: Record<string, Quiz[]> = {};
      
      const currentUid = user?.uid;
      const currentUsername = (profile?.username || (profile?.email === 'faishol16@gmail.com' ? 'fais' : '')).toLowerCase();
      const isFais = currentUid === 'fais' || currentUid === 'mock-teacher-fais' || currentUsername === 'fais' || user?.email === 'faishol16@gmail.com';
      const isTeacher = profile?.role === 'teacher';

      snap.forEach(doc => {
        const quiz = { id: doc.id, ...doc.data() } as Quiz;
        if (isTeacher) {
          let belongs = false;
          if (isFais) {
            belongs = 
              quiz.teacherId === 'fais' || 
              quiz.teacherId === 'mock-teacher-fais' || 
              quiz.teacherId === 'z0GQp7k45ZbaBnphWJfg32cCqxo1' || 
              quiz.teacherUsername?.toLowerCase() === 'fais' || 
              quiz.teacherId === currentUid;
          } else {
            belongs = 
              quiz.teacherId === currentUid || 
              quiz.teacherId === profile?.uid || 
              (Boolean(currentUsername) && quiz.teacherUsername?.toLowerCase() === currentUsername);
          }
          if (!belongs) return;
        }

        if (quiz.createdAt) {
          const dateKey = format(new Date(quiz.createdAt), 'yyyy-MM-dd');
          if (!eventMap[dateKey]) eventMap[dateKey] = [];
          eventMap[dateKey].push(quiz);
        }
      });
      setEvents(eventMap);
    };
    fetchQuizzes();
  }, [user, profile]);

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-blue-200">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            Institutional Timeline
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Track assessment deployments and academic milestones.</p>
        </div>
        <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-black px-6 dark:text-white uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map(day => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEvents = events[dateKey] || [];
        const cloneDay = day;

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[140px] p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-colors ${
              !isSameMonth(day, monthStart) ? 'opacity-20' : ''
            } ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-inset ring-blue-100 dark:ring-blue-900/40 z-10' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xs font-black tracking-tight ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-400'}`}>
                {formattedDate}
              </span>
            </div>
            <div className="space-y-1.5">
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  className="text-[9px] p-2 bg-slate-900 dark:bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest truncate cursor-pointer hover:bg-blue-600 transition-all hover:scale-[1.02]"
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">{rows}</div>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
