import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Quiz, Question, QuizTemplate } from '../types';
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Info, 
  Check, 
  Copy, 
  Layout, 
  X, 
  ChevronRight, 
  GripVertical, 
  CopyPlus,
  Calendar,
  Clock,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Sparkles,
  Wand2,
  Brain,
  Loader2,
  Code2,
  BookOpen,
  Layers,
  CheckCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { TIF_QUESTION_BANKS, TIFQuestionPreset } from '../data/tifQuestionBanks';
import CodeRenderer from '../components/CodeRenderer';

interface LocalQuestion extends Partial<Question> {
  tempId: string;
}

export default function QuizCreatePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTifBank, setShowTifBank] = useState(false);

  const setQuickSchedule = (type: 'always' | '2hours' | 'today' | '24hours') => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDateTime = (d: Date) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const now = new Date();
    if (type === 'always') {
      setStartDate('');
      setEndDate('');
      Swal.fire({
        title: 'Jadwal Diperbarui',
        text: 'Kuis diatur selalu terbuka (tanpa batas waktu akses).',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } else if (type === '2hours') {
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setStartDate(formatDateTime(now));
      setEndDate(formatDateTime(end));
      Swal.fire({
        title: 'Sesi Kuliah Aktif (2 Jam)',
        text: 'Kuis terbuka mulai sekarang hingga 2 jam ke depan.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    } else if (type === 'today') {
      const end = new Date(now);
      end.setHours(23, 59, 0, 0);
      setStartDate(formatDateTime(now));
      setEndDate(formatDateTime(end));
      Swal.fire({
        title: 'Kuis Hari Ini',
        text: 'Kuis dibuka hingga pukul 23:59 malam ini.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    } else if (type === '24hours') {
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setStartDate(formatDateTime(now));
      setEndDate(formatDateTime(end));
      Swal.fire({
        title: 'Kuis 24 Jam',
        text: 'Kuis dibuka selama 24 jam ke depan.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  const loadTifBankPreset = (preset: TIFQuestionPreset) => {
    const newQuestions: LocalQuestion[] = preset.questions.map(q => ({
      tempId: crypto.randomUUID(),
      text: q.text,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex,
      codeSnippet: q.codeSnippet || '',
      codeLanguage: q.codeLanguage || 'cpp',
      explanation: q.explanation || ''
    }));

    const isFirstEmpty = questions.length === 1 && !questions[0].text?.trim();
    if (isFirstEmpty) {
      setQuestions(newQuestions);
      if (!title) setTitle(preset.title);
      if (!description) setDescription(preset.description);
    } else {
      setQuestions(prev => [...prev, ...newQuestions]);
    }

    setShowTifBank(false);
    Swal.fire({
      title: 'Bank Soal TIF Dimuat!',
      text: `${newQuestions.length} soal dari "${preset.title}" berhasil ditambahkan.`,
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });
  };

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Quiz metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Questions
  const [questions, setQuestions] = useState<LocalQuestion[]>([
    { tempId: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctOptionIndex: 0 }
  ]);

  // Draft Auto-save state
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // AI Question Generation States
  const [aiTopic, setAiTopic] = useState('');
  const [aiTextContext, setAiTextContext] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiLanguage, setAiLanguage] = useState<'id' | 'en'>('id');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedPreviewIndexes, setSelectedPreviewIndexes] = useState<Record<number, boolean>>({});

  const handleGenerateAIQuestions = async () => {
    if (!aiTopic.trim() && !aiTextContext.trim()) {
      Swal.fire({
        title: 'Input Diperlukan',
        text: 'Silakan isi topik kuis atau materi/konteks terlebih dahulu.',
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedPreview([]);
    
    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: aiTopic,
          textInput: aiTextContext,
          count: aiCount,
          language: aiLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedPreview(data.questions);
        // Pre-select all generated questions
        const initialSelections: Record<number, boolean> = {};
        data.questions.forEach((_, idx) => {
          initialSelections[idx] = true;
        });
        setSelectedPreviewIndexes(initialSelections);
        
        Swal.fire({
          title: 'Berhasil!',
          text: `Gemini AI berhasil merancang ${data.questions.length} soal untuk Anda. Silakan tinjau di bawah ini.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        throw new Error('Sistem AI mengembalikan format yang tidak valid.');
      }
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        title: 'Kesalahan AI',
        text: error?.message || 'Gagal menghubungi asisten kecerdasan buatan Gemini.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectPreview = (idx: number) => {
    setSelectedPreviewIndexes(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const injectSelectedAIQuestions = () => {
    const selectedQuestions = generatedPreview.filter((_, idx) => selectedPreviewIndexes[idx]);
    if (selectedQuestions.length === 0) {
      Swal.fire({
        title: 'Pilih Soal',
        text: 'Silakan pilih setidaknya satu soal untuk ditambahkan ke kuis.',
        icon: 'info',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const formatted = selectedQuestions.map(q => ({
      tempId: crypto.randomUUID(),
      text: q.text,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex
    }));

    // Check if the current questions are empty/untouched placeholder questions
    const isTouched = questions.some(q => q.text?.trim() || q.options.some(o => o.trim()));
    if (!isTouched && questions.length === 1) {
      setQuestions(formatted);
    } else {
      setQuestions([...questions, ...formatted]);
    }

    // Reset AI states
    setGeneratedPreview([]);
    setAiTopic('');
    setAiTextContext('');
    setShowAiPanel(false);

    Swal.fire({
      title: 'Soal Ditambahkan!',
      text: `${formatted.length} soal baru berhasil dimasukkan ke kuis Anda.`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Check for auto-saved draft on mount
  useEffect(() => {
    if (!id) {
      const savedDraftS = localStorage.getItem('lms_quiz_draft');
      if (savedDraftS) {
        try {
          const draft = JSON.parse(savedDraftS);
          // Check if there is actual content worth restoring
          const hasContent = draft.title || 
                             draft.description || 
                             (draft.questions && draft.questions.some((q: any) => q.text || q.options.some((o: string) => o)));
          if (hasContent) {
            Swal.fire({
              title: 'Draf Kuis Ditemukan!',
              text: `Terdeteksi draf kuis "${draft.title || 'Tanpa Judul'}" yang tersimpan otomatis pada pukul ${draft.timestamp || ''}. Apakah Anda ingin memulihkannya?`,
              icon: 'info',
              showCancelButton: true,
              confirmButtonText: 'Ya, Pulihkan',
              cancelButtonText: 'Abaikan draf',
              confirmButtonColor: '#2563eb',
              cancelButtonColor: '#64748b',
            }).then((result) => {
              if (result.isConfirmed) {
                setTitle(draft.title || '');
                setDescription(draft.description || '');
                setTimeLimit(draft.timeLimit || 15);
                setStartDate(draft.startDate || '');
                setEndDate(draft.endDate || '');
                if (draft.questions) {
                  setQuestions(draft.questions);
                }
                setLastSaved(draft.timestamp || null);
                Swal.fire({
                  title: 'Draf Dipulihkan',
                  icon: 'success',
                  toast: true,
                  position: 'top-end',
                  timer: 2000,
                  showConfirmButton: false
                });
              } else {
                Swal.fire({
                  title: 'Hapus Draf Permanen?',
                  text: 'Draf yang tersimpan akan dihapus selamanya.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Ya, Hapus',
                  cancelButtonText: 'Simpan Draf Saja',
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#64748b'
                }).then((delRes) => {
                  if (delRes.isConfirmed) {
                    localStorage.removeItem('lms_quiz_draft');
                    setLastSaved(null);
                  }
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing quiz draft:", e);
        }
      }
    }
  }, [id]);

  // Periodic Auto-save with debounce (1.5 seconds)
  useEffect(() => {
    // Only save draft for new quizzes
    if (id) return;

    // Avoid saving if completely blank/initial state
    const isBlank = !title.trim() && 
                    !description.trim() && 
                    questions.length === 1 && 
                    !questions[0].text?.trim() && 
                    questions[0].options.every(o => !o.trim());
                    
    if (isBlank) return;

    const timer = setTimeout(() => {
      const draftData = {
        title,
        description,
        timeLimit,
        startDate,
        endDate,
        questions,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      localStorage.setItem('lms_quiz_draft', JSON.stringify(draftData));
      setLastSaved(draftData.timestamp);
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, description, timeLimit, startDate, endDate, questions, id]);

  // JSON and CSV Upload & Download Logic
  const [dragActive, setDragActive] = useState(false);

  const downloadJSONTemplate = () => {
    try {
      const data = [
        {
          text: "Siapa penemu lampu pijar tingkat dunia?",
          options: [
            "Thomas Alva Edison",
            "Nikola Tesla",
            "Albert Einstein",
            "Alexander Graham Bell"
          ],
          correctOptionIndex: 0
        },
        {
          text: "Manakah dari berikut ini yang merupakan bahasa pemrograman web di sisi server (backend)?",
          options: [
            "HTML",
            "CSS",
            "JavaScript (Node.js)",
            "Markdown"
          ],
          correctOptionIndex: 2
        }
      ];
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Soal_Kuis_JSON.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire({
        title: 'Sukses Mengunduh!',
        text: 'Silakan isi template JSON tersebut dan unggah kembali.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal mengunduh template JSON.', 'error');
    }
  };

  const downloadCSVTemplate = () => {
    try {
      const headers = 'Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Jawaban Benar (0-3 atau A/B/C/D)';
      const rows = [
        '"Siapa penemu lampu pijar tingkat dunia?","Thomas Alva Edison","Nikola Tesla","Albert Einstein","Alexander Graham Bell","A"',
        '"Manakah dari berikut ini yang merupakan bahasa pemrograman web di sisi server (backend)?","HTML","CSS","JavaScript (Node.js)","Markdown","2"'
      ];
      const csvContent = headers + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Soal_Kuis_CSV.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire({
        title: 'Sukses Mengunduh!',
        text: 'Silakan isi template CSV tersebut dan unggah kembali.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal mengunduh template CSV.', 'error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processJsonOrCsvFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processJsonOrCsvFile(file);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let entry = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(entry);
        entry = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(entry);
        lines.push(row);
        row = [];
        entry = '';
      } else {
        entry += char;
      }
    }
    if (row.length > 0 || entry !== '') {
      row.push(entry);
      lines.push(row);
    }
    return lines;
  };

  const processJsonOrCsvFile = (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'json' && fileType !== 'csv') {
      Swal.fire('Format Salah', 'Mohon unggah file format JSON (.json) atau CSV (.csv).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const textContent = e.target?.result as string;
        let parsedQuestions: LocalQuestion[] = [];

        if (fileType === 'json') {
          const rawData = JSON.parse(textContent);
          if (!Array.isArray(rawData)) {
            throw new Error('Data JSON harus berupa array of questions.');
          }

          parsedQuestions = rawData.map((item: any, index) => {
            if (!item.text || !Array.isArray(item.options) || item.options.length < 2) {
              throw new Error(`Format objek pada index ${index} tidak valid. Harus memiliki "text" dan "options" (dengan minimal 2 opsi).`);
            }
            
            const options = [...item.options];
            while (options.length < 4) {
              options.push(`Pilihan ${String.fromCharCode(65 + options.length)}`);
            }
            if (options.length > 4) {
              options.splice(4);
            }

            let correctOptionIndex = 0;
            if (typeof item.correctOptionIndex === 'number' && item.correctOptionIndex >= 0 && item.correctOptionIndex < 4) {
              correctOptionIndex = item.correctOptionIndex;
            } else if (typeof item.correctOptionIndex === 'string') {
              const letter = item.correctOptionIndex.trim().toUpperCase();
              if (letter === 'A') correctOptionIndex = 0;
              else if (letter === 'B') correctOptionIndex = 1;
              else if (letter === 'C') correctOptionIndex = 2;
              else if (letter === 'D') correctOptionIndex = 3;
              else {
                const num = parseInt(letter, 10);
                if (!isNaN(num) && num >= 0 && num < 4) {
                  correctOptionIndex = num;
                }
              }
            }

            return {
              tempId: crypto.randomUUID(),
              text: item.text.toString().trim(),
              options: options.map(o => o.toString().trim()),
              correctOptionIndex
            };
          });
        } else {
          // Parse CSV
          const rawLines = parseCSV(textContent);
          if (rawLines.length <= 1) {
            throw new Error('File CSV kosong atau hanya memiliki header.');
          }

          // Assume row 0 is header
          for (let i = 1; i < rawLines.length; i++) {
            const row = rawLines[i];
            if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

            const qText = row[0]?.trim();
            if (!qText) continue;

            const optA = row[1]?.trim() || 'Opsi A';
            const optB = row[2]?.trim() || 'Opsi B';
            const optC = row[3]?.trim() || 'Opsi C';
            const optD = row[4]?.trim() || 'Opsi D';

            const ansVal = row[5]?.trim() || 'A';
            let correctIdx = 0;
            const upperAns = ansVal.toUpperCase();
            if (upperAns === 'B' || upperAns === '1') correctIdx = 1;
            else if (upperAns === 'C' || upperAns === '2') correctIdx = 2;
            else if (upperAns === 'D' || upperAns === '3') correctIdx = 3;
            else if (upperAns === 'A' || upperAns === '0') correctIdx = 0;
            else {
              const parsedInt = parseInt(ansVal, 10);
              if (!isNaN(parsedInt) && parsedInt >= 0 && parsedInt < 4) {
                correctIdx = parsedInt;
              }
            }

            parsedQuestions.push({
              tempId: crypto.randomUUID(),
              text: qText,
              options: [optA, optB, optC, optD],
              correctOptionIndex: correctIdx
            });
          }
        }

        if (parsedQuestions.length === 0) {
          Swal.fire({
            title: 'Format Tidak Valid',
            text: 'Tidak dapat menemukan pertanyaan valid di file ini. Mohon gunakan template format JSON atau CSV.',
            icon: 'warning'
          });
          return;
        }

        Swal.fire({
          title: 'Konfirmasi Impor',
          text: `Ditemukan ${parsedQuestions.length} pertanyaan dari file ${fileType.toUpperCase()}. Apakah Anda ingin menimpa kuis saat ini atau menambahkannya?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Timpa Kuis',
          cancelButtonText: 'Tambahkan Saja',
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#10b981'
        }).then((result) => {
          if (result.isConfirmed) {
            setQuestions(parsedQuestions);
            Swal.fire('Impor Sukses', `Berhasil menggantikan kuis dengan ${parsedQuestions.length} pertanyaan baru.`, 'success');
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            setQuestions([...questions, ...parsedQuestions]);
            Swal.fire('Impor Sukses', `Berhasil menambahkan ${parsedQuestions.length} pertanyaan baru ke dalam kuis.`, 'success');
          }
        });

      } catch (err: any) {
        console.error(err);
        Swal.fire('Error', `Terjadi kesalahan saat memproses file: ${err.message || err}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, 'templates'), where('teacherId', '==', user?.uid));
      const snap = await getDocs(q);
      const list: QuizTemplate[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuizTemplate));
      setTemplates(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const saveAsTemplate = async () => {
    if (!title) {
      Swal.fire('Error', 'Please provide a title before saving as template', 'error');
      return;
    }

    const { value: name } = await Swal.fire({
      title: 'Save as Template',
      input: 'text',
      inputLabel: 'Template Name',
      inputValue: title,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'You need to write something!'
      }
    });

    if (!name) return;

    setSavingTemplate(true);
    try {
      const templateData = {
        name,
        title,
        description,
        timeLimit: Number(timeLimit),
        startDate,
        endDate,
        teacherId: user?.uid,
        questions: questions.map(q => ({
          text: q.text || '',
          options: q.options || ['', '', '', ''],
          correctOptionIndex: q.correctOptionIndex || 0,
          codeSnippet: q.codeSnippet || '',
          codeLanguage: q.codeLanguage || '',
          explanation: q.explanation || ''
        })),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'templates'), templateData);
      Swal.fire('Success', 'Template saved successfully!', 'success');
      fetchTemplates();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadTemplate = (template: QuizTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setTimeLimit(template.timeLimit);
    setStartDate(template.startDate || '');
    setEndDate(template.endDate || '');
    setQuestions(template.questions.map(q => ({ ...q, tempId: crypto.randomUUID() })));
    setShowTemplates(false);
    Swal.fire({
      title: 'Template Loaded',
      text: `Loaded values from "${template.name}"`,
      icon: 'success',
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false
    });
  };

  const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: 'Delete Template?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'templates', templateId));
        fetchTemplates();
        Swal.fire('Deleted!', 'Your template has been deleted.', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to delete template', 'error');
      }
    }
  };

  useEffect(() => {
    if (id) {
      const fetchQuiz = async () => {
        const quizDoc = await getDoc(doc(db, 'quizzes', id));
        if (quizDoc.exists()) {
          const quizData = quizDoc.data() as Quiz;
          setTitle(quizData.title);
          setDescription(quizData.description);
          setTimeLimit(quizData.timeLimit);
          setStartDate(quizData.startDate || '');
          setEndDate(quizData.endDate || '');

          const qSnap = await getDocs(collection(db, `quizzes/${id}/questions`));
          const qList: LocalQuestion[] = [];
          qSnap.forEach(d => qList.push({ id: d.id, tempId: d.id, ...d.data() }));
          if (qList.length > 0) setQuestions(qList);
        }
        setLoading(false);
      };
      fetchQuiz();
    }
  }, [id]);

  const addQuestion = () => {
    setQuestions([...questions, { tempId: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]);
  };

  const duplicateQuestion = (index: number) => {
    const qToDuplicate = questions[index];
    const newQuestion: LocalQuestion = {
      ...qToDuplicate,
      tempId: crypto.randomUUID(),
      id: undefined // Ensure it's treated as a new question on save
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, newQuestion);
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[qIndex].options || [])];
    options[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.tempId === active.id);
        const newIndex = items.findIndex((item) => item.tempId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (isNaN(timeLimit) || timeLimit <= 0) return "Time limit must be a positive number";
    if (questions.length === 0) return "At least one question is required";
    for (let i = 0; i < questions.length; i++) {
       if (!questions[i].text?.trim()) return `Question ${i + 1} text is required`;
       const options = questions[i].options || [];
       if (options.length < 2) return `Question ${i + 1} must have at least 2 options`;
       if (options.some(o => !o.trim())) return `All options for Question ${i + 1} must be filled`;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      Swal.fire('Validation Error', error, 'error');
      return;
    }

    setSaving(true);
    try {
      const quizData: any = {
        title,
        description,
        timeLimit: Number(timeLimit),
        startDate: startDate || null,
        endDate: endDate || null,
        teacherId: user?.uid,
        questionCount: questions.length
      };

      if (!id) {
        quizData.createdAt = new Date().toISOString();
      }

      let quizId = id;
      if (id) {
        await updateDoc(doc(db, 'quizzes', id), quizData);
      } else {
        const docRef = await addDoc(collection(db, 'quizzes'), quizData);
        quizId = docRef.id;
      }

      // Sync questions using a batch or manual updates
      // For simplicity in this example, we'll recreate them or update them
      // NOTE: In a production app, you might want to delete old questions correctly
      const questionsCol = collection(db, `quizzes/${quizId}/questions`);
      
      // Delete existing questions if editing
      if (id) {
        const existingDocs = await getDocs(questionsCol);
        for (const d of existingDocs.docs) {
          await deleteDoc(d.ref);
        }
      }

      for (const q of questions) {
        await addDoc(questionsCol, {
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          codeSnippet: q.codeSnippet || '',
          codeLanguage: q.codeLanguage || '',
          explanation: q.explanation || '',
          quizId
        });
      }

      localStorage.removeItem('lms_quiz_draft');
      Swal.fire('Success', `Quiz ${id ? 'updated' : 'created'} successfully!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save quiz.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32">
       <header className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="flex items-center w-full sm:w-auto gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{id ? 'Refine Asset' : 'Forge New Quiz'}</h1>
              {!id && lastSaved && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-950/45 text-[10px] font-black text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/30 uppercase tracking-widest leading-none mt-1 sm:mt-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Auto-saved: {lastSaved}
                </motion.span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 font-medium text-sm sm:text-base">Configure primary metadata and assessment logic.</p>
          </div>
        </div>
        {!id && (
          <button 
            type="button"
            onClick={() => setShowTemplates(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm uppercase tracking-widest text-xs"
          >
            <Layout className="w-4 h-4 mr-2" />
            Templates
          </button>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('quiz.title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Backend Architecture"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-bold placeholder:text-slate-300"
                required
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('quiz.description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a high-level overview of the assessment objectives..."
                rows={4}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-medium placeholder:text-slate-300 leading-relaxed"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-nowrap">{t('quiz.timeLimit')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  min={1}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-black"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('quiz.availability')}</label>
                </div>
                {/* Preset Jadwal Cepat */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 mr-1">Preset:</span>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule('always')}
                    className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all uppercase"
                  >
                    Selalu Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule('2hours')}
                    className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-all uppercase"
                  >
                    2 Jam Kuliah
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule('today')}
                    className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 transition-all uppercase"
                  >
                    Hari Ini (23:59)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule('24hours')}
                    className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 transition-all uppercase"
                  >
                    24 Jam
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-bold text-sm"
                  />
                  <span className="absolute -top-2 left-6 px-2 bg-white dark:bg-slate-900 text-[8px] font-black uppercase text-slate-400">{t('quiz.startTime')}</span>
                </div>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all dark:text-white font-bold text-sm"
                  />
                  <span className="absolute -top-2 left-6 px-2 bg-white dark:bg-slate-900 text-[8px] font-black uppercase text-slate-400">{t('quiz.endTime')}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium px-1">Atur jadwal mulai dan batas akhir kuis. Kosongkan jika kuis dapat dikerjakan kapan saja.</p>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Registry ({questions.length})</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTifBank(true)}
                className="inline-flex items-center px-5 py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-black rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95 uppercase tracking-widest text-xs"
                title="Muat Bank Soal Khusus Teknik Informatika (C++, Java, SQL, Python)"
              >
                <Code2 className="w-4 h-4 mr-2" />
                Bank Soal TIF
              </button>
              <button
                type="button"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="inline-flex items-center px-5 py-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95 uppercase tracking-widest text-xs"
              >
                <Sparkles className="w-4 h-4 mr-2 text-indigo-500 animate-pulse" />
                Gemini AI Builder
              </button>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-5 py-3 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-95 uppercase tracking-widest text-xs"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Soal
              </button>
            </div>
          </div>

          {/* Gemini AI Quiz Generator Section */}
          <AnimatePresence>
            {showAiPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative"
              >
                {/* Visual decoration overlay */}
                <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute left-10 bottom-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="p-8 sm:p-10 relative z-10 space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                        <Brain className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-wider text-indigo-450">Gemini AI Quiz Builder</h3>
                        <p className="text-slate-400 text-xs text-indigo-200">Rancang soal multiple-choice cerdas secara otomatis memakai model Gemini.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowAiPanel(false); setGeneratedPreview([]); }}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">Topik / Tema Utama</label>
                      <input
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="Contoh: Pemrograman C++, Query SQL, Struktur Data, dll..."
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all text-white font-bold text-sm placeholder:text-slate-500"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Rekomendasi TIF:</span>
                        {['Algoritma C++', 'Query SQL Relasional', 'OOP Java / Python', 'Jaringan Komputer', 'Frontend React & JS'].map((tChip) => (
                          <button
                            key={tChip}
                            type="button"
                            onClick={() => setAiTopic(tChip)}
                            className="px-2 py-0.5 rounded-md bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 text-[9px] font-bold border border-indigo-700/40 transition-colors"
                          >
                            + {tChip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">Jumlah Soal</label>
                        <select
                          value={aiCount}
                          onChange={(e) => setAiCount(Number(e.target.value))}
                          className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 focus:border-indigo-500 outline-none transition-all text-white font-bold text-sm"
                        >
                          <option value={3}>3 Soal</option>
                          <option value={5}>5 Soal</option>
                          <option value={8}>8 Soal</option>
                          <option value={10}>10 Soal</option>
                          <option value={12}>12 Soal</option>
                          <option value={15}>15 Soal</option>
                          <option value={18}>18 Soal</option>
                          <option value={20}>20 Soal</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">Bahasa</label>
                        <select
                          value={aiLanguage}
                          onChange={(e) => setAiLanguage(e.target.value as any)}
                          className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 focus:border-indigo-500 outline-none transition-all text-white font-bold text-sm"
                        >
                          <option value="id">Indonesia</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block flex justify-between">
                        <span>Materi / Konteks Teks Tambahan (Opsional)</span>
                        <span className="text-slate-500 text-[9px] lowercase">AI akan merujuk dokumen/materi yang ditempel</span>
                      </label>
                      <textarea
                        value={aiTextContext}
                        onChange={(e) => setAiTextContext(e.target.value)}
                        placeholder="Tempel ringkasan pelajaran atau teks artikel di sini untuk dijadikan sumber utama soal..."
                        rows={4}
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all text-white font-medium text-xs leading-relaxed placeholder:text-slate-550"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateAIQuestions}
                      className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-xs rounded-xl disabled:bg-slate-800 disabled:text-slate-555 transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-95 gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Memformulasi Soal...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-white animate-pulse" />
                          Rancang Soal dengan Gemini AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Loading Skeleton */}
                  {isGenerating && (
                    <div className="space-y-4 pt-6 border-t border-slate-800/80">
                      <div className="flex items-center space-x-2 text-indigo-400 font-black text-xs uppercase tracking-widest animate-pulse">
                        <Sparkles className="w-4 h-4" />
                        <span>Sintesis dan Formulasi Pengetahuan Sedang Berjalan...</span>
                      </div>
                      <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-2xl space-y-3">
                        <div className="h-4 bg-slate-800 rounded w-2/3 animate-pulse" />
                        <div className="h-3 bg-slate-800/80 rounded w-1/2 animate-pulse" />
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div className="h-10 bg-slate-850 rounded animate-pulse" />
                          <div className="h-10 bg-slate-850 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview generated questions */}
                  {generatedPreview.length > 0 && (
                    <div className="space-y-6 pt-8 border-t border-indigo-500/20">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <h4 className="text-sm font-black uppercase tracking-widest text-indigo-300 flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          Tinjau Hasil Formulasi ({generatedPreview.length} Soal)
                        </h4>
                        <p className="text-[10px] text-slate-450 font-medium">Beri tanda centang untuk opsi yang ingin Anda masukkan ke kuis.</p>
                      </div>

                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                        {generatedPreview.map((item, qIdx) => {
                          const isSelected = !!selectedPreviewIndexes[qIdx];
                          return (
                            <div
                              key={qIdx}
                              onClick={() => toggleSelectPreview(qIdx)}
                              className={`p-5 rounded-2xl border transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-950/30'
                                  : 'border-slate-800 bg-slate-900/30 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Soal {qIdx + 1}</span>
                                  <h5 className="text-sm font-bold text-white leading-relaxed">{item.text}</h5>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                                {item.options.map((opt: string, oIdx: number) => {
                                  const isCorrect = item.correctOptionIndex === oIdx;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center ${
                                        isCorrect
                                          ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
                                          : 'border-slate-800 bg-slate-950/30 text-slate-400'
                                      }`}
                                    >
                                      <span className="font-bold mr-2 uppercase">{String.fromCharCode(65 + oIdx)}.</span>
                                      {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                        <span className="text-xs font-bold text-indigo-300">
                          {generatedPreview.filter((_, i) => selectedPreviewIndexes[i]).length} soal terpilih untuk diintegrasikan.
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setGeneratedPreview([])}
                            className="px-5 py-3 border border-slate-800 hover:border-slate-705 bg-slate-900/60 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white"
                          >
                            Batalkan
                          </button>
                          <button
                            type="button"
                            onClick={injectSelectedAIQuestions}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/10 active:scale-95"
                          >
                            Integrasikan ke Kuis
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* JSON/CSV Template & Import Dashboard Component */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Import upload card (takes 2 cols on wide, 1 col on mobile) */}
            <div className="md:col-span-2">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-8 text-center rounded-[2rem] border-2 border-dashed transition-all duration-300 min-h-[180px] bg-white/40 dark:bg-slate-900/30 backdrop-blur-md ${
                  dragActive 
                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 scale-[1.01]' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input 
                  type="file" 
                  id="json-csv-file-upload" 
                  accept=".json, .csv"
                  onChange={handleFileChange}
                  className="hidden" 
                />
                
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl mb-4 text-indigo-600 dark:text-indigo-400">
                  <UploadCloud className="w-8 h-8" />
                </div>
                
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Seret & Lepas File Kuis JSON / CSV Anda
                </h3>
                
                <p className="text-slate-400 dark:text-slate-500 font-medium text-xs mt-1.5 max-w-sm">
                  Atau klik untuk memilih file dari komputer Anda. Mendukung file <code className="font-mono text-indigo-500 font-bold">.json</code> dan <code className="font-mono text-indigo-500 font-bold">.csv</code>.
                </p>

                <label 
                  htmlFor="json-csv-file-upload" 
                  className="mt-5 inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/15"
                >
                  Pilih File JSON / CSV
                </label>
              </div>
            </div>

            {/* Template Download card */}
            <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-[2rem] text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 transition-opacity group-hover:opacity-10">
                <FileSpreadsheet className="w-full h-full" />
              </div>
              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-500/10 rounded-full text-[8px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                  📥 Template Resmi
                </span>
                <h4 className="text-lg font-black tracking-tight uppercase leading-snug">
                  Template Import Soal Kuis
                </h4>
                <p className="text-slate-400 font-medium text-[11px] leading-relaxed">
                  Gunakan format JSON atau CSV standar kami untuk memasukkan puluhan soal kuis sekaligus ke dalam sistem secara mudah, cepat, dan instan.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={downloadJSONTemplate}
                  className="inline-flex items-center justify-center px-3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[9px] rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95 z-10 gap-1"
                >
                  <Download className="w-3 h-3" />
                  JSON Templ
                </button>
                <button 
                  type="button" 
                  onClick={downloadCSVTemplate}
                  className="inline-flex items-center justify-center px-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[9px] rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95 z-10 gap-1"
                >
                  <Download className="w-3 h-3" />
                  CSV Templ
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.tempId)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((q, qIndex) => (
                  <SortableQuestion
                    key={q.tempId}
                    q={q}
                    qIndex={qIndex}
                    removeQuestion={removeQuestion}
                    duplicateQuestion={duplicateQuestion}
                    updateQuestion={updateQuestion}
                    updateOption={updateOption}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
          <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 shadow-2xl flex items-center justify-between">
            <div className="px-4 hidden sm:flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-3"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Persistence Active</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={saving || savingTemplate}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-4 sm:py-5 bg-slate-800 text-slate-300 font-black rounded-xl sm:rounded-2xl hover:bg-slate-700 transition-all border border-white/5 disabled:opacity-50 uppercase tracking-widest text-[10px] sm:text-xs active:scale-95"
                title="Save structure as template"
              >
                {savingTemplate ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Copy className="w-4 h-4" />}
                <span className="ml-3 hidden md:inline">{t('quiz.saveTemplate')}</span>
              </button>
              <button
                disabled={saving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 sm:px-10 py-4 sm:py-5 bg-blue-600 text-white font-black rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px] sm:text-xs active:scale-95"
              >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 sm:mr-3" />
                  <span className="ml-2 sm:ml-0">{t('quiz.save')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>

      <AnimatePresence>
        {/* Modal Bank Soal Teknik Informatika */}
        {showTifBank && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTifBank(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bank Soal Teknik Informatika</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Pilih preset bank soal kurikulum TIF dengan potongan kode program siap pakai.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTifBank(false)}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                {TIF_QUESTION_BANKS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            {preset.badge}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {preset.category}
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{preset.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{preset.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadTifBankPreset(preset)}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
                      >
                        Gunakan Bank Soal Ini ({preset.questions.length} Soal)
                      </button>
                    </div>

                    {/* Preview first question snippet */}
                    {preset.questions[0]?.codeSnippet && (
                      <div className="pt-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Contoh Cuplikan Soal:</span>
                        <div className="p-3 bg-slate-950 rounded-xl text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-24">
                          <pre>{preset.questions[0].codeSnippet}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
        {/* Modal Template Blueprints */}
        {showTemplates && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplates(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Quiz Blueprints</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pilih template struktur kuis tersimpan.</p>
                </div>
                <button 
                  onClick={() => setShowTemplates(false)}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-4">
                {templates.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <Layout className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada blueprint tersimpan.</p>
                  </div>
                ) : (
                  templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full group p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-left hover:border-blue-600 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase group-hover:text-blue-600 transition-colors">{template.name}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium line-clamp-1">{template.title}</p>
                        <div className="flex items-center gap-4 mt-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                             {template.questions.length} Soal
                           </span>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                             {template.timeLimit} Menit
                           </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={(e) => deleteTemplate(template.id, e)}
                           className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                         <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-600 transition-all">
                           <ChevronRight className="w-5 h-5" />
                         </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableQuestion({ 
  q, 
  qIndex, 
  removeQuestion, 
  duplicateQuestion,
  updateQuestion, 
  updateOption 
}: { 
  q: LocalQuestion; 
  qIndex: number; 
  removeQuestion: (i: number) => void; 
  duplicateQuestion: (i: number) => void;
  updateQuestion: (i: number, f: string, v: any) => void; 
  updateOption: (qi: number, oi: number, v: string) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: q.tempId });

  const [showCode, setShowCode] = useState(!!q.codeSnippet);
  const [showExplanation, setShowExplanation] = useState(!!q.explanation);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-slate-300 transition-colors"
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          type="button"
          onClick={() => duplicateQuestion(qIndex)}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg sm:rounded-xl transition-all"
          title="Duplicate Question"
        >
          <CopyPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          type="button"
          onClick={() => removeQuestion(qIndex)}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg sm:rounded-xl transition-all"
          title="Remove Question"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-blue-600" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      <div className="flex items-start gap-4 sm:space-x-6 mb-6 mt-6 sm:mt-0">
        <span className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-xs sm:text-sm">
          {qIndex + 1 < 10 ? `0${qIndex + 1}` : qIndex + 1}
        </span>
        <div className="flex-grow space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Teks Soal</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !showCode;
                  setShowCode(next);
                  if (!next) {
                    updateQuestion(qIndex, 'codeSnippet', '');
                  } else if (!q.codeLanguage) {
                    updateQuestion(qIndex, 'codeLanguage', 'cpp');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  showCode 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showCode ? 'Snippet Kode Aktif' : '+ Kode Program (TIF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  showExplanation 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>💡 {showExplanation ? 'Pembahasan Aktif' : '+ Pembahasan'}</span>
              </button>
            </div>
          </div>
          <input
            type="text"
            value={q.text || ''}
            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
            placeholder="Tuliskan pertanyaan kuis di sini (misal: Apakah output dari program C++ berikut?)..."
            className="w-full text-lg sm:text-xl font-bold bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none pb-2 transition-colors dark:text-white placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Code Snippet Editor for TIF */}
      {showCode && (
        <div className="mb-6 p-4 sm:p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Code2 className="w-3.5 h-3.5" />
              Editor Potongan Kode Program (Syntax Highlighting)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bahasa:</span>
              <select
                value={q.codeLanguage || 'cpp'}
                onChange={(e) => updateQuestion(qIndex, 'codeLanguage', e.target.value)}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-mono font-bold outline-none"
              >
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="sql">SQL (Database)</option>
                <option value="javascript">JavaScript</option>
                <option value="php">PHP</option>
                <option value="csharp">C#</option>
                <option value="html">HTML / CSS</option>
              </select>
            </div>
          </div>
          <textarea
            value={q.codeSnippet || ''}
            onChange={(e) => updateQuestion(qIndex, 'codeSnippet', e.target.value)}
            rows={5}
            placeholder={`// Tuliskan potongan kode program di sini\n#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}`}
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-xs sm:text-sm leading-relaxed outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600 resize-y"
          />
        </div>
      )}

      {/* Explanation Field */}
      {showExplanation && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-1.5">
          <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
            💡 Pembahasan Soal / Kunci Penjelasan (Opsional, Ditampilkan saat Mahasiswa Review)
          </label>
          <input
            type="text"
            value={q.explanation || ''}
            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
            placeholder="Jelaskan alasan jawaban yang benar (misal: Karena loop berjalan dari i=0 sampai n-1)..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-200 text-xs font-medium outline-none"
          />
        </div>
      )}

      {/* Options Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {['A', 'B', 'C', 'D'].map((label, oIndex) => (
          <div key={label} className="relative">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                type="button"
                onClick={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)}
                className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center font-black transition-all relative ${
                  q.correctOptionIndex === oIndex
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                }`}
                title={`Pilih Opsi ${label} sebagai jawaban benar`}
              >
                {q.correctOptionIndex === oIndex ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 text-3xl sm:text-4xl">
                      {label}
                    </div>
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  </motion.div>
                ) : label}
              </button>
              <input
                type="text"
                value={q.options?.[oIndex] || ''}
                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                placeholder={`Opsi Jawaban ${label}`}
                className="flex-grow px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 outline-none transition-all dark:text-white font-bold placeholder:text-slate-300 text-sm sm:text-base"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
        <Info className="w-3.5 h-3.5 mr-2 text-blue-500" />
        Klik tombol huruf A, B, C, atau D untuk menentukan kunci jawaban yang benar.
      </div>
    </div>
  );
}
