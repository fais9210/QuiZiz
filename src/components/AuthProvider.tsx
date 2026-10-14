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

    // Migrate legacy 'lms_mock_teacher' to real user 'fais'
    if (localStorage.getItem('lms_mock_teacher') === 'true') {
      localStorage.removeItem('lms_mock_teacher');
      localStorage.setItem('lms_custom_user_uid', 'fais');
    }

    // Check if custom user is logged in
    const cachedUserUid = localStorage.getItem('lms_custom_user_uid');
    if (cachedUserUid) {
      const targetUid = cachedUserUid === 'mock-teacher-fais' ? 'fais' : cachedUserUid;
      if (targetUid !== cachedUserUid) {
        localStorage.setItem('lms_custom_user_uid', 'fais');
      }

      unsubscribeProfile = onSnapshot(doc(db, 'users', targetUid), (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.data() as UserProfile;
          const currentUser: any = {
            uid: profileData.uid || targetUid,
            displayName: profileData.displayName,
            email: profileData.email,
            emailVerified: true
          };
          setUser(currentUser);
          setProfile(profileData);
          if (profileData.preferredLanguage) {
            i18n.changeLanguage(profileData.preferredLanguage);
          }
        } else if (targetUid === 'fais') {
          const faisProfile: UserProfile = {
            uid: 'fais',
            displayName: 'Muhammad Faishol Amrulloh',
            email: 'faishol16@gmail.com',
            username: 'fais',
            role: 'teacher',
            createdAt: new Date().toISOString()
          };
          setUser({
            uid: 'fais',
            displayName: faisProfile.displayName,
            email: faisProfile.email,
            emailVerified: true
          } as any);
          setProfile(faisProfile);
        } else {
          localStorage.removeItem('lms_custom_user_uid');
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching cached profile:", error);
        if (targetUid === 'fais') {
          const faisProfile: UserProfile = {
            uid: 'fais',
            displayName: 'Muhammad Faishol Amrulloh',
            email: 'faishol16@gmail.com',
            username: 'fais',
            role: 'teacher',
            createdAt: new Date().toISOString()
          };
          setUser({
            uid: 'fais',
            displayName: faisProfile.displayName,
            email: faisProfile.email,
            emailVerified: true
          } as any);
          setProfile(faisProfile);
        }
        setLoading(false);
      });

      return () => {
        if (unsubscribeProfile) unsubscribeProfile();
      };
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

  const loginAsFais = () => {
    const faisProfile: UserProfile = {
      uid: 'fais',
      displayName: 'Muhammad Faishol Amrulloh',
      email: 'faishol16@gmail.com',
      username: 'fais',
      role: 'teacher',
      createdAt: new Date().toISOString()
    };
    const userObj: any = {
      uid: 'fais',
      displayName: 'Muhammad Faishol Amrulloh',
      email: 'faishol16@gmail.com',
      emailVerified: true
    };
    setUser(userObj);
    setProfile(faisProfile);
    localStorage.removeItem('lms_mock_teacher');
    localStorage.setItem('lms_custom_user_uid', 'fais');
    return true;
  };

  const signInWithCredentials = async (username: string, password: string): Promise<boolean> => {
    const inputUsername = username.trim().toLowerCase();

    // 1. Try querying Firestore users collection
    try {
      const { getDocs, getDoc, query, collection, where } = await import('firebase/firestore');
      
      let matchedProfile: UserProfile | null = null;

      // Direct document lookup by ID
      const directDoc = await getDoc(doc(db, 'users', inputUsername));
      if (directDoc.exists()) {
        const data = directDoc.data() as UserProfile;
        if (data.password === password) {
          matchedProfile = { ...data, uid: data.uid || directDoc.id };
        }
      }

      // If not found by doc id, query by username field
      if (!matchedProfile) {
        const q = query(collection(db, 'users'), where('username', '==', inputUsername));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((d) => {
          const data = d.data() as UserProfile;
          if (data.password === password) {
            matchedProfile = { ...data, uid: data.uid || d.id };
          }
        });
      }

      if (matchedProfile) {
        localStorage.removeItem('lms_mock_teacher');
        localStorage.setItem('lms_custom_user_uid', (matchedProfile as UserProfile).uid);

        const activeUser: any = {
          uid: (matchedProfile as UserProfile).uid,
          displayName: (matchedProfile as UserProfile).displayName,
          email: (matchedProfile as UserProfile).email,
          emailVerified: true
        };

        setUser(activeUser);
        setProfile(matchedProfile);
        return true;
      }

      // 2. Fallback check for default lecturer 'fais'
      if (inputUsername === 'fais') {
        if (password === 'fais123') {
          return loginAsFais();
        } else {
          throw new Error('Password salah. Silakan coba lagi.');
        }
      }

      throw new Error('Username atau password tidak cocok.');
    } catch (e: any) {
      if (inputUsername === 'fais' && password === 'fais123') {
        return loginAsFais();
      }
      console.error("Credentials login error:", e);
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
