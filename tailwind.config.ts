import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Identidade All Black estrita
        ink: "#000000",
        paper: "#ffffff",
        brand: {
          DEFAULT: "#dc2626", // ações, navegação ativa
          bright: "#ef4444", // marcas de dado sobre preto (contraste 4.8:1)
        },
        // Estados de check-in — nunca vermelho, para não competir com a marca
        ok: "#199e70",
        late: "#c98500",
      },
    },
  },
  plugins: [],
};

export default config;
