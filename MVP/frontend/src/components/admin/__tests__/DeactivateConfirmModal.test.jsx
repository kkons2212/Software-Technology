import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DeactivateConfirmModal from '../DeactivateConfirmModal.jsx';

describe('DeactivateConfirmModal Component (US 03.3)', () => {
  const activePoi = {
    poi_id: 'poi-101',
    title: 'Secret Trapdoor Bunkers',
    is_active: true,
  };

  const hiddenPoi = {
    poi_id: 'poi-102',
    title: 'Hoang Cam Field Stove',
    is_active: false,
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DeactivateConfirmModal
        isOpen={false}
        poi={activePoi}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when poi is null', () => {
    const { container } = render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders deactivation dialog when exhibit is active', () => {
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hide Exhibit from Visitor Map')).toBeInTheDocument();
    expect(screen.getByText(/"Secret Trapdoor Bunkers"/)).toBeInTheDocument();
    expect(
      screen.getByText(/immediately exclude it from visitor interactive maps/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Hide Exhibit' });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveClass('bg-red-700');
  });

  it('renders reactivation dialog when exhibit is hidden', () => {
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={hiddenPoi}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Reactivate Exhibit' })
    ).toBeInTheDocument();
    expect(screen.getByText(/"Hoang Cam Field Stove"/)).toBeInTheDocument();
    expect(
      screen.getByText(/reappear on visitor maps and resume automated proximity narrations/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Reactivate Exhibit' });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toHaveClass('bg-slate-800');
  });

  it('invokes onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide Exhibit' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={vi.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={vi.fn()}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when clicking the backdrop overlay', () => {
    const handleClose = vi.fn();
    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={vi.fn()}
        onClose={handleClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables actions and renders loading indicator when isLoading is true', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <DeactivateConfirmModal
        isOpen={true}
        poi={activePoi}
        onConfirm={handleConfirm}
        onClose={handleClose}
        isLoading={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toBeDisabled();

    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Escape should not trigger close while loading
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();

    // Backdrop click should not trigger close while loading
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).not.toHaveBeenCalled();
  });
});
