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


class UserPreferences(models.Model):
    THEME_CHOICES = [
        ('dark', 'Dark Theme'),
        ('light', 'Light Theme'),
        ('auto', 'Auto (System)'),
    ]
    
    VIEW_CHOICES = [
        ('grid', 'Grid View'),
        ('list', 'List View'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Display Preferences
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='dark')
    default_view = models.CharField(max_length=10, choices=VIEW_CHOICES, default='grid')
    movies_per_page = models.IntegerField(default=20, choices=[(10, '10'), (20, '20'), (30, '30'), (50, '50')])
    
    # Filter Preferences
    min_rating = models.FloatField(default=0.0, help_text="Minimum movie rating to show")
    preferred_genres = models.JSONField(default=list, blank=True, null=True)
    
    # Essential Settings
    auto_add_to_history = models.BooleanField(default=True, help_text="Automatically add viewed movies to watch history")
    email_notifications = models.BooleanField(default=True, help_text="Receive email notifications")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"
    
    def __str__(self):
        return f"{self.user.username}'s Preferences"
    
    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create preferences for a user"""
        preferences, created = cls.objects.get_or_create(user=user)
        return preferences
