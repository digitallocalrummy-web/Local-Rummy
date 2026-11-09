# Deploying Local Rummy on a VPS

Tested layout: Ubuntu 24.04 on a Hostinger KVM VPS. Everything runs on one server:
Nginx (port 80/443) → Node server (port 4000) → PostgreSQL (Docker, local only).

## 1. Prepare the server (once)

```bash
ssh root@YOUR_VPS_IP
apt update && apt install -y nginx git docker.io docker-compose-v2 apache2-utils
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
npm i -g pnpm@10 pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

## 2. Get the code and configure

```bash
git clone https://github.com/<client-account>/Local-Rummy.git /opt/local-rummy
cd /opt/local-rummy
pnpm install
POSTGRES_PASSWORD='a-strong-db-password' docker compose up -d db
cp apps/server/.env.example apps/server/.env
nano apps/server/.env
```

In `apps/server/.env` set:

- `DATABASE_URL=postgres://localrummy:a-strong-db-password@localhost:5432/localrummy`
- `JWT_SECRET` and `ADMIN_JWT_SECRET`: two different long random strings (`openssl rand -hex 32`)
- `CORS_ORIGINS=http://YOUR_VPS_IP` (or `https://yourdomain.com`), the address you open the admin panel from
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: the first super admin. Change the password after the first sign-in by creating a new admin and removing the seed values.

## 3. Build and start

```bash
pnpm --filter @local-rummy/server build
pnpm db:seed
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup

ADMIN_BASE=/admin/ pnpm --filter @local-rummy/admin build
mkdir -p /var/www/local-rummy-admin /var/www/local-rummy-prototype
cp -r apps/admin/dist/* /var/www/local-rummy-admin/
cp -r prototype/* /var/www/local-rummy-prototype/

cp deploy/nginx.conf /etc/nginx/sites-available/local-rummy
ln -sf /etc/nginx/sites-available/local-rummy /etc/nginx/sites-enabled/local-rummy
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Open `http://YOUR_VPS_IP/admin` and sign in. The APK should use `EXPO_PUBLIC_API_URL=http://YOUR_VPS_IP`.

**Protect the admin panel.** It already needs a sign-in, but for a second lock uncomment the `auth_basic` lines in the Nginx file and run `htpasswd -c /etc/nginx/.lr_admin yourname`.

## 4. HTTPS

With a domain: point an A record at the VPS, set `server_name yourdomain.com;` in the Nginx file, then
`apt install -y certbot python3-certbot-nginx && certbot --nginx -d yourdomain.com`.

Without a domain: use `YOUR-IP-WITH-DASHES.sslip.io` (e.g. `82-112-45-10.sslip.io`) as the server name and run certbot for it.

After switching to HTTPS, update `CORS_ORIGINS`, rebuild the APK with the `https://` address and restart: `pm2 restart local-rummy-server`.

## 5. Updating

```bash
cd /opt/local-rummy && git pull && pnpm install
pnpm --filter @local-rummy/server build && pm2 restart local-rummy-server   # migrations run on start
ADMIN_BASE=/admin/ pnpm --filter @local-rummy/admin build && cp -r apps/admin/dist/* /var/www/local-rummy-admin/
```

Restarting the server ends any running deals (tables live in memory); entries already taken are not refunded
automatically in that case, so update at a quiet time or switch on maintenance mode first.

## 6. Backups

Chip balances matter to players. Back up the database daily:

```bash
mkdir -p /opt/backups
crontab -e
# 30 3 * * * docker exec $(docker ps -qf name=db) pg_dump -U localrummy localrummy | gzip > /opt/backups/lr-$(date +\%F).sql.gz && find /opt/backups -mtime +14 -delete
```

## Notes

- Keep **one** server instance (PM2 `instances: 1`): live tables are held in that process's memory.
- Logs: `pm2 logs local-rummy-server`. Health check: `curl http://127.0.0.1:4000/api/health`.
- Port 4000 does not need to be open to the internet; Nginx forwards to it.
