/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F2D52',
          dark: '#07182C',
          light: '#1B477D',
        },
        secondary: {
          DEFAULT: '#4A90E2',
          light: '#72A9EA',
          dark: '#226BBF',
        },
        success: {
          DEFAULT: '#2E8B57',
          light: '#3CB371',
        },
        warning: {
          DEFAULT: '#F4A261',
          light: '#F6B783',
        },
        danger: {
          DEFAULT: '#E63946',
          light: '#EE6B76',
        },
        gray: {
          lightest: '#F5F7FA',
          light: '#E2E8F0',
          medium: '#94A3B8',
          dark: '#475569',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass-sm': '0 2px 8px 0 rgba(15, 45, 82, 0.04)',
        'glass-md': '0 8px 32px 0 rgba(15, 45, 82, 0.08)',
        'glass-lg': '0 12px 48px 0 rgba(15, 45, 82, 0.12)',
        'glow-sky': '0 0 15px rgba(74, 144, 226, 0.5)',
        'glow-red': '0 0 15px rgba(230, 57, 70, 0.5)',
      },
      backdropBlur: {
        'glass': '12px',
      }
    },
  },
  plugins: [],
}
