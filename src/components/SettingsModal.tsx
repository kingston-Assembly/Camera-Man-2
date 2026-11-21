/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Download,
  Trash2,
  Sliders,
  Volume2,
  Vibrate,
  Grid,
  Info,
  CheckCircle2,
  Smartphone,
  Upload,
} from 'lucide-react';
import { CameraSettings, StorageStats, MediaItem } from '../types/media';
import { checkStorageStats, requestStoragePersistence, clearAllMedia } from '../services/db';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  settings: CameraSettings;
  updateSettings: (partial: Partial<CameraSettings>) => void;
  items: MediaItem[];
  refreshItems: () => Promise<void>;
  onClose: () => void;
  onOpenMultiImport?: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  settings,
  updateSettings,
  items,
  refreshItems,
  onClose,
  onOpenMultiImport,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Load storage stats
  const loadStats = async () => {
    const data = await checkStorageStats();
    setStats(data);
  };

  useEffect(() => {
    loadStats();
  }, [items]);

  // Request storage persistence
  const handleRequestPersistence = async () => {
    setIsPersisting(true);
    const success = await requestStoragePersistence();
    setIsPersisting(false);
    await loadStats();
    if (success) {
      alert('Persistent storage granted. The browser will not clear your photos during low disk space.');
    } else {
      alert('Persistent storage could not be granted or is managed by browser defaults.');
    }
  };

  // Clear all media
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllMedia();
      setShowClearConfirm(false);
      await refreshItems();
      await loadStats();
    } catch (err) {
      console.error('Failed to clear media:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Export full gallery backup metadata
  const handleExportBackup = () => {
    const metadata = items.map((item) => ({
      id: item.id,
      filename: item.filename,
      type: item.type,
      timestamp: item.timestamp,
      size: item.size,
      width: item.width,
      height: item.height,
      duration: item.duration,
      mimeType: item.mimeType,
      filter: item.filter,
      isFavorite: item.isFavorite,
    }));

    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camera_man_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatStorageMB = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  const formatStorageGB = (bytes: number): string => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-xl max-h-[88dvh] sm:max-h-[90dvh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Settings</h3>
              <p className="text-[11px] sm:text-xs text-zinc-400">Offline storage & camera preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* PWA Install Banner */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Installation
            </h4>
            <PWAInstallButton variant="card" />
          </div>

          {/* Storage Quota Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                Offline Storage Quota
              </h4>
              {stats?.isPersistent ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Protected Storage
                </span>
              ) : (
                <button
                  onClick={handleRequestPersistence}
                  disabled={isPersisting}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Request Protection
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              {/* Quota Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300">
                    {stats ? formatStorageMB(stats.usedBytes) : '0'} MB Used
                  </span>
                  <span className="text-zinc-500">
                    {stats ? formatStorageGB(stats.quotaBytes) : '2.0'} GB Available
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(2, stats?.percentage || 0)}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Media Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/60">
                  <span className="text-zinc-500 block text-[11px]">Photos</span>
                  <span className="text-sm font-semibold text-white">
                    {stats?.photoCount || 0} items
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/60">
                  <span className="text-zinc-500 block text-[11px]">Videos</span>
                  <span className="text-sm font-semibold text-white">
                    {stats?.videoCount || 0} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Capture Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Capture Preferences
            </h4>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 text-xs">
              {/* Photo Quality */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white block">Photo Quality</span>
                  <span className="text-zinc-400 text-[11px]">Compression balance</span>
                </div>
                <select
                  value={settings.photoQuality}
                  aria-label="Photo Quality"
                  onChange={(e) => updateSettings({ photoQuality: parseFloat(e.target.value) })}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
                >
                  <option value={0.92}>High (92%)</option>
                  <option value={0.85}>Standard (85%)</option>
                  <option value={1.0}>Original (100%)</option>
                </select>
              </div>

              {/* Rule of Thirds Grid */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium text-white">Viewfinder Grid</span>
                </div>
                <input
                  type="checkbox"
                  aria-label="Viewfinder Grid"
                  checked={settings.gridEnabled}
                  onChange={(e) => updateSettings({ gridEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Shutter Sounds */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium text-white">Tactile Shutter Audio</span>
                </div>
                <input
                  type="checkbox"
                  aria-label="Tactile Shutter Audio"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Haptic Vibration */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium text-white">Haptic Feedback</span>
                </div>
                <input
                  type="checkbox"
                  aria-label="Haptic Feedback"
                  checked={settings.hapticsEnabled}
                  onChange={(e) => updateSettings({ hapticsEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Backup & Data Management */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Backup & Data
            </h4>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white block">Batch Multi-Import Media</span>
                  <span className="text-zinc-400 text-[11px]">Add multiple photos, videos or entire folders</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenMultiImport) onOpenMultiImport();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition cursor-pointer"
                >
                  Import
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div>
                  <span className="font-medium text-white block">Export Gallery Metadata</span>
                  <span className="text-zinc-400 text-[11px]">Download JSON manifest of all captures</span>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition cursor-pointer"
                >
                  Export
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div>
                  <span className="font-medium text-rose-400 block">Clear All Stored Media</span>
                  <span className="text-zinc-400 text-[11px]">Erase all captured photos and videos</span>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* About Camera Man */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Info className="w-4 h-4 text-amber-400" />
              About Camera Man
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Camera Man is a private, offline Progressive Web App built with Google AI Studio and deployed via Google Cloud Run. Media is encoded and saved strictly on-device in IndexedDB. Zero photos, videos, or personal data ever leave your browser.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              Version 1.0.0 · PWA Service Worker Ready
            </div>
          </div>
        </div>

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-xs w-full p-5 rounded-2xl bg-zinc-900 border border-rose-500/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Permanently Delete All Media?</h4>
              <p className="text-xs text-zinc-400">
                This will wipe all {items.length} photo(s) and video(s) from your local browser database. This action cannot be undone.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  {isClearing ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
