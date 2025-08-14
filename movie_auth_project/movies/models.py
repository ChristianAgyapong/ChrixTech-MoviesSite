from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    favorite_movies = models.JSONField(default=list, blank=True)
    total_views = models.IntegerField(default=0)
    trailers_watched = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def add_favorite(self, movie_id):
        """Add a movie to favorites if not already present"""
        if movie_id not in self.favorite_movies:
            self.favorite_movies.append(movie_id)
            self.save()
            return True
        return False
    
    def remove_favorite(self, movie_id):
        """Remove a movie from favorites"""
        if movie_id in self.favorite_movies:
            self.favorite_movies.remove(movie_id)
            self.save()
            return True
        return False
    
    def increment_trailer_view(self):
        """Increment trailer watched count"""
        self.trailers_watched += 1
        self.total_views += 1
        self.save()
    
    def get_stats(self):
        """Get user statistics"""
        return {
            'favorites_count': len(self.favorite_movies),
            'total_views': self.total_views,
            'trailers_watched': self.trailers_watched,
            'favorite_movies': self.favorite_movies
        }


class MovieView(models.Model):
    """Track individual movie views with timestamps"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    movie_id = models.IntegerField()
    movie_title = models.CharField(max_length=255, blank=True)
    view_type = models.CharField(max_length=20, choices=[
        ('trailer', 'Trailer Watched'),
        ('details', 'Details Viewed'),
    ])
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} - {self.movie_title} ({self.view_type})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create UserProfile when a new User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'userprofile'):
        instance.userprofile.save()
    else:
        UserProfile.objects.create(user=instance)
