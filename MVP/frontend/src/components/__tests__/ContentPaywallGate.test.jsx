import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ContentPaywallGate from '../ContentPaywallGate.jsx';

describe('ContentPaywallGate (TSK-06.4.3 & AC-06.4.3)', () => {
  afterEach(cleanup);

  it('renders locked paywall with teaser and unlock CTA button when unpaid', () => {
    const handleUnlock = vi.fn();
    render(
      <ContentPaywallGate
        isUnlocked={false}
        shortDescription="Cu Chi Tunnels served as a strategic underground base during the war."
        fullDescription="Complete 50-page historical transcript of the Cu Chi underground network."
        onUnlock={handleUnlock}
      />
    );

    const gate = screen.getByTestId('content-paywall-gate');
    expect(gate).toBeInTheDocument();
    expect(screen.getByText(/Cu Chi Tunnels served as a strategic/i)).toBeInTheDocument();
    expect(screen.queryByText(/Complete 50-page historical transcript/i)).not.toBeInTheDocument();

    const unlockBtn = screen.getByTestId('paywall-unlock-btn');
    expect(unlockBtn).toBeInTheDocument();
    expect(unlockBtn).toHaveTextContent(/Unlock Full Story/i);

    fireEvent.click(unlockBtn);
    expect(handleUnlock).toHaveBeenCalledOnce();
  });

  it('renders full narrative content without paywall gate when unlocked', () => {
    render(
      <ContentPaywallGate
        isUnlocked={true}
        shortDescription="Teaser text..."
        fullDescription="Full detailed chronicle unlocked for authorized visitor session."
        onUnlock={vi.fn()}
      />
    );

    expect(screen.queryByTestId('content-paywall-gate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('paywall-unlock-btn')).not.toBeInTheDocument();

    const unlockedContainer = screen.getByTestId('content-unlocked');
    expect(unlockedContainer).toBeInTheDocument();
    expect(screen.getByText(/Full detailed chronicle unlocked/i)).toBeInTheDocument();
  });

  it('falls back gracefully to short description if full description is absent when unlocked', () => {
    render(
      <ContentPaywallGate
        isUnlocked={true}
        shortDescription="Only short description exists."
        fullDescription=""
        onUnlock={vi.fn()}
      />
    );

    expect(screen.getByText('Only short description exists.')).toBeInTheDocument();
  });

  it('renders default fallback teaser if short description is missing when locked', () => {
    render(
      <ContentPaywallGate
        isUnlocked={false}
        shortDescription=""
        fullDescription=""
        onUnlock={vi.fn()}
      />
    );

    expect(screen.getByText('Historical chronicle preview...')).toBeInTheDocument();
  });
});

