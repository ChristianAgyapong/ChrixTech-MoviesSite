# Cinema Chronicles - Django Movie Website

A Django-based movie discovery website with user authentication, favorites, and watch history tracking.

## Features

- **Landing Page**: Welcome page for non-authenticated users
- **User Authentication**: Register, login, and logout functionality
- **Movie Discovery**: Browse trending, top-rated, and upcoming movies
- **Search & Filter**: Search movies by title and filter by genre
- **Movie Details**: Detailed information including cast, trailers, and similar movies
- **Favorites**: Save movies to personal favorites list
- **Watch History**: Track watched movies with timestamps
- **Responsive Design**: Mobile-friendly interface
- **User Dashboard**: Personalized home page with user stats

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd django_movie_app
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # On Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Run development server:**
   ```bash
   python manage.py runserver
   ```

7. **Visit the application:**
   - Open http://127.0.0.1:8000/ in your browser
   - Landing page will be shown for non-authenticated users
   - Register or login to access the full application

## Usage Flow

1. **Landing Page**: First-time visitors see a welcome page with options to sign in or create account
2. **Authentication**: Users can register new accounts or login with existing credentials
3. **Home Dashboard**: Authenticated users see personalized dashboard with favorites and watch history
4. **Movie Discovery**: Browse movies using the "Discover" section with search and filter options
5. **Movie Details**: Click on any movie to view detailed information, cast, trailers
6. **Favorites Management**: Add/remove movies from favorites using the heart icon
7. **Watch History**: Movies are automatically added to history when viewing details

## API Integration

The application uses The Movie Database (TMDB) API to fetch movie data:
- Trending, top-rated, and upcoming movies
- Movie search functionality
- Detailed movie information
- Cast and crew information
- Movie trailers and videos
- Similar movie recommendations

## Project Structure

```
django_movie_app/
├── cinema_chronicles/          # Django project settings
├── movies/                     # Main movie app
│   ├── models.py              # Movie, Favorite, WatchHistory models
│   ├── views.py               # Application views
│   ├── urls.py                # URL routing
│   ├── tmdb_service.py        # TMDB API integration
│   └── admin.py               # ChrixTech admin configuration
├── accounts/                   # User authentication app
│   ├── views.py               # Auth views
│   └── urls.py                # Auth URLs
├── templates/                  # HTML templates
│   ├── base.html              # Base template
│   ├── movies/                # Movie templates
│   └── accounts/              # Authentication templates
├── static/                     # Static files
│   ├── css/style.css          # Styling
│   └── js/main.js             # JavaScript
└── requirements.txt           # Python dependencies
```

## Key Features

### Authentication System
- User registration and login
- Session management
- Protected routes for authenticated users
- Redirect to appropriate pages after login/logout

### Movie Management
- Integration with TMDB API for real-time movie data
- Caching for improved performance
- Local database storage for user-specific data
- Favorite movies tracking
- Watch history with timestamps

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly interface
- Optimized images for different screen sizes

## Admin Interface

Access the ChrixTech Admin at `/admin/` to manage:
- Users and authentication
- Movies in the database
- User favorites and watch history
- System administration

## Technologies Used

- **Backend**: Django 4.2, Python 3.9
- **Frontend**: HTML5, CSS3, JavaScript
- **Database**: SQLite (default, can be changed to PostgreSQL/MySQL)
- **API**: The Movie Database (TMDB) API
- **Styling**: Custom CSS with Font Awesome icons
- **Static Files**: WhiteNoise for production
- **Deployment**: Vercel-ready with production configuration

## 🚀 Deployment to Vercel

This application is configured for easy deployment to Vercel. See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed instructions.

### Quick Deploy Steps:

1. **Run Pre-Deployment Checks**
   ```bash
   .\deploy-check.ps1
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

3. **Deploy via Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Import your repository
   - Add environment variables (SECRET_KEY, DEBUG, TMDB_API_KEY)
   - Deploy!

4. **Or Deploy via CLI**
   ```bash
   vercel --prod
   ```

### Production Environment Variables

Set these in your Vercel dashboard:
```env
SECRET_KEY=your-generated-secret-key
DEBUG=False
TMDB_API_KEY=949258ff4ff329d48e662c7badcd4ac9
```

## Environment Variables

The application uses the following settings:
- `TMDB_API_KEY`: Your TMDB API key (currently hardcoded in settings.py)
- `DEBUG`: Development mode (True/False)
- `SECRET_KEY`: Django secret key

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is created by Christian Agyapong for educational and personal use.

## Support

For issues or questions, please check the Django documentation or TMDB API documentation.
