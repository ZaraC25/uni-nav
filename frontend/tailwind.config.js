import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.resolve(__dirname, "index.html"),
    path.resolve(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#b5d4ff",
          300: "#84b5ff",
          400: "#4e8dfb",
          500: "#2e6ef0",
          600: "#1f56d6",
          700: "#1b45ad",
          800: "#1b3c8a",
          900: "#1c3570",
        },
      },
    },
  },
  plugins: [],
};
