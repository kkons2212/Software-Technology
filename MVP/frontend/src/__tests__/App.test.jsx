import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App.jsx';

describe('App Component', () => {
  it('renders application header and title', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Cu Chi Tunnels - Smart Audio Guide/i);
  });

  it('renders main introduction text', () => {
    render(<App />);
    expect(
      screen.getByText(/Interactive Map & Multilingual Audio Guide System initialized/i)
    ).toBeInTheDocument();
  });
});
