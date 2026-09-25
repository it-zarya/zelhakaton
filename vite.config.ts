import { defineConfig } from "vite";
import { adminApi } from "./vite-admin-plugin";

// Админка контента (admin.html + /__admin/*) — только в dev-сервере, в сборку не попадает.
export default defineConfig({
  plugins: [adminApi()],
});
