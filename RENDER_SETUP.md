# Render Deployment Setup

## Updated Start Command

In your Render dashboard, update the **Start Command** to:

```bash
python run.py
```

## Environment Variables

Make sure these are set in Render:
- `OPENAI_API_KEY` - Your OpenAI API key
- `EXA_API_KEY` - Your Exa API key

## What Changed

1. **Created `run.py`** - Entry point that sets up Python path correctly
2. **Updated imports** - Added fallback imports for Render's environment
3. **Created `render.yaml`** - Optional configuration file

## Deploy Steps

1. Go to your Render dashboard
2. Select your service
3. Go to **Settings**
4. Update **Start Command** to: `python run.py`
5. Make sure environment variables are set
6. Click **Manual Deploy** or wait for auto-deploy

The deployment should now work!

