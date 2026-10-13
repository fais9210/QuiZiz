import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AuthContextType, UserProfile, UserRole } from '../types';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Check if custom mock user is logged in
    const cachedUserUid = localStorage.getItem('lms_custom_user_uid');
    if (cachedUserUid) {
      unsubscribeProfile = onSnapshot(doc(db, 'users', cachedUserUid), (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.data() as UserProfile;
          const mockUser: any = {
            uid: profileData.uid,
            displayName: profileData.displayName,
            email: profileData.email,
            emailVerified: true
          };
          setUser(mockUser);
          setProfile(profileData);
          if (profileData.preferredLanguage) {
            i18n.changeLanguage(profileData.preferredLanguage);
          }
        } else {
          localStorage.removeItem('lms_custom_user_uid');
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching cached profile:", error);
        setLoading(false);
      });

      return () => {
        if (unsubscribeProfile) unsubscribeProfile();
      };
    }

    // Check if mock teacher is logged in
    const isMockTeacher = localStorage.getItem('lms_mock_teacher') === 'true';
    if (isMockTeacher) {
      const mockUser: any = {
        uid: 'mock-teacher-fais',
        displayName: 'Fais (Dosen)',
        email: 'fais@lms-tif.id',
        emailVerified: true
      };
      const mockProfile: UserProfile = {
        uid: 'mock-teacher-fais',
        displayName: 'Fais',
        email: 'fais@lms-tif.id',
        role: 'teacher',
        createdAt: new Date().toISOString()
      };
      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // Listen for profile changes
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data() as UserProfile;
            setProfile(profileData);
            if (profileData.preferredLanguage) {
              i18n.changeLanguage(profileData.preferredLanguage);
            }
          } else {
            // Profile doesn't exist, create it (this is likely a first-time sign-in)
            const isQuizLink = window.location.pathname.includes('/quizzes/take/') || 
                              sessionStorage.getItem('lumina_pending_quiz') === 'true';
            
            let selectedRole: UserRole = 'student';

            if (!isQuizLink) {
              const { value: role } = await Swal.fire({
                title: 'Welcome!',
                text: 'Are you a Teacher or a Student?',
                icon: 'question',
                showCancelButton: false,
                confirmButtonText: 'Teacher',
                denyButtonText: 'Student',
                showDenyButton: true,
                allowOutsideClick: false,
              });
              selectedRole = role ? 'teacher' : 'student';
            }
            
            sessionStorage.removeItem('lumina_pending_quiz');

            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'User',
              email: user.email || '',
              role: selectedRole,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            // onSnapshot will pick this up
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [i18n]);

  const loginWithMockTeacher = () => {
    const mockUser: any = {
      uid: 'mock-teacher-fais',
      displayName: 'Fais (Dosen)',
      email: 'fais@lms-tif.id',
      emailVerified: true
    };
    const mockProfile: UserProfile = {
      uid: 'mock-teacher-fais',
      displayName: 'Fais',
      email: 'fais@lms-tif.id',
      role: 'teacher',
      createdAt: new Date().toISOString()
    };
    setUser(mockUser);
    setProfile(mockProfile);
    localStorage.setItem('lms_mock_teacher', 'true');
    return true;
  };

  const signInWithCredentials = async (username: string, password: string): Promise<boolean> => {
    const inputUsername = username.trim().toLowerCase();

    // 1. Check if login is the default Fais lecturer login
    if (inputUsername === 'fais') {
      if (password !== 'fais123') {
        throw new Error('Password tidak valid.');
      }

      const email = 'fais@lms-tif.id';
      try {
        localStorage.removeItem('lms_mock_teacher');
        localStorage.removeItem('lms_custom_user_uid');
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (error: any) {
        console.warn('Sign-in with email failed:', error.code, error.message);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            const newProfile: UserProfile = {
              uid: newUser.uid,
              displayName: 'Fais',
              email: email,
              role: 'teacher',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', newUser.uid), newProfile);
            return true;
          } catch (createError: any) {
            console.error('Failed to create teacher user in FB:', createError);
            if (createError.code === 'auth/operation-not-allowed') {
              console.warn('Email/Password not enabled in Firebase Console. Falling back to frontend-only mock.');
              return loginWithMockTeacher();
            }
            throw createError;
          }
        } else if (error.code === 'auth/operation-not-allowed') {
          console.warn('Email/Password not enabled in Firebase Console. Falling back to frontend-only mock.');
          return loginWithMockTeacher();
        } else {
          throw error;
        }
      }
    }

    // 2. Query Firestore for credentials matching username
    try {
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('username', '==', inputUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User tidak ditemukan. Periksa kembali username Anda.');
      }

      let matchedProfile: UserProfile | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (data.password === password) {
          matchedProfile = data;
        }
      });

      if (!matchedProfile) {
        throw new Error('Password salah atau tidak valid.');
      }

      // Record custom mock user session
      localStorage.removeItem('lms_mock_teacher');
      localStorage.setItem('lms_custom_user_uid', (matchedProfile as UserProfile).uid);

      const mockUser: any = {
        uid: (matchedProfile as UserProfile).uid,
        displayName: (matchedProfile as UserProfile).displayName,
        email: (matchedProfile as UserProfile).email,
        emailVerified: true
      };

      setUser(mockUser);
      setProfile(matchedProfile);
      return true;
    } catch (e: any) {
      console.error("Credentials login failed:", e);
      throw e;
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      localStorage.removeItem('lms_mock_teacher');
      localStorage.removeItem('lms_custom_user_uid');
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error', error);
      Swal.fire('Error', 'Failed to sign in with Google.', 'error');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('lms_mock_teacher');
    localStorage.removeItem('lms_custom_user_uid');
    await firebaseSignOut(auth);
  };

  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInWithCredentials, signOut, isTeacher, isStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
