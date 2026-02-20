# Deployment (VPS + Nginx)

## Build
```bash
npm install
npm run build
```

## Run (systemd)
Create `/etc/systemd/system/fencinghub.service`:
```ini
[Unit]
Description=FencingHub Next.js
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/.openclaw/workspace/fencinghub
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fencinghub
```

## Nginx
```
server {
  server_name fencinghub.patrickcorr.me;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## SSL
Use Certbot or Cloudflare Origin Cert.
