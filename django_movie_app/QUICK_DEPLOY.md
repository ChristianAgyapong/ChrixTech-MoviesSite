# 🚀 Quick Deployment Reference Card

## ⚡ 5-Minute Deploy

```bash
# 1. Commit your code
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Go to Vercel
https://vercel.com/dashboard

# 3. Import repository
Click "Add New" → "Project" → Select "ChrixTech-MoviesSite"

# 4. Configure
Root Directory: django_movie_app

# 5. Add Environment Variables
SECRET_KEY = [generate new key]
DEBUG = False
TMDB_API_KEY = 949258ff4ff329d48e662c7badcd4ac9

# 6. Deploy!
Click "Deploy" → Wait 2-3 minutes → Done! ✨
```

## 🔑 Generate SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 📋 Environment Variables

| Variable | Value |
|----------|-------|
| SECRET_KEY | [Your generated key] |
| DEBUG | False |
| TMDB_API_KEY | 949258ff4ff329d48e662c7badcd4ac9 |

## 🧪 Test Before Deploy

```bash
.\deploy-check.ps1
```

## 📱 After Deployment

Your app: `https://your-project.vercel.app`
Admin: `https://your-project.vercel.app/admin/`

## 📚 Full Documentation

- `DEPLOYMENT_READY.md` - Complete guide
- `VERCEL_DEPLOYMENT.md` - Detailed instructions
- `README.md` - Project overview

## ⚠️ Important

- SQLite resets on each deploy
- Upgrade to PostgreSQL for production
- See docs for PostgreSQL setup

## 🆘 Need Help?

Check Vercel logs:
```bash
vercel logs --follow
```

---
**Ready to go live? Let's deploy! 🎉**
