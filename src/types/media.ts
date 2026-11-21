/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MediaType = 'photo' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  blob: Blob;
  thumbnailBlob: Blob;
  filename: string;
  timestamp: number;
  size: number;
  width: number;
  height: number;
  duration?: number; // In seconds, for videos
  mimeType: string;
  filter?: string;
  isFavorite?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  cssFilter: string;
  canvasFilter?: string;
  accentColor: string;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  isPersistent: boolean;
  itemCount: number;
  photoCount: number;
  videoCount: number;
}

export type AspectRatioType = 'full' | '4:3' | '16:9' | '1:1';

export interface CameraSettings {
  facingMode: 'user' | 'environment';
  aspectRatio: AspectRatioType;
  filterId: string;
  photoQuality: number; // 0.7 - 1.0
  videoResolution: '1080p' | '720p';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  gridEnabled: boolean;
  torchEnabled: boolean;
  recordAudio: boolean;
}

export type SortOrder = 'newest' | 'oldest' | 'largest' | 'smallest';
export type FilterType = 'all' | 'photo' | 'video' | 'favorites';
