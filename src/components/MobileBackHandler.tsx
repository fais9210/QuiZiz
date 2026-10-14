import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

/**
 * MobileBackHandler handles Android/phone hardware & gesture back button presses:
 * 1. Closes open modals (SweetAlert2 or UI modals) without exiting.
 * 2. When inside any subpage (quiz creation, calendar, settings, analytics, etc.),
 *    pressing back navigates back to /dashboard instead of closing/exiting the app.
 * 3. When on /dashboard, prevents instant exit by requiring a double-tap within 2s,
 *    showing a helpful native-app-style toast notification.
 */
export default function MobileBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressTime = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);

  useEffect(() => {
    // Ensure there is always a history stack state so pressing back can be intercepted
    // instead of instantly exiting the webview/PWA/browser
    const currentState = window.history.state;
    if (!currentState || currentState.lmsApp !== true) {
      window.history.pushState({ lmsApp: true, path: location.pathname }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      // 1. Check if SweetAlert2 modal is currently visible
      if (Swal.isVisible()) {
        Swal.close();
        window.history.pushState({ lmsApp: true, path: location.pathname }, '');
        return;
      }

      // 2. Check if any application modal or overlay is active (e.g. with [data-modal] or close buttons)
      const closeButtons = document.querySelectorAll<HTMLElement>('[data-close-modal="true"]');
      if (closeButtons.length > 0) {
        const activeCloseBtn = Array.from(closeButtons).find(btn => btn.offsetParent !== null);
        if (activeCloseBtn) {
          activeCloseBtn.click();
          window.history.pushState({ lmsApp: true, path: location.pathname }, '');
          return;
        }
      }

      const currentPath = window.location.pathname;

      // 3. If user is in a subpage (NOT dashboard and NOT initial entry pages like / or /login)
      if (currentPath !== '/dashboard' && currentPath !== '/' && currentPath !== '/login') {
        isNavigatingRef.current = true;
        // Navigate cleanly back to /dashboard
        navigate('/dashboard', { replace: true });
        window.history.pushState({ lmsApp: true, path: '/dashboard' }, '');
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 100);
        return;
      }

      // 4. If user IS on /dashboard:
      if (currentPath === '/dashboard') {
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
          // User pressed back twice within 2 seconds: allow standard exit
          window.history.back();
        } else {
          lastBackPressTime.current = now;
          // Re-push state so next back press is also captured
          window.history.pushState({ lmsApp: true, path: '/dashboard' }, '');

          // Show floating toast indicator
          const toastEl = document.getElementById('mobile-exit-toast');
          if (toastEl) {
            toastEl.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
            toastEl.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => {
              toastEl.classList.remove('opacity-100', 'translate-y-0');
              toastEl.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
            }, 2000);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, navigate]);

  return (
    <div
      id="mobile-exit-toast"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-xs sm:text-sm font-bold rounded-full shadow-2xl backdrop-blur-md opacity-0 pointer-events-none translate-y-4 transition-all duration-300 flex items-center gap-2 border border-white/10 dark:border-slate-800/20"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      <span>Tekan tombol kembali sekali lagi untuk keluar</span>
    </div>
  );
}
