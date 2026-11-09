'use strict';

/**
 * NUKRON Installer Asset & Wizard Preparation Script
 * - Compiles the custom WPF Optical Glass Setup Wizard (build/NukronSetupUI.cs -> build/NukronSetupUI.exe)
 *   using the built-in Windows .NET Framework 4.x compiler (csc.exe).
 * - Generates branded 24-bit BMP assets for NSIS fallback/uninstaller surfaces
 *   (installerSidebar.bmp, uninstallerSidebar.bmp, installerHeader.bmp).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const LOGO_PATH = path.join(ROOT_DIR, 'assets', 'logos', 'nukron-logo.png');
const ICON_PATH = path.join(BUILD_DIR, 'icon.ico');
const CS_SOURCE = path.join(BUILD_DIR, 'NukronSetupUI.cs');
const EXE_OUTPUT = path.join(BUILD_DIR, 'NukronSetupUI.exe');

function findCscExe() {
  const windir = process.env.WINDIR || 'C:\\Windows';
  const candidates = [
    path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not locate .NET Framework v4.0.30319 csc.exe compiler.');
}

function compileSetupWizard() {
  if (!fs.existsSync(CS_SOURCE)) {
    throw new Error(`Missing installer UI source: ${CS_SOURCE}`);
  }
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error(`Missing NUKRON logo resource: ${LOGO_PATH}`);
  }

  const cscPath = findCscExe();
  const netDir = path.dirname(cscPath);
  const wpfDir = path.join(netDir, 'WPF');

  const args = [
    '/nologo',
    '/target:winexe',
    '/optimize+',
    `/out:${EXE_OUTPUT}`,
    `/r:${path.join(wpfDir, 'PresentationFramework.dll')}`,
    `/r:${path.join(wpfDir, 'PresentationCore.dll')}`,
    `/r:${path.join(wpfDir, 'WindowsBase.dll')}`,
    `/r:${path.join( netDir, 'System.Xaml.dll')}`,
    `/r:${path.join(netDir, 'System.dll')}`,
    `/r:${path.join(netDir, 'System.Core.dll')}`,
    `/r:${path.join(netDir, 'System.Drawing.dll')}`,
    `/r:${path.join(netDir, 'System.Windows.Forms.dll')}`,
    `/resource:${LOGO_PATH},nukron-logo.png`
  ];

  if (fs.existsSync(ICON_PATH)) {
    args.push(`/win32icon:${ICON_PATH}`);
  }

  args.push(CS_SOURCE);

  console.log('[prepare-installer] Compiling NUKRON Optical Glass Setup Wizard...');
  execFileSync(cscPath, args, { stdio: 'pipe', encoding: 'utf8' });

  if (!fs.existsSync(EXE_OUTPUT)) {
    throw new Error('csc.exe finished without producing NukronSetupUI.exe');
  }
  const stat = fs.statSync(EXE_OUTPUT);
  console.log(`[prepare-installer] Built ${path.relative(ROOT_DIR, EXE_OUTPUT)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

/**
 * Generates an uncompressed 24-bit BMP image with NUKRON Deep Midnight (#090D19),
 * Electric Blue (#2563EB), and Crimson Red (#E63946) optical refraction styling.
 */
function createBrandedBmp(width, height, pixelFn) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;
  const buf = Buffer.alloc(fileSize, 0);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0, 2, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const bmpRow = height - 1 - y;
    const rowStart = 54 + bmpRow * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y, width, height);
      const idx = rowStart + x * 3;
      buf[idx] = Math.max(0, Math.min(255, Math.round(b)));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[idx + 2] = Math.max(0, Math.min(255, Math.round(r)));
    }
  }

  return buf;
}

function generateNsisBitmaps() {
  // Sidebar bitmap (164x314) for installer & uninstaller
  const sidebarBmp = createBrandedBmp(164, 314, (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;

    // Top 3px optical accent bar (Electric Blue -> Sky Blue -> Crimson)
    if (y < 3) {
      if (nx < 0.5) {
        const t = nx / 0.5;
        return [
          37 + (96 - 37) * t,
          99 + (165 - 99) * t,
          235 + (250 - 235) * t
        ];
      }
      const t = (nx - 0.5) / 0.5;
      return [
        96 + (230 - 96) * t,
        165 + (57 - 165) * t,
        250 + (70 - 250) * t
      ];
    }

    // Right border hairline
    if (x === w - 1) {
      return [30, 44, 72];
    }

    // Base Deep Midnight gradient (#090D19 -> #111827)
    let r = 9 + ny * 8;
    let g = 13 + ny * 11;
    let b = 25 + ny * 16;

    // Electric Blue radial glow near top-left
    const dx1 = (x - 42) / 90;
    const dy1 = (y - 68) / 90;
    const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    if (d1 < 1) {
      const glow = Math.pow(1 - d1, 2) * 0.28;
      r += 37 * glow;
      g += 99 * glow;
      b += 235 * glow;
    }

    // Crimson ambient glow near bottom-right
    const dx2 = (x - 130) / 110;
    const dy2 = (y - 260) / 110;
    const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (d2 < 1) {
      const glow2 = Math.pow(1 - d2, 2) * 0.22;
      r += 230 * glow2;
      g += 57 * glow2;
      b += 70 * glow2;
    }

    // Subtle geometric NUKRON emblem ring in upper center
    const cx = w / 2;
    const cy = 84;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (dist >= 27 && dist <= 29.5) {
      return [59, 130, 246];
    }
    if (dist < 27) {
      r = 17;
      g = 24;
      b = 39;
      // Stylized 'N' inside emblem
      const rx = x - cx;
      const ry = y - cy;
      if (ry >= -11 && ry <= 11) {
        const leftBar = rx >= -9 && rx <= -5;
        const rightBar = rx >= 5 && rx <= 9;
        const diag = Math.abs(rx - (ry * 0.65)) <= 2.3 && rx >= -6 && rx <= 6;
        if (leftBar || rightBar) {
          return [248, 250, 252];
        }
        if (diag) {
          return [230, 57, 70];
        }
      }
    }

    return [r, g, b];
  });

  // Header bitmap (150x57)
  const headerBmp = createBrandedBmp(150, 57, (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;
    if (y < 2) {
      return [
        37 + (230 - 37) * nx,
        99 + (57 - 99) * nx,
        235 + (70 - 235) * nx
      ];
    }
    let r = 12 + ny * 6;
    let g = 18 + ny * 8;
    let b = 32 + ny * 12;
    const dx = (x - 120) / 60;
    const dy = (y - 28) / 40;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) {
      const glow = Math.pow(1 - d, 2) * 0.25;
      r += 37 * glow;
      g += 99 * glow;
      b += 235 * glow;
    }
    return [r, g, b];
  });

  const sidebarPath = path.join(BUILD_DIR, 'installerSidebar.bmp');
  const uninstallerSidebarPath = path.join(BUILD_DIR, 'uninstallerSidebar.bmp');
  const headerPath = path.join(BUILD_DIR, 'installerHeader.bmp');

  fs.writeFileSync(sidebarPath, sidebarBmp);
  fs.writeFileSync(uninstallerSidebarPath, sidebarBmp);
  fs.writeFileSync(headerPath, headerBmp);
  console.log('[prepare-installer] Generated branded NSIS BMP surfaces in build/');
}

function main() {
  compileSetupWizard();
  generateNsisBitmaps();
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('[prepare-installer] ERROR:', err.stderr ? err.stderr.toString() : err.message);
    if (err.stdout) console.error(err.stdout.toString());
    process.exit(1);
  }
}

module.exports = { main, compileSetupWizard, generateNsisBitmaps };

