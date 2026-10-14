import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz, Question, Result } from '../types';
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle, Trophy, CheckCircle2, Check, X, Calendar, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import { formatTime } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import CodeRenderer, { isCodeLike } from '../components/CodeRenderer';

export default function QuizTakePage() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [status, setStatus] = useState<'available' | 'not-started' | 'ended'>('available');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isFinished, setIsFinished] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState<Omit<Result, 'id'> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-Cheat & Tab Switch Tracking
  const maxViolations = 3;
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(() => {
    if (!id) return 0;
    const userKey = user ? user.uid : 'guest';
    const saved = sessionStorage.getItem(`lms_tab_switches_${id}_${userKey}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const warningActiveRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  // Keep a reference to the latest answers so that auto-submit has access to the up-to-date states
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    // If user is not logged in, we check if they've already entered a guest name
    if (!authLoading && !user && !hasEnteredName) {
      sessionStorage.setItem('lumina_pending_quiz', 'true');
    }
  }, [user, authLoading, hasEnteredName]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const quizDoc = await getDoc(doc(db, 'quizzes', id!));
      if (!quizDoc.exists()) {
        navigate('/dashboard');
        return;
      }
      const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
      
      const now = new Date();
      if (quizData.startDate && new Date(quizData.startDate) > now) {
        setStatus('not-started');
      } else if (quizData.endDate && new Date(quizData.endDate) < now) {
        setStatus('ended');
      }

      setQuiz(quizData);
      setTimeLeft(quizData.timeLimit * 60);

      const qSnap = await getDocs(collection(db, `quizzes/${id}/questions`));
      const qList: Question[] = [];
      qSnap.forEach(d => qList.push({ id: d.id, ...d.data() } as Question));

      // Acak soal yang sudah tersimpan (Fisher-Yates Shuffle)
      const userKey = user ? user.uid : (guestName.trim() || 'guest');
      const shuffleKey = `lms_quiz_shuffled_${id}_${userKey}`;
      let finalQuestions: Question[] = [];

      try {
        const savedShuffled = sessionStorage.getItem(shuffleKey);
        if (savedShuffled) {
          const orderedIds: string[] = JSON.parse(savedShuffled);
          const qMap = new Map(qList.map(q => [q.id, q]));
          finalQuestions = orderedIds.map(qid => qMap.get(qid)).filter(Boolean) as Question[];
          // Append any newly added questions that were not in cached order
          qList.forEach(q => {
            if (!finalQuestions.some(fq => fq.id === q.id)) finalQuestions.push(q);
          });
        }
      } catch {
        finalQuestions = [];
      }

      if (finalQuestions.length !== qList.length || finalQuestions.length === 0) {
        finalQuestions = [...qList];
        for (let i = finalQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
        }
        try {
          sessionStorage.setItem(shuffleKey, JSON.stringify(finalQuestions.map(q => q.id)));
        } catch {
          // ignore session storage error
        }
      }

      setQuestions(finalQuestions);
      setLoading(false);
    };

    fetchData();
  }, [id, user]);

  // Persistent Countdown & Duration Enforcement Effect
  useEffect(() => {
    if (loading || authLoading || !quiz || isFinished) return;

    // Only engage once student enters the active test workspace
    const isReady = user || hasEnteredName;
    if (!isReady) return;

    const userIdentifier = user ? user.uid : `guest_${guestName.trim().replace(/\s+/g, '_')}`;
    const storageKey = `lms_quiz_start_epoch_${quiz.id}_${userIdentifier}`;

    let startEpochStr = localStorage.getItem(storageKey);
    if (!startEpochStr) {
      startEpochStr = Date.now().toString();
      localStorage.setItem(storageKey, startEpochStr);
    }

    const syncTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - Number(startEpochStr)) / 1000);
      const limitSeconds = quiz.timeLimit * 60;
      const computedTimeLeft = Math.max(0, limitSeconds - elapsedSeconds);

      setTimeLeft(computedTimeLeft);

      // Synthesis Beep warning at final 10 seconds
      if (computedTimeLeft > 0 && computedTimeLeft <= 10 && !isFinished) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime); // subtle volume
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
          // ignore error
        }
      }

      if (computedTimeLeft <= 0 && !isFinished) {
        clearInterval(timerInterval);
        autoSubmit();
      }
    };

    syncTimer();
    const timerInterval = setInterval(syncTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [loading, authLoading, quiz, hasEnteredName, user, isFinished, guestName]);

  // Anti-Cheat: Tab Switch & Window Blur Detection
  useEffect(() => {
    if (loading || authLoading || !quiz || isFinished) return;
    const isReady = user || hasEnteredName;
    if (!isReady || status !== 'available') return;

    const playAlertBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // ignore audio errors
      }
    };

    const handleViolation = () => {
      if (isFinished || isSubmittingRef.current || warningActiveRef.current) return;

      warningActiveRef.current = true;
      playAlertBeep();

      const newCount = tabSwitchCountRef.current + 1;
      setTabSwitchCount(newCount);
      const userKey = user ? user.uid : `guest_${guestName.trim().replace(/\s+/g, '_')}`;
      sessionStorage.setItem(`lms_tab_switches_${quiz.id}_${userKey}`, newCount.toString());

      if (newCount >= maxViolations) {
        // Disqualify and auto-submit
        Swal.fire({
          title: '🛑 Batas Pindah Tab Terlampaui!',
          html: `
            <div class="text-left space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p class="font-bold text-red-600 dark:text-red-400">
                Anda telah berpindah tab atau meninggalkan jendela ujian sebanyak <b>${newCount} kali</b>.
              </p>
              <div class="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                Sesuai peraturan integritas ujian, Anda <b>tidak diijinkan membuka tab lain</b>. Kuis Anda <b>otomatis dikumpulkan dan didiskualifikasi</b> oleh sistem sekarang.
              </div>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'Kumpulkan Sekarang',
          confirmButtonColor: '#dc2626',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => {
          warningActiveRef.current = false;
          handleSubmit({ disqualified: true, violations: newCount });
        });
      } else if (newCount === 2) {
        Swal.fire({
          title: '🚨 Peringatan 2/3: Peringatan Terakhir!',
          html: `
            <div class="text-left space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p class="font-bold text-red-600 dark:text-red-400">
                Anda kembali terdeteksi berpindah tab atau meminimalkan browser!
              </p>
              <div class="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                <b>PERINGATAN KERAS:</b> Jika Anda berpindah tab <b>1 KALI LAGI</b>, kuis Anda akan langsung <b>otomatis di-submit</b> dan didiskualifikasi!
              </div>
              <p class="text-xs text-slate-500 font-semibold">
                Pelanggaran tercatat: <b>${newCount} dari ${maxViolations}</b>. Sisa toleransi: <b>1 kali</b>.
              </p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Saya Paham & Kembali Mengerjakan',
          confirmButtonColor: '#dc2626',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => {
          warningActiveRef.current = false;
        });
      } else {
        // 1st warning
        Swal.fire({
          title: '⚠️ Dilarang Berpindah Tab!',
          html: `
            <div class="text-left space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p class="font-bold text-amber-600 dark:text-amber-400">
                Peringatan Pelanggaran (1 dari ${maxViolations})
              </p>
              <p>
                Selama kuis berlangsung, Anda <b>tidak diijinkan berpindah tab</b>, membuka tab baru, atau beralih jendela aplikasi lain.
              </p>
              <div class="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                Sisa toleransi: <b>${maxViolations - newCount} kali lagi</b> sebelum kuis otomatis dikumpulkan dan didiskualifikasi.
              </div>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Kembali ke Kuis',
          confirmButtonColor: '#2563eb',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => {
          warningActiveRef.current = false;
        });
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const onWindowBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && !Swal.isVisible()) {
          handleViolation();
        }
      }, 350);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    // Disable right-click & copy key combinations during the exam
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventKeyShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        ['c', 'v', 'u', 'a', 'p', 's'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyShortcuts);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyShortcuts);
    };
  }, [loading, authLoading, quiz, isFinished, user, hasEnteredName, status, guestName]);

  const autoSubmit = () => {
    Swal.fire({
      title: 'Waktu Habis!',
      text: 'Jawaban Anda dikirim secara otomatis oleh sistem.',
      icon: 'warning',
      timer: 2000,
      showConfirmButton: false
    }).then(() => {
      handleSubmit();
    });
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers({ ...answers, [currentIndex]: optionIndex });
  };

  const handleSubmit = async (options?: { disqualified?: boolean; violations?: number }) => {
    if (isFinished || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsFinished(true);

    const isDisqualified = options?.disqualified || false;
    const finalViolations = options?.violations !== undefined ? options.violations : tabSwitchCountRef.current;
    
    // Always use up-to-date answers reference to avoid interval stale closure
    const activeAnswers = answersRef.current;
    
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (activeAnswers[idx] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const score = isDisqualified 
      ? 0 
      : Math.round((correctCount / questions.length) * 100);
    const timeSpentSeconds = quiz ? Math.max(0, (quiz.timeLimit * 60) - timeLeft) : 0;

    const isGuest = !user;
    const finalStudentId = user ? user.uid : `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const finalStudentName = user ? (profile?.displayName || 'Student') : guestName;

    const result: Omit<Result, 'id'> = {
      quizId: id!,
      quizTitle: quiz?.title || '',
      teacherId: quiz!.teacherId,
      studentId: finalStudentId,
      studentName: finalStudentName,
      isGuest,
      ...(isGuest && { guestName }),
      score,
      correctCount,
      totalQuestions: questions.length,
      completedAt: new Date().toISOString(),
      timeSpentSeconds,
      tabSwitchViolations: finalViolations,
      disqualified: isDisqualified,
      ...(isDisqualified && { disqualifiedReason: 'Melanggar aturan: Berpindah tab melebihi batas toleransi' })
    };

    try {
      await addDoc(collection(db, 'results'), result);
      setResultData(result);
      
      // Clean up the durable start timestamp upon successful submission
      const userIdentifier = user ? user.uid : `guest_${guestName.trim().replace(/\s+/g, '_')}`;
      localStorage.removeItem(`lms_quiz_start_epoch_${id}_${userIdentifier}`);
      sessionStorage.removeItem(`lms_tab_switches_${id}_${userIdentifier}`);
      sessionStorage.removeItem(`lms_quiz_shuffled_${id}_${userIdentifier}`);

      if (!isDisqualified) {
        Swal.fire({
          title: 'Kuis Terkirim!',
          text: `Kerja bagus, ${result.studentName}! Skor Anda adalah ${score}% (${correctCount}/${questions.length})`,
          icon: score >= 70 ? 'success' : 'info',
          confirmButtonText: 'Tinjau Jawaban'
        }).then(() => {
          setShowResults(true);
        });
      } else {
        setShowResults(true);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save results.', 'error');
    }
  };

  if (!authLoading && !user && !hasEnteredName) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Identify Yourself</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Enter your name to begin the assessment.</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); if (guestName.trim()) setHasEnteredName(true); }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-bold placeholder:text-slate-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none uppercase tracking-widest text-xs"
          >
            Commence Quiz
          </button>
        </form>
      </div>
    );
  }

  if (showResults && resultData) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 pb-20">
        <header className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${resultData.score >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}
          >
            <Trophy className="w-12 h-12" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assessment Summary</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Great effort, {resultData.studentName}! Here is how you performed.</p>
          </div>

          {resultData.disqualified && (
            <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-500/40 text-red-900 dark:text-red-200 text-left flex items-start gap-4 shadow-sm">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-red-700 dark:text-red-400">
                  Ujian Didiskualifikasi Sistem
                </h4>
                <p className="text-sm font-medium mt-1">
                  Anda tercatat berpindah tab sebanyak <b>{resultData.tabSwitchViolations || 3} kali</b>, melampaui batas toleransi ujian. Kuis otomatis dikumpulkan dan nilai dibatalkan (0%).
                </p>
              </div>
            </div>
          )}

          {!resultData.disqualified && resultData.tabSwitchViolations && resultData.tabSwitchViolations > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-left flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold">
                <b>Catatan Integritas Ujian:</b> Terdeteksi <b>{resultData.tabSwitchViolations} kali</b> perpindahan tab/jendela selama kuis berlangsung.
              </p>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Score</p>
            <p className="text-5xl font-black text-blue-600">{resultData.score}%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Accuracy</p>
            <p className="text-5xl font-black text-slate-900 dark:text-white">{resultData.correctCount} / {resultData.totalQuestions}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
            <p className={`text-2xl font-black uppercase tracking-tight mt-2 ${resultData.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {resultData.score >= 70 ? 'Passed' : 'Needs Review'}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight px-2 flex items-center">
            <CheckCircle2 className="w-6 h-6 mr-3 text-blue-600" />
            Detailed Review
          </h3>
          
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const studentAnswer = answers[idx];
              const isCorrect = studentAnswer === q.correctOptionIndex;
              
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
                  <div className={`absolute top-0 right-0 px-6 py-2 text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Question {idx + 1}</p>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                    <CodeRenderer 
                      text={q.text} 
                      codeSnippet={q.codeSnippet}
                      codeLanguage={q.codeLanguage}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => {
                      const isSelected = studentAnswer === optIdx;
                      const isCorrectOption = q.correctOptionIndex === optIdx;
                      const isCode = isCodeLike(option);
                      
                      let appearance = "border-slate-100 dark:border-slate-800 opacity-60";
                      if (isCorrectOption) appearance = "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 ring-2 ring-emerald-500/20 opacity-100";
                      if (isSelected && !isCorrectOption) appearance = "border-red-500 bg-red-50/30 dark:bg-red-900/10 ring-2 ring-red-500/20 opacity-100";
                      if (isSelected && isCorrectOption) appearance = "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 ring-2 ring-emerald-500/20 opacity-100";

                      return (
                        <div key={optIdx} className={`px-6 py-4 rounded-2xl border-2 flex items-center transition-all ${appearance}`}>
                          <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                             isCorrectOption ? 'border-emerald-500 bg-emerald-500' : 
                             (isSelected && !isCorrectOption) ? 'border-red-500 bg-red-500' : 'border-slate-300'
                          }`}>
                            {isCorrectOption ? <Check className="w-4 h-4 text-white" /> : 
                             (isSelected && !isCorrectOption) ? <X className="w-4 h-4 text-white" /> : null}
                          </div>
                          <span className={`text-base font-medium ${isCode ? 'font-mono text-sm sm:text-base' : ''} ${isCorrectOption ? 'text-emerald-700 dark:text-emerald-400' : isSelected ? 'text-red-700 dark:text-red-400' : 'text-slate-500'}`}>
                            {isCode ? (
                              <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                                {option}
                              </code>
                            ) : (
                              option
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!isCorrect && (
                    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Explanation</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">The correct answer was <span className="font-bold underline font-mono">{q.options[q.correctOptionIndex]}</span>.</p>
                      </div>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-200">
                      <span className="font-bold uppercase tracking-wider block mb-1">💡 Pembahasan / Solusi:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            onClick={() => user ? navigate('/dashboard') : window.location.href = '/'}
            className="px-12 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all uppercase tracking-widest text-sm"
          >
            {user ? 'Return to Dashboard' : 'Finish Experience'}
          </button>
        </div>
      </div>
    );
  }

  if (loading || authLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 font-medium">{authLoading ? 'Verifying Identity...' : 'Preparing your quiz...'}</p>
    </div>
  );

  if (status !== 'available' && !showResults) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${status === 'not-started' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
          {status === 'not-started' ? <Calendar className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
        </div>
        
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 ${status === 'not-started' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
            {status === 'not-started' ? 'Kuis Belum Dibuka' : 'Waktu Kuis Telah Berakhir'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {quiz?.title}
          </h2>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-2">
          {status === 'not-started' ? (
            <>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jadwal Akses Kuis:</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                Dibuka: {quiz?.startDate ? new Date(quiz.startDate).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '-'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Halaman ini akan otomatis dapat diakses setelah jam buka kuis tiba. Silakan tunggu beberapa saat atau klik tombol Refresh.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batas Waktu Ditutup:</p>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                Berakhir: {quiz?.endDate ? new Date(quiz.endDate).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '-'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Batas pengumpulan kuis ini sudah terlewati. Jika Anda memiliki kendala teknis, silakan hubungi Bapak/Ibu Dosen pengampu.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {status === 'not-started' && (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Muat Ulang (Refresh)
            </button>
          )}
          <button
            onClick={() => user ? navigate('/dashboard') : navigate('/')}
            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs active:scale-95"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const timerProgress = quiz ? (timeLeft / (quiz.timeLimit * 60)) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      {/* Anti-Cheat Proctoring Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                Mode Ujian Terproteksi: Dilarang Pindah Tab
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Sistem memantau fokus browser. Dilarang membuka tab lain atau beralih aplikasi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Toleransi:</span>
          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
            tabSwitchCount === 0 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : tabSwitchCount === 1 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
          }`}>
            {tabSwitchCount === 0 ? 'Aman (0/3)' : `Pelanggaran ${tabSwitchCount}/3`}
          </span>
        </div>
      </div>

      {/* Header with Timer */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-16 sm:top-20 z-40">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
            <Clock className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Time Remaining</p>
            <p className={`text-xl sm:text-3xl font-mono font-black ${timeLeft < 60 ? 'text-red-600' : 'text-blue-700 dark:text-blue-400'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Progress</p>
          <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentIndex + 1}<span className="text-slate-300 font-medium text-lg sm:text-xl"> / {questions.length}</span>
          </p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 px-2">
        {/* Timer Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Temporal Exhaustion</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${timeLeft < 60 ? 'text-red-500' : 'text-slate-400'}`}>
              {Math.round(timerProgress)}% Remaining
            </span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${timeLeft < 60 ? 'bg-red-500' : 'bg-blue-500/40'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${timerProgress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Question Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{progress === 100 ? 'Assessment Finalized' : 'Assessment Vector'}</span>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className="bg-white dark:bg-slate-900 px-10 py-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <div className="mb-8">
            <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black text-slate-500 uppercase mb-4 inline-block tracking-widest">
              Question {currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1} of {questions.length}
            </span>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
              <CodeRenderer 
                text={currentQuestion.text}
                codeSnippet={currentQuestion.codeSnippet}
                codeLanguage={currentQuestion.codeLanguage}
              />
            </div>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isCode = isCodeLike(option);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full flex items-center px-6 py-5 rounded-2xl border-2 transition-all text-left group ${
                    answers[currentIndex] === idx
                      ? 'border-blue-500 bg-white ring-4 ring-blue-50 dark:ring-blue-900/10'
                      : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors shrink-0 ${
                     answers[currentIndex] === idx
                     ? 'border-blue-600 bg-blue-600'
                     : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {answers[currentIndex] === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className={`text-base sm:text-lg transition-colors ${
                     isCode ? 'font-mono text-sm sm:text-base' : ''
                  } ${
                     answers[currentIndex] === idx
                     ? 'text-slate-900 dark:text-white font-bold'
                     : 'text-slate-600 dark:text-slate-400 font-medium'
                  }`}>
                    {isCode ? (
                      <code className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 font-mono text-xs sm:text-sm font-bold inline-block">
                        {option}
                      </code>
                    ) : (
                      option
                    )}
                  </span>
                  {answers[currentIndex] === idx && (
                     <div className="ml-auto text-blue-600 shrink-0 pl-2">
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                     </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex items-center justify-center sm:justify-start px-6 sm:px-8 py-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-extrabold rounded-2xl border-2 border-slate-100 dark:border-slate-800 disabled:opacity-30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm uppercase text-xs tracking-widest"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => handleSubmit()}
            className="flex items-center justify-center px-6 sm:px-12 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-95 uppercase text-xs tracking-widest"
          >
            Finish & Submit
            <Send className="w-5 h-5 ml-3" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex items-center justify-center px-6 sm:px-12 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 uppercase text-xs tracking-widest"
          >
            Next Question
            <ChevronRight className="w-5 h-5 ml-3" />
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-400">
           Do not refresh the page. Your progress will be lost if you leave.
        </p>
      </div>
    </div>
  );
}
