# Deployment Guide

## Frontend (GitHub Pages)

The frontend is already set up in the root directory and will be served by GitHub Pages automatically.

1. Go to your repository: https://github.com/candicesxc/Profile-to-Profile-Outreach-Engine
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main` / Folder: `/ (root)`
5. Save

Your site will be available at: `https://candicesxc.github.io/Profile-to-Profile-Outreach-Engine/`

## Backend Deployment

The frontend needs a backend API to function. Deploy the backend to one of these services:

### Option 1: Render (Recommended - Free tier available)

1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && python main.py` or `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Add `OPENAI_API_KEY` and `EXA_API_KEY` from your `.env` file
5. Deploy

### Option 2: Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select your repository
4. Add environment variables: `OPENAI_API_KEY` and `EXA_API_KEY`
5. Deploy

### Option 3: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch`
3. Add secrets: `fly secrets set OPENAI_API_KEY=your_key EXA_API_KEY=your_key`
4. Deploy: `fly deploy`

## Update Frontend Backend URL

After deploying the backend, update `app.js` line 2-3:

```javascript
return 'https://your-backend-url.onrender.com';  // Replace with your actual deployed backend URL
```

Replace `your-backend-url.onrender.com` with your actual deployed backend URL.

## Local Development

For local development:

1. Start backend:
   ```bash
   cd backend
   python main.py
   ```

2. Open `index.html` in your browser or serve it:
   ```bash
   python -m http.server 8080
   ```

The frontend will automatically detect localhost and use `http://localhost:8000` for the backend.

