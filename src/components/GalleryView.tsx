/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Trash2,
  Download,
  Camera,
  Play,
  Star,
  Upload,
  ArrowUpDown,
  X,
  Plus,
} from 'lucide-react';
import { MediaItem, FilterType, SortOrder } from '../types/media';
import { deleteMediaItem, deleteMediaItems, updateMediaItem, saveMediaItem } from '../services/db';

interface Props {
  items: MediaItem[];
  refreshItems: () => Promise<void>;
  onSelectMedia: (item: MediaItem, index: number) => void;
  onNavigateToCamera: () => void;
  onOpenMultiImport: () => void;
}

// Media Card component managing its own object URL lifecycle
const MediaCard: React.FC<{
  item: MediaItem;
  index: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent, item: MediaItem) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onDownload: (e: React.MouseEvent, item: MediaItem) => void;
}> = ({
  item,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onClick,
  onToggleFavorite,
  onDelete,
  onDownload,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(item.thumbnailBlob || item.blob);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={isSelectionMode ? () => onToggleSelect(item.id) : onClick}
      className={`group relative rounded-2xl overflow-hidden bg-zinc-900 border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl ${
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[0.98]'
          : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Thumbnail Aspect Box */}
      <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.filename}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
        )}

        {/* Top Badges / Checkbox */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
          {isSelectionMode ? (
            <div className="pointer-events-auto p-1 rounded-md bg-black/60 backdrop-blur-sm">
              {isSelected ? (
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400/20" />
              ) : (
                <Square className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Video Duration Badge */}
          {item.type === 'video' && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] sm:text-[11px] font-mono font-medium text-white shadow">
              <Play className="w-2.5 h-2.5 fill-white text-white" />
              <span>
                {Math.floor((item.duration || 0) / 60)}:
                {((item.duration || 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Filter Preset indicator */}
          {item.filter && item.filter !== 'none' && (
            <div className="px-1.5 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-sm text-[9px] sm:text-[10px] font-semibold text-zinc-950 uppercase">
              {item.filter}
            </div>
          )}
        </div>

        {/* Favorite Star Button */}
        {!isSelectionMode && (
          <button
            onClick={(e) => onToggleFavorite(e, item)}
            title={item.isFavorite ? 'Unfavorite' : 'Add to Favorites'}
            className={`absolute top-1.5 right-1.5 p-1 sm:p-1.5 rounded-lg backdrop-blur-md transition-opacity cursor-pointer ${
              item.isFavorite
                ? 'opacity-100 bg-black/60 text-amber-400'
                : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white hover:text-amber-400'
            }`}
          >
            <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}

        {/* Hover Quick Action Overlay */}
        {!isSelectionMode && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 sm:p-2.5">
            <div className="flex items-center justify-between gap-1 text-white">
              <span className="text-[10px] sm:text-[11px] font-medium truncate max-w-[60%]">
                {item.filename}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => onDownload(e, item)}
                  title="Download"
                  className="p-1 rounded bg-white/20 hover:bg-white/40 transition cursor-pointer"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={(e) => onDelete(e, item.id)}
                  title="Delete"
                  className="p-1 rounded bg-rose-500/40 hover:bg-rose-500/80 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-200" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unboxed Metadata Footer */}
      <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400">
        <span>{formatDate(item.timestamp)}</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span className="font-mono text-[9px] sm:text-[10px]">{formatSize(item.size)}</span>
      </div>
    </div>
  );
};

export const GalleryView: React.FC<Props> = ({
  items,
  refreshItems,
  onSelectMedia,
  onNavigateToCamera,
  onOpenMultiImport,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      if (filterType === 'photo') return item.type === 'photo';
      if (filterType === 'video') return item.type === 'video';
      if (filterType === 'favorites') return item.isFavorite === true;
      return true;
    })
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.filename.toLowerCase().includes(q) ||
        (item.filter && item.filter.toLowerCase().includes(q)) ||
        new Date(item.timestamp).toLocaleDateString().toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return b.timestamp - a.timestamp;
      if (sortOrder === 'oldest') return a.timestamp - b.timestamp;
      if (sortOrder === 'largest') return b.size - a.size;
      if (sortOrder === 'smallest') return a.size - b.size;
      return 0;
    });

  // Toggle single item selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible items
  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    try {
      await updateMediaItem(item.id, { isFavorite: !item.isFavorite });
      await refreshItems();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Download single item
  const handleDownload = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Delete single item
  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this item from offline storage?')) {
      try {
        await deleteMediaItem(id);
        await refreshItems();
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  // Batch delete selected items
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected item(s) permanently?`)) {
      setIsDeleting(true);
      try {
        await deleteMediaItems(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        await refreshItems();
      } catch (err) {
        console.error('Batch deletion failed:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Batch download selected items
  const handleBatchDownload = () => {
    const itemsToDownload = items.filter((i) => selectedIds.has(i.id));
    itemsToDownload.forEach((item, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }, index * 250);
    });
  };

  // Import files from device
  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) continue;

      await saveMediaItem({
        type: isVideo ? 'video' : 'photo',
        blob: file,
        filename: file.name,
        timestamp: Date.now(),
        size: file.size,
        width: 1920,
        height: 1080,
        mimeType: file.type,
        isFavorite: false,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await refreshItems();
  };

  const photoCount = items.filter((i) => i.type === 'photo').length;
  const videoCount = items.filter((i) => i.type === 'video').length;
  const favCount = items.filter((i) => i.isFavorite).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4">
      {/* Hidden File Input for Device Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleImportFiles}
        className="hidden"
      />

      {/* Gallery Header Controls (Responsive 2-Row or 1-Row layout) */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-zinc-800">
        {/* Row 1: Filter Segmented Control Tabs */}
        {/* Row 1: Filter Segmented Control Tabs & + Add Media Button */}
        <div className="w-full flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All <span className="text-[10px] opacity-75 font-mono">({items.length})</span>
            </button>
            <button
              onClick={() => setFilterType('photo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === 'photo'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Photos <span className="text-[10px] opacity-75 font-mono">({photoCount})</span>
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === 'video'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Videos <span className="text-[10px] opacity-75 font-mono">({videoCount})</span>
            </button>
            <button
              onClick={() => setFilterType('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === 'favorites'
                  ? 'bg-zinc-800 text-amber-300 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Favorites <span className="text-[10px] opacity-75 font-mono">({favCount})</span>
            </button>
          </div>

          {/* Dedicated + Add Media CTA */}
          <button
            onClick={onOpenMultiImport}
            title="Import multiple photos and videos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Media</span>
          </button>
        </div>

        {/* Row 2: Search, Sort, Import, and Batch Selection Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar (Flex-1 fills remaining space on all devices) */}
          <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortOrder}
              aria-label="Sort media by"
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-7 py-1.5 text-xs text-zinc-300 hover:text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="largest">Largest</option>
              <option value="smallest">Smallest</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Multi-Import Trigger Button */}
          <button
            onClick={onOpenMultiImport}
            title="Multi-import media files from device"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition cursor-pointer shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline sm:inline">Import</span>
          </button>

          {/* Multi-Select Toggle */}
          {items.length > 0 && (
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                isSelectionMode
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              {isSelectionMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select Floating Action Deck */}
      {isSelectionMode && (
        <div className="sticky top-15 z-30 flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-zinc-900/95 border border-amber-500/30 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              {selectedIds.size === filteredItems.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="text-[11px] sm:text-xs">
                {selectedIds.size === filteredItems.length ? 'Deselect' : 'Select All'}
              </span>
            </button>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-mono">
              ({selectedIds.size}/{filteredItems.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleBatchDownload}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-white transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Download</span>
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0 || isDeleting}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 disabled:opacity-40 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
            <Camera className="w-7 h-7 sm:w-8 sm:h-8 opacity-70" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white mb-1">
            {searchQuery
              ? 'No matching media'
              : filterType === 'favorites'
              ? 'No favorite photos or videos yet'
              : 'No media captured yet'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
            {searchQuery
              ? 'Try modifying your search query or clear the filter.'
              : 'Tap the camera button to capture your first offline photo or video, or import existing files from your device.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              onClick={onNavigateToCamera}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs shadow hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Open Camera</span>
            </button>
            <button
              onClick={onOpenMultiImport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Multi-Import / Add Media</span>
            </button>
          </div>
        </div>
      )}

      {/* Media Responsive Grid (Adapts seamlessly from 2 cols on mobile to 6 cols on 4K) */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 pb-12">
          {filteredItems.map((item, index) => (
            <MediaCard
              key={item.id}
              item={item}
              index={index}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
              onClick={() => onSelectMedia(item, index)}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteSingle}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
};
