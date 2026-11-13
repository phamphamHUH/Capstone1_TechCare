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

// =========================
// END SESSION (LOGOUT)
// =========================
// Clears only the auth keys (keeps e.g. a doctor's unsaved drafts) and goes to /login.
export function endSession() {
  AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
  if (window.location.pathname !== "/login") window.location.assign("/login");
}

// =========================
// SESSION EXPIRED
// =========================
// Logs out and stops the request. The returned promise never finishes, so the
// page's own catch block never runs: no console error and no red error
// message while the browser is already going to /login.
function sessionExpired() {
  endSession();
  return new Promise<never>(() => {});
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// =========================
// RESPONSE INTERCEPTOR
// =========================
// Runs on every failed request:
//   1. Not a session problem       -> give the error to the page as usual
//   2. Already retried, still 401  -> session expired (e.g. account deactivated)
//   3. First 401                   -> get a new token and retry once
//   4. New token not possible      -> session expired (refresh token expired too)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetriableConfig | undefined;
    const status = error?.response?.status;
    const url = config?.url ?? "";

    // 1. NOT A SESSION PROBLEM
    // A 401 from login/refresh means a wrong password, not an expired token.
    // No token means nobody is logged in (e.g. dev without login).
    const isAuthCall =
      url.includes("/api/auth/login") || url.includes("/api/auth/refresh");
    const isLoggedIn = Boolean(sessionStorage.getItem("token"));

    if (status !== 401 || !config || isAuthCall || !isLoggedIn) {
      return Promise.reject(error);
    }

    // 2. ALREADY RETRIED, STILL 401
    if (config._retried) {
      return sessionExpired();
    }

    // 3. FIRST 401: GET A NEW TOKEN
    const token = await refreshAccessToken();

    // 4. NEW TOKEN NOT POSSIBLE
    if (!token) {
      return sessionExpired();
    }

    // Retry once. The request interceptor attaches the new token.
    config._retried = true;
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
