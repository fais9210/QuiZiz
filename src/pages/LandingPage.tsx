import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { GraduationCap, ArrowRight, BookOpen, Clock, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="text-center py-24 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest mb-8 border border-blue-100 dark:border-blue-900/50">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-3 animate-pulse"></span>
            Academic Infrastructure v2.0
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tighter">
            Architecting the <span className="text-blue-600">Future</span> of Learning
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Premium assessment infrastructure for modern educators. LMS_TIF provides the tools 
            required to deploy sophisticated quizzes and track student trajectory with precision.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-10 py-5 text-sm font-black uppercase tracking-widest text-white bg-slate-900 dark:bg-slate-800 rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 dark:shadow-none hover:scale-105 active:scale-95"
              >
                Access Dashboard
                <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-10 py-5 text-sm font-black uppercase tracking-widest text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95"
              >
                Deploy LMS_TIF
                <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full mt-12 px-4 max-w-6xl mx-auto">
        {[
          {
            title: 'Quiz Foundry',
            desc: 'Powerful tools for instructors to forge multiple-choice assessments with absolute precision.',
            icon: BookOpen,
            color: 'bg-white border-slate-200'
          },
          {
            title: 'Temporal Logic',
            desc: 'High-precision countdown systems to maintain assessment integrity and time constraints.',
            icon: Clock,
            color: 'bg-white border-slate-200'
          },
          {
            title: 'Global Ranking',
            desc: 'Competitive assessment streams sorted by precision accuracy and temporal acquisition velocity.',
            icon: Trophy,
            color: 'bg-slate-900 border-slate-800 text-white'
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`p-10 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 group ${feature.color}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border transition-colors ${i === 2 ? 'bg-white/10 border-white/20' : 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
              <feature.icon className="w-7 h-7" />
            </div>
            <h3 className={`text-2xl font-black mb-4 tracking-tight ${i === 2 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{feature.title}</h3>
            <p className={`line-clamp-3 leading-relaxed font-medium ${i === 2 ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{feature.desc}</p>
          </motion.div>
        ))}
      </section>
      
      {/* Visual Asset */}
      <div className="mt-20 md:mt-32 w-full max-w-6xl px-4">
        <div className="aspect-square sm:aspect-video lg:aspect-[21/9] rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-[6px] sm:border-[12px] border-white dark:border-slate-800 shadow-2xl relative group">
           <img 
            src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200" 
            alt="LuminaLMS UI" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex items-end p-6 sm:p-16">
            <div className="text-white max-w-lg">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 sm:mb-4 text-blue-400 opacity-80">Global Ecosystem</p>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">Advanced Assessment Infrastructure at Scale.</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
