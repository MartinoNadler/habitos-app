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
        'app-bg':      '#0a0a0f',
        'surface':     '#13131a',
        'surface-2':   '#1c1c26',
        'surface-3':   '#252535',
        'accent':      '#7c6fff',
        'accent-dim':  '#4a3faa',
        'green':       '#4fffa0',
        'amber':       '#ffb84f',
        'red-soft':    '#ff6b6b',
        'text-muted':  '#6b6b8a',
        'text-dim':    '#9494b0',
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        mono:  ['var(--font-space-mono)', 'Space Mono', 'monospace'],
      },
      borderRadius: {
        'xl2': '16px',
        'xl3': '20px',
        'xl4': '24px',
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}

export default config
