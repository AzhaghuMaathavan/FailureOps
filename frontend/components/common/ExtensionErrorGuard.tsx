'use client';

import React, { useEffect } from 'react';

// Intercept console.error at module load time on the client before React's dev overlay captures extension warnings
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      message.includes('bis_skin_checked') ||
      message.includes('__processed_') ||
      message.includes("reading 'M_ID'") ||
      message.includes('eppiocemhmnlbhjplcgkofciiegomcon') ||
      message.includes('chrome-extension://')
    ) {
      // Suppress extension DOM attribute and script injection noise
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export const ExtensionErrorGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const filename = event.filename || '';
      const message = event.message || '';
      const stack = event.error?.stack || '';

      const isExtensionError =
        filename.startsWith('chrome-extension://') ||
        filename.startsWith('moz-extension://') ||
        filename.startsWith('safari-extension://') ||
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://') ||
        message.includes("reading 'M_ID'") ||
        message.includes('bis_skin_checked') ||
        message.includes('eppiocemhmnlbhjplcgkofciiegomcon');

      if (isExtensionError) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString?.() || '';
      const stack = event.reason?.stack || '';

      if (
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://') ||
        reason.includes("reading 'M_ID'") ||
        reason.includes('bis_skin_checked') ||
        reason.includes('eppiocemhmnlbhjplcgkofciiegomcon')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  return <>{children}</>;
};
