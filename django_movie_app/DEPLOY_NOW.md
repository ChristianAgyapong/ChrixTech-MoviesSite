# 🚀 VERCEL DEPLOYMENT - QUICK REFERENCE

## 📝 Environment Variables for Vercel

Copy and paste these EXACTLY into Vercel:

### 1. SECRET_KEY
```
n#-b@wg!#k-$_z$tf157+^946i41^rpl8e2^dtdrxbh9e4z)0u
```

### 2. DEBUG
```
False
```

### 3. TMDB_API_KEY
```
949258ff4ff329d48e662c7badcd4ac9
```

## 🎯 Deployment URL
**Start Here:** https://vercel.com/new

## ⚙️ Project Settings
- **Root Directory:** `./` (LEAVE AS ROOT - DO NOT CHANGE!)
- **Framework Preset:** Other
- **Build Command:** (default)
- **Output Directory:** (default)

⚠️ **IMPORTANT:** Do NOT set root directory to `django_movie_app`. The vercel.json handles this automatically!

## 📦 Repository
- **GitHub Repo:** ChristianAgyapong/ChrixTech-MoviesSite
- **Branch:** main

## ✅ Deployment Checklist
- [ ] Go to https://vercel.com/new
- [ ] Import ChrixTech-MoviesSite repository
- [ ] **LEAVE Root Directory as './' (DO NOT CHANGE!)**
- [ ] Add 3 environment variables (above)
- [ ] Click Deploy
- [ ] Wait 2-3 minutes
- [ ] Access your live app!

## 🌐 Your Live URLs (after deployment)
- **Main App:** https://[your-project].vercel.app
- **Admin Panel:** https://[your-project].vercel.app/admin/

## ⚠️ Important Notes
1. SQLite resets on each deploy - upgrade to PostgreSQL for production
2. Static files are served via WhiteNoise
3. Auto-deployment enabled on every Git push
4. HTTPS/SSL is automatic

## 🆘 Need Help?
- Full guide: VERCEL_DEPLOYMENT.md
- Complete reference: DEPLOYMENT_READY.md

---
**Ready? Let's deploy! 🚀**
https://vercel.com/new
