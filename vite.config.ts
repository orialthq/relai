import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed at https://orialthq.github.io/relai/ — base must match the repo path.
export default defineConfig({
  base: "/relai/",
  plugins: [react()],
});
