/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilterPreset } from '../types/media';

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'none',
    name: 'Normal',
    cssFilter: 'none',
    accentColor: '#94A3B8',
  },
  {
    id: 'vintage',
    name: 'Vintage 70s',
    cssFilter: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.2)',
    accentColor: '#D97706',
  },
  {
    id: 'noir',
    name: 'Noir Film',
    cssFilter: 'grayscale(1) contrast(1.3) brightness(0.95)',
    accentColor: '#E2E8F0',
  },
  {
    id: 'warm',
    name: 'Golden Hour',
    cssFilter: 'sepia(0.2) saturate(1.35) contrast(1.05) hue-rotate(-10deg)',
    accentColor: '#F59E0B',
  },
  {
    id: 'cyber',
    name: 'Cool Cyber',
    cssFilter: 'hue-rotate(185deg) saturate(1.25) contrast(1.1)',
    accentColor: '#06B6D4',
  },
  {
    id: 'vivid',
    name: 'Vivid Pop',
    cssFilter: 'saturate(1.6) contrast(1.15)',
    accentColor: '#EC4899',
  },
  {
    id: 'matte',
    name: 'Matte Film',
    cssFilter: 'contrast(0.9) brightness(1.08) saturate(0.85)',
    accentColor: '#A78BFA',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    cssFilter: 'hue-rotate(60deg) saturate(1.15) contrast(1.05)',
    accentColor: '#10B981',
  },
];
