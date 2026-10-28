// =============================================================================
// TIER 1 - ADMIN LOGIN VIEW
// Desktop-first Administrator authentication screen (US 02.1, US 02.2 & US 02.3).
// Presentation only: all network work is delegated to AuthContext -> authApi.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LOGOUT_REASON_IDLE, useAuth } from '../../contexts/AuthContext.jsx';
import { ApiError } from '../../api/apiClient.js';
import AccountLockoutModal, {
  LOCKOUT_STORAGE_KEY,
} from '../../components/admin/AccountLockoutModal.jsx';

const ADMIN_WORKSPACE_PATH = '/admin';
// AC-02.3.2: explains the unsolicited bounce back to the login screen.
const IDLE_TIMEOUT_MESSAGE =
  'Your session expired after 30 minutes of inactivity. Please sign in again.';
// Generic message prevents user enumeration (AC-02.1.4).
const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';
const GENERIC_SIGN_IN_ERROR_MESSAGE = 'Unable to sign in right now. Please try again later.';
const HTTP_UNAUTHORIZED = 401;
const HTTP_LOCKED = 423;

const INITIAL_FORM_VALUES = { username: '', password: '' };

function resolveLoginErrorMessage(loginError) {
  if (loginError instanceof ApiError && loginError.status === HTTP_UNAUTHORIZED) {
    return INVALID_CREDENTIALS_MESSAGE;
  }
  return GENERIC_SIGN_IN_ERROR_MESSAGE;
}

export default function AdminLoginView() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const currentLocation = useLocation();

  const passwordInputRef = useRef(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(900);

  const redirectPath = currentLocation.state?.from ?? ADMIN_WORKSPACE_PATH;
  const isIdleTimeoutNotice = currentLocation.state?.reason === LOGOUT_REASON_IDLE;

  // AC-02.2.3: Check if browser session has an active lockout stored
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (stored) {
        const unlockAt = parseInt(stored, 10);
        const remaining = Math.ceil((unlockAt - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSeconds(remaining);
          setIsLocked(true);
        } else {
          sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        }
      }
    } catch {
      // Storage access handled gracefully
    }
  }, []);

  // Reactive redirect: fires as soon as authentication state flips to unlocked.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
    setFieldErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
    setSubmitError('');
  }

  function validateForm() {
    const validationErrors = {};
    if (!formValues.username.trim()) {
      validationErrors.username = 'Username or email is required.';
    }
    if (!formValues.password) {
      validationErrors.password = 'Password is required.';
    }
    return validationErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isLocked) {
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await login({ username: formValues.username.trim(), password: formValues.password });
    } catch (loginError) {
      // AC-02.2.2 & AC-02.2.3: Catch HTTP 423 Locked and trigger countdown modal
      if (loginError instanceof ApiError && loginError.status === HTTP_LOCKED) {
        const retryAfter =
          loginError.details?.retry_after_seconds ||
          loginError.retry_after_seconds ||
          900;
        setLockoutSeconds(retryAfter);
        setIsLocked(true);
        setSubmitError('');
      } else {
        // AC-02.1.4: retain the username, wipe the password, refocus the password field.
        setFormValues((previousValues) => ({ ...previousValues, password: '' }));
        setSubmitError(resolveLoginErrorMessage(loginError));
        passwordInputRef.current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Administrator Sign In</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage exhibits, multilingual guides, and site telemetry.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* AC-02.3.2: the browser was bounced here by the idle timer, not by
              the Administrator, so the redirect is explained before the fields. */}
          {isIdleTimeoutNotice && (
            <p
              role="status"
              data-testid="idle-timeout-notice"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {IDLE_TIMEOUT_MESSAGE}
            </p>
          )}

          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {submitError}
            </p>
          )}

          <div>
            <label htmlFor="admin-username" className="block text-sm font-medium text-slate-900">
              Username or Email
            </label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              value={formValues.username}
              onChange={handleInputChange}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'admin-username-error' : undefined}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-slate-800 focus:outline-none"
            />
            {fieldErrors.username && (
              <p id="admin-username-error" className="mt-1 text-xs text-red-700">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-900">
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              ref={passwordInputRef}
              value={formValues.password}
              onChange={handleInputChange}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 focus:border-slate-800 focus:outline-none"
            />
            {fieldErrors.password && (
              <p id="admin-password-error" className="mt-1 text-xs text-red-700">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className="h-11 w-full rounded-md bg-slate-800 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Signing in...' : isLocked ? 'Account Locked' : 'Sign In'}
          </button>
        </form>
      </section>

      {/* US 02.2: Brute-Force Lockout Countdown Modal */}
      <AccountLockoutModal
        isOpen={isLocked}
        retryAfterSeconds={lockoutSeconds}
        onUnlock={() => setIsLocked(false)}
        onClose={() => setIsLocked(false)}
      />
    </main>
  );
}
