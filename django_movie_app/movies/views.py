from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Count, Prefetch
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils import timezone
from .models import Movie, UserFavorite, UserWatchHistory, UserPreferences
from .tmdb_service import TMDBService
import json

def landing(request):
    """Landing page for non-authenticated users"""
    return render(request, 'movies/landing.html')

@login_required
def home(request):
    """Home page showing user's favorites and watch history - Optimized"""
    # Use select_related to reduce database queries
    user_favorites = UserFavorite.objects.select_related('movie').filter(
        user=request.user
    ).order_by('-created_at')[:6]
    
    user_watch_history = UserWatchHistory.objects.select_related('movie').filter(
        user=request.user
    ).order_by('-watched_at')[:6]
    
    # Cache user stats for better performance
    cache_key_favorites = f'user_favorites_count_{request.user.id}'
    cache_key_watched = f'user_watched_count_{request.user.id}'
    
    favorites_count = cache.get(cache_key_favorites)
    if favorites_count is None:
        favorites_count = UserFavorite.objects.filter(user=request.user).count()
        cache.set(cache_key_favorites, favorites_count, 300)  # Cache for 5 minutes
    
    watched_count = cache.get(cache_key_watched)
    if watched_count is None:
        watched_count = UserWatchHistory.objects.filter(user=request.user).count()
        cache.set(cache_key_watched, watched_count, 300)  # Cache for 5 minutes
    
    context = {
        'user_favorites': user_favorites,
        'user_watch_history': user_watch_history,
        'favorites_count': favorites_count,
        'watched_count': watched_count,
    }
    return render(request, 'movies/home.html', context)

@login_required
def movies_list(request):
    """Display movies with filtering and search - Optimized"""
    tmdb = TMDBService()
    mode = request.GET.get('mode', 'trending')
    page = int(request.GET.get('page', 1))
    search_query = request.GET.get('search', '')
    genre_id = request.GET.get('genre', '')
    
    # Cache genres for better performance
    cache_key_genres = 'movie_genres'
    genres = cache.get(cache_key_genres)
    if genres is None:
        genres_data = tmdb.get_genres()
        genres = genres_data.get('genres', []) if genres_data else []
        cache.set(cache_key_genres, genres, 60 * 60)  # Cache for 1 hour
    
    movies_data = None
    
    # Create cache key for movies based on request parameters
    cache_key_movies = f'movies_{mode}_{page}_{search_query}_{genre_id}'
    movies_data = cache.get(cache_key_movies)
    
    if movies_data is None:
        if search_query:
            movies_data = tmdb.search_movies(search_query, page)
        elif genre_id:
            movies_data = tmdb.discover_movies_by_genre(genre_id, page)
        elif mode == 'top_rated':
            movies_data = tmdb.get_top_rated_movies(page)
        elif mode == 'upcoming':
            movies_data = tmdb.get_upcoming_movies(page)
        else:  # trending
            movies_data = tmdb.get_trending_movies(page)
        
        # Cache movies data for 10 minutes
        if movies_data:
            cache.set(cache_key_movies, movies_data, 60 * 10)
    
    movies = movies_data.get('results', []) if movies_data else []
    total_pages = movies_data.get('total_pages', 1) if movies_data else 1
    
    # Get user favorites for marking (using set for O(1) lookup)
    user_favorites = set()
    if request.user.is_authenticated:
        user_favorites = set(
            UserFavorite.objects.filter(user=request.user).values_list('movie__tmdb_id', flat=True)
        )
    
    context = {
        'movies': movies,
        'genres': genres,
        'current_page': page,
        'total_pages': total_pages,
        'mode': mode,
        'search_query': search_query,
        'selected_genre': genre_id,
        'user_favorites': user_favorites,
    }
    return render(request, 'movies/movies_list.html', context)

@login_required
def movie_detail(request, tmdb_id):
    """Display detailed movie information and automatically track as watched"""
    tmdb = TMDBService()
    
    movie_data = tmdb.get_movie_details(tmdb_id)
    if not movie_data:
        messages.error(request, 'Movie not found.')
        return redirect('movies:movies_list')
    
    # Save movie to database
    movie = tmdb.save_movie_to_db(movie_data)
    
    # Automatically add to watch history when user views the movie detail
    if movie:
        try:
            # Use the smart method that prevents duplicates
            UserWatchHistory.add_or_update_watch_entry(request.user, movie)
            
            # Invalidate cache
            cache.delete(f'user_watched_count_{request.user.id}')
        except Exception as e:
            # Log error but don't break the page
            print(f"Error auto-adding to watch history: {e}")
    
    # Get additional data
    credits = tmdb.get_movie_credits(tmdb_id)
    videos = tmdb.get_movie_videos(tmdb_id)
    similar = tmdb.get_similar_movies(tmdb_id)
    
    # Check if user has favorited this movie
    is_favorite = UserFavorite.objects.filter(user=request.user, movie__tmdb_id=tmdb_id).exists()
    
    # Since we auto-add to watch history, this will always be True
    is_watched = True  # Movie is automatically watched when viewed
    
    # Get trailer
    trailer = None
    if videos and videos.get('results'):
        for video in videos['results']:
            if video['type'] == 'Trailer' and video['site'] == 'YouTube':
                trailer = video
                break
    
    context = {
        'movie_data': movie_data,
        'credits': credits,
        'trailer': trailer,
        'similar_movies': similar.get('results', [])[:6] if similar else [],
        'is_favorite': is_favorite,
        'is_watched': is_watched,
    }
    return render(request, 'movies/movie_detail.html', context)

@login_required
def toggle_favorite(request):
    """Toggle movie favorite status - Optimized"""
    if request.method == 'POST':
        data = json.loads(request.body)
        tmdb_id = data.get('tmdb_id')
        
        if not tmdb_id:
            return JsonResponse({'error': 'Movie ID required'}, status=400)
        
        try:
            # Check if movie already exists in database first
            movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
            
            if not movie:
                # Only fetch from TMDB if movie doesn't exist in DB
                tmdb = TMDBService()
                movie_data = tmdb.get_movie_details(tmdb_id)
                
                if not movie_data:
                    return JsonResponse({'error': 'Movie not found'}, status=404)
                
                # Save movie to database
                movie = tmdb.save_movie_to_db(movie_data)
                
                if not movie:
                    return JsonResponse({'error': 'Error saving movie'}, status=500)
            
            # Use get_or_create for atomic operation
            favorite, created = UserFavorite.objects.get_or_create(
                user=request.user,
                movie=movie,
            )
            
            if not created:
                favorite.delete()
                is_favorite = False
                action = 'removed'
                # Invalidate user favorites cache
                cache.delete(f'user_favorites_count_{request.user.id}')
            else:
                is_favorite = True
                action = 'added'
                # Invalidate user favorites cache
                cache.delete(f'user_favorites_count_{request.user.id}')
            
            return JsonResponse({
                'is_favorite': is_favorite,
                'action': action,
                'message': f'Movie {action} to favorites'
            })
        
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
def add_to_watch_history(request):
    """Add movie to watch history - Optimized with duplicate prevention"""
    if request.method == 'POST':
        data = json.loads(request.body)
        tmdb_id = data.get('tmdb_id')
        
        if not tmdb_id:
            return JsonResponse({'error': 'Movie ID required'}, status=400)
        
        try:
            # Check if movie already exists in database first
            movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
            
            if not movie:
                # Only fetch from TMDB if movie doesn't exist in DB
                tmdb = TMDBService()
                movie_data = tmdb.get_movie_details(tmdb_id)
                
                if not movie_data:
                    return JsonResponse({'error': 'Movie not found'}, status=404)
                
                # Save movie to database
                movie = tmdb.save_movie_to_db(movie_data)
                
                if not movie:
                    return JsonResponse({'error': 'Error saving movie'}, status=500)
            
            # Use the new method to prevent duplicate entries on same day
            watch_entry, created = UserWatchHistory.add_or_update_watch_entry(request.user, movie)
            
            # Invalidate watch history cache
            cache.delete(f'user_watched_count_{request.user.id}')
            
            action = 'added' if created else 'updated'
            
            return JsonResponse({
                'success': True,
                'action': action,
                'message': f'Movie {action} to watch history',
                'is_watched': True
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
def favorites(request):
    """Display user's favorite movies"""
    favorites_list = UserFavorite.objects.filter(user=request.user).select_related('movie').order_by('-created_at')
    
    paginator = Paginator(favorites_list, 12)
    page_number = request.GET.get('page')
    favorites = paginator.get_page(page_number)
    
    context = {
        'favorites': favorites,
        'title': 'My Favorites'
    }
    return render(request, 'movies/favorites.html', context)

@login_required
def watch_history(request):
    """Display user's watch history"""
    history_list = UserWatchHistory.objects.filter(user=request.user).select_related('movie').order_by('-watched_at')
    
    paginator = Paginator(history_list, 12)
    page_number = request.GET.get('page')
    history = paginator.get_page(page_number)
    
    context = {
        'history': history,
        'title': 'Watch History'
    }
    return render(request, 'movies/watch_history.html', context)


@login_required
def settings(request):
    """User settings and preferences"""
    from .forms import UserPreferencesForm
    from .models import UserPreferences
    
    # Get or create user preferences
    preferences = UserPreferences.get_or_create_for_user(request.user)
    
    if request.method == 'POST':
        form = UserPreferencesForm(request.POST, instance=preferences)
        if form.is_valid():
            # Ensure preferred_genres is always a list
            if 'preferred_genres' not in form.cleaned_data or not form.cleaned_data['preferred_genres']:
                form.cleaned_data['preferred_genres'] = []
            
            try:
                form.save()
                messages.success(request, 'Your settings have been saved successfully!')
                return redirect('movies:settings')
            except Exception as e:
                messages.error(request, f'Error saving settings: {str(e)}')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserPreferencesForm(instance=preferences)
    
    context = {
        'form': form,
        'preferences': preferences,
        'title': 'Settings & Preferences'
    }
    return render(request, 'movies/settings.html', context)


@login_required
def export_data(request):
    """Export user's movie data"""
    import json
    from django.http import HttpResponse
    
    # Get user's data
    favorites = list(UserFavorite.objects.filter(user=request.user).select_related('movie').values(
        'movie__title', 'movie__tmdb_id', 'movie__vote_average', 'created_at'
    ))
    
    watch_history = list(UserWatchHistory.objects.filter(user=request.user).select_related('movie').values(
        'movie__title', 'movie__tmdb_id', 'movie__vote_average', 'watched_at'
    ))
    
    preferences = UserPreferences.objects.filter(user=request.user).values().first()
    
    # Prepare data for export
    export_data = {
        'user': request.user.username,
        'export_date': str(timezone.now()),
        'favorites': [
            {
                'title': fav['movie__title'],
                'tmdb_id': fav['movie__tmdb_id'],
                'rating': fav['movie__vote_average'],
                'added_date': fav['created_at'].isoformat() if fav['created_at'] else None
            } for fav in favorites
        ],
        'watch_history': [
            {
                'title': watch['movie__title'],
                'tmdb_id': watch['movie__tmdb_id'],
                'rating': watch['movie__vote_average'],
                'watched_date': watch['watched_at'].isoformat() if watch['watched_at'] else None
            } for watch in watch_history
        ],
        'preferences': preferences if preferences else {}
    }
    
    # Create response
    response = HttpResponse(
        json.dumps(export_data, indent=2, default=str),
        content_type='application/json'
    )
    response['Content-Disposition'] = f'attachment; filename="{request.user.username}_cinema_chronicles_data.json"'
    
    return response
