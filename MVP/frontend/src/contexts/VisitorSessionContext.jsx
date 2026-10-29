import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const VISITOR_STORAGE_KEYS = {
  SESSION_CODE: 'museum_visitor_session_code',
  SESSION_TOKEN: 'museum_visitor_session_token',
  EXPIRES_AT: 'museum_visitor_expires_at',
  LEGACY_CODE: 'visitor_session_code',
  LEGACY_TOKEN: 'visitor_session_token',
  LEGACY_EXPIRES: 'visitor_expires_at',
};

export const ACTIVATED_POIS_STORAGE_PREFIX = 'museum_activated_pois_';

const COUNTDOWN_INTERVAL_MS = 1000;

export function formatSessionCountdown(milliseconds) {
  if (!milliseconds || milliseconds <= 0) {
    return '0h 00m';
  }
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function shouldClearFromUrl() {
  if (typeof window === 'undefined' || !window.location?.search) {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('reset') === '1' ||
    params.get('reset') === 'true' ||
    params.get('clear') === '1' ||
    params.get('clear') === 'true' ||
    params.has('reset_session')
  );
}

function getStoredValue(primaryKey, fallbackKey) {
  if (typeof window === 'undefined' || !window.localStorage || shouldClearFromUrl()) {
    return '';
  }
  return (
    window.localStorage.getItem(primaryKey) ||
    window.localStorage.getItem(fallbackKey) ||
    ''
  );
}

function getStoredActivatedPois(code) {
  if (!code || typeof window === 'undefined' || !window.localStorage || shouldClearFromUrl()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(`${ACTIVATED_POIS_STORAGE_PREFIX}${code}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const defaultSessionState = {
  isUnlocked: false,
  sessionCode: '',
  sessionToken: '',
  expiresAt: null,
  timeRemaining: 0,
  formattedCountdown: '0h 00m',
  activatedPoiIds: [],
  markPoiActivated: () => {},
  isPoiActivated: () => false,
  activateSession: () => {},
  clearSession: () => {},
};

const VisitorSessionContext = createContext(null);

export function VisitorSessionProvider({ children }) {
  const [sessionCode, setSessionCode] = useState(() =>
    getStoredValue(
      VISITOR_STORAGE_KEYS.SESSION_CODE,
      VISITOR_STORAGE_KEYS.LEGACY_CODE
    )
  );

  const [sessionToken, setSessionToken] = useState(() =>
    getStoredValue(
      VISITOR_STORAGE_KEYS.SESSION_TOKEN,
      VISITOR_STORAGE_KEYS.LEGACY_TOKEN
    )
  );

  const [expiresAt, setExpiresAt] = useState(() => {
    const raw = getStoredValue(
      VISITOR_STORAGE_KEYS.EXPIRES_AT,
      VISITOR_STORAGE_KEYS.LEGACY_EXPIRES
    );
    if (!raw) return null;
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  });

  const [activatedPoiIds, setActivatedPoiIds] = useState(() =>
    getStoredActivatedPois(
      getStoredValue(
        VISITOR_STORAGE_KEYS.SESSION_CODE,
        VISITOR_STORAGE_KEYS.LEGACY_CODE
      )
    )
  );

  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, diff);
  });

  const clearSession = useCallback(() => {
    setSessionCode('');
    setSessionToken('');
    setExpiresAt(null);
    setTimeRemaining(0);
    setActivatedPoiIds([]);

    if (typeof window !== 'undefined' && window.localStorage) {
      if (sessionCode) {
        window.localStorage.removeItem(`${ACTIVATED_POIS_STORAGE_PREFIX}${sessionCode}`);
      }
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.SESSION_CODE);
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.SESSION_TOKEN);
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.EXPIRES_AT);
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.LEGACY_CODE);
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.LEGACY_TOKEN);
      window.localStorage.removeItem(VISITOR_STORAGE_KEYS.LEGACY_EXPIRES);
    }
  }, [sessionCode]);

  const activateSession = useCallback(
    ({ sessionCode: code, sessionToken: token, expiresAt: rawExpiry }) => {
      const codeVal = code || '';
      const tokenVal = token || '';
      const expiryDate = rawExpiry
        ? new Date(rawExpiry)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiryIso = isNaN(expiryDate.getTime())
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : expiryDate.toISOString();

      setSessionCode(codeVal);
      setSessionToken(tokenVal);
      setExpiresAt(expiryIso);

      const remaining = Math.max(0, new Date(expiryIso).getTime() - Date.now());
      setTimeRemaining(remaining);

      const storedActivated = getStoredActivatedPois(codeVal);
      setActivatedPoiIds(storedActivated);

      if (typeof window !== 'undefined' && window.localStorage) {
        if (codeVal) {
          window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_CODE, codeVal);
          window.localStorage.setItem(VISITOR_STORAGE_KEYS.LEGACY_CODE, codeVal);
        }
        if (tokenVal) {
          window.localStorage.setItem(VISITOR_STORAGE_KEYS.SESSION_TOKEN, tokenVal);
          window.localStorage.setItem(VISITOR_STORAGE_KEYS.LEGACY_TOKEN, tokenVal);
        }
        window.localStorage.setItem(VISITOR_STORAGE_KEYS.EXPIRES_AT, expiryIso);
        window.localStorage.setItem(VISITOR_STORAGE_KEYS.LEGACY_EXPIRES, expiryIso);
      }
    },
    []
  );

  const markPoiActivated = useCallback(
    (poiId) => {
      if (!poiId) return;
      const idStr = String(poiId);
      setActivatedPoiIds((prev) => {
        if (prev.includes(idStr)) return prev;
        const next = [...prev, idStr];
        if (sessionCode && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(
            `${ACTIVATED_POIS_STORAGE_PREFIX}${sessionCode}`,
            JSON.stringify(next)
          );
        }
        return next;
      });
    },
    [sessionCode]
  );

  const isPoiActivated = useCallback(
    (poiId) => {
      if (!poiId) return false;
      return activatedPoiIds.includes(String(poiId));
    },
    [activatedPoiIds]
  );

  // Interval timer for real-time countdown and automatic expiration
  useEffect(() => {
    // Check if URL requests a reset (e.g. ?reset=1 or ?reset_session=1)
    if (shouldClearFromUrl()) {
      clearSession();
      if (window.history?.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      return undefined;
    }

    if (!expiresAt || !sessionCode) {
      setTimeRemaining(0);
      return undefined;
    }

    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime) || expiryTime <= Date.now()) {
      clearSession();
      return undefined;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const diff = expiryTime - now;
      if (diff <= 0) {
        clearSession();
      } else {
        setTimeRemaining(diff);
      }
    };

    updateRemaining();
    const timerId = window.setInterval(updateRemaining, COUNTDOWN_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, [expiresAt, sessionCode, clearSession]);

  const isUnlocked = useMemo(() => {
    return Boolean(sessionCode) && timeRemaining > 0;
  }, [sessionCode, timeRemaining]);

  const formattedCountdown = useMemo(() => {
    return formatSessionCountdown(timeRemaining);
  }, [timeRemaining]);

  const contextValue = useMemo(
    () => ({
      isUnlocked,
      sessionCode,
      sessionToken,
      expiresAt,
      timeRemaining,
      formattedCountdown,
      activatedPoiIds,
      markPoiActivated,
      isPoiActivated,
      activateSession,
      clearSession,
    }),
    [
      isUnlocked,
      sessionCode,
      sessionToken,
      expiresAt,
      timeRemaining,
      formattedCountdown,
      activatedPoiIds,
      markPoiActivated,
      isPoiActivated,
      activateSession,
      clearSession,
    ]
  );

  return (
    <VisitorSessionContext.Provider value={contextValue}>
      {children}
    </VisitorSessionContext.Provider>
  );
}

export function useVisitorSession() {
  const context = useContext(VisitorSessionContext);
  return context || defaultSessionState;
}

export default VisitorSessionContext;
