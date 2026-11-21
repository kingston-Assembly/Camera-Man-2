/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Image as ImageIcon, Settings, Moon, Sun } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  activeTab: 'camera' | 'gallery' | 'settings';
  setActiveTab: (tab: 'camera' | 'gallery' | 'settings') => void;
  mediaCount: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  mediaCount,
  theme,
  toggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-[#0B0B0F]/90 light:bg-white/90 light:border-zinc-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in display face) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-zinc-950 shadow-sm shadow-amber-500/20">
            <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </div>
          <button
            onClick={() => setActiveTab('camera')}
            className="text-sm sm:text-base font-bold tracking-tight text-white light:text-zinc-900 whitespace-nowrap hover:opacity-90 transition cursor-pointer"
          >
            Camera Man
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line controls) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-zinc-800 text-white light:bg-zinc-100 light:text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-white light:text-zinc-600 light:hover:text-zinc-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-zinc-800 text-white light:bg-zinc-100 light:text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-white light:text-zinc-600 light:hover:text-zinc-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gallery</span>
            {mediaCount > 0 && (
              <span className="text-[10px] font-mono opacity-80">({mediaCount})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-zinc-800 text-white light:bg-zinc-100 light:text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-white light:text-zinc-600 light:hover:text-zinc-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action (PWA Install Button) & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Always visible, responsive PWA Install Button */}
          <PWAInstallButton variant="nav" />

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-100 transition cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
