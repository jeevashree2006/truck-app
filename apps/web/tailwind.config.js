/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        status: {
          valid: "#16a34a",
          expiring: "#f59e0b",
          expired: "#ef4444",
          unknown: "#94a3b8",
        },
        // Dark surface palette
        ink: {
          900: "#0b1120",
          800: "#0f1a30",
          700: "#111a2e",
          600: "#1e293b",
          500: "#334155",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.12)",
        card: "0 1px 3px rgba(15,23,42,0.06), 0 12px 32px -12px rgba(15,23,42,0.18)",
        glow: "0 8px 30px -8px rgba(37,99,235,0.45)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #6366f1 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(29,78,216,0.12) 0%, rgba(99,102,241,0.10) 100%)",
        "violet-gradient": "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
