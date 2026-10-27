import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PoiPreviewCard from '../PoiPreviewCard.jsx';

const poi = {
  id: 'poi-1',
  title: 'Cu Chi Tunnel',
  short_description: 'Explore the underground tunnel system.',
  image_url: 'https://example.test/tunnel.jpg',
  latitude: 11.14,
  longitude: 106.46,
};

afterEach(cleanup);

describe('PoiPreviewCard', () => {
  it('shows the exhibit preview, Haversine distance, and action links', () => {
    const onPlayAudio = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={{ lat: 11.14, lng: 106.461 }}
        directionsUrl="https://maps.example/directions"
        onPlayAudio={onPlayAudio}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('img', { name: poi.title })).toHaveAttribute('src', poi.image_url);
    expect(screen.getByRole('heading', { name: poi.title })).toBeInTheDocument();
    expect(screen.getByText(poi.short_description)).toBeInTheDocument();
    expect(screen.getByText(/109 m away/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      'https://maps.example/directions',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play Narration' }));
    expect(onPlayAudio).toHaveBeenCalledOnce();
  });

  it('shows a useful distance fallback and closes from the backdrop', () => {
    const onDismiss = vi.fn();
    render(
      <PoiPreviewCard
        poi={{ ...poi, image_url: null }}
        location={null}
        directionsUrl="https://maps.example/directions"
        onPlayAudio={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Distance unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close exhibit preview' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses on a downward swipe and Escape key', () => {
    const onDismiss = vi.fn();
    render(
      <PoiPreviewCard
        poi={poi}
        location={null}
        directionsUrl="https://maps.example/directions"
        onPlayAudio={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientY: 160 }] });
    expect(onDismiss).toHaveBeenCalledOnce();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
