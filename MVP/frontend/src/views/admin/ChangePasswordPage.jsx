// =============================================================================
// TIER 1 - ADMIN CHANGE PASSWORD PAGE
// Simple password change view for Administrator security compliance.
// Allows changing the password, and handles mandatory reset when password
// has not been updated for > 1 day.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeAdminPassword } from '../../api/authApi.js';
import { ApiError } from '../../api/apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ADMIN_TRANSLATIONS } from '../../locales/adminTranslations.js';

const INITIAL_FORM = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordPage() {
  const { currentAdmin, updateAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRequired = Boolean(currentAdmin?.require_password_change);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError('');
  }

  function validate() {
    const errors = {};
    if (!form.oldPassword.trim()) {
      errors.oldPassword = ADMIN_TRANSLATIONS.oldPasswordRequired;
    }
    if (!form.newPassword.trim()) {
      errors.newPassword = ADMIN_TRANSLATIONS.newPasswordRequired;
    } else if (form.newPassword.length < 6) {
      errors.newPassword = ADMIN_TRANSLATIONS.passwordMinLength;
    } else if (form.newPassword === form.oldPassword) {
      errors.newPassword = ADMIN_TRANSLATIONS.passwordMustDiffer;
    }

    if (!form.confirmPassword.trim()) {
      errors.confirmPassword = ADMIN_TRANSLATIONS.confirmPasswordRequired;
    } else if (form.confirmPassword !== form.newPassword) {
      errors.confirmPassword = ADMIN_TRANSLATIONS.passwordsDoNotMatch;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedProfile = await changeAdminPassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      if (updatedProfile) {
        updateAdmin(updatedProfile);
      }
      setSuccessMessage(ADMIN_TRANSLATIONS.changePasswordSuccess);
      setForm(INITIAL_FORM);

      // Brief delay before redirecting to allow user to read success message
      setTimeout(() => {
        navigate('/admin/pois', { replace: true });
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || ADMIN_TRANSLATIONS.genericSignInError);
      } else {
        setSubmitError(ADMIN_TRANSLATIONS.genericSignInError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-8 px-4 sm:px-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <header className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {ADMIN_TRANSLATIONS.changePasswordTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {ADMIN_TRANSLATIONS.changePasswordSubtitle}
          </p>
        </header>

        {isRequired && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"
          >
            <div className="flex items-start">
              <svg
                className="mr-2 h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{ADMIN_TRANSLATIONS.passwordExpiredNotice}</span>
            </div>
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="oldPassword"
              className="block text-sm font-medium text-slate-900"
            >
              {ADMIN_TRANSLATIONS.oldPasswordLabel} *
            </label>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              autoComplete="current-password"
              placeholder={ADMIN_TRANSLATIONS.oldPasswordPlaceholder}
              value={form.oldPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:outline-none disabled:bg-slate-50"
            />
            {fieldErrors.oldPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.oldPassword}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-slate-900"
            >
              {ADMIN_TRANSLATIONS.newPasswordLabel} *
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder={ADMIN_TRANSLATIONS.newPasswordPlaceholder}
              value={form.newPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:outline-none disabled:bg-slate-50"
            />
            {fieldErrors.newPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-900"
            >
              {ADMIN_TRANSLATIONS.confirmPasswordLabel} *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={ADMIN_TRANSLATIONS.confirmPasswordPlaceholder}
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 focus:outline-none disabled:bg-slate-50"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            {!isRequired && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {ADMIN_TRANSLATIONS.btnCancel}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting
                ? ADMIN_TRANSLATIONS.btnChangingPassword
                : ADMIN_TRANSLATIONS.btnChangePassword}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
