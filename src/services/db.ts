/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaItem, FilterType, SortOrder, StorageStats } from '../types/media';

const DB_NAME = 'camera_man_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_items';

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('size', 'size', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };
  });
}

/**
 * Generate a lightweight WebP or JPEG thumbnail (~240px max dimension) from an image or video Blob.
 */
export async function createThumbnail(blob: Blob, type: 'photo' | 'video'): Promise<Blob> {
  return new Promise((resolve) => {
    if (type === 'photo') {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 240;
        let width = img.width || 300;
        let height = img.height || 200;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (thumbBlob) => {
              resolve(thumbBlob || blob);
            },
            'image/jpeg',
            0.8
          );
        } else {
          resolve(blob);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob);
      };
      img.src = url;
    } else {
      // Video thumbnail extraction from 0.5s or first frame
      const video = document.createElement('video');
      const url = URL.createObjectURL(blob);
      video.muted = true;
      video.preload = 'metadata';
      video.src = url;

      let resolved = false;
      const finish = (fallback: Blob) => {
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(url);
          resolve(fallback);
        }
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        try {
          const maxDim = 240;
          let width = video.videoWidth || 320;
          let height = video.videoHeight || 180;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            canvas.toBlob(
              (thumbBlob) => {
                finish(thumbBlob || blob);
              },
              'image/jpeg',
              0.8
            );
          } else {
            finish(blob);
          }
        } catch {
          finish(blob);
        }
      };

      video.onerror = () => finish(blob);
      // Timeout fallback in case video codec thumbnail extraction stalls
      setTimeout(() => finish(blob), 1500);
    }
  });
}

/**
 * Save a newly captured photo or recorded video into IndexedDB.
 */
export async function saveMediaItem(
  item: Omit<MediaItem, 'id' | 'thumbnailBlob'> & { id?: string; thumbnailBlob?: Blob }
): Promise<MediaItem> {
  const db = await getDB();
  const id = item.id || `cm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let thumbnailBlob = item.thumbnailBlob;
  if (!thumbnailBlob) {
    thumbnailBlob = await createThumbnail(item.blob, item.type);
  }

  const mediaItem: MediaItem = {
    ...item,
    id,
    thumbnailBlob,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(mediaItem);

    request.onsuccess = () => resolve(mediaItem);
    request.onerror = () => reject(new Error(`Failed to save media: ${request.error?.message}`));
  });
}

/**
 * Get all media items with optional filtering and sorting.
 */
export async function getMediaItems(
  filter: FilterType = 'all',
  sort: SortOrder = 'newest',
  searchQuery = ''
): Promise<MediaItem[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let items = (request.result as MediaItem[]) || [];

      // Filter by type or favorites
      if (filter === 'photo') {
        items = items.filter((i) => i.type === 'photo');
      } else if (filter === 'video') {
        items = items.filter((i) => i.type === 'video');
      } else if (filter === 'favorites') {
        items = items.filter((i) => i.isFavorite === true);
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        items = items.filter((i) =>
          i.filename.toLowerCase().includes(query) ||
          (i.filter && i.filter.toLowerCase().includes(query)) ||
          new Date(i.timestamp).toLocaleDateString().toLowerCase().includes(query)
        );
      }

      // Sorting
      items.sort((a, b) => {
        if (sort === 'newest') return b.timestamp - a.timestamp;
        if (sort === 'oldest') return a.timestamp - b.timestamp;
        if (sort === 'largest') return b.size - a.size;
        if (sort === 'smallest') return a.size - b.size;
        return 0;
      });

      resolve(items);
    };

    request.onerror = () => reject(new Error(`Failed to retrieve media: ${request.error?.message}`));
  });
}

/**
 * Get a single media item by ID.
 */
export async function getMediaItem(id: string): Promise<MediaItem | undefined> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as MediaItem | undefined);
    request.onerror = () => reject(new Error(`Failed to retrieve media item: ${request.error?.message}`));
  });
}

/**
 * Update a media item's mutable properties (e.g. filename, favorite status).
 */
export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as MediaItem;
      if (!existing) {
        reject(new Error(`Item ${id} not found`));
        return;
      }

      const updated = { ...existing, ...updates, id };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(new Error(`Failed to update item: ${putReq.error?.message}`));
    };

    getReq.onerror = () => reject(new Error(`Failed to find item for update: ${getReq.error?.message}`));
  });
}

/**
 * Delete a single media item by ID.
 */
export async function deleteMediaItem(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to delete item: ${request.error?.message}`));
  });
}

/**
 * Delete multiple media items by ID in a single transaction.
 */
export async function deleteMediaItems(ids: string[]): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let errorOccurred = false;
    ids.forEach((id) => {
      const req = store.delete(id);
      req.onerror = () => {
        errorOccurred = true;
      };
    });

    transaction.oncomplete = () => {
      if (errorOccurred) {
        reject(new Error('Some items could not be deleted'));
      } else {
        resolve();
      }
    };

    transaction.onerror = () => reject(new Error(`Batch deletion failed: ${transaction.error?.message}`));
  });
}

/**
 * Clear all stored media from the database.
 */
export async function clearAllMedia(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to clear media: ${request.error?.message}`));
  });
}

/**
 * Query detailed storage metrics and quota via StorageManager API.
 */
export async function checkStorageStats(): Promise<StorageStats> {
  let usedBytes = 0;
  let quotaBytes = 1024 * 1024 * 1024 * 2; // Default 2GB estimate
  let isPersistent = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usedBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || quotaBytes;
      } catch (err) {
        console.warn('Storage estimate failed:', err);
      }
    }

    if (navigator.storage.persisted) {
      try {
        isPersistent = await navigator.storage.persisted();
      } catch (err) {
        console.warn('Storage persisted check failed:', err);
      }
    }
  }

  // Also query items count
  let itemCount = 0;
  let photoCount = 0;
  let videoCount = 0;

  try {
    const all = await getMediaItems('all', 'newest');
    itemCount = all.length;
    photoCount = all.filter((i) => i.type === 'photo').length;
    videoCount = all.filter((i) => i.type === 'video').length;
  } catch {
    // ignore
  }

  const percentage = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

  return {
    usedBytes,
    quotaBytes,
    percentage,
    isPersistent,
    itemCount,
    photoCount,
    videoCount,
  };
}

/**
 * Request persistent storage from the browser.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Asynchronously inspects a File and extracts true dimensions, duration, thumbnail and metadata.
 */
export async function processFileForImport(
  file: File,
  appliedFilter = 'none'
): Promise<Omit<MediaItem, 'id'>> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv)$/i.test(file.name);
  const type: 'photo' | 'video' = isVideo ? 'video' : 'photo';
  const timestamp = file.lastModified && file.lastModified > 0 ? file.lastModified : Date.now();
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (type === 'photo') {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      let finished = false;

      const done = async (width: number, height: number) => {
        if (finished) return;
        finished = true;
        URL.revokeObjectURL(url);
        const thumbnailBlob = await createThumbnail(file, 'photo');
        resolve({
          type: 'photo',
          blob: file,
          thumbnailBlob,
          filename,
          timestamp,
          size: file.size,
          width,
          height,
          mimeType: file.type || 'image/jpeg',
          filter: appliedFilter !== 'none' ? appliedFilter : undefined,
          isFavorite: false,
        });
      };

      img.onload = () => {
        done(img.naturalWidth || img.width || 1920, img.naturalHeight || img.height || 1080);
      };
      img.onerror = () => {
        done(1920, 1080);
      };
      img.src = url;
      setTimeout(() => done(1920, 1080), 2000);
    });
  } else {
    // Video
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      let finished = false;

      const done = async (width: number, height: number, duration: number) => {
        if (finished) return;
        finished = true;
        URL.revokeObjectURL(url);
        const thumbnailBlob = await createThumbnail(file, 'video');
        resolve({
          type: 'video',
          blob: file,
          thumbnailBlob,
          filename,
          timestamp,
          size: file.size,
          width,
          height,
          duration,
          mimeType: file.type || 'video/webm',
          filter: appliedFilter !== 'none' ? appliedFilter : undefined,
          isFavorite: false,
        });
      };

      video.onloadedmetadata = () => {
        done(
          video.videoWidth || 1280,
          video.videoHeight || 720,
          Math.round(video.duration || 0)
        );
      };
      video.onerror = () => {
        done(1280, 720, 0);
      };
      video.src = url;
      setTimeout(() => done(1280, 720, 0), 2500);
    });
  }
}

/**
 * Batch save multiple media items in IndexedDB with real-time progress callbacks.
 */
export async function saveMediaItemsBatch(
  items: Array<Omit<MediaItem, 'id'>>,
  onProgress?: (processed: number, total: number) => void
): Promise<MediaItem[]> {
  const db = await getDB();
  const savedItems: MediaItem[] = [];
  const total = items.length;

  if (total === 0) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let count = 0;
    items.forEach((item, index) => {
      const id = `cm_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`;
      const mediaItem: MediaItem = {
        ...item,
        id,
      };
      const req = store.add(mediaItem);
      req.onsuccess = () => {
        savedItems.push(mediaItem);
        count++;
        if (onProgress) onProgress(count, total);
      };
      req.onerror = () => {
        console.warn(`Failed to save item ${item.filename}`);
      };
    });

    transaction.oncomplete = () => {
      resolve(savedItems);
    };

    transaction.onerror = () => {
      reject(new Error(`Batch save transaction failed: ${transaction.error?.message}`));
    };
  });
}

