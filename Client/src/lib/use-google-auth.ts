import { useCallback, useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/api.config';

/**
 * Minimal type declarations for Google Identity Services.
 * Only the parts we actually use are typed here.
 */
interface GoogleCredentialResponse {
  credential: string; // The ID token
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          revoke: (hint: string, callback?: () => void) => void;
        };
      };
    };
  }
}

const SCRIPT_ID = 'google-gis-script';

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      // Script tag exists but hasn't loaded yet — wait for it
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

interface UseGoogleAuthOptions {
  onToken: (idToken: string) => void;
}

export function useGoogleAuth({ onToken }: UseGoogleAuthOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled) return;

        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            onTokenRef.current(response.credential);
          },
          cancel_on_tap_outside: true,
        });

        setIsReady(true);
      })
      .catch((err) => {
        console.error('[Google Auth]', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const promptGoogleSignIn = useCallback(() => {
    if (!window.google?.accounts?.id) return;

    setIsLoading(true);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was blocked (e.g. user dismissed previously, or popup blocked).
        // Fall back to rendering button will be handled by the component.
        setIsLoading(false);
      }
    });
  }, []);

  return { isReady, isLoading, setIsLoading, promptGoogleSignIn };
}
