/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Navbar } from './components/Navbar';
import { CameraView } from './components/CameraView';
import { GalleryView } from './components/GalleryView';
import { LightboxModal } from './components/LightboxModal';
import { SettingsModal } from './components/SettingsModal';
import { MultiImportModal } from './components/MultiImportModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CameraSettings, MediaItem } from './types/media';
import { getMediaItems, deleteMediaItem } from './services/db';
import { Upload, CheckCircle2 } from 'lucide-react';

const DEFAULT_SETTINGS: CameraSettings = {
  facingMode: 'environment',
  aspectRatio: 'full',
  filterId: 'none',
  photoQuality: 0.92,
  videoResolution: '1080p',
  soundEnabled: true,
  hapticsEnabled: true,
  gridEnabled: false,
  torchEnabled: false,
  recordAudio: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'settings'>('camera');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [settings, setSettings] = useState<CameraSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  // Multi-Import state & Global Drag/Drop
  const [isMultiImportOpen, setIsMultiImportOpen] = useState<boolean>(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState<boolean>(false);
  const [importToast, setImportToast] = useState<string | null>(null);

  // Initialize PWA autoUpdate Service Worker registration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        registerSW({
          immediate: true,
          onNeedRefresh() {
            console.log('Camera Man update available.');
          },
          onOfflineReady() {
            console.log('Camera Man is ready for full offline use.');
          },
        });
      } catch (err) {
        console.warn('SW registration error:', err);
      }
    }
  }, []);

  // Global window drag-and-drop listener
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDraggingGlobal(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDraggingGlobal(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingGlobal(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        setDroppedFiles(Array.from(e.dataTransfer.files));
        setIsMultiImportOpen(true);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Initialize theme from system preference or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('camera_man_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.classList.toggle('light', initial === 'light');
    }

    // Load saved camera settings
    const savedSettings = localStorage.getItem('camera_man_settings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        // ignore
      }
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('camera_man_theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  // Update settings and persist
  const updateSettings = (partial: Partial<CameraSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('camera_man_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Refresh items from IndexedDB
  const refreshItems = useCallback(async () => {
    try {
      const allItems = await getMediaItems('all', 'newest');
      setItems(allItems);
    } catch (err) {
      console.error('Error loading media items:', err);
    }
  }, []);

  // Initial media load
  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  // Handle new media capture
  const handleMediaCaptured = (item: MediaItem) => {
    setItems((prev) => [item, ...prev]);
  };

  // Handle batch import completion
  const handleBatchImportComplete = async (newItems: MediaItem[]) => {
    await refreshItems();
    setImportToast(`Added ${newItems.length} media item(s) to offline storage`);
    setTimeout(() => setImportToast(null), 4000);
  };

  // Handle single deletion from Lightbox
  const handleDeleteMedia = async (id: string) => {
    await deleteMediaItem(id);
    await refreshItems();
  };

  const openMultiImport = () => {
    setDroppedFiles([]);
    setIsMultiImportOpen(true);
  };

  const recentMedia = items.length > 0 ? items[0] : null;

  return (
    <div
      className={`flex flex-col bg-[#0B0B0F] light:bg-[#F8FAFC] text-slate-100 light:text-slate-900 transition-colors ${
        activeTab === 'camera' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
    >
      {/* Global Drag-and-Drop Overlay */}
      {isDraggingGlobal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-md border-4 border-dashed border-amber-400 animate-in fade-in pointer-events-none">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 animate-bounce">
            <Upload className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Drop Photos & Videos Here</h2>
          <p className="text-xs text-zinc-300">
            Release to instantly multi-import into your offline Camera Man gallery
          </p>
        </div>
      )}

      {/* Top Navigation Bar conforming to the 3-zone contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mediaCount={items.length}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col ${activeTab !== 'camera' ? 'pb-16 sm:pb-0' : 'overflow-hidden'}`}>
        {activeTab === 'camera' && (
          <CameraView
            settings={settings}
            updateSettings={updateSettings}
            onMediaCaptured={handleMediaCaptured}
            recentMedia={recentMedia}
            onOpenGallery={() => setActiveTab('gallery')}
            onOpenMultiImport={openMultiImport}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            items={items}
            refreshItems={refreshItems}
            onSelectMedia={(_item, index) => setSelectedMediaIndex(index)}
            onNavigateToCamera={() => setActiveTab('camera')}
            onOpenMultiImport={openMultiImport}
          />
        )}

        {activeTab === 'settings' && (
          <div className="w-full flex-1 p-3 sm:p-4">
            <SettingsModal
              settings={settings}
              updateSettings={updateSettings}
              items={items}
              refreshItems={refreshItems}
              onClose={() => setActiveTab('camera')}
              onOpenMultiImport={openMultiImport}
            />
          </div>
        )}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar when outside Camera view */}
      {activeTab !== 'camera' && (
        <nav
          aria-label="Mobile Navigation"
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 light:bg-white/95 backdrop-blur-md border-t border-zinc-800/80 light:border-zinc-200 px-6 py-2 flex items-center justify-around pb-safe shadow-2xl transition-all"
        >
          <button
            onClick={() => setActiveTab('camera')}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-md">
              <span className="text-xs font-bold">📷</span>
            </div>
            <span>Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'gallery' ? 'text-amber-400' : 'text-zinc-400'
            }`}
          >
            <span className="text-base">🖼️</span>
            <span>Gallery ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
              activeTab === 'settings' ? 'text-amber-400' : 'text-zinc-400'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>
      )}

      {/* Full-screen Lightbox Modal */}
      {selectedMediaIndex !== null && (
        <LightboxModal
          items={items}
          currentIndex={selectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
          onNavigate={(newIdx) => setSelectedMediaIndex(newIdx)}
          onDelete={handleDeleteMedia}
          onRefresh={refreshItems}
        />
      )}

      {/* Multi-Import Modal */}
      <MultiImportModal
        isOpen={isMultiImportOpen}
        onClose={() => {
          setIsMultiImportOpen(false);
          setDroppedFiles([]);
        }}
        onImportComplete={handleBatchImportComplete}
        initialFiles={droppedFiles}
      />

      {/* Import Success Toast Notification */}
      {importToast && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-emerald-500/50 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{importToast}</span>
        </div>
      )}

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
}
