# 🚀 Deployment Guide (Vercel + Render)

## ⚡ Quick Setup (5 minutes)

### Step 1️⃣: Deploy Backend to Render

1. **Create Render account**: Go to [render.com](https://render.com) and sign up
2. **Connect GitHub**:
   - Initialize git in your project: `git init`
   - Create a GitHub repository
   - Push your code:
     ```bash
     git add .
     git commit -m "Initial commit"
     git remote add origin YOUR_GITHUB_REPO_URL
     git push -u origin main
     ```

3. **Create Web Service on Render**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - **Configuration**:
     - **Name**: `delhi-pollution-api`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r Backend/requirements.txt`
     - **Start Command**: `uvicorn Backend.main:app --host 0.0.0.0 --port $PORT`
     - **Plan**: Free
   - Click "Create Web Service"

4. **Wait for deployment** (~2-3 minutes)
5. **Copy your backend URL**: It will be like `https://delhi-pollution-api.onrender.com`

### Step 2️⃣: Deploy Frontend to Vercel

1. **Create Vercel account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import your GitHub repository**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - **Configuration**:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   
3. **Add Environment Variable**:
   - Before deploying, click "Environment Variables"
   - Add: `VITE_API_BASE` = `https://YOUR-RENDER-URL` (from Step 1)
   - Example: `VITE_API_BASE` = `https://delhi-pollution-api.onrender.com`

4. **Deploy**: Click "Deploy" button
5. **Wait for deployment** (~1-2 minutes)
6. **Your app is live!** 🎉

### Step 3️⃣: Test on Mobile

1. Open your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Go to `/omniqr` page
3. Click "Generate QR Code"
4. Scan QR with your phone
5. ✅ It should work perfectly!

---

## 🔄 Alternative: Quick Deploy Without GitHub

### Backend (Render):
1. Go to Render Dashboard
2. New Web Service → "Deploy from Git"
3. Paste your repo URL
4. Use render.yaml configuration (already configured!)

### Frontend (Vercel CLI):
```bash
npm install -g vercel
vercel login
vercel --prod
# Follow prompts and add VITE_API_BASE when asked
```

---

## 🛠️ Important Notes

- **Free tier limits**: 
  - Render: 750 hours/month (sufficient for demo)
  - Vercel: Unlimited bandwidth for hobby projects
  
- **Cold starts**: On free tier, backend may sleep after 15 min inactivity
  - First request may take 30-60 seconds to wake up
  - Subsequent requests will be fast

- **Custom domain** (optional): You can add your own domain in Vercel settings

---

## ✅ Verification Checklist

- [ ] Backend deployed on Render
- [ ] Backend URL copied
- [ ] Frontend deployed on Vercel
- [ ] Environment variable `VITE_API_BASE` added
- [ ] Can access frontend on Vercel URL
- [ ] QR code generation works
- [ ] QR codes scan correctly on mobile
- [ ] Judge mode loads properly

---

## 🐛 Troubleshooting

**QR codes not working?**
- Make sure `VITE_API_BASE` is set in Vercel
- Redeploy frontend after adding env variable

**Backend errors?**
- Check Render logs: Dashboard → Your Service → Logs
- Ensure all dependencies in requirements.txt

**Frontend blank page?**
- Check browser console for errors
- Verify build succeeded in Vercel dashboard

---

Need help? Check:
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
