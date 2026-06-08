import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        w: {
          bg:        '#111827',
          card:      '#1F2937',
          border:    '#374151',
          primary:   '#7CBF9E',
          secondary: '#A78BFA',
          accent:    '#FB7185',
          warning:   '#FDBA74',
          info:      '#60A5FA',
          text:      '#F9FAFB',
          muted:     '#9CA3AF',
          dim:       '#6B7280',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.3)',
        card: '0 2px 12px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}

export default config
