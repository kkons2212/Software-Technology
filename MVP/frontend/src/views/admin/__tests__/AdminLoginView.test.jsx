import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { login: vi.fn(), isAuthenticated: false },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  LOGOUT_REASON_IDLE: 'IDLE_TIMEOUT',
  useAuth: () => mockAuthState,
}));

import AdminLoginView from '../AdminLoginView.jsx';
import { ApiError } from '../../../api/apiClient.js';
import { LOCKOUT_STORAGE_KEY } from '../../../components/admin/AccountLockoutModal.jsx';
import { ADMIN_TRANSLATIONS } from '../../../locales/adminTranslations.js';

function renderLoginView({ state } = {}) {
  const initialEntry = state ? { pathname: '/admin/login', state } : '/admin/login';

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginView />} />
        <Route path="/admin" element={<div>Admin Workspace Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLoginView', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockAuthState.login = vi.fn();
    mockAuthState.isAuthenticated = false;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders the credential fields and the submit button', () => {
    renderLoginView();

    expect(screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail)).toBeInTheDocument();
    expect(screen.getByLabelText(ADMIN_TRANSLATIONS.password)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn })).toBeInTheDocument();
  });

  it('blocks submission and shows field errors when both fields are empty', async () => {
    const user = userEvent.setup();
    renderLoginView();

    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));

    expect(await screen.findByText(ADMIN_TRANSLATIONS.usernameRequired)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_TRANSLATIONS.passwordRequired)).toBeInTheDocument();
    expect(mockAuthState.login).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials to the auth context', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockResolvedValue({ id: 1 });
    renderLoginView();

    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail), '  admin@cuchi.vn  ');
    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.password), 'secret-pass');
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));

    expect(mockAuthState.login).toHaveBeenCalledWith({
      username: 'admin@cuchi.vn',
      password: 'secret-pass',
    });
  });

  it('shows the generic error, keeps the username and clears the password on HTTP 401', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHORIZED', message: ADMIN_TRANSLATIONS.invalidCredentials }),
    );
    renderLoginView();

    const usernameInput = screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail);
    const passwordInput = screen.getByLabelText(ADMIN_TRANSLATIONS.password);

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'wrong-pass');
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));

    expect(await screen.findByRole('alert')).toHaveTextContent(ADMIN_TRANSLATIONS.invalidCredentials);
    expect(usernameInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('');
    expect(passwordInput).toHaveFocus();
  });

  it('shows a generic error message for non-authentication failures', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(
      new ApiError({ status: 500, code: 'SERVER_ERROR', message: 'Boom' }),
    );
    renderLoginView();

    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail), 'admin');
    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.password), 'pw');
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));

    expect(await screen.findByRole('alert')).toHaveTextContent(ADMIN_TRANSLATIONS.genericSignInError);
  });

  it('clears the previous error while the administrator retypes credentials', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(new ApiError({ status: 401 }));
    renderLoginView();

    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail), 'admin');
    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.password), 'pw');
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.password), 'a');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('redirects to the admin workspace once the administrator is authenticated', async () => {
    mockAuthState.isAuthenticated = true;

    renderLoginView();

    await waitFor(() => expect(screen.getByText('Admin Workspace Stub')).toBeInTheDocument());
  });

  it('catches HTTP 423 Locked and triggers lockout countdown modal while disabling submit button', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(
      new ApiError({
        status: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked',
        details: { retry_after_seconds: 900 },
      }),
    );

    renderLoginView();

    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.usernameOrEmail), 'admin');
    await user.type(screen.getByLabelText(ADMIN_TRANSLATIONS.password), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: ADMIN_TRANSLATIONS.signIn }));

    expect(
      await screen.findByRole('heading', { level: 2, name: new RegExp(ADMIN_TRANSLATIONS.lockoutTitle, 'i') }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('lockout-countdown')).toHaveTextContent('15:00');
    expect(screen.getByRole('button', { name: new RegExp(ADMIN_TRANSLATIONS.accountLocked, 'i') })).toBeDisabled();
  });

  it('explains the redirect when the session expired from inactivity', () => {
    renderLoginView({ state: { from: '/admin/pois', reason: 'IDLE_TIMEOUT' } });

    expect(screen.getByTestId('idle-timeout-notice')).toHaveTextContent(
      '30 phút không hoạt động',
    );
  });

  it('omits the idle notice after a deliberate sign-out', () => {
    renderLoginView({ state: { from: '/admin/pois', reason: 'MANUAL' } });

    expect(screen.queryByTestId('idle-timeout-notice')).not.toBeInTheDocument();
  });

  it('restores lockout state from sessionStorage on page load', () => {
    const futureUnlock = Date.now() + 600 * 1000; // 10 minutes from now
    sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(futureUnlock));

    renderLoginView();

    expect(
      screen.getByRole('heading', { level: 2, name: new RegExp(ADMIN_TRANSLATIONS.lockoutTitle, 'i') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(ADMIN_TRANSLATIONS.accountLocked, 'i') })).toBeDisabled();
  });
});
