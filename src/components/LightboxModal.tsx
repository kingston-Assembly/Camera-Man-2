/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Star,
  Info,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Edit2,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { updateMediaItem } from '../services/db';

interface Props {
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const LightboxModal: React.FC<Props> = ({
  items,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  onRefresh,
}) => {
  const currentItem = items[currentIndex];

  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [showChrome, setShowChrome] = useState<boolean>(true);
  const [isEditingFilename, setIsEditingFilename] = useState<boolean>(false);
  const [editedFilename, setEditedFilename] = useState<string>('');

  // Video state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Generate object URL for original high-res blob
  useEffect(() => {
    if (!currentItem) return;

    const url = URL.createObjectURL(currentItem.blob);
    setMediaUrl(url);
    setZoomLevel(1);
    setRotation(0);
    setEditedFilename(currentItem.filename);
    setIsEditingFilename(false);
    setIsPlaying(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentItem]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < items.length - 1) onNavigate(currentIndex + 1);
      } else if (e.key === ' ' && currentItem?.type === 'video') {
        e.preventDefault();
        togglePlayVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, onClose, onNavigate, currentItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch swipe listeners for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && e.changedTouches.length === 1) {
      const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
      touchStartXRef.current = null;
      if (diffX > 60 && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (diffX < -60 && currentIndex < items.length - 1) {
        onNavigate(currentIndex + 1);
      }
    }
  };

  if (!currentItem) return null;

  // Toggle favorite
  const handleToggleFavorite = async () => {
    try {
      await updateMediaItem(currentItem.id, { isFavorite: !currentItem.isFavorite });
      await onRefresh();
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
  };

  // Save edited filename
  const handleSaveFilename = async () => {
    if (!editedFilename.trim() || editedFilename === currentItem.filename) {
      setIsEditingFilename(false);
      return;
    }
    try {
      await updateMediaItem(currentItem.id, { filename: editedFilename.trim() });
      setIsEditingFilename(false);
      await onRefresh();
    } catch (err) {
      console.error('Failed to update filename:', err);
    }
  };

  // Download media
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = currentItem.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Share media via Web Share API
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([currentItem.blob], currentItem.filename, {
          type: currentItem.mimeType,
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: currentItem.filename,
          });
          return;
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }
    // Fallback: download
    handleDownload();
  };

  // Delete media
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this media item?')) {
      await onDelete(currentItem.id);
      if (items.length <= 1) {
        onClose();
      } else if (currentIndex >= items.length - 1) {
        onNavigate(currentIndex - 1);
      }
    }
  };

  // Video playback handlers
  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 h-[100dvh] w-full flex items-center justify-center bg-black/95 select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Top Floating Chrome Bar (Fits all screen sizes with pt-safe) */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-4 pt-safe bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${
          showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 transition cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <span className="text-[11px] sm:text-xs font-mono text-zinc-300 bg-black/50 px-2.5 py-1 rounded-full border border-zinc-800">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Favorite Toggle */}
          <button
            onClick={handleToggleFavorite}
            title={currentItem.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
            className="p-1.5 sm:p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 transition cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                currentItem.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
              }`}
            />
          </button>

          {/* Metadata Inspector Drawer Toggle */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            title="View Details & Metadata"
            className={`p-1.5 sm:p-2 rounded-full transition cursor-pointer ${
              showMetadata
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            title="Share"
            className="p-1.5 sm:p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            title="Download Media File"
            className="p-1.5 sm:p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            title="Delete from Offline Storage"
            className="p-1.5 sm:p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Media Canvas */}
      <div
        onClick={() => setShowChrome(!showChrome)}
        className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      >
        {currentItem.type === 'photo' ? (
          <div
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            <img
              src={mediaUrl}
              alt={currentItem.filename}
              className="max-h-[82dvh] max-w-[94vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
            />
          </div>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[80dvh] flex flex-col items-center justify-center px-2"
          >
            <video
              ref={videoRef}
              src={mediaUrl}
              playsInline
              muted={isMuted}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
              className="max-h-[70dvh] max-w-full object-contain rounded-2xl shadow-2xl bg-black"
            />

            {/* Custom Video Controls (Responsive) */}
            <div className="w-full mt-2.5 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl">
              <button
                onClick={togglePlayVideo}
                className="p-1.5 sm:p-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-zinc-950" /> : <Play className="w-3.5 h-3.5 fill-zinc-950" />}
              </button>

              <span className="text-[11px] font-mono text-zinc-300 whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration || currentItem.duration || 0)}
              </span>

              {/* Seek Slider */}
              <input
                type="range"
                min="0"
                max={duration || currentItem.duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg min-w-[60px]"
              />

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 text-zinc-300 hover:text-white cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prev / Next Navigation Arrows (Hidden on small touchscreens to not obstruct media, replaced by swipe) */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          title="Previous (Left Arrow or Swipe Right)"
          className={`hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 shadow-xl transition cursor-pointer ${
            showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < items.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          title="Next (Right Arrow or Swipe Left)"
          className={`hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 shadow-xl transition cursor-pointer ${
            showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Photo Zoom & Rotate Bar (Bottom) */}
      {currentItem.type === 'photo' && showChrome && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            title="Zoom Out"
            className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="text-[11px] sm:text-xs font-mono text-zinc-400 min-w-[36px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
            title="Zoom In"
            className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="w-[1px] h-3.5 bg-zinc-700 mx-1" />
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate"
            className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Metadata Inspector Drawer (Responsive: Bottom Sheet on Mobile, Right Sidebar on Desktop) */}
      {showMetadata && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:left-auto md:right-0 z-40 w-full md:max-w-sm max-h-[75dvh] md:max-h-full rounded-t-3xl md:rounded-none bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-right duration-200"
        >
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                Media Details
              </h3>
              <button
                onClick={() => setShowMetadata(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filename with inline edit */}
            <div className="space-y-1.5">
              <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                File Name
              </span>
              {isEditingFilename ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedFilename}
                    onChange={(e) => setEditedFilename(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveFilename}
                    className="p-1.5 rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-xs font-mono text-zinc-200 truncate">
                    {currentItem.filename}
                  </span>
                  <button
                    onClick={() => setIsEditingFilename(true)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Key-Value Metadata Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Type</span>
                <span className="font-semibold text-white capitalize">{currentItem.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Captured On</span>
                <span className="text-zinc-200">
                  {new Date(currentItem.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">File Size</span>
                <span className="font-mono text-zinc-200">{formatSize(currentItem.size)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Dimensions</span>
                <span className="font-mono text-zinc-200">
                  {currentItem.width} × {currentItem.height} px
                </span>
              </div>
              {currentItem.type === 'video' && currentItem.duration && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Duration</span>
                  <span className="font-mono text-zinc-200">{formatTime(currentItem.duration)}</span>
                </div>
              )}
              {currentItem.filter && (
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Filter Preset</span>
                  <span className="text-amber-400 capitalize">{currentItem.filter}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Storage</span>
                <span className="text-emerald-400 font-medium">On-Device IndexedDB</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 mt-4">
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Permanently</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
