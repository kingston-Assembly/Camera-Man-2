/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Share2,
  PlusSquare,
  X,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Sparkles,
} from 'lucide-react';

interface Props {
  variant?: 'nav' | 'card' | 'compact' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'nav', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // If already installed as standalone PWA
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Camera Man is installed on your device in standalone mode.</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If native prompt is available (e.g. Chrome on standalone window)
    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (!success) {
        setShowGuideModal(true);
      }
    } else {
      // Show guided install modal with platform-specific instructions and URL opener
      setShowGuideModal(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleOpenInNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      {variant === 'card' ? (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border border-amber-500/30 shadow-xl ${className}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Install Camera Man App
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              Install to your home screen or desktop for full-screen camera view, zero-latency capture, and 100% offline access.
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        </div>
      ) : variant === 'floating' ? (
        <button
          onClick={handleInstallClick}
          title="Install Camera Man PWA"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xl active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install PWA</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          title="Install Camera Man to home screen or desktop"
          className={`flex items-center justify-center p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-medium transition active:scale-95 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-amber-400" />
        </button>
      ) : (
        /* Nav variant */
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="Install Camera Man Progressive Web App"
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Install App</span>
        </button>
      )}

      {/* Comprehensive Guided Installation Modal */}
      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl text-zinc-100 space-y-5"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install Camera Man</h3>
                <p className="text-xs text-zinc-400">Offline Camera & Gallery PWA</p>
              </div>
            </div>

            {/* If inside iframe: offer direct open in full browser */}
            {isInIframe && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Environment Detected</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  To trigger native one-click browser installation, open the application in a full browser tab:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleOpenInNewWindow}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Browser</span>
                  </button>
                  <button
                    onClick={handleCopyUrl}
                    title="Copy App URL"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Instructions Accordion / Cards */}
            <div className="space-y-3 text-xs">
              {/* iOS Safari Instructions */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-zinc-200">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>On iPhone & iPad (Safari)</span>
                </div>
                <ol className="space-y-1.5 text-[11px] text-zinc-400 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-zinc-500">1.</span>
                    <span>Tap the <strong className="text-zinc-200">Share</strong> icon in the Safari navigation bar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-zinc-500">2.</span>
                    <span>Scroll down and select <strong className="text-zinc-200">Add to Home Screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-zinc-500">3.</span>
                    <span>Tap <strong className="text-zinc-200">Add</strong> in the top right.</span>
                  </li>
                </ol>
              </div>

              {/* Chrome & Android Instructions */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-zinc-200">
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span>On Chrome, Edge & Android</span>
                </div>
                <ol className="space-y-1.5 text-[11px] text-zinc-400 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-zinc-500">1.</span>
                    <span>Look for the <strong className="text-zinc-200">Install icon (⊕ or ⬇)</strong> on the right side of the address bar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-zinc-500">2.</span>
                    <span>Or click the browser menu (<strong className="text-zinc-200">⋮</strong>) and tap <strong className="text-zinc-200">Install Camera Man</strong>.</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Offline Readiness Note */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Camera Man Service Worker is active and caches all assets.</span>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
