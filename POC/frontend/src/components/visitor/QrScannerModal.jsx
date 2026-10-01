import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Camera, Flashlight, RefreshCw, Upload, CheckCircle2,
  AlertTriangle, ExternalLink, Sparkles, HelpCircle, Smartphone
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useVisitorSession } from '../../context/VisitorSessionContext';
import { visitorApi } from '../../services/visitorApi';

const ELEMENT_ID = 'interactive-qr-reader';
const TEMP_ELEMENT_ID = 'interactive-qr-reader-temp';

export default function QrScannerModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { setLastScannedPoiId, t } = useVisitorSession();

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasScannedRef = useRef(false);

  const [isStarting, setIsStarting] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [unrecognizedCode, setUnrecognizedCode] = useState(null);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const [activePois, setActivePois] = useState([]);

  // Fetch only existing, active POIs from DB for testing mode
  useEffect(() => {
    if (isOpen) {
      visitorApi.getPoiList()
        .then((data) => {
          if (Array.isArray(data)) {
            const sorted = [...data].sort((a, b) => (a.floor - b.floor) || (a.id - b.id));
            setActivePois(sorted);
          }
        })
        .catch((err) => console.warn('Could not fetch active POIs:', err));
    }
  }, [isOpen]);

  // Play audio chime when scanned
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext policy
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('Error while stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanningActive(false);
        setIsTorchOn(false);
        setHasTorch(false);
      }
    }
  };

  const processScannedText = (rawText) => {
    const text = (rawText || '').trim();

    // Check if contains POI id
    let poiId = null;
    const urlPoiMatch = text.match(/\/poi\/(\d+)/i);
    const prefixPoiMatch = text.match(/^poi[_\-:\s]*(\d+)$/i);
    const pureNumberMatch = text.match(/^(\d+)$/);

    if (urlPoiMatch) {
      poiId = parseInt(urlPoiMatch[1], 10);
    } else if (prefixPoiMatch) {
      poiId = parseInt(prefixPoiMatch[1], 10);
    } else if (pureNumberMatch) {
      poiId = parseInt(pureNumberMatch[1], 10);
    }

    if (poiId) {
      try {
        const unlockedStorage = JSON.parse(localStorage.getItem('unlocked_pois') || '{}');
        unlockedStorage[poiId] = true;
        localStorage.setItem('unlocked_pois', JSON.stringify(unlockedStorage));
        setLastScannedPoiId(poiId);
      } catch (e) {
        console.warn('Storage update error:', e);
      }

      setSuccessInfo({
        type: 'poi',
        id: poiId,
        text: `Hiện vật #${poiId}`,
      });

      setTimeout(() => {
        stopScanner();
        onClose();
        navigate(`/poi/${poiId}?from_qr=true&scanned=1`);
      }, 700);
      return;
    }

    // Check if map route
    if (text.includes('/map') || text === 'map') {
      setSuccessInfo({
        type: 'map',
        text: 'Bản đồ bảo tàng',
      });
      setTimeout(() => {
        stopScanner();
        onClose();
        navigate('/map');
      }, 700);
      return;
    }

    // Check external link
    if (/^https?:\/\//i.test(text)) {
      setSuccessInfo({
        type: 'external',
        url: text,
        text: text,
      });
      return;
    }

    // Unrecognized text
    setUnrecognizedCode(text);
  };

  const onScanSuccess = (decodedText) => {
    if (!decodedText || hasScannedRef.current) return;
    hasScannedRef.current = true;

    playSuccessBeep();
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }

    processScannedText(decodedText);
  };

  const onScanFailure = () => {
    // Normal per-frame decode failure, ignore to avoid spamming console
  };

  const startScanner = async () => {
    try {
      await stopScanner();

      const container = document.getElementById(ELEMENT_ID);
      if (!container) return;

      setIsStarting(true);
      setCameraError(null);
      setSuccessInfo(null);
      setUnrecognizedCode(null);
      hasScannedRef.current = false;

      // Detect cameras
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        setAvailableCameras(cameras || []);
      } catch (e) {
        console.warn('Could not enumerate cameras:', e);
      }

      const scanner = new Html5Qrcode(ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const qrBoxSize = Math.min(250, window.innerWidth - 80);
      const scanConfig = {
        fps: 15,
        qrbox: { width: qrBoxSize, height: qrBoxSize },
        aspectRatio: 1.0,
      };

      // Determine camera choice
      let cameraChoice = { facingMode: 'environment' };
      if (selectedCameraId) {
        cameraChoice = { deviceId: { exact: selectedCameraId } };
      } else if (cameras && cameras.length > 0) {
        const back = cameras.find((c) => /back|rear|sau|environment/i.test(c.label));
        if (back) {
          cameraChoice = { deviceId: { exact: back.id } };
        }
      }

      let started = false;
      // Level 1: Preferred environment/back camera
      try {
        await scanner.start(cameraChoice, scanConfig, onScanSuccess, onScanFailure);
        started = true;
      } catch (e1) {
        console.warn('Attempt 1 failed, trying fallback:', e1);
      }

      // Level 2: First camera device ID
      if (!started && cameras && cameras.length > 0) {
        try {
          await scanner.start(cameras[0].id, scanConfig, onScanSuccess, onScanFailure);
          started = true;
        } catch (e2) {
          console.warn('Attempt 2 failed, trying user camera:', e2);
        }
      }

      // Level 3: facingMode user (front camera/laptop webcam)
      if (!started) {
        try {
          await scanner.start({ facingMode: 'user' }, scanConfig, onScanSuccess, onScanFailure);
          started = true;
        } catch (e3) {
          console.error('All camera attempts failed:', e3);
          throw e3;
        }
      }

      setIsScanningActive(true);

      // Check torch
      try {
        const caps = scanner.getRunningTrackCapabilities();
        if (caps && 'torch' in caps) {
          setHasTorch(true);
        }
      } catch {
        // Torch capability not present
      }
    } catch (err) {
      console.error('Camera start failed:', err);
      const msg = err.name === 'NotAllowedError'
        ? t('camera_permission_denied')
        : (err.message || 'Không thể mở máy ảnh trên thiết bị này.');
      setCameraError(msg);
      setIsScanningActive(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Toggle flash
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Switch camera if multiple
  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCameraId(availableCameras[nextIndex].id);
  };

  // Upload photo of QR code
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsStarting(true);
      setCameraError(null);
      setUnrecognizedCode(null);

      await stopScanner();

      const tempScanner = new Html5Qrcode(TEMP_ELEMENT_ID);
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();

      onScanSuccess(decodedText);
    } catch (err) {
      console.warn('File decode error:', err);
      setCameraError('Không nhận diện được mã QR trong tệp ảnh này. Vui lòng chụp rõ và thử lại.');
      // Restart live stream
      startScanner();
    } finally {
      setIsStarting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle open/close lifecycle
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        startScanner();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden container for temp file scanning */}
      <div id={TEMP_ELEMENT_ID} style={{ display: 'none' }} />

      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 to-[#090d16] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/10 blur-2xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {t('qr_scanner_title')}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('qr_scanner_sub')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700/60"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder Viewport */}
        <div className="relative w-full aspect-square max-h-[300px] sm:max-h-[340px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">

          {/* Video Container (Managed by Html5Qrcode) */}
          <div id={ELEMENT_ID} className="w-full h-full object-cover" />

          {/* Scanner Visual Overlay (Frame + Corner Brackets + Laser) */}
          {isScanningActive && !successInfo && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Target Square */}
              <div className="relative w-52 h-52 sm:w-56 sm:h-56">
                {/* 4 Glowing Corner Brackets */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl-lg shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr-lg shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl-lg shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br-lg shadow-[0_0_8px_rgba(245,158,11,0.6)]" />

                {/* Animated Laser Beam */}
                <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan-laser" />
              </div>

              {/* Status prompt */}
              <div className="absolute bottom-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/20 text-[10px] text-amber-300 font-medium flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('qr_align_guide')}</span>
              </div>
            </div>
          )}

          {/* Loading / Starting Indicator */}
          {isStarting && !isScanningActive && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Đang khởi động camera...</p>
            </div>
          )}

          {/* Success Flash Banner */}
          {successInfo && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {t('scan_success')}
              </h3>
              <p className="text-xs text-amber-400 font-semibold mb-4">
                {successInfo.text}
              </p>

              {successInfo.type === 'external' ? (
                <div className="space-y-2 w-full">
                  <a
                    href={successInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25"
                  >
                    <span>Mở liên kết</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      setSuccessInfo(null);
                      startScanner();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Quét mã khác
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Đang mở trang chi tiết...</span>
                </p>
              )}
            </div>
          )}

          {/* Camera Permission / Error Fallback */}
          {cameraError && !isStarting && !successInfo && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="max-w-[260px]">
                <p className="text-xs font-bold text-white mb-1">{cameraError}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('camera_error_tip')}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[220px]">
                <button
                  onClick={startScanner}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại Camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('upload_qr_photo')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warning Toast for Unrecognized QR */}
        {unrecognizedCode && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-300">{t('unrecognized_qr')}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{unrecognizedCode}</p>
            </div>
            <button
              onClick={() => {
                setUnrecognizedCode(null);
                startScanner();
              }}
              className="text-[11px] text-amber-400 hover:underline font-bold"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            title={t('upload_qr_photo')}
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('upload_qr_photo')}</span>
          </button>

          {/* Flash Toggle Button */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                isTorchOn
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
              title={t('toggle_flash')}
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera Button */}
          {availableCameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center justify-center transition-all active:scale-95"
              title={t('switch_camera')}
            >
              <RefreshCw className="w-4 h-4 text-sky-400" />
            </button>
          )}

          {/* Toggle Demo Quick Open */}
          <button
            type="button"
            onClick={() => setShowDemoSelector((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
              showDemoSelector
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
            title={t('simulate_scan_title')}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Fast Unlock Selector (For PCs or testing without camera) */}
        {showDemoSelector && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {t('simulate_scan_title')}
              </p>
              <span className="text-[10px] text-slate-400">
                {activePois.length} hiện vật khả dụng
              </span>
            </div>

            {activePois.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {activePois.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => processScannedText(`/poi/${p.id}`)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-left border border-slate-700/60 transition-all active:scale-95 flex flex-col group"
                  >
                    <span className="text-[10px] text-amber-400 group-hover:text-slate-950 font-bold">
                      POI #{p.id} · {p.floor === 1 ? 'Tầng Trệt' : `Lầu ${p.floor - 1}`}
                    </span>
                    <span className="text-xs font-semibold truncate w-full">
                      {p.title}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Đang tải danh sách hiện vật thực tế...</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
