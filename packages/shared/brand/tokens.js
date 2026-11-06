/**
 * Official NUKRON Design System Tokens ("Optical Glass" — Snell's Law Inspired)
 * Synchronized directly with renderer/styles.css, renderer/overlay.css, and apps/website/src/styles/main.css.
 * Palette: Primary Electric Blue (#2563EB) + Secondary Crimson Red (#E63946)
 * on Deep Midnight (#090D19), Secondary (#111827), and Surface (#172033).
 */
const BRAND_TOKENS = {
  name: 'NUKRON',
  fullName: 'NUKRON',
  tagline: 'Your games. Your universe.',
  designSystem: 'Optical Glass',
  opticalLaw: 'n1 * sin(theta1) = n2 * sin(theta2)',
  fonts: {
    brand: '"Unbounded", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
    ui: '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Code", "JetBrains Mono", "Consolas", monospace'
  },
  colors: {
    dark: {
      bg: '#090D19',
      bgElevated: '#111827',
      panel: '#111827',
      panel2: '#172033',
      surface: '#172033',
      text: '#F8FAFC',
      muted: '#AAB6CC',
      accentPrimary: '#2563EB',   // --a1: Primary Electric Blue
      accentSecondary: '#E63946', // --a2: Secondary Crimson Red
      accentHighlight: '#60A5FA', // --a3: Refracted Sky/Ice Blue highlight
      onAccent: '#F8FAFC',        // --on-a: Crisp alabaster white on Electric Blue
      ok: '#34D399',              // --ok: Live/emerald telemetry status
      danger: '#FDA4AF',
      glass: 'rgba(23, 32, 51, 0.42)',
      glassStrong: 'rgba(23, 32, 51, 0.64)',
      line: 'rgba(170, 182, 204, 0.22)',
      lineSoft: 'rgba(170, 182, 204, 0.12)'
    },
    light: {
      bg: '#F1F5F9',
      panel: '#FFFFFF',
      panel2: '#E2E8F0',
      surface: '#F8FAFC',
      text: '#0F172A',
      muted: '#475569',
      onAccent: '#F8FAFC',
      ok: '#059669',
      danger: '#E11D48'
    }
  },
  materials: {
    clearGlass: {
      name: 'Clear Glass',
      purpose: 'High transparency and restrained blur for floating elements, window controls, and navigation',
      backdropFilter: 'blur(12px) saturate(1.25)',
      background: 'linear-gradient(145deg, rgba(23, 32, 51, 0.40), rgba(9, 13, 25, 0.54))',
      border: 'rgba(170, 182, 204, 0.18)'
    },
    frostedGlass: {
      name: 'Frosted Glass',
      purpose: 'Medium transparency and controlled blur for cards, panels, dialogs, and settings',
      backdropFilter: 'blur(20px) saturate(1.38)',
      background: 'linear-gradient(150deg, rgba(23, 32, 51, 0.56), rgba(17, 24, 39, 0.46) 55%, rgba(9, 13, 25, 0.62))',
      border: 'rgba(170, 182, 204, 0.22)'
    },
    opticalAccentGlass: {
      name: 'Optical Accent Glass',
      purpose: 'Layered reflections, Snell refraction gradients, and blue/red chromatic edge lighting for active & selected elements',
      backdropFilter: 'blur(22px) saturate(1.45)',
      background:
        'radial-gradient(120% 80% at 14% -10%, rgba(37, 99, 235, 0.26), transparent 58%), radial-gradient(110% 80% at 88% 112%, rgba(230, 57, 70, 0.18), transparent 56%), linear-gradient(145deg, rgba(23, 32, 51, 0.64), rgba(17, 24, 39, 0.50))',
      border: 'rgba(96, 165, 250, 0.38)'
    }
  },
  gradients: {
    brand: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 58%, #1D4ED8 100%)',
    opticalSpectrum: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 52%, #E63946 100%)',
    surface: 'linear-gradient(150deg, rgba(248, 250, 252, 0.08), rgba(37, 99, 235, 0.03) 55%, rgba(230, 57, 70, 0.04))',
    scatter: 'radial-gradient(120% 75% at 16% -12%, rgba(37, 99, 235, 0.22), transparent 60%), radial-gradient(100% 70% at 88% 112%, rgba(230, 57, 70, 0.14), transparent 58%)',
    rim: 'linear-gradient(138deg, rgba(96, 165, 250, 0.68) 0%, rgba(248, 250, 252, 0.16) 28%, rgba(248, 250, 252, 0.06) 64%, rgba(230, 57, 70, 0.52) 100%)'
  },
  radii: {
    xl: '28px',
    lg: '22px',
    md: '14px',
    sm: '10px',
    pill: '999px'
  },
  easing: {
    standard: 'cubic-bezier(.2, .8, .2, 1)',
    outExpo: 'cubic-bezier(.16, 1, .3, 1)'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRAND_TOKENS;
}
if (typeof window !== 'undefined') {
  window.NUKRON_BRAND_TOKENS = BRAND_TOKENS;
  window.EMBER_BRAND_TOKENS = BRAND_TOKENS;
}
