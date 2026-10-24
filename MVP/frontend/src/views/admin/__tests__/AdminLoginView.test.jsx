import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { login: vi.fn(), isAuthenticated: false },
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: () => mockAuthState }));

import AdminLoginView from '../AdminLoginView.jsx';
import { ApiError } from '../../../api/apiClient.js';

function renderLoginView() {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginView />} />
        <Route path="/admin" element={<div>Admin Workspace Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLoginView', () => {
  beforeEach(() => {
    mockAuthState.login = vi.fn();
    mockAuthState.isAuthenticated = false;
  });

  it('renders the credential fields and the submit button', () => {
    renderLoginView();

    expect(screen.getByLabelText('Username or Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('blocks submission and shows field errors when both fields are empty', async () => {
    const user = userEvent.setup();
    renderLoginView();

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Username or email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(mockAuthState.login).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials to the auth context', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockResolvedValue({ id: 1 });
    renderLoginView();

    await user.type(screen.getByLabelText('Username or Email'), '  admin@cuchi.vn  ');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mockAuthState.login).toHaveBeenCalledWith({
      username: 'admin@cuchi.vn',
      password: 'secret-pass',
    });
  });

  it('shows the generic error, keeps the username and clears the password on HTTP 401', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid username or password' }),
    );
    renderLoginView();

    const usernameInput = screen.getByLabelText('Username or Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
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

    await user.type(screen.getByLabelText('Username or Email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in right now');
  });

  it('clears the previous error while the administrator retypes credentials', async () => {
    const user = userEvent.setup();
    mockAuthState.login.mockRejectedValue(new ApiError({ status: 401 }));
    renderLoginView();

    await user.type(screen.getByLabelText('Username or Email'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Password'), 'a');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('redirects to the admin workspace once the administrator is authenticated', async () => {
    mockAuthState.isAuthenticated = true;

    renderLoginView();

    await waitFor(() => expect(screen.getByText('Admin Workspace Stub')).toBeInTheDocument());
  });
});
