/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Solar Flare palette — warm Eigengrau/Gold/Amber/Cream. Surfaces
        // feel like deep space + low embers; primary accent is Organic
        // Gold (#FFD700) used sparingly so it reads as light, not
        // decoration. Replaced the cool slate `dark.*` scale entirely
        // (deleted in the cleanup pass once every reference migrated).
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
