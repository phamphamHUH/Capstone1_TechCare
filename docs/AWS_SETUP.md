# AWS Setup (Database + Image Uploads)

TechCare uses AWS the same way it used Neon and Cloudinary:

| Before | Now | What the app needs |
|---|---|---|
| Neon (database) | **Amazon RDS** PostgreSQL | one `DATABASE_URL` |
| Cloudinary (photos) | **Amazon S3** bucket | 4 `AWS_*` values |

The Express server is not on AWS yet; it runs where it always did.

---

## 1. Use it (the only part most people need)

Put this in `backend/.env` (ask the team lead for the real values; never commit them):

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@ENDPOINT:5432/techcare?sslmode=require

AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=techcare-clinic-uploads
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Run the backend as usual (`npm run dev`). That's it.

- Uploaded photos get a normal link (`https://techcare-clinic-uploads.s3.ap-southeast-2.amazonaws.com/...`),
  saved in the database and shown with `<img src>`, just like Cloudinary links.
- Old photos still have Cloudinary links and keep working.
- To browse and manage the database and photos day to day (tables, SQL, backups,
  password, photos), see **[AWS_MANAGE.md](AWS_MANAGE.md)**.

---

## 2. How it was set up in the AWS console

Account is on the **Free plan** (Sydney region only). Never click "Upgrade plan" or
"Activate advanced features".

### Database (RDS)
RDS → **Create database** → "Create with **full** configuration":
- PostgreSQL, template **Free tier**, **Single-AZ**
- Identifier `techcare-db`, username `postgres`, **self managed** password (long + random)
- `db.t4g.micro`, **gp2 20 GiB**
- **Public access: Yes**, new security group `techcare-db-sg`
- Additional configuration → **Initial database name: `techcare`**
- Backup 1 day; leave everything that says Proxy / Extended Support / Enhanced Monitoring **off**

Then open it to the internet like Neon: RDS → `techcare-db` → Connectivity & security →
click `techcare-db-sg` → **Inbound rules → Edit**: PostgreSQL, port 5432,
source **Anywhere-IPv4 (0.0.0.0/0)** → Save. The password is what protects it, same as Neon.

Connection string: copy **Endpoint** from Connectivity & security into
`postgresql://postgres:PASSWORD@ENDPOINT:5432/techcare?sslmode=require`.

### Photos (S3)
S3 → **Create bucket** `techcare-clinic-uploads`, Sydney, defaults otherwise.

Make photos viewable by link, like Cloudinary:
1. Bucket → **Permissions** → Block public access → **Edit** → uncheck **Block all public access** → Save → type `confirm`.
2. Same tab → **Bucket policy** → Edit → paste → Save:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::techcare-clinic-uploads/techcare/*"
     }]
   }
   ```
   Anyone with a photo's link can view it. Nobody can list, upload, or delete without the key.

### App key (IAM)
S3 has no username/password, so the backend gets its own AWS login:
1. IAM → Users → **Create user** `techcare-app` (no console access, no policies).
2. `techcare-app` → Permissions → Add permissions → **Create inline policy** → JSON:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
       "Resource": "arn:aws:s3:::techcare-clinic-uploads/*"
     }]
   }
   ```
3. Security credentials → **Create access key** → "Application running outside AWS" →
   download the `.csv`. Those two values are `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

This key can only touch that one bucket. If it leaks, delete it there and make a new one.

---

## 3. What changed in the code

- **Database driver**: `@neondatabase/serverless` only works with Neon, so it was
  replaced with `pg` in `backend/src/config/pgClient.ts`. It keeps the same
  `sql\`...\``, `sql.query()`, `sql.transaction()` and `pool` the code already used, so
  no queries changed. Works with RDS, Neon, or local Postgres.
- **Uploads**: the 6 `cloudinary.uploader.upload(...)` calls became
  `uploadImage(req.file, folder)` from `backend/src/config/s3.ts`, which returns the link to save.
- Removed: `config/cloudinary.ts`, the `cloudinary` package, `CLOUDINARY_*` env vars.

---

## 4. Moving the data from Neon to RDS (one time, not done yet)

Needs PostgreSQL command-line tools **v18+** installed.

```bash
pg_dump "NEON_URL" -Fc --no-owner --no-acl -f techcare.dump
pg_restore --no-owner --no-acl -d "RDS_URL" techcare.dump
```

Then set `DATABASE_URL` to the RDS URL. Delete `techcare.dump` afterward (it has every
patient record). To go back to Neon, just change `DATABASE_URL` back.

---

## 5. If something breaks

| Problem | Fix |
|---|---|
| Can't connect / timeout | Inbound rule must be PostgreSQL, 5432, `0.0.0.0/0` |
| `password authentication failed` | Wrong password; special characters like `@` must be written as `%40` |
| `database "techcare" does not exist` | Initial database name was skipped; run `CREATE DATABASE techcare;` |
| Upload fails `AccessDenied` / `InvalidAccessKeyId` | Check the 2 keys and the inline policy |
| Photo link shows `AccessDenied` | Bucket policy (section 2, Photos step 2) missing |
| "Region unavailable" popup | Free plan is Sydney only; click "Return to Sydney" |

---

## Status
- [x] RDS `techcare-db`, S3 `techcare-clinic-uploads`, IAM `techcare-app` created
- [x] Code switched to `pg` and S3
- [ ] Inbound rule → `0.0.0.0/0`; bucket public-read policy
- [ ] Fill AWS keys in `backend/.env`, test a photo upload
- [ ] Copy Neon data to RDS, switch `DATABASE_URL`
- [ ] Same env vars on Render before deploying
