/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Painel Infantil - Flash Theme
        hero: {
          primary: '#FF6B6B',    // Vermelho coral suave
          secondary: '#FF8E8E',  // Vermelho mais claro
          accent: '#FFD93D',     // Amarelo dourado suave
          light: '#FFFFFF',      // Branco puro
          background: '#F8FAFC', // Fundo suave
        },
        // Painel Adulto - Clean Theme
        parent: {
          primary: '#2563EB',    // Azul principal
          secondary: '#1E40AF',  // Azul mais escuro
          accent: '#3B82F6',     // Azul claro
          text: '#374151',       // Cinza escuro para texto
          background: '#FFFFFF', // Fundo branco
          muted: '#F3F4F6',      // Cinza claro
        },
        // Estados e feedback
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
      fontFamily: {
        // Fonte infantil
        comic: ['Comic Neue', 'cursive'],
        // Fonte adulta
        inter: ['Inter', 'sans-serif'],
        // Fonte de destaque
        poppins: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        // Tamanhos otimizados para toque
        'touch-sm': ['16px', '24px'],
        'touch-base': ['18px', '28px'],
        'touch-lg': ['20px', '32px'],
        'touch-xl': ['24px', '36px'],
      },
      spacing: {
        // Sistema de espaçamento 8px
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
      },
      borderRadius: {
        // Bordas arredondadas para elementos infantis
        'hero': '1rem',
        'parent': '0.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Sombras customizadas
        'hero': '0 4px 12px rgba(0, 0, 0, 0.25)',
        'hero-hover': '0 8px 24px rgba(0, 0, 0, 0.3)',
        'parent': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'parent-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(255, 215, 0, 0.5)',
        'glow-intense': '0 0 40px rgba(255, 215, 0, 0.8)',
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