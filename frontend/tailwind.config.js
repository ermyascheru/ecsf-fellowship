/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#172B4D',
          hover: '#203A60',
          secondary: '#24456F',
          light: '#36649B',
          subtle: '#EBF2FA',
          muted: '#64748B',
          border: '#CBD5E1',
        },
        biblical: {
          navy: '#172B4D',
          darkBg: '#121A28',
          darkCard: '#1A2536',
          darkCardHover: '#202C3D',
          darkBorder: '#29384E',
          ivory: '#F8FAFC',
          softWhite: '#FFFFFF',
          accent: '#2563EB',
          accentLight: '#3B82F6',
          accentMuted: '#64748B',
        },
        navy: {
          950: '#0E1624',
          900: '#121A28',
          850: '#172B4D',
          800: '#1A2536',
          700: '#202C3D',
          600: '#29384E',
          500: '#344563',
          400: '#42526E',
        },
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
        },
        surface: {
          ground: '#F8FAFC',
          card: '#FFFFFF',
          muted: '#F1F5F9',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
