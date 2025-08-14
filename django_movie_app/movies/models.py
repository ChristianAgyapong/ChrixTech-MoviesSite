from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class Movie(models.Model):
    tmdb_id = models.IntegerField(unique=True, db_index=True)  # Add index for faster lookups
    title = models.CharField(max_length=200, db_index=True)  # Add index for search
    overview = models.TextField()
    poster_path = models.CharField(max_length=200, blank=True, null=True)
    backdrop_path = models.CharField(max_length=200, blank=True, null=True)
    release_date = models.DateField(null=True, blank=True, db_index=True)  # Add index for date queries
    vote_average = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(10)], db_index=True)  # Add index for rating queries
    vote_count = models.IntegerField(default=0)
    runtime = models.IntegerField(null=True, blank=True)
    genres = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index for ordering
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tmdb_id', 'created_at']),  # Compound index
            models.Index(fields=['title', 'release_date']),   # Compound index for search
            models.Index(fields=['vote_average', 'vote_count']),  # Compound index for ratings
        ]

class UserFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)  # Add index
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, db_index=True)  # Add index
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index for ordering
    
    class Meta:
        unique_together = ['user', 'movie']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),  # Compound index for user queries
            models.Index(fields=['movie', 'created_at']),  # Compound index for movie queries
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.movie.title}"

class UserWatchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)  # Add index
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, db_index=True)  # Add index
    watched_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Add index for ordering
    
    class Meta:
        # Prevent duplicate movie entries per user
        unique_together = ['user', 'movie']
        ordering = ['-watched_at']
        indexes = [
            models.Index(fields=['user', 'watched_at']),  # Compound index for user queries
            models.Index(fields=['movie', 'watched_at']),  # Compound index for movie queries
            models.Index(fields=['user', 'movie']),  # For checking duplicates efficiently
        ]
    
    def __str__(self):
        return f"{self.user.username} watched {self.movie.title}"
    
    @classmethod
    def add_or_update_watch_entry(cls, user, movie):
        """Add or update watch history entry, preventing duplicates on the same day"""
        from django.utils import timezone
        today = timezone.now().date()
        
        obj, created = cls.objects.get_or_create(
            user=user, 
            movie=movie, 
            watched_at__date=today,
            defaults={'watched_at': timezone.now()}
        )
        
        if not created:
            # Update the timestamp if already exists today
            obj.watched_at = timezone.now()
            obj.save(update_fields=['watched_at'])
        
        return obj, created
