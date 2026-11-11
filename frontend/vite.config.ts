import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          // Keep SSE notification and queue streams open for their full lifetime.
          timeout: 0,
          proxyTimeout: 0,
        },
      },
    },
  };
});

// React code
//     │
//     ▼
// api.get("/api/fdstaff/patients")
//     │
//     ▼
// Browser sends request to
// http://localhost:5173/api/fdstaff/patients
//     │
//     ▼
// Vite (running on 5173) receives it
//     │
//     ▼
// Vite proxy forwards it to
// http://localhost:5000/api/fdstaff/patients
//     │
//     ▼
// Express handles the request
