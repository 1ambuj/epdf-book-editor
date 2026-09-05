# Deploy ePDF Studio (get a public link)

This app runs on a server. After deploy you get a link like:
`https://epdf-studio.onrender.com` — send that to anyone.

## Fastest path: Render (free)

### 1. Put code on GitHub
1. Create a free account at https://github.com
2. Create a **new empty repository** (e.g. `epdf-studio`)
3. On your PC, in the project folder (`epdf with template`), run:

```bash
git init -b main
git add -A
git commit -m "Deploy ePDF Studio"
git remote add origin https://github.com/YOUR_USERNAME/epdf-studio.git
git push -u origin main
```

(Replace `YOUR_USERNAME` with your GitHub username.)

### 2. Deploy on Render
1. Go to https://render.com → Sign up (can use GitHub)
2. **New** → **Web Service** → connect the `epdf-studio` repo
3. Settings:
   - **Runtime:** Docker
   - **Instance:** Free
4. Click **Create Web Service**
5. Wait 5–10 minutes for the first build
6. Copy the URL Render shows (e.g. `https://epdf-studio-xxxx.onrender.com`)

That URL is your software link.

### Notes
- Free Render sleeps after idle time — first open may take ~30–60 seconds.
- Uploaded books on the free plan can reset when the server restarts (no permanent disk).
- PDF Publish needs Chromium (already included in the Docker image).

## Alternative: Railway
1. https://railway.app → New Project → Deploy from GitHub
2. Select the repo → Deploy
3. Use the generated public domain as your link

## Local test of the Docker image (optional)

```bash
docker build -t epdf-studio .
docker run -p 8000:8000 epdf-studio
```

Open http://127.0.0.1:8000
