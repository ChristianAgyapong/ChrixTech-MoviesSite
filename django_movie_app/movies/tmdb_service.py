import requests
from django.conf import settings
from django.core.cache import cache
from .models import Movie
from datetime import datetime
import logging
from requests.exceptions import ConnectionError, Timeout, RequestException

logger = logging.getLogger(__name__)

class TMDBService:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
    
    def _make_request(self, endpoint, params=None):
        """Make request to TMDB API with robust error handling and offline fallbacks"""
        if params is None:
            params = {}
        params['api_key'] = self.api_key
        
        # Create unique cache key
        cache_key = f"tmdb_{endpoint}_{hash(str(sorted(params.items())))}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        try:
            response = requests.get(
                f"{self.base_url}{endpoint}", 
                params=params, 
                timeout=10  # Add timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                # Cache successful responses for 1 hour
                cache.set(cache_key, data, timeout=3600)
                return data
            else:
                logger.warning(f"TMDB API returned status code {response.status_code} for {endpoint}")
                
        except (ConnectionError, Timeout, RequestException) as e:
            logger.error(f"Network error accessing TMDB API: {e}")
            # Return fallback data for critical endpoints
            return self._get_fallback_data(endpoint)
        except Exception as e:
            logger.error(f"Unexpected error accessing TMDB API: {e}")
            
        return self._get_fallback_data(endpoint)
    
    def _get_fallback_data(self, endpoint):
        """Provide offline fallback data when API is unavailable"""
        fallback_data = {
            '/genre/movie/list': {
                'genres': [
                    {'id': 28, 'name': 'Action'},
                    {'id': 12, 'name': 'Adventure'},
                    {'id': 16, 'name': 'Animation'},
                    {'id': 35, 'name': 'Comedy'},
                    {'id': 80, 'name': 'Crime'},
                    {'id': 99, 'name': 'Documentary'},
                    {'id': 18, 'name': 'Drama'},
                    {'id': 10751, 'name': 'Family'},
                    {'id': 14, 'name': 'Fantasy'},
                    {'id': 36, 'name': 'History'},
                    {'id': 27, 'name': 'Horror'},
                    {'id': 10402, 'name': 'Music'},
                    {'id': 9648, 'name': 'Mystery'},
                    {'id': 10749, 'name': 'Romance'},
                    {'id': 878, 'name': 'Science Fiction'},
                    {'id': 10770, 'name': 'TV Movie'},
                    {'id': 53, 'name': 'Thriller'},
                    {'id': 10752, 'name': 'War'},
                    {'id': 37, 'name': 'Western'}
                ]
            }
        }
        
        # Check if we have database movies to show when API is down
        if 'trending' in endpoint or 'discover' in endpoint or 'search' in endpoint:
            movies_from_db = list(Movie.objects.all()[:20].values(
                'tmdb_id', 'title', 'overview', 'poster_path', 
                'backdrop_path', 'release_date', 'vote_average', 'vote_count'
            ))
            
            # Convert to TMDB API format
            if movies_from_db:
                return {
                    'results': [
                        {
                            'id': movie['tmdb_id'],
                            'title': movie['title'],
                            'overview': movie['overview'],
                            'poster_path': movie['poster_path'],
                            'backdrop_path': movie['backdrop_path'],
                            'release_date': movie['release_date'].strftime('%Y-%m-%d') if movie['release_date'] else '',
                            'vote_average': movie['vote_average'],
                            'vote_count': movie['vote_count']
                        } for movie in movies_from_db
                    ],
                    'total_pages': 1,
                    'total_results': len(movies_from_db)
                }
        
        return fallback_data.get(endpoint, None)
    
    def get_trending_movies(self, page=1):
        """Get trending movies with fallback"""
        return self._make_request('/trending/movie/day', {'page': page})
    
    def get_top_rated_movies(self, page=1):
        """Get top rated movies with fallback"""
        return self._make_request('/movie/top_rated', {'page': page})
    
    def get_upcoming_movies(self, page=1):
        """Get upcoming movies with fallback"""
        return self._make_request('/movie/upcoming', {'page': page})
    
    def search_movies(self, query, page=1):
        """Search for movies with fallback to database search"""
        result = self._make_request('/search/movie', {'query': query, 'page': page})
        
        # If API fails, search in local database
        if result is None and query:
            movies = Movie.objects.filter(title__icontains=query)[:20]
            return {
                'results': [
                    {
                        'id': movie.tmdb_id,
                        'title': movie.title,
                        'overview': movie.overview,
                        'poster_path': movie.poster_path,
                        'backdrop_path': movie.backdrop_path,
                        'release_date': movie.release_date.strftime('%Y-%m-%d') if movie.release_date else '',
                        'vote_average': movie.vote_average,
                        'vote_count': movie.vote_count
                    } for movie in movies
                ],
                'total_pages': 1,
                'total_results': len(movies)
            }
        
        return result
    
    def get_movie_details(self, movie_id):
        """Get detailed information about a movie with database fallback"""
        result = self._make_request(f'/movie/{movie_id}')
        
        # If API fails, get from database
        if result is None:
            try:
                movie = Movie.objects.get(tmdb_id=movie_id)
                return {
                    'id': movie.tmdb_id,
                    'title': movie.title,
                    'overview': movie.overview,
                    'poster_path': movie.poster_path,
                    'backdrop_path': movie.backdrop_path,
                    'release_date': movie.release_date.strftime('%Y-%m-%d') if movie.release_date else '',
                    'vote_average': movie.vote_average,
                    'vote_count': movie.vote_count,
                    'runtime': movie.runtime,
                    'genres': movie.genres
                }
            except Movie.DoesNotExist:
                pass
        
        return result
    
    def get_movie_credits(self, movie_id):
        """Get movie cast and crew"""
        return self._make_request(f'/movie/{movie_id}/credits')
    
    def get_movie_videos(self, movie_id):
        """Get movie trailers and videos"""
        return self._make_request(f'/movie/{movie_id}/videos')
    
    def get_similar_movies(self, movie_id):
        """Get similar movies"""
        return self._make_request(f'/movie/{movie_id}/similar')
    
    def get_genres(self):
        """Get all movie genres with offline fallback"""
        return self._make_request('/genre/movie/list')
    
    def discover_movies_by_genre(self, genre_id, page=1):
        """Discover movies by genre with database fallback"""
        result = self._make_request('/discover/movie', {'with_genres': genre_id, 'page': page})
        
        # If API fails and we have movies with genres in database
        if result is None:
            # This is a simplified fallback - in production you'd want better genre filtering
            movies = Movie.objects.filter(genres__icontains=str(genre_id))[:20]
            if movies.exists():
                return {
                    'results': [
                        {
                            'id': movie.tmdb_id,
                            'title': movie.title,
                            'overview': movie.overview,
                            'poster_path': movie.poster_path,
                            'backdrop_path': movie.backdrop_path,
                            'release_date': movie.release_date.strftime('%Y-%m-%d') if movie.release_date else '',
                            'vote_average': movie.vote_average,
                            'vote_count': movie.vote_count
                        } for movie in movies
                    ],
                    'total_pages': 1,
                    'total_results': len(movies)
                }
        
        return result
    
    def save_movie_to_db(self, movie_data):
        """Save movie data to database with duplicate prevention"""
        if not movie_data or 'id' not in movie_data:
            return None
            
        try:
            release_date = None
            if movie_data.get('release_date'):
                try:
                    release_date = datetime.strptime(movie_data['release_date'], '%Y-%m-%d').date()
                except ValueError:
                    pass
            
            # Use get_or_create to prevent duplicates
            movie, created = Movie.objects.get_or_create(
                tmdb_id=movie_data['id'],
                defaults={
                    'title': movie_data.get('title', ''),
                    'overview': movie_data.get('overview', ''),
                    'poster_path': movie_data.get('poster_path', ''),
                    'backdrop_path': movie_data.get('backdrop_path', ''),
                    'release_date': release_date,
                    'vote_average': movie_data.get('vote_average', 0),
                    'vote_count': movie_data.get('vote_count', 0),
                    'runtime': movie_data.get('runtime'),
                    'genres': movie_data.get('genres', []),
                }
            )
            
            # Update existing movie with new data if not created
            if not created:
                updated = False
                for field, value in {
                    'title': movie_data.get('title', ''),
                    'overview': movie_data.get('overview', ''),
                    'poster_path': movie_data.get('poster_path', ''),
                    'backdrop_path': movie_data.get('backdrop_path', ''),
                    'vote_average': movie_data.get('vote_average', 0),
                    'vote_count': movie_data.get('vote_count', 0),
                    'runtime': movie_data.get('runtime'),
                    'genres': movie_data.get('genres', []),
                }.items():
                    if getattr(movie, field) != value and value:
                        setattr(movie, field, value)
                        updated = True
                
                if updated:
                    movie.save()
            
            return movie
            
        except Exception as e:
            logger.error(f"Error saving movie to database: {e}")
            return None
