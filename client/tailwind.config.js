/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Binds dark: variants to [data-theme="dark"] on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#FDFBF6', dark: '#1C1715' },
        surface: {
          DEFAULT: '#F8F5EE',
          dark: '#261F1D',
          2: '#F3EDE3',
          '2-dark': '#332C2A',
          '3-dark': '#3E3735',
        },
        border: {
          DEFAULT: '#E6DBCC',
          dark: '#484240',
          strong: '#D3C5B0',
          'strong-dark': '#5A5250',
        },
        text: {
          DEFAULT: '#261F1D',
          dark: '#F3EEE6',
          2: '#5C5653',
          '2-dark': '#C4BAB0',
          muted: '#6F6863',
          'muted-dark': '#A0958C',
        },
        primary: {
          DEFAULT: '#CF3426',
          dark: '#F29188',
          hover: '#AC2B20',
          'hover-dark': '#F5A79F',
          brand: '#D93E30',
          tint: '#F9E4DE',
          'tint-dark': '#47312E',
        },
        'on-primary': { DEFAULT: '#FDFBF6', dark: '#1C1715' },
        secondary: {
          DEFAULT: '#A03401',
          dark: '#E99C72',
          tint: '#F2E3D9',
          'tint-dark': '#48311F',
        },
        'on-secondary': { DEFAULT: '#FDFBF6', dark: '#1C1715' },
        accent: {
          DEFAULT: '#E87721',
          dark: '#FA8F2C',
          hi: '#FA8F2C',
          soft: '#E87721',
          tint: '#FDEEDE',
          'tint-dark': '#48311F',
        },
        'on-accent': { DEFAULT: '#261F1D', dark: '#1C1715' },
        bronze: {
          DEFAULT: '#8C5D23',
          dark: '#CD9652',
          tint: '#EFE8DD',
          'tint-dark': '#413225',
        },
        brown: { DEFAULT: '#825F45', dark: '#B59882' },
        sage: {
          DEFAULT: '#636650',
          dark: '#9B9D8E',
          fill: '#797D62',
          tint: '#EDECE4',
          'tint-dark': '#39332F',
        },
        'rust-fill': '#A03401',
        salmon: '#F29188',
        peach: '#E99C72',
        tan: '#D08C60',
        success: {
          DEFAULT: '#636650',
          dark: '#9B9D8E',
          tint: '#EDECE4',
          'tint-dark': '#39332F',
        },
        warning: {
          DEFAULT: '#8C5D23',
          dark: '#FA8F2C',
          fill: '#E87721',
          tint: '#FDEEDE',
          'tint-dark': '#48311F',
        },
        danger: {
          DEFAULT: '#CF3426',
          dark: '#EF6B5E',
          tint: '#F9E4DE',
          'tint-dark': '#47312E',
        },
        info: {
          DEFAULT: '#825F45',
          dark: '#B59882',
          tint: '#EFE8DD',
          'tint-dark': '#413225',
        },
        'focus-ring': { DEFAULT: '#A03401', dark: '#FA8F2C' },
        overlay: {
          DEFAULT: 'rgba(38,31,29,0.5)',
          dark: 'rgba(0,0,0,0.6)',
        },
        panel: {
          DEFAULT: '#261F1D',
          text: '#FDFBF6',
          'text-2': '#C4BAB0',
          accent: '#FA8F2C',
        },
      },
      boxShadow: {
        'sonar-light': '0 1px 2px rgba(38,31,29,.06), 0 4px 16px rgba(38,31,29,.06)',
        'sonar-dark': '0 0 0 1px rgba(253,251,246,.06)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(10px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '80%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        'bounce-in': 'bounce-in 0.4s ease-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
    },
  },
  plugins: [],
};
