# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)

### Steps:

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin master
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: **Next.js**
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `.next`
   
3. **Environment Variables** (in Vercel dashboard):
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com`

4. **Deploy**: Click "Deploy"

---

## Backend Deployment (Render)

### Prerequisites
- GitHub account  
- Render account (sign up at render.com)

### Steps:

1. **Deploy to Render**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure service:
     - Name: `routex-backend`
     - Root Directory: `backend`
     - Runtime: **Python 3**
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
2. **Environment Variables** (in Render dashboard):
   - `PYTHON_VERSION` = `3.11.0`
   - `MONGODB_URL` = `your-mongodb-connection-string` (optional, if you want database)
   - `FRONTEND_URL` = `https://your-app.vercel.app`

3. **Deploy**: Click "Create Web Service"

---

## Update Frontend with Backend URL

After backend is deployed:

1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` with your Render backend URL
4. Redeploy

---

## CORS Configuration

The backend is already configured to allow CORS. If you need to restrict it:

Edit `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app"],  # Your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Post-Deployment Testing

1. Test frontend: `https://your-app.vercel.app`
2. Test backend API: `https://your-backend.onrender.com/docs`
3. Test optimization endpoint: Challenge Output tab → Run Optimization

---

## Troubleshooting

### Vercel Issues:
- Check build logs in Vercel dashboard
- Ensure `package.json` is in frontend directory
- Verify Node.js version compatibility

### Render Issues:
- Check deployment logs
- Verify Python version
- Check that `requirements.txt` includes all dependencies
- Free tier may take 15-30s to wake up from sleep

### API Connection Issues:
- Verify CORS settings
- Check environment variables are set correctly
- Ensure backend URL in frontend doesn't have trailing slash
