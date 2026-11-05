---
name: techcare-auth-rbac
description: Full-stack authentication and role-based access for TechCare - login for staff AND patients, JWT access tokens, authMiddleware, role middleware, patientMiddleware with ownership checks, logout/active flag, sessionStorage on the client, axios interceptors, ProtectedRoute and role redirects. Use when touching login, tokens, 401/403 errors, role strings, protecting a new route, fixing IDOR on patient endpoints, or the refresh-token/env-name mismatch that makes login return 500.
---

# Auth + RBAC

## Roles (exact strings, used in DB, middleware, ProtectedRoute and URLs)
`admin` | `doctor` | `frontdesk-staff` | `laboratory-staff` | `patient`
Post-login navigation is `navigate('/' + role)`, so route paths must equal the role string.

## Token model
- Payload: `{ user_id, account_type: "user" | "patient" }` (for patients `user_id` holds the `patient_id`).
- Access token only, lifetime `JWT_EXPIRES_IN` (default `1d`), secret `JWT_SECRET`.
- Original code also signs a refresh token with `JWT_REFRESH_TOKEN`; nothing consumes it and a missing env var makes **login 500**. Either delete it or implement the endpoint below.

## Backend

### Login (`controllers/auth/postRequests.controller.ts`)
Looks in `users` first, then `patients`; username may be the email.
```ts
export async function login(req: Request, res: Response) {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

  const [user] = await sql`SELECT * FROM users WHERE username=${username} OR email=${username}`;
  const [patient] = user ? [] : await sql`SELECT * FROM patients WHERE username=${username} OR email=${username}`;
  const account = user ?? patient;

  // same message for unknown user and wrong password (no user enumeration)
  if (!account || !(await bcrypt.compare(password, account.password_hash)))
    return res.status(401).json({ message: "Invalid credentials" });
  if (account.account_status === false) return res.status(403).json({ message: "Account is deactivated" });

  const accountType = user ? "user" : "patient";
  const id = user ? user.user_id : patient.patient_id;
  if (user) await sql`UPDATE users SET active=TRUE, last_login=now() WHERE user_id=${id}`;
  else await sql`UPDATE patients SET updated_at=now() WHERE patient_id=${id}`;

  const token = jwt.sign({ user_id: id, account_type: accountType }, ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  const { password_hash, ...safe } = account;           // NEVER return the hash
  res.json({ message: "Login successful", accountType, user: safe, token });
}
export async function logout(req: Request, res: Response) {
  await sql`UPDATE users SET active=FALSE WHERE user_id=${req.user!.user_id}`;
  res.json({ message: "Logged out" });
}
```

### Middlewares
`auth.middleware.ts` (staff): verify JWT, require `account_type === "user"`, load a **column-listed** user row (not `SELECT *`), reject deactivated accounts, set `req.user`.
`role.middleware.ts`: `requireRole(...roles)` returns 403 on mismatch. Export `adminOnly`, `fdstaffOnly`, `doctorOnly`, `labstaffOnly`.
(Original: four near-identical files, role checks only active when `IS_PRODUCTION`. Make them unconditional.)

`patient.middleware.ts` with ownership:
```ts
export async function patientMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const p = jwt.verify(token, ENV.JWT_SECRET) as { user_id: string; account_type: string };
    if (p.account_type !== "patient") return res.status(403).json({ message: "Forbidden" });
    const [row] = await sql`SELECT patient_id FROM patients WHERE patient_id=${p.user_id} AND account_status`;
    if (!row) return res.status(401).json({ message: "Account unavailable" });
    res.locals.patientId = row.patient_id;
    next();
  } catch { res.status(401).json({ message: "Invalid or expired token" }); }
}
```
**Ownership rule**: patient handlers never trust `:patient_id` from the URL. Use `res.locals.patientId` in SQL, or compare and 403:
```ts
if (req.params.patient_id !== res.locals.patientId) return res.status(403).json({ message: "Forbidden" });
```
This fixes the original IDOR on `/api/patient/medical-history/:patient_id`, `/prescriptions/:patient_id`, and the released-results endpoint that ignores `:result_id` and returns everyone's results.

### Router wiring
```ts
// staff
router.use(authMiddleware, requireRole("doctor"));
// patient
router.use(patientMiddleware);
router.get("/prescriptions", getMyPrescriptions);   // uses res.locals.patientId
```

### Optional refresh endpoint (only if you want it)
```ts
// login also returns refreshToken = jwt.sign({ user_id, account_type }, ENV.JWT_REFRESH_SECRET, { expiresIn: "7d" })
router.post("/refresh", async (req, res) => {
  try {
    const p = jwt.verify(req.body.refreshToken, ENV.JWT_REFRESH_SECRET) as any;
    res.json({ token: jwt.sign({ user_id: p.user_id, account_type: p.account_type }, ENV.JWT_SECRET, { expiresIn: "1d" }) });
  } catch { res.status(401).json({ message: "Invalid refresh token" }); }
});
```
Name the env var `JWT_REFRESH_SECRET` and add it to `env.ts`; keep ONE name across code and docs.

### Password rules
`bcrypt.hash(pw, 10)`. Patient default password = last name (lowercased); force change in the portal if you can. Admin creates staff with an initial password.

## Frontend

### `auth/LoginPage.tsx`
```tsx
const { data } = await api.post("/api/auth/login", { username, password });
sessionStorage.setItem("token", data.token);
sessionStorage.setItem("role", data.user.role);
sessionStorage.setItem("user", JSON.stringify(data.user));
navigate(`/${data.user.role}`, { replace: true });
```
Handle 401 ("Invalid credentials"), 403 ("Account deactivated"), network error. Optionally call `GET /api/auth/ping` on mount to wake a sleeping Render instance.

### `lib/axios.ts`
Request interceptor adds `Authorization: Bearer <sessionStorage token>`; response interceptor on 401 clears storage and goes to `/login`.

### `lib/ProtectedRoute.tsx`
Checks `sessionStorage.token` and `role` in `allowedRoles`, else `<Navigate to="/login" replace />`. Original only enforces in `import.meta.env.PROD`: make it always enforce. It is display-only; the backend is the real gate.

### Logout
```ts
await api.patch("/api/auth/logout").catch(() => {});
sessionStorage.clear();
navigate("/login", { replace: true });
```

## Why sessionStorage
Token dies with the tab (fits shared clinic PCs) and is not sent automatically (no CSRF). Trade-off: XSS can read it, so never `dangerouslySetInnerHTML` unsanitized content.

## Status codes
400 missing fields, 401 no/invalid/expired token or bad credentials, 403 deactivated or wrong role, 409 duplicates elsewhere.

## Gotchas
1. `/api/test/sign-in` mints JWTs from a raw body: remove it before exposing any environment.
2. `authMiddleware` rejects patient tokens (users table lookup): by design; use `patientMiddleware` for patient routes.
3. Self-deactivation is blocked in `updateUserStatus`; keep it.
4. With role middleware off (`IS_PRODUCTION=false`) `req.user` is undefined, which is why controllers hardcoded `U-26-1001-0004`. Fix the root cause: always run auth.
5. Missing/typo'd env names (`REFRESH_TOKEN_SECRET` vs `JWT_REFRESH_TOKEN`) crash login: validate env at boot in `config/env.ts`.

## Tests
Login matrix (missing fields, wrong password, deactivated, patient, user), then one 401 and one 403 per router. See `techcare-testing`.