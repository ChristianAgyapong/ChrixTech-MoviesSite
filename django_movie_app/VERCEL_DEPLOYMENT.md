# 🚀 ChrixTech Movies - Vercel Deployment Guide

## 📋 Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (optional but recommended)
3. Git repository with your code

## 🔧 Pre-Deployment Setup

### 1. Install Dependencies Locally (Test)
```bash
pip install -r requirements.txt
```

### 2. Collect Static Files (Test)
```bash
python manage.py collectstatic --noinput
```

### 3. Test Locally
```bash
python manage.py runserver
```

## 🌐 Deploy to Vercel

### Method 1: Using Vercel Dashboard (Easiest)

1. **Push Your Code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/dashboard
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the `django_movie_app` directory as the root directory

3. **Configure Environment Variables**
   In Vercel Dashboard → Project Settings → Environment Variables, add:
   
   ```
   SECRET_KEY = your-generated-secret-key-here
   DEBUG = False
   TMDB_API_KEY = 949258ff4ff329d48e662c7badcd4ac9
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at: `https://your-project.vercel.app`

### Method 2: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd "c:\Users\DELL\OneDrive\Desktop\Integrated movies\django_movie_app"
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? `chrixtech-movies`
   - In which directory is your code located? `./`

5. **Add Environment Variables**
   ```bash
   vercel env add SECRET_KEY
   vercel env add DEBUG
   vercel env add TMDB_API_KEY
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## 🔐 Generate New Secret Key

For production, generate a new SECRET_KEY:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## ⚙️ Important Settings for Production

### Update ALLOWED_HOSTS in Vercel
Add your Vercel domain to environment variables:
```
ALLOWED_HOSTS = .vercel.app,your-custom-domain.com
```

### Database Considerations
- **Current Setup**: SQLite (works for small apps)
- **For Production**: Consider PostgreSQL (Neon, Supabase, Railway)
- **Note**: SQLite files reset on each deployment on Vercel

## 🗄️ Upgrade to PostgreSQL (Optional but Recommended)

1. **Install psycopg2**
   ```bash
   pip install psycopg2-binary
   ```

2. **Update requirements.txt**
   ```
   psycopg2-binary==2.9.9
   ```

3. **Update settings.py**
   ```python
   import dj_database_url
   
   DATABASES = {
       'default': dj_database_url.config(
           default='sqlite:///db.sqlite3',
           conn_max_age=600
       )
   }
   ```

4. **Add DATABASE_URL to Vercel Environment Variables**
   ```
   DATABASE_URL = postgresql://user:password@host:5432/database
   ```

## 🧪 Testing Deployment

### Local Testing with Production Settings
```bash
# Set environment variables
$env:DEBUG="False"
$env:SECRET_KEY="your-secret-key"

# Run server
python manage.py runserver
```

### Check Deployment
1. Visit your Vercel URL
2. Test all features:
   - Homepage loads
   - Movie browsing works
   - User registration/login
   - Favorites functionality
   - Admin panel access

## 🐛 Troubleshooting

### Static Files Not Loading
- Check `vercel.json` configuration
- Verify `STATIC_ROOT` in settings.py
- Run `vercel logs` to check build logs

### 500 Server Error
- Check Vercel logs: `vercel logs`
- Verify all environment variables are set
- Ensure `DEBUG=False` in production
- Check `ALLOWED_HOSTS` includes your domain

### Database Errors
- SQLite resets on each deployment
- Migrate to PostgreSQL for persistent data
- Run migrations: `python manage.py migrate`

## 📝 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Static files loading correctly
- [ ] Database connected (if using PostgreSQL)
- [ ] Admin panel accessible
- [ ] User authentication working
- [ ] Movie browsing functional
- [ ] API calls to TMDB working
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS enabled (automatic on Vercel)

## 🔗 Useful Commands

```bash
# View deployment logs
vercel logs

# View deployment list
vercel ls

# Remove a deployment
vercel rm [deployment-url]

# View environment variables
vercel env ls

# Pull environment variables locally
vercel env pull
```

## 🎉 Success!

Your Cinema Chronicles app should now be live on Vercel!

**Default URL**: `https://your-project.vercel.app`

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [Vercel Python Runtime](https://vercel.com/docs/runtimes#official-runtimes/python)

---

**Need Help?** Check Vercel logs or Django error messages for specific issues.
