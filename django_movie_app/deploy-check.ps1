# ChrixTech Movies - Quick Deployment Script
# Run this before deploying to Vercel

Write-Host "🚀 Preparing ChrixTech Movies for Vercel Deployment..." -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path "manage.py")) {
    Write-Host "❌ Error: Please run this script from the django_movie_app directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Checking dependencies..." -ForegroundColor Green
pip install -r requirements.txt

Write-Host "✅ Collecting static files..." -ForegroundColor Green
python manage.py collectstatic --noinput --clear

Write-Host "✅ Running Django checks..." -ForegroundColor Green
python manage.py check --deploy

Write-Host ""
Write-Host "🎉 Pre-deployment checks complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Commit your changes: git add . && git commit -m 'Prepare for Vercel deployment'"
Write-Host "2. Push to GitHub: git push origin main"
Write-Host "3. Deploy to Vercel:"
Write-Host "   - Dashboard: https://vercel.com/dashboard"
Write-Host "   - Or CLI: vercel --prod"
Write-Host ""
Write-Host "📖 See VERCEL_DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
