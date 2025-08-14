from django.contrib import admin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.urls import reverse, path
from django.db.models import Count
from django.shortcuts import render
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

class WatchHistoryInline(admin.TabularInline):
    model = UserWatchHistory
    extra = 0
    readonly_fields = ('movie', 'watched_at')
    can_delete = True
    
    def has_add_permission(self, request, obj=None):
        return False

# Custom User Admin to show watch history inline
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'movies_watched_count', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    inlines = [WatchHistoryInline]
    
    def movies_watched_count(self, obj):
        count = UserWatchHistory.objects.filter(user=obj).count()
        if count > 0:
            return format_html('<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">{}</span> movies', count)
        return '0 movies'
    movies_watched_count.short_description = 'Movies Watched'
    movies_watched_count.admin_order_field = 'watch_count'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        # Only show users who have watch history
        user_ids_with_history = UserWatchHistory.objects.values_list('user_id', flat=True).distinct()
        return queryset.filter(id__in=user_ids_with_history).annotate(
            watch_count=Count('userwatchhistory')
        )
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('watch-summary/', self.admin_site.admin_view(self.users_watch_summary), name='users_watch_summary'),
        ]
        return custom_urls + urls
    
    def users_watch_summary(self, request):
        # Get users with their watch history count
        users_with_history = User.objects.annotate(
            movies_watched=Count('userwatchhistory__movie', distinct=True),
            total_watches=Count('userwatchhistory')
        ).filter(movies_watched__gt=0).order_by('-movies_watched')
        
        # If a specific user is selected, get their detailed history
        selected_user_id = request.GET.get('user_id')
        user_watch_details = None
        selected_user = None
        
        if selected_user_id:
            try:
                selected_user = User.objects.get(id=selected_user_id)
                user_watch_details = UserWatchHistory.objects.filter(
                    user=selected_user
                ).select_related('movie').order_by('-watched_at')
            except User.DoesNotExist:
                pass
        
        context = {
            'users_with_history': users_with_history,
            'user_watch_details': user_watch_details,
            'selected_user': selected_user,
            'title': 'User Watch History Summary',
            'opts': self.model._meta,
            'has_change_permission': True,
        }
        
        return render(request, 'admin/watch_history_summary.html', context)

# Register the custom User admin (but first unregister the default one)
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

@admin.register(UserWatchHistory)
class UserWatchHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'movie', 'watched_at')
    list_filter = ('watched_at',)
    search_fields = ('user__username', 'movie__title')
    ordering = ('-watched_at',)
    date_hierarchy = 'watched_at'
    
    # Add link to the summary view
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'User Watch History - Individual Records'
        extra_context['summary_url'] = reverse('admin:users_watch_summary')
        return super().changelist_view(request, extra_context=extra_context)
