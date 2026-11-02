/**
 * Official Ember Design System Tokens ("Liquid Glass")
 * Synchronized directly with renderer/styles.css and renderer/overlay.css.
 * Palette originates from the Ember logo: molten amber -> vibrant orange -> crimson on deep charcoal.
 */
const BRAND_TOKENS = {
  name: 'Ember',
  fullName: 'Ember Universal Launcher',
  designSystem: 'Liquid Glass',
  fonts: {
    brand: '"Unbounded", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
    ui: '"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Code", "JetBrains Mono", "Consolas", monospace'
  },
  colors: {
    dark: {
      bg: '#0d0e11',
      bgElevated: '#121318',
      panel: '#17181d',
      panel2: '#202127',
      text: '#f5efe8',
      muted: '#a59f98',
      accentPrimary: '#ff8a2b',   // --a1: Ember orange
      accentSecondary: '#e8401f', // --a2: Crimson flame
      accentHighlight: '#ffb454', // --a3: Molten amber
      onAccent: '#2a0c03',        // --on-a: Deep espresso text on amber/orange buttons
      ok: '#52d69a',              // --ok: Live/emerald status
      danger: '#ffa597',
      glass: '#ffffff0b',
      glassStrong: '#ffffff17',
      line: '#ffffff24',
      lineSoft: '#ffffff12'
    },
    light: {
      bg: '#f4f0ec',
      panel: '#ffffff',
      panel2: '#eee8e2',
      text: '#2a1d15',
      muted: '#6d625a',
      onAccent: '#2a0c03',
      ok: '#10835a',
      danger: '#b3261a'
    }
  },
  gradients: {
    brand: 'linear-gradient(135deg, #ffb454 0%, #ff7a1a 48%, #f0491f 100%)',
    surface: 'linear-gradient(150deg, #ffffff16, #ffffff07 55%, #ffffff0d)',
    scatter: 'radial-gradient(120% 70% at 18% -12%, #ffb45426, transparent 62%)',
    rim: 'linear-gradient(140deg, #ffffff8c, #ffffff12 26%, #ffffff07 62%, #ffb46a66)'
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
  window.EMBER_BRAND_TOKENS = BRAND_TOKENS;
}

