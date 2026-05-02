/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy slate-cool dark palette — kept while migrating each
        // component over. Once every reference moves to `solar-*`, this
        // scale + the related blue-* references can be cleaned up in a
        // follow-up.
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Solar Flare palette — warm Eigengrau/Gold/Amber/Cream. Intent:
        // surfaces feel like deep space + low embers; primary accent is
        // Organic Gold (#FFD700) used sparingly so it reads as light, not
        // decoration. The numbered scale mirrors the legacy `dark` scale
        // so a className swap is a 1:1 substitution.
        solar: {
          900: '#050505',  // Eigengrau — bg base
          800: '#0F0A05',  // elevated panel bg
          700: '#1A130C',  // border / divider tone
          600: '#2B2317',  // hover surface
          500: '#9A8B6E',  // tertiary text
          400: '#D4C4A0',  // secondary text
          100: '#FFF8E7',  // Cream — primary text
          gold:  '#FFD700',  // Organic Gold — primary accent
          amber: '#FF9500',  // Deep Amber — active / hover
          warm:  '#E5B800',  // secondary accent
          ember: '#FF6B35',  // alert / wrong-state glow
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'class',
}
