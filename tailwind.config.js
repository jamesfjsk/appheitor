/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flash Red - Cor Principal (usado com parcimônia)
        flash: {
          red: '#DC2626',        // Vermelho principal - apenas para acentos
          'red-light': '#FEF2F2', // Vermelho muito claro - backgrounds sutis
          'red-soft': '#FECACA',  // Vermelho suave - estados hover
          'red-dark': '#B91C1C',  // Vermelho escuro - hover de botões
        },
        // Acentos Mínimos
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        gold: {
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        // Fonte principal
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Hierarquia tipográfica clara
        'xs': ['0.75rem', '1rem'],
        'sm': ['0.875rem', '1.25rem'],
        'base': ['1rem', '1.5rem'],
        'lg': ['1.125rem', '1.75rem'],
        'xl': ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
      },
      spacing: {
        // Sistema de espaçamento 8px
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
      },
      borderRadius: {
        // Bordas moderadas e elegantes
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        // Sombras sutis e elegantes
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'normal': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'elevated': '0 4px 6px rgba(0, 0, 0, 0.05)',
        'floating': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        // Animações customizadas
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'flash': 'flash 0.5s ease-in-out',
        'success-pop': 'successPop 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        successPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        // Breakpoints otimizados
        'xs': '480px',
        'tablet': '768px',
        'laptop': '1024px',
        'desktop': '1440px',
      },
      zIndex: {
        // Z-index organizados
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      transitionDuration: {
        // Durações de transição otimizadas
        '150': '150ms',
        '250': '250ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        // Easing functions customizadas
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    // Plugin para estados de foco acessíveis
    function({ addUtilities }) {
      addUtilities({
        '.focus-visible-ring': {
          '&:focus-visible': {
            outline: '2px solid #3B82F6',
            outlineOffset: '2px',
          },
        },
        '.touch-target': {
          minHeight: '48px',
          minWidth: '48px',
        },
        '.hero-gradient': {
          background: 'linear-gradient(135deg, #C8102E, #FF3131)',
        },
        '.hero-text-shadow': {
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
        },
        '.glass-effect': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      });
    },
  ],
}