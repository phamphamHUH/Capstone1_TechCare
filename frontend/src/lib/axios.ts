// import axios from "axios";

// export const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "https://techcare-hui6.onrender.com",
//   withCredentials: true,
// });

import axios, { type InternalAxiosRequestConfig } from "axios";
import { ENV } from "./env.config";

const api = axios.create({
  // Vite development: relative /api URLs through the proxy in vite.config.ts.
  // Production: VITE_API_BASE_URL. Empty means same origin (the monolith deployment).
  baseURL: import.meta.env.DEV ? "" : ENV.VITE_API_BASE_URL,
});



// ┌─────────┬──────────────────┬─────────────────────────────────────┬──────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┬───────────────────┐
// │ (index) │ deployment       │ baseURL                             │ axiosBehavior                                │ finalURL                                                    │ status            │
// ├─────────┼──────────────────┼─────────────────────────────────────┼──────────────────────────────────────────────┼────────────────────────────────────────———————————————┬———————————————┤
// │ 0       │ 'Monolithic'     │ 'undefined'                         │ 'Falls back to the page's own origin'        │ 'https://techcare-hui6.onrender.com/api/admin/services'     │ '✅ Correct'      │
// │ 1       │ 'Static (broken)'│ 'undefined or wrong'                │ 'Falls back to the page's own origin'        │ 'https://your-static-site.onrender.com/api/admin/services'  │ '❌ Wrong server' │
// │ 2       │ 'Static (fixed)' │ 'https://techcare-hui6.onrender.com'│ 'Uses that explicitly'                       │ 'https://techcare-hui6.onrender.com/api/admin/services'     │ '✅ Correct'      │
// └─────────┴──────────────────┴─────────────────────────────────────┴──────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┴───────────────────┘

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================
// SESSION REFRESH
// =========================
// The access token expires (JWT_EXPIRES_IN). On a 401 we trade the refresh
// token for a new pair once, then retry the request. If that fails too, the
// session is over and we send the user back to /login.

const AUTH_KEYS = ["token", "refreshToken", "user", "role"];

let pendingRefresh: Promise<string | null> | null = null;

// Shared by every caller, so a burst of 401s triggers a single refresh.
// Resolves to the new access token, or null when the session can't be renewed.
export function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= (async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    try {
      // Plain axios, not `api`, so this call never loops through the interceptor.
      const { data } = await axios.post<{ token: string; refreshToken: string }>(
        `${api.defaults.baseURL ?? ""}/api/auth/refresh`,
        { refreshToken },
      );
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      return data.token;
    } catch {
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

// Clears only the auth keys (keeps e.g. a doctor's unsaved drafts) and goes to /login.
export function endSession() {
  AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
  if (window.location.pathname !== "/login") window.location.assign("/login");
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetriableConfig | undefined;
    // A 401 from login/refresh means bad credentials, not an expired token.
    const url = config?.url ?? "";
    const isAuthCall =
      url.includes("/api/auth/login") || url.includes("/api/auth/refresh");

    if (
      error?.response?.status !== 401 ||
      !config ||
      config._retried ||
      isAuthCall ||
      !sessionStorage.getItem("token") // never logged in (e.g. dev without login)
    ) {
      return Promise.reject(error);
    }

    config._retried = true;
    const token = await refreshAccessToken();
    if (!token) {
      endSession();
      return Promise.reject(error);
    }

    // The request interceptor attaches the new token from sessionStorage.
    return api(config);
  },
);

export default api;
// There are two kinds of interceptors:

// Request interceptor (before sending)
// api.interceptors.request.use((config) => {
//   config.headers.Authorization = "Bearer token";
//   config.baseURL = "https://example.com";
//   config.timeout = 10000;

//   return config;
// });

//===========================================================================================
// interceptors is a property on the Axios instance.

// api.interceptors

// It contains tools for intercepting requests and responses.

// Conceptually:

// api = {
//     interceptors: {
//         request: { ... },
//         response: { ... }
//     }
// }
//===========================================================================================
// Response interceptor (after receiving)
// api.interceptors.response.use((response) => {
//   console.log(response.data);

//   return response;
// });

// Here, you can modify the response before the rest of your application sees it.
