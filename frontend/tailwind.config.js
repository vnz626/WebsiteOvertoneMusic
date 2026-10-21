/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Violet neon — warna utama brand (dipakai tombol, link aktif, glow)
        brand: {
          50: "#f3f1ff",
          100: "#e9e5ff",
          400: "#b39dff",
          500: "#a078ff",
          600: "#8b5cf6",
          700: "#6d3bd7",
        },
        accent: "#00b894",
        // Token desain homepage baru
        ts: {
          primary: "#4648d4",
          container: "#6063ee",
          fixed: "#e1e0ff",
          low: "#f2f3ff",
          canvas: "#F8FAFC",
          lime: "#CCFF00",
          void: "#0B0F19",
          voidsurface: "#1E293B",
          perforated: "#CBD5E1",
          subtle: "#E2E8F0",
          muted: "#64748B",
          ink: "#0F172A",
        },
        // Kategori sekunder & tersier untuk badge/aksen (dipakai di kartu event)
        secondary: "#ff6b81",
        tertiary: "#ffb95f",
        // Token permukaan gelap ala Material You — dipakai di mode gelap
        surface: {
          lowest: "#0a0e18",
          DEFAULT: "#0f131d",
          low: "#171b26",
          container: "#1c1f2a",
          high: "#262a35",
          highest: "#313540",
          bright: "#353944",
        },
        outline: {
          DEFAULT: "#958ea0",
          variant: "#494454",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
