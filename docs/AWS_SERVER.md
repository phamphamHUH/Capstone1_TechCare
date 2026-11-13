# Running the Server on AWS (EC2)

How to run the TechCare backend + frontend on AWS instead of Render. Written for
people who already deploy on Render; every part says what Render did for you and
what you do yourself here.

Database (RDS) and photos (S3) are covered in [AWS_SETUP.md](AWS_SETUP.md). This doc
assumes those already work.

---

## Render vs AWS EC2 at a glance

| Render did this for you | On EC2 you… |
|---|---|
| Gave you a server | Launch an **EC2 instance** (a Linux virtual machine) |
| Installed Node | Install Node yourself (one command) |
| Pulled from GitHub on every push | Run `git pull` + build yourself (one deploy command) |
| Ran `npm run build` / `npm run start` | Same commands, plus **pm2** keeps the app running and restarts it after crashes/reboots |
| **Environment** tab | A `backend/.env` file on the server |
| `https://xxx.onrender.com` with HTTPS | **Caddy** gives you HTTPS automatically on a free `sslip.io` address |
| **Logs** tab | `pm2 logs techcare` |
| **Manual Deploy / Restart** buttons | `pm2 restart techcare` |
| Free tier slept when idle | Runs 24/7 (no cold starts) |

What you get at the end: `https://<your-ip-with-dashes>.sslip.io` serving the whole app,
same as the Render URL.

### Cost (Free plan credits)
Unlike the database, a server uses your credits continuously. Rough Sydney prices:

| Item | Approx. per month |
|---|---|
| EC2 `t3.micro` running 24/7 | ~$10 |
| Public IP address (AWS charges for every public IPv4) | ~$4 |
| 20 GB disk | ~$2 |
| RDS (already running) | ~$17 |
| **Total** | **~$33/month** |

With $120 in credits that's roughly **3–4 months**, possibly less than the 182 days.
When credits run out the account is paused (not billed). Check **Billing → Credits
remaining** after the first few days to see the real burn rate. Stopping the
instance when nobody needs it (section 10) saves the EC2 part.

---

## 1. Launch the server (EC2 instance)

Console → search **EC2** → make sure the region is **Sydney** → **Launch instance**.

| Setting | Value |
|---|---|
| Name | `techcare-server` |
| Application and OS Images (AMI) | **Ubuntu** → **Ubuntu Server 24.04 LTS** (Free tier eligible) |
| Architecture | 64-bit (x86) |
| Instance type | **t3.micro** (must say *Free tier eligible*) |
| Key pair | **Create new key pair** → name `techcare-key`, type RSA, format `.pem` → it downloads; keep it safe (backup way to log in) |
| Network settings → **Edit** | Auto-assign public IP: **Enable** |
| Firewall (security groups) | **Create security group**, name `techcare-server-sg` |
| | ✅ Allow **SSH** traffic from **Anywhere** |
| | ✅ Allow **HTTPS** traffic from the internet |
| | ✅ Allow **HTTP** traffic from the internet |
| Configure storage | **20 GiB gp3** |

Click **Launch instance**. Wait until **Instance state = Running** and
**Status checks = 2/2 passed** (a couple of minutes).

Never pick a bigger instance type or anything not marked *Free tier eligible*;
those burn credits much faster.

---

## 2. Give it a permanent IP (Elastic IP)

A normal public IP changes every time the instance is stopped. An **Elastic IP** stays
the same, so your URL doesn't change.

1. EC2 left menu → **Network & Security → Elastic IPs** → **Allocate Elastic IP address** → **Allocate**.
2. Select it → **Actions → Associate Elastic IP address** → Instance: `techcare-server` → **Associate**.
3. Write the IP down, e.g. `3.104.55.12`.

Your app's address will be that IP with dashes + `.sslip.io`:

```
3.104.55.12   →   3-104-55-12.sslip.io
```

`sslip.io` is a free service that points that name at that IP, which lets us get a
real HTTPS certificate without buying a domain.

If you ever delete the server, also **release** the Elastic IP (Actions → Release);
an unused one still costs credits.

---

## 3. Open a terminal on the server

EC2 → **Instances** → select `techcare-server` → **Connect** → **EC2 Instance Connect**
tab → Username `ubuntu` → **Connect**.

A terminal opens in your browser. Every command below is typed there.
(Paste with `Ctrl+Shift+V`.)

---

## 4. Install everything (one time)

Copy each block, paste, press Enter, wait for it to finish.

**4.1 Add swap memory.** The server has 1 GB RAM; building the frontend needs more,
so give it 2 GB of disk-backed memory:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**4.2 Node.js 24, git, pm2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
node -v   # should print v24.x
```

**4.3 Caddy (HTTPS web server):**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## 5. Get the code

```bash
cd ~
git clone https://github.com/phamphamHUH/Capstone1_TechCare.git techcare
cd techcare
git checkout release        # the branch you deploy (same one Render used)
```

The branch must already contain the AWS changes (the `pg` driver and S3 uploads),
so merge `feat/aws-rds-s3` into it first.

**If the repo is private**, git asks for a username and password. The password must
be a **GitHub personal access token**, not your GitHub password:
GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained** →
Repository access: only this repo → Permissions: **Contents: Read-only** → Generate.
Paste it when git asks for the password.

---

## 6. Environment variables (Render's "Environment" tab)

Create the file:
```bash
nano ~/techcare/backend/.env
```

Paste your values (easiest: copy them from Render → Environment, then change the
ones marked ✱). Replace `3-104-55-12.sslip.io` with your own address from section 2.

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@techcare-db.xxxx.ap-southeast-2.rds.amazonaws.com:5432/techcare?sslmode=require
IS_PRODUCTION=true

JWT_SECRET=...
JWT_EXPIRES_IN=...
JWT_REFRESH_TOKEN=...
JWT_REFRESH_EXPIRES_IN=...

# ✱ your new address
CORS_ORIGIN=https://3-104-55-12.sslip.io
APP_URL=https://3-104-55-12.sslip.io

BREVO_API_KEY=...
EMAIL_FROM=...
EMAIL_FROM_NAME=...

AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=techcare-clinic-uploads
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Save: `Ctrl+O`, Enter, then exit: `Ctrl+X`.

Don't add `PORT` (defaults to 5000, which Caddy expects). Don't run
`export NODE_ENV=production` in the terminal; the build needs dev dependencies
(TypeScript) and would fail.

---

## 7. Build and start (Render's Build + Start commands)

```bash
cd ~/techcare
npm run build                         # same build command as Render; takes a few minutes
cd backend
pm2 start dist/server.js --name techcare
pm2 logs techcare --lines 20          # look for "Server is up and running"; Ctrl+C to leave
```

Make it start again automatically after a reboot:
```bash
pm2 save
pm2 startup
```
`pm2 startup` prints a line starting with `sudo env PATH=...`. **Copy that line, paste it, run it.**

---

## 8. Turn on HTTPS (Caddy)

```bash
sudo nano /etc/caddy/Caddyfile
```

Delete everything in the file and put (with your own address):
```
3-104-55-12.sslip.io {
    reverse_proxy localhost:5000
}
```
Save (`Ctrl+O`, Enter, `Ctrl+X`), then:
```bash
sudo systemctl reload caddy
```

Caddy fetches a free HTTPS certificate by itself in a few seconds and renews it
automatically. It also passes the live queue monitor (SSE) through without changes.

---

## 9. Test it

Open `https://3-104-55-12.sslip.io` (your address):
- Login page loads with the padlock 🔒.
- Log in, open a few pages, upload a profile photo (it should show).
- Open the queue monitor and check it updates live.

When it all works, point people to the new URL. Keep Render running for a few days
as a fallback, then suspend it.

---

## 10. Everyday tasks

| Task | Render | EC2 (in the Instance Connect terminal) |
|---|---|---|
| Deploy new code | push → auto deploy | `cd ~/techcare && git pull && npm run build && pm2 restart techcare` |
| See logs | Logs tab | `pm2 logs techcare` (Ctrl+C to exit) |
| Restart | Restart button | `pm2 restart techcare` |
| Is it running? | Dashboard status | `pm2 status` |
| Change an env var | Environment tab | `nano ~/techcare/backend/.env` → save → `pm2 restart techcare` |
| HTTPS problems | — | `sudo journalctl -u caddy --since "10 min ago"` |
| Pause to save credits | Suspend | EC2 → Instances → **Instance state → Stop** (Start again later; pm2 brings the app back, the Elastic IP keeps the URL) |

Make deploys one word (optional, one time):
```bash
echo 'alias deploy="cd ~/techcare && git pull && npm run build && pm2 restart techcare"' >> ~/.bashrc && source ~/.bashrc
```
After that, just type `deploy`.

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| Browser can't reach the site at all | Instance running? Security group `techcare-server-sg` must allow HTTP 80 + HTTPS 443 from anywhere |
| Certificate / "not secure" error | Address in the Caddyfile must exactly match the Elastic IP with dashes. Check `sudo journalctl -u caddy` |
| `502 Bad Gateway` | The app isn't running: `pm2 status`, `pm2 logs techcare` |
| Build stops with "Killed" or "heap out of memory" | Swap missing: run `free -h`; redo section 4.1 |
| Build fails: `tsc: not found` | `NODE_ENV=production` was exported in the shell; run `unset NODE_ENV`, build again |
| App starts then crashes with a database error | Check `DATABASE_URL` in `backend/.env`; RDS inbound rule must allow the server (it's `0.0.0.0/0` now) |
| Login works but API calls fail with CORS errors | `CORS_ORIGIN` must be exactly `https://<your-address>` (no trailing slash) |
| Email links point to the old Render URL | Update `APP_URL`, then `pm2 restart techcare` |
| `git pull` asks for a password every time | Save it once: `git config --global credential.helper store`, then pull and enter the token one last time |
| Can't open Instance Connect | Security group must allow SSH 22; or connect with the `.pem` key: `ssh -i techcare-key.pem ubuntu@<elastic-ip>` |

---

## 12. Turning it off for good

1. EC2 → Instances → select → **Instance state → Terminate**.
2. EC2 → Elastic IPs → select → **Actions → Release**.
3. EC2 → Security Groups → delete `techcare-server-sg` (optional).

Point people back to Render before doing this.
