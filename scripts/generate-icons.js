import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const iconsDir = path.resolve('public/icons');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create Brand SVG with beautiful camera graphic
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Subtle border -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#27272A" stroke-width="4"/>

  <!-- Camera Body Outline -->
  <rect x="96" y="140" width="320" height="240" rx="36" fill="#141419" stroke="#3F3F46" stroke-width="6"/>

  <!-- Flash/Sensor Bump on top left -->
  <rect x="136" y="108" width="80" height="32" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="4"/>
  <!-- Shutter Button on top right -->
  <rect x="300" y="112" width="68" height="28" rx="8" fill="url(#ringGrad)"/>

  <!-- Red Recording / Power indicator dot -->
  <circle cx="140" cy="180" r="10" fill="#EF4444" filter="url(#glow)"/>

  <!-- Viewfinder small window -->
  <rect x="340" y="168" width="44" height="26" rx="6" fill="#09090B" stroke="#52525B" stroke-width="3"/>

  <!-- Outer Lens Ring -->
  <circle cx="256" cy="265" r="95" fill="#09090B" stroke="#52525B" stroke-width="8"/>
  <circle cx="256" cy="265" r="82" fill="none" stroke="url(#ringGrad)" stroke-width="4"/>

  <!-- Inner Lens Glass -->
  <circle cx="256" cy="265" r="68" fill="url(#lensGrad)" opacity="0.9"/>
  <circle cx="256" cy="265" r="42" fill="#0F172A"/>

  <!-- Lens reflection highlight -->
  <path d="M 230 225 A 50 50 0 0 1 285 240" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
  <circle cx="275" cy="285" r="8" fill="#FFFFFF" opacity="0.4"/>
</svg>`;

// Maskable icon with 15% safe margin (centered inside 80% circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
    <linearGradient id="lensGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="ringGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad2)"/>

  <!-- Scaled camera within 70% safe zone -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Camera Body Outline -->
    <rect x="96" y="140" width="320" height="240" rx="36" fill="#141419" stroke="#3F3F46" stroke-width="6"/>

    <!-- Flash/Sensor Bump on top left -->
    <rect x="136" y="108" width="80" height="32" rx="10" fill="#27272A" stroke="#3F3F46" stroke-width="4"/>
    <!-- Shutter Button on top right -->
    <rect x="300" y="112" width="68" height="28" rx="8" fill="url(#ringGrad2)"/>

    <!-- Red Recording dot -->
    <circle cx="140" cy="180" r="10" fill="#EF4444"/>

    <!-- Viewfinder small window -->
    <rect x="340" y="168" width="44" height="26" rx="6" fill="#09090B" stroke="#52525B" stroke-width="3"/>

    <!-- Outer Lens Ring -->
    <circle cx="256" cy="265" r="95" fill="#09090B" stroke="#52525B" stroke-width="8"/>
    <circle cx="256" cy="265" r="82" fill="none" stroke="url(#ringGrad2)" stroke-width="4"/>

    <!-- Inner Lens Glass -->
    <circle cx="256" cy="265" r="68" fill="url(#lensGrad2)" opacity="0.9"/>
    <circle cx="256" cy="265" r="42" fill="#0F172A"/>

    <!-- Lens reflection highlight -->
    <path d="M 230 225 A 50 50 0 0 1 285 240" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
    <circle cx="275" cy="285" r="8" fill="#FFFFFF" opacity="0.4"/>
  </g>
</svg>`;

async function run() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  const standardBuf = Buffer.from(standardSvg);
  const maskableBuf = Buffer.from(maskableSvg);

  // 192x192
  await sharp(standardBuf).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  // 512x512
  await sharp(standardBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  // 512x512 maskable
  await sharp(maskableBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  // 180x180 apple touch icon
  await sharp(standardBuf).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  // favicon.ico (as 48x48 png fallback)
  await sharp(standardBuf).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Successfully generated all PWA icons!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
