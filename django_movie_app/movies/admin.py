from django.contrib import admin
from .models import Movie, UserFavorite, UserWatchHistory

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'release_date', 'vote_average', 'tmdb_id', 'created_at')
    list_filter = ('release_date', 'vote_average')
    search_fields = ('title', 'overview')
    readonly_fields = ('tmdb_id', 'created_at')
    ordering = ('-created_at',)

@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'movie', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'movie__title')
    ordering = ('-created_at',)

@admin.register(UserWatchHistory)
class UserWatchHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'movie', 'watched_at')
    list_filter = ('watched_at',)
    search_fields = ('user__username', 'movie__title')
    ordering = ('-watched_at',)
