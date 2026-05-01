/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ludo token colors (muted, premium)
        ludo: {
          green:  '#2D7D46',
          'green-light': '#4CAF71',
          red:    '#C0392B',
          'red-light': '#E05748',
          blue:   '#1A5276',
          'blue-light': '#2E86C1',
          yellow: '#B7860B',
          'yellow-light': '#D4AC0D',
          gold:   '#F0C040',
        },
        // Background palette
        bg: {
          deep:   '#0A0E1A',
          dark:   '#111827',
          card:   '#1A2235',
          glass:  'rgba(255,255,255,0.05)',
        },
        // Accent
        accent: {
          primary: '#6C63FF',
          glow:    '#8B80FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      boxShadow: {
        glass:  '0 4px 32px 0 rgba(0,0,0,0.37)',
        glow:   '0 0 20px rgba(108,99,255,0.4)',
        'glow-green':  '0 0 16px rgba(45,125,70,0.6)',
        'glow-red':    '0 0 16px rgba(192,57,43,0.6)',
        'glow-blue':   '0 0 16px rgba(26,82,118,0.6)',
        'glow-yellow': '0 0 16px rgba(183,134,11,0.6)',
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heartbeat':     'heartbeat 0.8s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'glow-ring':     'glowRing 2s ease-in-out infinite',
        'dice-bounce':   'diceBounce 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'token-trail':   'tokenTrail 0.4s ease-out',
        'ripple':        'ripple 0.6s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'fade-in':       'fadeIn 0.4s ease-out',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%':      { transform: 'scale(1.15)' },
          '28%':      { transform: 'scale(1)' },
          '42%':      { transform: 'scale(1.1)' },
          '70%':      { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        glowRing: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.08)' },
        },
        diceBounce: {
          '0%':   { transform: 'scale(1) rotate(0deg)' },
          '30%':  { transform: 'scale(1.4) rotate(180deg)' },
          '60%':  { transform: 'scale(0.9) rotate(320deg)' },
          '80%':  { transform: 'scale(1.05) rotate(355deg)' },
          '100%': { transform: 'scale(1) rotate(360deg)' },
        },
        ripple: {
          '0%':   { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
