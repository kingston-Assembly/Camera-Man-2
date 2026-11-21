/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, hasChanged } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (hasChanged && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasChanged, isOnline]);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-zinc-900/95 text-zinc-100 border border-zinc-700/80 px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2"
      >
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold text-white">Offline Mode</span>
          <span className="text-[11px] text-zinc-400">All camera and gallery features work 100% locally</span>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-950/90 text-emerald-200 border border-emerald-800/80 px-3 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md transition-all animate-in fade-in"
      >
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        <span>Connected to network</span>
      </div>
    );
  }

  return null;
};
