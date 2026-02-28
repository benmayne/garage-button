# garage-button

A minimal progressive web app (PWA) for opening and closing a garage door via [Home Assistant](https://www.home-assistant.io/). Designed to be self-hosted in Docker and accessed remotely through a Cloudflare tunnel, with the app installable on iOS and Android home screens like a native app.

---

## How it works

```
Phone (Safari/Chrome PWA)
        │
        ▼
Cloudflare Tunnel + Access (auth)
        │
        ▼
Docker container (your home server)
  └── Node.js server
        │
        ▼
Home Assistant REST API
  └── cover entity (garage door)
```

The Node.js backend proxies requests to Home Assistant so your HA token never leaves your server. The frontend polls for door state every 5 seconds and shows a single button that opens or closes depending on current state.

---

## Prerequisites

- [Home Assistant](https://www.home-assistant.io/) running on your local network with a garage door entity
- A server at home capable of running Docker (e.g. Unraid, TrueNAS, a Raspberry Pi, or any Linux machine)
- A domain name with [Cloudflare](https://www.cloudflare.com/) managing DNS (free plan works)
- [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) account (free tier is sufficient)

---

## 1. Home Assistant setup

### Get a Long-Lived Access Token

1. In Home Assistant, click your profile icon (bottom left)
2. Scroll to **Long-Lived Access Tokens** → **Create Token**
3. Give it a name (e.g. `garage-button`) and copy the token — you won't see it again

### Find your entity ID

Your garage door entity ID will look something like `cover.garage_door`. To find it:

- Go to **Settings → Devices & Services → Entities**
- Search for your garage door
- The entity ID is shown in the row (e.g. `cover.my_garage`)

---

## 2. Docker deployment

### Option A: Docker Compose (recommended)

Create a `docker-compose.yml`:

```yaml
services:
  garage-button:
    image: ghcr.io/benmayne/garage-button:latest
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
```

Create a `.env` file in the same directory:

```env
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token
HA_ENTITY_ID=cover.your_garage_door
```

Then run:

```bash
docker compose up -d
```

### Option B: Docker run

```bash
docker run -d \
  --name garage-button \
  --restart unless-stopped \
  -p 3000:3000 \
  -e HA_URL=http://homeassistant.local:8123 \
  -e HA_TOKEN=your_token_here \
  -e HA_ENTITY_ID=cover.your_garage_door \
  ghcr.io/benmayne/garage-button:latest
```

### Unraid

In Unraid's **Compose Manager** plugin, create a new stack and paste in the `docker-compose.yml` contents above. Set your environment variables in the `.env` file in the stack directory (typically `/boot/config/plugins/compose.manager/projects/garage-button/`).

### Configuration reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `HA_URL` | Yes | — | Home Assistant base URL, no trailing slash |
| `HA_TOKEN` | Yes | — | Long-lived access token |
| `HA_ENTITY_ID` | No | `cover.msg100_6122_garage_door` | Cover entity to control |
| `PORT` | No | `3000` | Port the server listens on |

### Verify it's working

With the container running, open `http://your-server-ip:3000` on your local network. You should see the door state and button. If it shows an error, check that `HA_URL` is reachable from within the container — you may need to use the server's IP address rather than a hostname.

---

## 3. Cloudflare Tunnel

A Cloudflare Tunnel creates a secure outbound connection from your server to Cloudflare's network, exposing your app publicly without opening firewall ports.

### Install cloudflared

On your home server, install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/):

```bash
# Debian/Ubuntu
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

Alternatively, run `cloudflared` as a Docker container alongside your app.

### Create the tunnel

1. Log in: `cloudflared tunnel login`
2. Create a tunnel: `cloudflared tunnel create garage-button`
3. Note the tunnel ID from the output

### Configure a public hostname

In [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks → Tunnels** → click your tunnel → **Public Hostnames** → **Add a public hostname**:

| Field | Value |
|---|---|
| Subdomain | `garage` (or any name you like) |
| Domain | your domain (e.g. `yourdomain.com`) |
| Type | HTTP |
| URL | `localhost:3000` (or `your-server-ip:3000`) |

Your app will be accessible at `https://garage.yourdomain.com`.

---

## 4. Cloudflare Access (authentication)

Cloudflare Access sits in front of your tunnel and handles authentication, so you don't have to build login into the app itself.

1. In Zero Trust → **Access → Applications** → **Add an application** → **Self-hosted**
2. Set the **Application domain** to match your tunnel hostname (e.g. `garage.yourdomain.com`)
3. Under **Policies**, add a policy:
   - **Action**: Allow
   - **Include rule**: Emails → add the email addresses of anyone who should have access
4. Save the application

On first visit, users will be prompted to verify their email via a one-time code. After that, Cloudflare remembers them for a configurable session duration (default 24 hours).

---

## 5. Phone setup

### iOS (iPhone/iPad)

The app must be added via **Safari** — other browsers on iOS cannot install PWAs.

1. Open Safari and navigate to your app URL (e.g. `https://garage.yourdomain.com`)
2. Complete the Cloudflare Access login if prompted (one-time)
3. Tap the **Share** button (the box with an arrow, in the bottom toolbar)
4. Scroll down and tap **Add to Home Screen**
5. Optionally rename it, then tap **Add**

The app will appear on your home screen. When opened, it runs full-screen with no browser chrome, like a native app.

> **Note:** iOS may occasionally require re-authentication with Cloudflare Access after the session expires. This is a one-tap process in Safari.

### Android

1. Open **Chrome** and navigate to your app URL
2. Complete the Cloudflare Access login if prompted
3. Chrome will show an **"Add to Home Screen"** banner automatically, or tap the three-dot menu → **Add to Home Screen**
4. Tap **Add**

---

## 6. Updating

The Docker image is rebuilt and published automatically via GitHub Actions on every push to `main`. To update your running container:

```bash
docker compose pull && docker compose up -d
```

Or with plain Docker:

```bash
docker pull ghcr.io/benmayne/garage-button:latest
docker stop garage-button && docker rm garage-button
# re-run your docker run command
```

---

## Icons

The app ships with placeholder icons. To use your own:

Replace these three files in `public/` with PNG images of the correct dimensions:

| File | Size | Used by |
|---|---|---|
| `icon-180.png` | 180×180 | iOS home screen |
| `icon-192.png` | 192×192 | Android / PWA manifest |
| `icon-512.png` | 512×512 | PWA manifest (splash screen) |

After replacing the icons, rebuild the Docker image or rebuild and push via git to trigger the GitHub Actions workflow.
