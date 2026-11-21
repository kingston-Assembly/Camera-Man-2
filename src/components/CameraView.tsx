/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Zap,
  ZapOff,
  Grid,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Upload,
  AlertCircle,
  Crop,
  Sparkles,
  CircleDot,
  Square,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { AspectRatioType, CameraSettings, MediaItem } from '../types/media';
import { FILTER_PRESETS } from '../constants/filters';
import { saveMediaItem } from '../services/db';
import { playShutterSound, playRecordStartSound, playRecordStopSound, triggerHaptic } from '../services/audio';

interface Props {
  settings: CameraSettings;
  updateSettings: (partial: Partial<CameraSettings>) => void;
  onMediaCaptured: (item: MediaItem) => void;
  recentMedia: MediaItem | null;
  onOpenGallery: () => void;
  onOpenMultiImport?: () => void;
}

export const CameraView: React.FC<Props> = ({
  settings,
  updateSettings,
  onMediaCaptured,
  recentMedia,
  onOpenGallery,
  onOpenMultiImport,
}) => {
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recentThumbUrl, setRecentThumbUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    stream,
    videoRef,
    isLoading,
    error: cameraError,
    permissionStatus,
    facingMode,
    hasMultipleCameras,
    torchSupported,
    isTorchOn,
    startCamera,
    switchCamera,
    toggleTorch,
    capturePhoto,
  } = useCamera();

  const {
    isRecording,
    isPaused,
    formattedTime,
    estimatedSizeBytes,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useMediaRecorder();

  // Create thumbnail URL for recent media
  useEffect(() => {
    if (recentMedia) {
      const url = URL.createObjectURL(recentMedia.thumbnailBlob || recentMedia.blob);
      setRecentThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setRecentThumbUrl(null);
    }
  }, [recentMedia]);

  // Start camera on mount
  useEffect(() => {
    startCamera(settings.facingMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tap-to-focus animation
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1200);
  };

  // Capture Photo
  const handlePhotoCapture = async () => {
    if (isProcessing || !stream) return;

    // Flash screen effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 240);

    // Audio & haptic
    if (settings.soundEnabled) playShutterSound();
    if (settings.hapticsEnabled) triggerHaptic([30]);

    setIsProcessing(true);
    try {
      const result = await capturePhoto(
        settings.filterId,
        settings.photoQuality,
        settings.aspectRatio
      );

      if (result) {
        const timestamp = Date.now();
        const dateStr = new Date(timestamp)
          .toISOString()
          .replace(/[-:]/g, '')
          .slice(0, 15);
        const filename = `CAM_${dateStr}.jpg`;

        const item = await saveMediaItem({
          type: 'photo',
          blob: result.blob,
          filename,
          timestamp,
          size: result.blob.size,
          width: result.width,
          height: result.height,
          mimeType: 'image/jpeg',
          filter: settings.filterId !== 'none' ? settings.filterId : undefined,
          isFavorite: false,
        });

        onMediaCaptured(item);
      }
    } catch (err) {
      console.error('Failed to capture photo:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Video Recording
  const handleVideoToggle = async () => {
    if (isRecording) {
      // Stop recording
      if (settings.soundEnabled) playRecordStopSound();
      if (settings.hapticsEnabled) triggerHaptic([20, 50, 20]);

      setIsProcessing(true);
      try {
        const result = await stopRecording();
        if (result && result.blob.size > 0) {
          const timestamp = Date.now();
          const dateStr = new Date(timestamp)
            .toISOString()
            .replace(/[-:]/g, '')
            .slice(0, 15);
          const filename = `VID_${dateStr}.webm`;

          const videoElem = videoRef.current;
          const width = videoElem?.videoWidth || 1280;
          const height = videoElem?.videoHeight || 720;

          const item = await saveMediaItem({
            type: 'video',
            blob: result.blob,
            filename,
            timestamp,
            size: result.blob.size,
            width,
            height,
            duration: result.duration,
            mimeType: result.mimeType,
            filter: settings.filterId !== 'none' ? settings.filterId : undefined,
            isFavorite: false,
          });

          onMediaCaptured(item);
        }
      } catch (err) {
        console.error('Error saving video:', err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      if (!stream) return;
      if (settings.soundEnabled) playRecordStartSound();
      if (settings.hapticsEnabled) triggerHaptic([40]);

      await startRecording(stream, settings.recordAudio);
    }
  };

  // Shutter button click dispatcher
  const handleShutterClick = () => {
    if (captureMode === 'photo') {
      handlePhotoCapture();
    } else {
      handleVideoToggle();
    }
  };

  // Keyboard shortcut: Spacebar for capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        handleShutterClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [captureMode, isRecording, stream]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle manual file import (when camera is unavailable or user chooses to upload)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isImage && !isVideo) continue;

        const timestamp = Date.now();
        const item = await saveMediaItem({
          type: isVideo ? 'video' : 'photo',
          blob: file,
          filename: file.name,
          timestamp,
          size: file.size,
          width: 1920,
          height: 1080,
          mimeType: file.type,
          isFavorite: false,
        });

        onMediaCaptured(item);
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Active filter CSS
  const activePreset = FILTER_PRESETS.find((f) => f.id === settings.filterId);
  const activeFilterStyle = activePreset?.cssFilter || 'none';

  // Aspect ratio helper styles for viewfinder containment
  const getAspectRatioClasses = () => {
    switch (settings.aspectRatio) {
      case '1:1':
        return 'aspect-square max-h-full max-w-full mx-auto';
      case '4:3':
        return 'aspect-[4/3] max-h-full max-w-full mx-auto';
      case '16:9':
        return 'aspect-[16/9] max-h-full max-w-full mx-auto';
      default:
        return 'w-full h-full';
    }
  };

  // Cycle aspect ratios
  const cycleAspectRatio = () => {
    const order: AspectRatioType[] = ['full', '4:3', '16:9', '1:1'];
    const nextIdx = (order.indexOf(settings.aspectRatio) + 1) % order.length;
    updateSettings({ aspectRatio: order[nextIdx] });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col justify-between h-[calc(100dvh-3.25rem)] sm:h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.25rem)] sm:max-h-[calc(100dvh-3.5rem)] px-2 sm:px-4 py-1.5 sm:py-2 select-none overflow-hidden">
      {/* Hidden File Input for Device Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Screen Shutter Flash Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white animate-camera-flash pointer-events-none" />
      )}

      {/* Top Camera Controls Bar */}
      <div className="w-full z-20 flex items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-zinc-950/75 backdrop-blur-md rounded-2xl border border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Torch Toggle */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              title={isTorchOn ? 'Torch On' : 'Torch Off'}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isTorchOn
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {isTorchOn ? <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ZapOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}

          {/* Aspect Ratio Toggle */}
          <button
            onClick={cycleAspectRatio}
            title={`Aspect Ratio: ${settings.aspectRatio.toUpperCase()}`}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <Crop className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
            <span className="text-[10px] sm:text-[11px] uppercase">{settings.aspectRatio}</span>
          </button>

          {/* Grid Lines Toggle */}
          <button
            onClick={() => updateSettings({ gridEnabled: !settings.gridEnabled })}
            title={settings.gridEnabled ? 'Grid On' : 'Grid Off'}
            className={`p-1.5 sm:p-2 rounded-xl text-xs transition cursor-pointer ${
              settings.gridEnabled
                ? 'bg-zinc-800 text-amber-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Live Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            showFilters || settings.filterId !== 'none'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span className="text-[11px] sm:text-xs">{activePreset?.name || 'Filters'}</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Sound Toggle */}
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            title={settings.soundEnabled ? 'Shutter Sound Enabled' : 'Muted'}
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Mic Toggle (for Video Mode) */}
          {captureMode === 'video' && (
            <button
              onClick={() => updateSettings({ recordAudio: !settings.recordAudio })}
              title={settings.recordAudio ? 'Mic On' : 'Mic Muted'}
              className={`p-1.5 sm:p-2 rounded-xl text-xs transition cursor-pointer ${
                settings.recordAudio ? 'text-zinc-300' : 'text-rose-400 bg-rose-500/10'
              }`}
            >
              {settings.recordAudio ? <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}

          {/* Quick Import from device */}
          <button
            onClick={() => onOpenMultiImport ? onOpenMultiImport() : fileInputRef.current?.click()}
            title="Multi-import photos and videos from device"
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Frame (Flex-1 with min-h-0 fits ALL screen sizes without overflow) */}
      <div className="relative w-full flex-1 min-h-0 my-1 sm:my-2 flex items-center justify-center overflow-hidden">
        <div
          ref={containerRef}
          onClick={handleViewfinderClick}
          className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800/80 shadow-2xl transition-all ${getAspectRatioClasses()}`}
        >
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              filter: activeFilterStyle,
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
            className="w-full h-full object-cover select-none"
          />

          {/* Viewfinder Rule-of-Thirds Grid */}
          {settings.gridEnabled && (
            <div className="absolute inset-0 pointer-events-none viewfinder-grid opacity-60" />
          )}

          {/* Focus Bracket Animation on tap */}
          {focusPoint && (
            <div
              style={{
                left: `${focusPoint.x - 24}px`,
                top: `${focusPoint.y - 24}px`,
              }}
              className="absolute pointer-events-none w-12 h-12 border-2 border-amber-400/90 rounded-lg animate-ping opacity-75"
            />
          )}

          {/* Live Recording HUD / Badge */}
          {isRecording && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-red-500/50 text-xs font-mono font-semibold text-white shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC {formattedTime}</span>
              {estimatedSizeBytes > 0 && (
                <span className="text-zinc-400 font-normal text-[10px]">
                  {(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
          )}

          {/* Recording Pause / Resume Button */}
          {isRecording && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPaused) {
                    resumeRecording();
                  } else {
                    pauseRecording();
                  }
                }}
                className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-zinc-700 hover:bg-zinc-800 transition cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
              </button>
            </div>
          )}

          {/* Center Target Crosshair (subtle) */}
          <div className="absolute pointer-events-none w-6 h-6 border border-white/20 rounded-full flex items-center justify-center opacity-40">
            <div className="w-1 h-1 rounded-full bg-white/60" />
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 text-white p-4">
              <div className="w-7 h-7 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-2" />
              <span className="text-xs text-zinc-400 font-medium">Starting camera...</span>
            </div>
          )}

          {/* Error / Permission Denied Fallback */}
          {(cameraError || permissionStatus === 'denied' || permissionStatus === 'unsupported') && !isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-zinc-950/95 text-zinc-100 overflow-y-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">Camera Access Required</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
                {cameraError ||
                  'To capture photos and videos, please allow camera permission in your browser.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full max-w-xs">
                <button
                  onClick={() => startCamera(settings.facingMode)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
                >
                  Request Permission
                </button>

                <button
                  onClick={() => onOpenMultiImport ? onOpenMultiImport() : fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Multi-Import Media</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Presets Floating Overlay (Floats over viewfinder without causing layout shift) */}
        {showFilters && (
          <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-4 z-30 py-2 px-3 bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-800/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-zinc-800/60">
              <span className="text-[11px] font-semibold text-zinc-300">Color Looks & Filters</span>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updateSettings({ filterId: preset.id })}
                  className={`flex flex-col items-center gap-1 p-1 rounded-xl transition shrink-0 cursor-pointer ${
                    settings.filterId === preset.id
                      ? 'bg-zinc-800 border border-amber-500/60 shadow-sm'
                      : 'hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div
                    style={{
                      filter: preset.cssFilter,
                      backgroundColor: preset.accentColor,
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-inner flex items-center justify-center text-[10px] font-bold text-zinc-950 overflow-hidden"
                  >
                    <span className="drop-shadow-sm font-mono text-[8px] sm:text-[9px]">
                      {preset.name.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium text-zinc-300 whitespace-nowrap">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Capture Deck (Always fits neatly at bottom with pb-safe) */}
      <div className="w-full z-20 flex flex-col items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-950/80 backdrop-blur-md rounded-3xl border border-zinc-800/80 shrink-0 pb-safe">
        {/* Mode Selector Tabs (Photo vs Video) */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-900/90 rounded-full border border-zinc-800/60 text-[11px] font-semibold">
          <button
            disabled={isRecording}
            onClick={() => setCaptureMode('photo')}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer ${
              captureMode === 'photo'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            PHOTO
          </button>
          <button
            disabled={isRecording}
            onClick={() => setCaptureMode('video')}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer ${
              captureMode === 'video'
                ? 'bg-zinc-800 text-red-400 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            VIDEO
          </button>
        </div>

        {/* Shutter Bar Controls: [Gallery Shortcut] - [Shutter Button] - [Camera Flip] */}
        <div className="w-full flex items-center justify-between px-3 sm:px-8 max-w-sm sm:max-w-md">
          {/* Recent Media Thumbnail Shortcut */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
            {recentThumbUrl ? (
              <button
                onClick={onOpenGallery}
                title="Open Gallery"
                className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden border-2 border-zinc-700 hover:border-amber-400 transition transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              >
                <img
                  src={recentThumbUrl}
                  alt="Recent capture"
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <button
                onClick={onOpenGallery}
                title="Open Gallery"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 opacity-40" />
              </button>
            )}
          </div>

          {/* Center Tactile Shutter Button */}
          <div className="flex items-center justify-center">
            {captureMode === 'photo' ? (
              <button
                onClick={handleShutterClick}
                disabled={isProcessing}
                title="Capture Photo (Spacebar)"
                className="group relative w-15 h-15 sm:w-18 sm:h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:bg-zinc-200 transition-colors shadow-inner" />
              </button>
            ) : (
              <button
                onClick={handleShutterClick}
                disabled={isProcessing}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                className={`group relative w-15 h-15 sm:w-18 sm:h-18 rounded-full border-4 p-1 flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer ${
                  isRecording ? 'border-red-500 bg-red-950/20' : 'border-white/80'
                }`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-red-500 transition-all animate-pulse flex items-center justify-center shadow-lg">
                    <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-red-600 group-hover:bg-red-500 transition-colors shadow-inner" />
                )}
              </button>
            )}
          </div>

          {/* Camera Flip (Front / Back switch) */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
            {hasMultipleCameras || true ? (
              <button
                onClick={switchCamera}
                title={`Switch camera (Currently ${facingMode === 'user' ? 'Front' : 'Rear'})`}
                className="p-2.5 sm:p-3 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:rotate-180 transition-all duration-300 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : (
              <div className="w-10 sm:w-11" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
