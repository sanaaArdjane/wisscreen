import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest setup per node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md.
// `tsconfigPaths` resolves the `@/*` alias from tsconfig.json so tests import the same
// way the app does; `react` + jsdom keep the door open for component tests later.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    // Fills the browser APIs jsdom lacks (matchMedia, IntersectionObserver) so
    // components can use them without a `typeof` guard. See the file's own comment.
    setupFiles: ["./__tests__/setup.ts"],
    // Only pick up our own tests — never the copies bundled inside dependencies.
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
