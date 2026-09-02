import type { Config } from 'tailwindcss';

/**
 * Fonte única de verdade visual do Campus.
 *
 * Os nomes aqui são IDÊNTICOS aos nomes dos styles/variables do arquivo do Figma
 * ("Campus — Design System & App (CP4)") e aos tokens documentados em
 * docs/06-marca/identidade-visual.md. É isso que liga design e código: mudar um
 * token exige atualizar os três no mesmo PR.
 *
 * Nenhum componente pode usar valor arbitrário de cor, fonte, raio, sombra ou
 * espaçamento: a regra `no-restricted-syntax` do ESLint reprova `className` com
 * valor entre colchetes (`text-[#E8542E]`, `p-[13px]`).
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // `colors` substitui (não estende) a paleta padrão: nada fora destas 30 cores
    // entra na interface, e `text-blue-500` deixa de existir.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      coral: {
        50: '#FAF4F2',
        100: '#F7E6E1',
        200: '#F3CBC1',
        300: '#F0A693',
        400: '#EE7D60',
        500: '#E8542E',
        600: '#C83A16',
        700: '#9B2E13',
        800: '#6F2411',
        900: '#491A0E',
      },
      teal: {
        50: '#F2F8F7',
        100: '#DEEFED',
        200: '#BDE5E0',
        300: '#82D9CF',
        400: '#27BFAE',
        500: '#0F7A6E',
        600: '#0C6258',
        700: '#094D46',
        800: '#093A34',
        900: '#072723',
      },
      neutral: {
        50: '#FBFBFA',
        100: '#F2F1EE',
        200: '#E7E5E0',
        300: '#D6D3CC',
        400: '#A9A5A0',
        500: '#767D85',
        600: '#5C6269',
        700: '#43484E',
        800: '#2A2E33',
        900: '#14181C',
      },

      // Tokens semânticos: é o que os componentes usam. Componente que referencia
      // `coral-600` direto em vez de `accent-strong` é revisão reprovada.
      bg: '#FBFBFA',
      surface: '#FFFFFF',
      'surface-2': '#F2F1EE',
      border: '#E7E5E0',
      'border-strong': '#767D85',
      text: '#14181C',
      'text-muted': '#5C6269',
      'text-subtle': '#767D85',
      'text-disabled': '#A9A5A0',
      accent: '#E8542E',
      'accent-strong': '#C83A16',
      'accent-hover': '#9B2E13',
      'accent-soft': '#F7E6E1',
      'accent-2': '#0F7A6E',
      'accent-2-hover': '#0C6258',
      'accent-2-soft': '#DEEFED',
      danger: '#6F2411',
    },

    fontFamily: {
      display: ['Space Grotesk', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      body: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
    },

    // A escala tipográfica inteira, com line-height e letter-spacing embutidos.
    // Não existe tamanho fora daqui: `text-[15px]` é erro de lint.
    fontSize: {
      'mono-xs': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.1em' }],
      'mono-sm': ['0.75rem', { lineHeight: '1.0625rem', letterSpacing: '0.04em' }],
      'body-xs': ['0.75rem', { lineHeight: '1.125rem' }],
      'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
      'body-md': ['0.875rem', { lineHeight: '1.375rem' }],
      'display-sm': ['1rem', { lineHeight: '1.3125rem', letterSpacing: '-0.01em' }],
      'display-md': ['1.25rem', { lineHeight: '1.5625rem', letterSpacing: '-0.01em' }],
      'display-lg': ['1.5rem', { lineHeight: '1.8125rem', letterSpacing: '-0.02em' }],
      'display-xl': ['1.75rem', { lineHeight: '1.9375rem', letterSpacing: '-0.02em' }],
      'display-2xl': ['2.25rem', { lineHeight: '2.375rem', letterSpacing: '-0.03em' }],
    },

    // Escala de 4px. Mantém os utilitários numéricos do Tailwind que já são
    // múltiplos de 4 e remove os quebrados (1.5, 2.5, 3.5...).
    spacing: {
      0: '0px',
      px: '1px',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      7: '1.75rem',
      8: '2rem',
      10: '2.5rem',
      11: '2.75rem',
      12: '3rem',
      14: '3.5rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      full: '100%',
    },

    borderRadius: {
      none: '0px',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
      full: '9999px',
    },

    boxShadow: {
      none: 'none',
      sm: '0 1px 2px rgba(20, 24, 28, 0.05)',
      md: '0 4px 12px rgba(20, 24, 28, 0.08)',
      lg: '0 12px 32px rgba(20, 24, 28, 0.12)',
      // Anel de foco: 4,98:1 sobre o fundo da tela (RNF-002, WCAG 1.4.11).
      focus: '0 0 0 3px rgba(200, 58, 22, 0.35)',
    },

    borderWidth: { 0: '0px', DEFAULT: '1px', 2: '2px', 3: '3px' },

    maxWidth: {
      // O app é mobile; no desktop ele é uma coluna centralizada, não um painel.
      content: '40rem',
      full: '100%',
      none: 'none',
    },

    screens: {
      xs: '390px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
    },

    extend: {
      // 21 colunas: a grade do QR Code do ingresso (src/components/ui/QrCode.tsx).
      gridTemplateColumns: { 21: 'repeat(21, minmax(0, 1fr))' },
      minHeight: { touch: '2.75rem' },
      minWidth: { touch: '2.75rem' },
      height: { topbar: '3.5rem', bottomnav: '4rem' },
      transitionDuration: { fast: '150ms', DEFAULT: '200ms' },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translate(-50%, 1rem)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'toast-in': 'toast-in 200ms ease-out',
        skeleton: 'pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
