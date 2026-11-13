# AWS Setup — RDS (Database) + S3 (File Storage)

This records how TechCare's AWS infrastructure was created, so it can be reproduced or
recreated later. The account is on the **AWS Free plan** ($100 credit, ~182 days),
locked to **Asia Pacific (Sydney) ap-southeast-2**. Stay on free-tier-eligible options
everywhere — never click "Upgrade plan" / "Activate advanced features".

The server (Express backend) is **not** deployed to AWS yet — only the database and
file storage. The backend currently still runs wherever it's hosted today and connects
out to these two AWS services.

---

## Part 1 — Database: Amazon RDS (PostgreSQL)

Replaces Neon as the Postgres host.

### 1. Open RDS
AWS Console → search **RDS** → **Databases** → **Create database**.
(Use the full **"Create database"** form under "Create with full configuration", not
"Easy create" — Easy create hides the public-access, security-group, and initial
database name settings we need.)

### 2. Engine options
- **Engine type:** PostgreSQL
- **Engine version:** latest available (e.g. 18.3-R2)
- **Enable RDS Extended Support:** leave **unchecked** (this is a paid add-on)

### 3. Templates
- **Free tier**

### 4. Availability and durability
- **Single-AZ DB instance (1 instance)** — do not pick Multi-AZ or Aurora, those aren't free tier

### 5. Settings
- **DB instance identifier:** `techcare-db`
- **Master username:** `postgres`
- **Credentials management:** Self managed
- **Master password:** set a strong password and **save it** (password manager / secure note) — you cannot retrieve it later, only reset it
- **Database authentication options:** Password authentication

### 6. Instance configuration
- **DB instance class:** Burstable classes → **`db.t4g.micro`** (free tier eligible)

### 7. Storage
- **Storage type:** General Purpose SSD (**gp2**) — gp2, not gp3, is the type actually covered by RDS free tier
- **Allocated storage:** 20 GiB
- **Storage autoscaling:** leave unchecked / default (don't need it)

### 8. Connectivity
- **Compute resource:** Don't connect to an EC2 compute resource
- **VPC:** Default VPC
- **Public access: Yes** — required since the backend isn't on AWS yet and needs to reach this database over the internet
- **VPC security group:** Create new → name it `techcare-db-sg`
- **RDS Proxy:** leave **unchecked** (this has additional cost)
- **Certificate authority:** leave default (`rds-ca-rsa2048-g1`)

### 9. Additional configuration
- **Initial database name:** `techcare` — **do not skip this field**. If left blank,
  RDS creates the server but no actual database inside it.
- **DB parameter group / Option group:** leave default
- **Enable encryption:** leave checked (no extra cost)
- **Backup:**
  - Enable automated backup: checked
  - Backup retention period: **1 day** (keep low — free tier backup storage is limited)
  - Backup replication to another region: leave **unchecked**
- **Maintenance:**
  - Enable auto minor version upgrade: checked
  - Maintenance window: No preference
- **Enable deletion protection:** leave **unchecked** while still setting things up (turn
  this on later once the database holds real data you don't want accidentally deleted —
  Modify → check the box → Apply)

### 10. Create
Click **Create database**. Provisioning takes 5–10 minutes. Status goes
**Creating** → **Backing-up** (first automatic backup) → **Available**.

### 11. Open the firewall for your IP
RDS auto-creates one inbound rule on `techcare-db-sg` for your current IP during
creation. Confirm it, rather than adding a duplicate:

1. RDS → `techcare-db` → **Connectivity & security** tab → click the security group
   link (`techcare-db-sg`).
2. This opens **EC2 → Security Groups**. Click the group's ID/checkbox to expand it.
3. **Inbound rules** tab → should show exactly **one** rule:
   Type `PostgreSQL`, Port `5432`, Source = your public IP (`x.x.x.x/32`).
   If there are two identical rows, delete one, keep one, **Save rules**.
4. **Leave Outbound rules untouched** — must stay **All traffic → 0.0.0.0/0 (Anywhere)**.
   Do not change outbound to "My IP"; that would block the database from reaching
   AWS's own services.

> If your home/office internet IP changes later (common with ISPs that don't give a
> static IP), you'll need to come back here and update the inbound rule's source to the
> new IP, or the app will get connection timeouts.

### 12. Get the connection string
RDS → `techcare-db` → **Connectivity & security** tab → copy the **Endpoint** (e.g.
`techcare-db.xxxxxxxxxxxx.ap-southeast-2.rds.amazonaws.com`) and **Port** (`5432`).

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_ENDPOINT:5432/techcare?sslmode=require
```

### 13. Browsing the database (there's no built-in Neon-style table browser on RDS)
Use an external Postgres client with the same host/port/username/password/database:
- **VS Code** — install the "PostgreSQL" extension (Microsoft) or "SQLTools" +
  PostgreSQL driver, Add Connection, browse tables / run queries in-editor.
- **DBeaver** (free desktop app, dbeaver.io) — closest to Neon's browsing experience.
- **psql** CLI — `psql "postgresql://postgres:PASSWORD@ENDPOINT:5432/techcare?sslmode=require"`

### 14. Code change still required
`backend/src/config/db.ts` currently uses `@neondatabase/serverless`, which only
works with Neon's own HTTP/WebSocket proxy — it cannot connect to RDS. This must be
swapped to the `pg` package (keeping the same `sql`/`pool` interface so controllers
don't need to change) before the app can actually use this database. Not done yet.

---

## Part 2 — File storage: Amazon S3

Replaces Cloudinary for uploaded images (profile photos, lab result images, etc.)

### 1. Open S3
AWS Console → search **S3** → **Create bucket**.

### 2. General configuration
- **AWS Region:** Asia Pacific (Sydney) ap-southeast-2 — must match the RDS region
- **Bucket type:** General purpose
- **Bucket name:** any globally-unique, lowercase name, e.g. `techcare-clinic-uploads`
  (bucket names are unique across *all* AWS accounts worldwide, not just yours — if
  taken, add digits/words until it's free)

### 3. Object Ownership
- **ACLs disabled (recommended)**

### 4. Block Public Access settings for this bucket
- **Block all public access: checked** — these are patient/staff photos, must stay private

### 5. Bucket Versioning
- **Disable** (versioning keeps every past version of every file — more storage, more cost)

### 6. Default encryption
- **Server-side encryption with Amazon S3 managed keys (SSE-S3)** (free)
- **Bucket Key: Enable** (reduces encryption overhead, free)

### 7. Create
Click **Create bucket**.

### 8. Code changes still required
- 6 places in the backend currently call `cloudinary.uploader.upload(...)`
  (`backend/src/controllers/admin/postRequests.controller.ts`,
  `updateRequests.controller.ts`, `backend/src/controllers/auth/updateRequests.controller.ts`,
  `backend/src/controllers/fdstaff/postRequests.controller.ts`,
  `updateRequests.controller.ts`, `backend/src/controllers/test.controller.ts`).
  These need to be replaced with an S3 upload helper built on `@aws-sdk/client-s3`.
- Need an **IAM user** scoped to only `s3:PutObject` / `s3:GetObject` (/ `s3:DeleteObject`)
  on this one bucket's ARN, with an access key pair for the app to use — not created yet.
- Env vars to add once that IAM user exists:
  ```
  AWS_REGION=ap-southeast-2
  AWS_S3_BUCKET=techcare-clinic-uploads
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  ```

---

## Status as of this write-up
- [x] AWS account created, Free plan, region locked to Sydney
- [x] RDS PostgreSQL instance `techcare-db` created, Available, free tier
- [x] Security group inbound rule confirmed (port 5432, own IP only)
- [x] S3 bucket `techcare-clinic-uploads` created, private, free tier
- [ ] Swap `@neondatabase/serverless` → `pg` in `backend/src/config/db.ts`
- [ ] Migrate existing Neon data to RDS via `pg_dump` / `pg_restore`
- [ ] Create IAM user + access keys scoped to the S3 bucket
- [ ] Replace 6 Cloudinary upload calls with an S3 upload helper
- [ ] Update `backend/.env` with `DATABASE_URL` (RDS) and `AWS_*` vars
- [ ] Move the Express server itself onto AWS (not started — deferred)
