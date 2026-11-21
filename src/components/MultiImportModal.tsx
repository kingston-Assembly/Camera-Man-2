/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FileVideo,
  Sparkles,
  Trash2,
  FolderPlus,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { FILTER_PRESETS } from '../constants/filters';
import { processFileForImport, saveMediaItemsBatch } from '../services/db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (items: MediaItem[]) => void;
  initialFiles?: File[];
}

interface QueuedFile {
  id: string;
  file: File;
  previewUrl?: string;
  type: 'photo' | 'video';
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export const MultiImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportComplete,
  initialFiles = [],
}) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [appliedFilter, setAppliedFilter] = useState<string>('none');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize with initial files if passed (e.g. from app-level drag & drop)
  useEffect(() => {
    if (initialFiles.length > 0) {
      addFilesToQueue(initialFiles);
    }
  }, [initialFiles]);

  // Clean up object URLs on unmount or queue reset
  useEffect(() => {
    return () => {
      queue.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
    };
  }, [queue]);

  if (!isOpen) return null;

  const addFilesToQueue = (files: File[] | FileList) => {
    const validFiles: QueuedFile[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)$/i.test(file.name);

      if (isImage || isVideo) {
        let previewUrl: string | undefined;
        if (isImage) {
          try {
            previewUrl = URL.createObjectURL(file);
          } catch {
            // ignore
          }
        }

        validFiles.push({
          id: `${file.name}_${file.size}_${Date.now()}_${Math.random()}`,
          file,
          previewUrl,
          type: isVideo ? 'video' : 'photo',
          status: 'pending',
        });
      }
    });

    setQueue((prev) => [...prev, ...validFiles]);
    setIsComplete(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const clearQueue = () => {
    queue.forEach((q) => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
    });
    setQueue([]);
    setIsComplete(false);
  };

  // Start Batch Import Pipeline
  const startImport = async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: queue.length });

    try {
      const processedItems: Array<Omit<MediaItem, 'id'>> = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'processing' } : q))
        );

        try {
          const processed = await processFileForImport(item.file, appliedFilter);
          processedItems.push(processed);

          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: 'done' } : q))
          );
        } catch (err) {
          console.error(`Error processing ${item.file.name}:`, err);
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: 'error', error: 'Failed to process' } : q
            )
          );
        }

        setProgress({ current: i + 1, total: queue.length });
      }

      // Batch save into IndexedDB
      const saved = await saveMediaItemsBatch(processedItems);
      setImportedCount(saved.length);
      setIsComplete(true);
      onImportComplete(saved);
    } catch (err) {
      console.error('Batch import failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalBytes = queue.reduce((acc, q) => acc + q.file.size, 0);
  const photoCount = queue.filter((q) => q.type === 'photo').length;
  const videoCount = queue.filter((q) => q.type === 'video').length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-zinc-100 overflow-hidden"
      >
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is standard in WebKit/Blink for directory picker
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Import Media
              </h3>
              <p className="text-xs text-zinc-400">Add multiple photos and videos to offline storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Dropzone Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              isDraggingOver
                ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
                : 'border-zinc-700/80 hover:border-amber-500/50 hover:bg-zinc-900/60 bg-zinc-900/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto text-amber-400 mb-3 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Drag & drop multiple photos and videos here
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4 leading-relaxed">
              Supports JPEG, PNG, WebP, GIF, MP4, WebM, MOV, and high-res camera exports.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95 shadow cursor-pointer"
              >
                Choose Multiple Files
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Import Folder</span>
              </button>
            </div>
          </div>

          {/* Queue Section */}
          {queue.length > 0 && !isComplete && (
            <div className="space-y-3">
              {/* Summary and Batch Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">{queue.length} items queued</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-400">
                    {photoCount} photos, {videoCount} videos ({formatSize(totalBytes)})
                  </span>
                </div>
                {!isProcessing && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Optional Batch Filter Preset Selector */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Apply Filter to Photos:</span>
                </div>
                <select
                  value={appliedFilter}
                  disabled={isProcessing}
                  onChange={(e) => setAppliedFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white cursor-pointer"
                >
                  {FILTER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress Bar (Visible while processing) */}
              {isProcessing && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-amber-300">
                      Processing & generating thumbnails...
                    </span>
                    <span className="font-mono text-zinc-400">
                      {progress.current} of {progress.total} (
                      {Math.round((progress.current / progress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round((progress.current / progress.total) * 100)}%`,
                      }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Queued Items List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 max-w-[70%]">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 bg-zinc-950"
                        />
                      ) : item.type === 'video' ? (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                          <FileVideo className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <FileImage className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-zinc-200 font-medium truncate block">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatSize(item.file.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'processing' && (
                        <span className="text-[10px] text-amber-400 animate-pulse">
                          Encoding...
                        </span>
                      )}
                      {item.status === 'done' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      {item.status === 'pending' && !isProcessing && (
                        <button
                          onClick={() => removeQueueItem(item.id)}
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {isComplete && (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Import Complete!</h4>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                Successfully added <strong className="text-white">{importedCount} media items</strong> to your private offline gallery.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <span>View in Gallery</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {queue.length > 0 && !isComplete && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            >
              + Add more files
            </button>

            <button
              onClick={startImport}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isProcessing
                  ? `Importing (${progress.current}/${progress.total})...`
                  : `Import & Save ${queue.length} Items`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
