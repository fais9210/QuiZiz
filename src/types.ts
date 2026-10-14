import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  logoUrl?: string;
  preferredLanguage?: 'en' | 'id';
  username?: string;
  password?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // in minutes
  teacherId: string;
  teacherUsername?: string;
  teacherName?: string;
  createdAt: string;
  questionCount: number;
  startDate?: string;
  endDate?: string;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  options: string[]; // Exactly 4 options
  correctOptionIndex: number; // 0, 1, 2, 3
  codeSnippet?: string; // Optional code block for programming questions
  codeLanguage?: string; // Optional language: cpp, java, python, sql, javascript, php
  explanation?: string; // Optional explanation / discussion of the solution
}

export interface Result {
  id: string;
  quizId: string;
  quizTitle: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  isGuest?: boolean;
  guestName?: string;
  score: number; // 0-100
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  timeSpentSeconds: number;
  tabSwitchViolations?: number;
  disqualified?: boolean;
  disqualifiedReason?: string;
}

export interface QuizTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  timeLimit: number;
  teacherId: string;
  questions: Omit<Question, 'id' | 'quizId'>[];
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithCredentials: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
