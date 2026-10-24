/**
 * App.jsx
 * Entry point for Smart Audio Guide Web App with User Story 01.3 Geofence & Player Demo.
 */

import React, { useState } from 'react';
import { AudioPlayerProvider, useAudioPlayer } from './contexts/AudioPlayerContext.jsx';
import { MiniAudioPlayer } from './components/visitor/MiniAudioPlayer.jsx';
import { useGeofenceTrigger } from './hooks/useGeofenceTrigger.js';
import {
  isCooldownActive,
  getRemainingCooldownSeconds,
  clearAllCooldowns,
} from './services/cooldownService.js';

// Top-of-file constants
const MOCK_POIS = [
  {
    id: 1,
    title: 'Bếp Hoàng Cầm (Không Khói)',
    latitude: 11.1432,
    longitude: 106.4631,
    trigger_radius: 30,
    text: 'Bếp Hoàng Cầm là một loại bếp dã chiến có công dụng làm tan loãng khói bếp do đồng chí Hoàng Cầm sáng chế ra trong chiến dịch Hòa Bình năm 1951.',
    bcp47Code: 'vi-VN',
  },
  {
    id: 2,
    title: 'Xưởng Chế Tạo Vũ Khí & Bẫy Chông',
    latitude: 11.144,
    longitude: 106.464,
    trigger_radius: 25,
    text: 'Khu vực chế tạo vũ khí tự tạo của quân dân Củ Chi, biến bom đạn pháo của địch thành các loại mìn, bẫy chông độc đáo.',
    bcp47Code: 'vi-VN',
  },
];

function DemoContent() {
  const { play, currentPoi, isPlaying } = useAudioPlayer();
  const [userLocation, setUserLocation] = useState(null);
  const [lastTriggerNotice, setLastTriggerNotice] = useState(null);
  const [, setRefreshKey] = useState(0);

  const { nearestPoi, distanceToNearest, activeGeofencePois } = useGeofenceTrigger({
    userLocation,
    pois: MOCK_POIS,
    isUnlocked: true,
    onTrigger: (poi, distance, options) => {
      setLastTriggerNotice(`Đã kích hoạt tự động: ${poi.title} (Cách ${distance}m)`);
      play(poi);
      setRefreshKey((prevIteration) => prevIteration + 1);
    },
  });

  const handleSimulateEnterHoangCam = () => {
    // Exact coordinates of Hoang Cam Stove (distance ~0m <= 30m)
    setUserLocation({ lat: 11.1432, lng: 106.4631 });
  };

  const handleSimulateEnterWeaponWorkshop = () => {
    // Exact coordinates of Weapon Workshop (distance ~0m <= 25m)
    setUserLocation({ lat: 11.144, lng: 106.464 });
  };

  const handleSimulateWalkAway = () => {
    // ~1km away
    setUserLocation({ lat: 11.152, lng: 106.472 });
  };

  const handleClearCooldowns = () => {
    clearAllCooldowns();
    setLastTriggerNotice('Đã xóa bộ nhớ đệm cooldown 10 phút.');
    setRefreshKey((prevIteration) => prevIteration + 1);
  };

  const isHoangCamCooldown = isCooldownActive(1);
  const remainingHoangCamSec = getRemainingCooldownSeconds(1);

  return (
    <div style={{ paddingBottom: '90px' }}>
      <header
        style={{
          padding: '16px 20px',
          backgroundColor: '#15803D',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Cu Chi Tunnels - Smart Audio Guide
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
            Interactive Map & Multilingual Audio Guide System initialized.
          </p>
        </div>
        <span
          style={{
            backgroundColor: '#166534',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          US 01.3 Active
        </span>
      </header>

      <main style={{ padding: '20px', maxWidth: '640px', margin: '0 auto' }}>
        {/* US 01.3 Interactive Test Panel */}
        <section
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginTop: 0 }}>
            📍 Bảng Kiểm Thử Mô Phỏng GPS & Geofence (User Story 01.3)
          </h2>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
            Bấm nút bên dưới để mô phỏng du khách cầm điện thoại đi bộ vào vùng Geofence (bán kính
            10m–50m). Trình phát Mini Audio Player sẽ tự động ghim ở đáy màn hình và phát thuyết minh!
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handleSimulateEnterHoangCam}
              style={{
                backgroundColor: '#1D4ED8',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚶 Bước vào Bếp Hoàng Cầm (R = 30m)
            </button>

            <button
              type="button"
              onClick={handleSimulateEnterWeaponWorkshop}
              style={{
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚶 Bước vào Xưởng Vũ Khí (R = 25m)
            </button>

            <button
              type="button"
              onClick={handleSimulateWalkAway}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🚶 Đi ra xa khu di tích (~1km)
            </button>
          </div>

          {/* Real-time Geofence Telemetry Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              color: '#334155',
            }}
          >
            <div>
              <strong>Tọa độ GPS hiện tại:</strong>{' '}
              {userLocation
                ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                : 'Chưa có tọa độ (Đang chờ)'}
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong>Điểm POI gần nhất:</strong>{' '}
              {nearestPoi ? `${nearestPoi.title} (~${distanceToNearest}m)` : 'Không có'}
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong>Trong vùng phát Geofence:</strong>{' '}
              {activeGeofencePois.length > 0 ? (
                <span style={{ color: '#15803D', fontWeight: 600 }}>CÓ (Đang trong bán kính kích hoạt)</span>
              ) : (
                <span style={{ color: '#64748B' }}>NGOÀI VÙNG</span>
              )}
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong>Khóa Debounce 10 phút (Bếp Hoàng Cầm):</strong>{' '}
              {isHoangCamCooldown ? (
                <span style={{ color: '#B45309', fontWeight: 600 }}>
                  ĐANG KHÓA CHỐNG SPAM (Còn {remainingHoangCamSec}s)
                </span>
              ) : (
                <span style={{ color: '#15803D' }}>SẴN SÀNG TỰ ĐỘNG PHÁT</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleClearCooldowns}
              style={{
                backgroundColor: '#FFFBEB',
                color: '#B45309',
                border: '1px solid #FCD34D',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ↺ Reset bộ đếm 10 phút
            </button>
            {lastTriggerNotice && (
              <span style={{ fontSize: '12px', color: '#15803D', fontStyle: 'italic' }}>
                {lastTriggerNotice}
              </span>
            )}
          </div>
        </section>

        {/* POI Cards Preview */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
            🏛️ Danh sách hiện vật minh họa
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_POIS.map((poi) => (
              <div
                key={poi.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                    {poi.title}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Bán kính GPS: {poi.trigger_radius}m • Tọa độ: {poi.latitude}, {poi.longitude}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => play(poi)}
                  style={{
                    backgroundColor: '#1E293B',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {currentPoi?.id === poi.id && isPlaying ? 'Đang phát' : 'Phát thủ công'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Mini Audio Player pinned to viewport bottom (US 01.3) */}
      <MiniAudioPlayer />
    </div>
  );
}

export default function App() {
  return (
    <AudioPlayerProvider>
      <DemoContent />
    </AudioPlayerProvider>
  );
}
