# Managing the Database (RDS) and Photos (S3)

The day-to-day guide, written for people who already know the **Neon** and
**Cloudinary** dashboards. Each section starts with "In Neon you…" and then shows the
AWS way. Setup itself is in [AWS_SETUP.md](AWS_SETUP.md).

**The one big difference:** Neon has the tables and SQL editor *inside* its website.
AWS's RDS page does **not**. The AWS website is only for the *server* (start/stop,
password, backups, size). To see tables and rows you connect with a **database app**
(DBeaver or VS Code). Once connected, it feels like Neon's editor.

Always check you're in **Sydney (ap-southeast-2)**; other regions look empty.

---

## Quick map: Neon / Cloudinary → AWS

| You did this in Neon / Cloudinary | Do this in AWS |
|---|---|
| Neon **Tables** / **SQL Editor** | DBeaver or VS Code PostgreSQL extension ([section 1](#1-see-tables-and-run-sql)) |
| Neon **Connect** button (copy URL) | RDS → `techcare-db` → Connectivity & security → Endpoint ([section 2](#2-get-the-connection-url)) |
| Neon **Roles** → reset password | RDS → Modify → Master password ([section 3](#3-change-the-password)) |
| Neon **Monitoring** | RDS → `techcare-db` → **Monitoring** tab ([section 4](#4-check-health-and-usage)) |
| Neon **Restore / history** | RDS → Actions → Restore to point in time ([section 5](#5-backups-and-restoring)) |
| Neon **Branches** | No direct equivalent; snapshot → restore as a copy ([section 5](#5-backups-and-restoring)) |
| Neon auto-suspend | RDS runs 24/7 (free tier covers it). Can stop manually ([section 6](#6-stop-start-delete)) |
| Neon **Settings → Delete project** | RDS → Actions → Delete ([section 6](#6-stop-start-delete)) |
| Neon IP allow list | Security group inbound rules ([section 7](#7-who-can-connect-firewall)) |
| Cloudinary **Media Library** | S3 → `techcare-clinic-uploads` → Objects ([section 8](#8-photos-s3-instead-of-cloudinary-media-library)) |
| Cloudinary usage / credits | Billing → Free plan credits ([section 9](#9-cost-and-credits)) |

---

## 1. See tables and run SQL

### Option A: DBeaver (closest to Neon's Tables page)
1. Download **DBeaver Community** from dbeaver.io and install it.
2. **Database → New Database Connection → PostgreSQL → Next.**
3. Fill in:
   | Field | Value |
   |---|---|
   | Host | the RDS endpoint (`techcare-db.xxxx.ap-southeast-2.rds.amazonaws.com`) |
   | Port | `5432` |
   | Database | `techcare` |
   | Username | `postgres` |
   | Password | the master password (tick "Save password") |
4. **SSL** tab → tick **Use SSL** → SSL mode **require**.
5. **Test Connection** (it may offer to download a driver; say yes) → **Finish**.

Then in the left panel: `techcare-db → techcare → Schemas → public → Tables`.
- Double-click a table → **Data** tab = Neon's table view (scroll, filter, sort, edit cells, then **Save** at the bottom).
- **SQL Editor → New SQL script** (or `Ctrl+]`) = Neon's SQL Editor. `Ctrl+Enter` runs the current statement.

### Option B: VS Code (no extra app)
1. Extensions (`Ctrl+Shift+X`) → install **PostgreSQL** (by Microsoft).
2. Click the elephant icon in the sidebar → **Add Connection** → same values as the table above, SSL on.
3. Expand the connection to see tables; right-click a table → **Select Top 1000** to view rows,
   or open a new query and run SQL.

### Option C: psql (command line)
```bash
psql "postgresql://postgres:PASSWORD@ENDPOINT:5432/techcare?sslmode=require"
```
`\dt` lists tables, `\d users` shows a table's columns, `\q` quits.

### Don't change the table structure here
Same rule as with Neon: add/remove columns and tables by editing `TABLES` in
`backend/src/config/db.ts`; the backend syncs the schema itself. Editing **rows**
in DBeaver is fine; editing **columns/tables** by hand will be overwritten or cause drift.

---

## 2. Get the connection URL

Neon gives you a ready-made URL. RDS gives you the pieces:

RDS → **Databases** → `techcare-db` → **Connectivity & security** tab → copy **Endpoint**.

```
postgresql://postgres:PASSWORD@ENDPOINT:5432/techcare?sslmode=require
```

That's the `DATABASE_URL` for `backend/.env` and Render.

---

## 3. Change the password

RDS → `techcare-db` → **Modify** (top right) → **Settings** → **Master password** → type
the new one twice → scroll down → **Continue** → choose **Apply immediately** → **Modify DB instance**.

Takes a minute or two. Then update `DATABASE_URL` everywhere it's used (`.env`, Render,
DBeaver), or the app can't log in.

---

## 4. Check health and usage

RDS → `techcare-db`:

| Tab / place | What it shows | Watch for |
|---|---|---|
| **Summary** (top) | Status, size (`db.t4g.micro`), region | Status should be **Available** |
| **Monitoring** | CPU, connections, free storage, read/write | **Free storage space** approaching 0 (you have 20 GiB); **CPU** stuck near 100% |
| **Logs & events** | Recent events (restarts, backups, password changes), Postgres logs | Errors after a crash or failed login |
| **Configuration** | Engine version, storage, backup settings | — |
| **Maintenance & backups** | Backup window, pending upgrades, snapshots | Pending maintenance |

Quick checks in SQL (DBeaver / psql):
```sql
-- database size
SELECT pg_size_pretty(pg_database_size('techcare'));

-- biggest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- who is connected right now
SELECT usename, client_addr, state, query_start FROM pg_stat_activity
WHERE datname = 'techcare';
```

---

## 5. Backups and restoring

### Automatic backups (like Neon's restore history)
RDS backs up the database every day and keeps **1 day** of history (set at creation).

**Restore** (e.g. someone deleted data by mistake):
RDS → `techcare-db` → **Actions → Restore to point in time** → pick a time → give it a
new name like `techcare-db-restored` → **Restore**.

Important difference from Neon: **this creates a second, separate database server**.
It does not overwrite the current one. Then either:
- point `DATABASE_URL` at the restored one, or
- connect to it in DBeaver, copy back just the rows you need, then delete it.

A second server uses free-tier hours too (750 hours/month total covers **one** server
running all month). **Delete the extra one when you're done.**

### Manual snapshot (a "save point" before something risky)
Use before big changes, seeding, or migrations:
RDS → `techcare-db` → **Actions → Take snapshot** → name it (e.g. `before-seed-2026-11-20`) → **Take snapshot**.

Find them under RDS → **Snapshots**. To restore one: select it → **Actions → Restore snapshot**
(again creates a new server). Delete old snapshots you don't need; the free tier only
covers 20 GB of backup storage.

### "Branches"
RDS has no branches. The closest thing is: take a snapshot → restore it as a new
server → test on that → delete it. For everyday testing, a local Postgres or a free
Neon branch is cheaper and faster.

---

## 6. Stop, start, delete

- **Neon auto-suspends; RDS doesn't.** It runs all the time, and the free tier covers
  one server running 24/7, so you normally leave it on.
- **Stop** (e.g. long break): RDS → `techcare-db` → **Actions → Stop temporarily**.
  AWS **starts it again automatically after 7 days**. Storage is still counted while stopped.
- **Start**: Actions → **Start**.
- **Reboot** (if it's stuck): Actions → **Reboot**. A few minutes of downtime.
- **Delete**: Actions → **Delete** → it asks whether to keep a final snapshot (say yes
  unless you're sure) → type `delete me`. If **Deletion protection** is on, first turn
  it off via **Modify**.

Turn **deletion protection** on once the database holds real clinic data:
Modify → **Enable deletion protection** → Apply immediately.

---

## 7. Who can connect (firewall)

Neon accepts any IP; RDS uses a **security group** (`techcare-db-sg`) as its firewall.
It's currently open to everyone (`0.0.0.0/0`), like Neon, so the **password is the lock**.

To view or change: RDS → `techcare-db` → Connectivity & security → click
`techcare-db-sg` → **Inbound rules** → **Edit inbound rules**.

- If connections suddenly **time out** everywhere, check this rule still exists:
  PostgreSQL, port 5432, source `0.0.0.0/0`.
- Leave **Outbound rules** alone.

### Give a teammate read-only access (optional)
Instead of sharing the `postgres` password, create a login that can only read:
```sql
CREATE ROLE teammate_ro LOGIN PASSWORD 'a-long-random-password';
GRANT CONNECT ON DATABASE techcare TO teammate_ro;
GRANT USAGE ON SCHEMA public TO teammate_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO teammate_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO teammate_ro;
```
Remove it later with `DROP OWNED BY teammate_ro; DROP ROLE teammate_ro;`.

---

## 8. Photos: S3 instead of Cloudinary Media Library

S3 → **General purpose buckets** → `techcare-clinic-uploads` → **Objects** tab.

| Cloudinary | S3 |
|---|---|
| Media Library folders | Folders: `techcare/patients/`, `techcare/patient_photos/`, `techcare/user_photos/` |
| Click an image to preview | Click the file → **Open** (top right) |
| Copy URL | Click the file → **Object URL** (this is what's saved in the database) |
| Search by name | Search box filters by **prefix** (start of the path), e.g. `techcare/patients/` |
| Delete | Tick the file(s) → **Delete** → type `permanently delete` |
| Upload | **Upload** → Add files → Upload (rarely needed; the app uploads) |
| Usage / storage | Bucket → **Metrics** tab (updates once a day) |
| Transformations (resize, crop in the URL) | **Not available** in S3. Images are stored as uploaded |

Files are named with a random ID (`3f2a…e9.jpg`), not the patient's name. To find a
person's photo, look it up from the database:
```sql
SELECT patient_id, first_name, last_name, image_url FROM patients WHERE last_name ILIKE 'dela cruz';
SELECT user_id, username, profile_photo FROM users WHERE username = 'jdoe';
```
Then open that URL, or search the key in the S3 Objects tab.

**Deleting a photo in S3 does not clear it in the database.** The patient/user row
still points at it and shows a broken image. Prefer changing the photo through the app.

Old photos uploaded before the switch still live in **Cloudinary** (their URLs start with
`res.cloudinary.com`). Manage those in Cloudinary as before.

### If the app's S3 key leaks
IAM → **Users** → `techcare-app` → **Security credentials** → find the key →
**Actions → Deactivate**, then **Delete** → **Create access key** → put the new values
in `.env` and Render.

---

## 9. Cost and credits

Like Cloudinary's credit meter: top right **Moonshot Mode ▾** → shows **Free plan
status** (credits remaining, days remaining). More detail under **Billing**.

Things that would use credits faster, so avoid them:
- Leaving a restored/extra database server running (section 5)
- Changing the instance size from `db.t4g.micro` or storage above 20 GiB
- Turning on Multi-AZ, RDS Proxy, Enhanced Monitoring, or Extended Support
- Keeping lots of manual snapshots

Never click **Upgrade plan** / **Activate advanced features**; that switches to paid billing.

---

## 10. Common tasks cheat sheet

| I want to… | Go to |
|---|---|
| Look at patients table | DBeaver → techcare → public → Tables → patients → Data |
| Run a query | DBeaver → SQL Editor → `Ctrl+Enter` |
| Copy the DB URL | RDS → techcare-db → Connectivity & security → Endpoint |
| Reset DB password | RDS → techcare-db → Modify → Master password → Apply immediately |
| Save a backup before something risky | RDS → techcare-db → Actions → Take snapshot |
| Undo a mistake from today | RDS → techcare-db → Actions → Restore to point in time (then delete the copy) |
| See if the DB is healthy | RDS → techcare-db → Monitoring |
| Fix "can't connect / timeout" | techcare-db-sg → Inbound rules → PostgreSQL 5432 from 0.0.0.0/0 |
| See uploaded photos | S3 → techcare-clinic-uploads → Objects → techcare/ |
| Check remaining credits | Top right account menu → Free plan status |
