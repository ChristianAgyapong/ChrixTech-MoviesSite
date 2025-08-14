from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from django.utils.html import format_html
from django.urls import reverse, path
from django.db.models import Count, Q
from django.shortcuts import render
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Movie, UserFavorite, UserWatchHistory

# Custom filter classes for time-based filtering
class TimePeriodListFilter(admin.SimpleListFilter):
    title = 'Time Period'
    parameter_name = 'time_period'
    date_field = 'watched_at'  # Default for watch history

    def lookups(self, request, model_admin):
        return (
            ('today', 'Today'),
            ('yesterday', 'Yesterday'),
            ('this_week', 'This Week'),
            ('last_week', 'Last Week'),
            ('this_month', 'This Month'),
            ('last_month', 'Last Month'),
            ('last_3_months', 'Last 3 Months'),
            ('last_6_months', 'Last 6 Months'),
            ('this_year', 'This Year'),
            ('last_year', 'Last Year'),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        today = now.date()
        date_field = getattr(self, 'date_field', 'watched_at')
        
        if self.value() == 'today':
            return queryset.filter(**{f'{date_field}__date': today})
        elif self.value() == 'yesterday':
            yesterday = today - timedelta(days=1)
            return queryset.filter(**{f'{date_field}__date': yesterday})
        elif self.value() == 'this_week':
            start_week = today - timedelta(days=today.weekday())
            return queryset.filter(**{f'{date_field}__date__gte': start_week})
        elif self.value() == 'last_week':
            start_last_week = today - timedelta(days=today.weekday() + 7)
            end_last_week = today - timedelta(days=today.weekday() + 1)
            return queryset.filter(**{f'{date_field}__date__gte': start_last_week, f'{date_field}__date__lte': end_last_week})
        elif self.value() == 'this_month':
            start_month = today.replace(day=1)
            return queryset.filter(**{f'{date_field}__date__gte': start_month})
        elif self.value() == 'last_month':
            first_this_month = today.replace(day=1)
            last_month = first_this_month - timedelta(days=1)
            first_last_month = last_month.replace(day=1)
            return queryset.filter(**{f'{date_field}__date__gte': first_last_month, f'{date_field}__date__lt': first_this_month})
        elif self.value() == 'last_3_months':
            three_months_ago = today - timedelta(days=90)
            return queryset.filter(**{f'{date_field}__date__gte': three_months_ago})
        elif self.value() == 'last_6_months':
            six_months_ago = today - timedelta(days=180)
            return queryset.filter(**{f'{date_field}__date__gte': six_months_ago})
        elif self.value() == 'this_year':
            start_year = today.replace(month=1, day=1)
            return queryset.filter(**{f'{date_field}__date__gte': start_year})
        elif self.value() == 'last_year':
            start_last_year = today.replace(year=today.year-1, month=1, day=1)
            end_last_year = today.replace(year=today.year-1, month=12, day=31)
            return queryset.filter(**{f'{date_field}__date__gte': start_last_year, f'{date_field}__date__lte': end_last_year})
        return queryset

class HourRangeListFilter(admin.SimpleListFilter):
    title = 'Time of Day'
    parameter_name = 'hour_range'
    date_field = 'watched_at'  # Default for watch history

    def lookups(self, request, model_admin):
        return (
            ('morning', 'Morning (6AM - 12PM)'),
            ('afternoon', 'Afternoon (12PM - 6PM)'),
            ('evening', 'Evening (6PM - 10PM)'),
            ('night', 'Night (10PM - 6AM)'),
            ('business', 'Business Hours (9AM - 5PM)'),
            ('weekend', 'Weekend'),
        )

    def queryset(self, request, queryset):
        date_field = getattr(self, 'date_field', 'watched_at')
        
        if self.value() == 'morning':
            return queryset.filter(**{f'{date_field}__hour__gte': 6, f'{date_field}__hour__lt': 12})
        elif self.value() == 'afternoon':
            return queryset.filter(**{f'{date_field}__hour__gte': 12, f'{date_field}__hour__lt': 18})
        elif self.value() == 'evening':
            return queryset.filter(**{f'{date_field}__hour__gte': 18, f'{date_field}__hour__lt': 22})
        elif self.value() == 'night':
            return queryset.filter(Q(**{f'{date_field}__hour__gte': 22}) | Q(**{f'{date_field}__hour__lt': 6}))
        elif self.value() == 'business':
            return queryset.filter(**{f'{date_field}__hour__gte': 9, f'{date_field}__hour__lt': 17})
        elif self.value() == 'weekend':
            return queryset.filter(**{f'{date_field}__week_day__in': [1, 7]})  # Sunday=1, Saturday=7
        return queryset

# Specific filters for UserFavorite (using created_at field)
class FavoriteTimePeriodFilter(TimePeriodListFilter):
    date_field = 'created_at'

class FavoriteHourRangeFilter(HourRangeListFilter):
    date_field = 'created_at'

class MovieYearListFilter(admin.SimpleListFilter):
    title = 'Movie Release Year'
    parameter_name = 'movie_year'

    def lookups(self, request, model_admin):
        current_year = timezone.now().year
        return (
            ('2024', '2024'),
            ('2023', '2023'),
            ('2022', '2022'),
            ('2021', '2021'),
            ('2020', '2020'),
            ('2010s', '2010-2019'),
            ('2000s', '2000-2009'),
            ('90s', '1990-1999'),
            ('80s', '1980-1989'),
            ('older', 'Before 1980'),
        )

    def queryset(self, request, queryset):
        if self.value() == '2024':
            return queryset.filter(release_date__year=2024)
        elif self.value() == '2023':
            return queryset.filter(release_date__year=2023)
        elif self.value() == '2022':
            return queryset.filter(release_date__year=2022)
        elif self.value() == '2021':
            return queryset.filter(release_date__year=2021)
        elif self.value() == '2020':
            return queryset.filter(release_date__year=2020)
        elif self.value() == '2010s':
            return queryset.filter(release_date__year__gte=2010, release_date__year__lte=2019)
        elif self.value() == '2000s':
            return queryset.filter(release_date__year__gte=2000, release_date__year__lte=2009)
        elif self.value() == '90s':
            return queryset.filter(release_date__year__gte=1990, release_date__year__lte=1999)
        elif self.value() == '80s':
            return queryset.filter(release_date__year__gte=1980, release_date__year__lte=1989)
        elif self.value() == 'older':
            return queryset.filter(release_date__year__lt=1980)
        return queryset

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'release_date', 'vote_average', 'tmdb_id', 'created_at', 'colored_rating')
    list_filter = ('release_date', 'vote_average', MovieYearListFilter, 'created_at')
    search_fields = ('title', 'overview')
    readonly_fields = ('tmdb_id', 'created_at')
    ordering = ('-created_at',)
    date_hierarchy = 'release_date'
    
    def colored_rating(self, obj):
        if obj.vote_average >= 8.0:
            color = '#28a745'  # Green
        elif obj.vote_average >= 6.0:
            color = '#ffc107'  # Yellow
        else:
            color = '#dc3545'  # Red
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.vote_average
        )
    colored_rating.short_description = 'Rating'
    colored_rating.admin_order_field = 'vote_average'

@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'movie', 'created_at', 'time_since_added')
    list_filter = ('created_at', FavoriteTimePeriodFilter, FavoriteHourRangeFilter)
    search_fields = ('user__username', 'movie__title')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    def time_since_added(self, obj):
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    time_since_added.short_description = 'Added'

class WatchHistoryInline(admin.TabularInline):
    model = UserWatchHistory
    extra = 0
    readonly_fields = ('movie', 'watched_at')
    can_delete = True
    
    def has_add_permission(self, request, obj=None):
        return False

# Custom User Admin to show watch history inline
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'movies_watched_count', 'last_activity', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('date_joined', 'last_login')
    inlines = [WatchHistoryInline]
    
    # Enable all permissions for user management
    actions = ['delete_selected', 'activate_users', 'deactivate_users']
    
    # Fieldsets for better organization in edit form
    fieldsets = (
        ('User Information', {
            'fields': ('username', 'email', 'first_name', 'last_name')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users were successfully activated.')
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users were successfully deactivated.')
    deactivate_users.short_description = "Deactivate selected users"
    
    def movies_watched_count(self, obj):
        count = UserWatchHistory.objects.filter(user=obj).count()
        unique_movies = UserWatchHistory.objects.filter(user=obj).values('movie').distinct().count()
        
        if count > 0:
            color = '#28a745' if count >= 10 else '#ffc107' if count >= 5 else '#17a2b8'
            return format_html(
                '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">{}</span> total<br/><small>{} unique</small>',
                color, count, unique_movies
            )
        return '0 movies'
    movies_watched_count.short_description = 'Movies Watched'
    movies_watched_count.admin_order_field = 'watch_count'
    
    def last_activity(self, obj):
        last_watch = UserWatchHistory.objects.filter(user=obj).order_by('-watched_at').first()
        if last_watch:
            now = timezone.now()
            diff = now - last_watch.watched_at
            
            if diff.days > 0:
                return f"{diff.days} days ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours} hours ago"
            else:
                return "Recently"
        return "Never"
    last_activity.short_description = 'Last Activity'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        # Show ALL users, not just those with watch history
        return queryset.annotate(
            watch_count=Count('userwatchhistory', distinct=True)
        ).prefetch_related('userwatchhistory')
    
    # Override delete permissions to ensure they work
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or request.user.has_perm('auth.delete_user')
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser or request.user.has_perm('auth.change_user')
    
    def has_add_permission(self, request):
        return request.user.is_superuser or request.user.has_perm('auth.add_user')
    
    # Custom delete method to handle cascading properly
    def delete_queryset(self, request, queryset):
        for user in queryset:
            # Delete related records first
            UserWatchHistory.objects.filter(user=user).delete()
            UserFavorite.objects.filter(user=user).delete()
            # Then delete the user
            user.delete()
        
        self.message_user(request, f'{queryset.count()} users were successfully deleted along with their watch history and favorites.')
    
    def delete_model(self, request, obj):
        # Delete related records first
        UserWatchHistory.objects.filter(user=obj).delete()
        UserFavorite.objects.filter(user=obj).delete()
        # Then delete the user
        obj.delete()
        
        self.message_user(request, f'User "{obj.username}" was successfully deleted along with their watch history and favorites.')


# Register the models (User is now handled in accounts.admin)

# Register dummy model to provide the watch summary URL
# We'll use the Movie model as a base since it already exists
class MovieAdminForSummary(MovieAdmin):
    """Extended Movie admin that includes the watch summary URL"""
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('watch-summary/', self.admin_site.admin_view(self.users_watch_summary), name='users_watch_summary'),
            path('recent-actions/', self.admin_site.admin_view(self.recent_actions_view), name='recent_actions'),
        ]
        return custom_urls + urls

    def recent_actions_view(self, request):
        """View for current admin actions"""
        # Get filter parameters
        days = int(request.GET.get('days', 7))  # Default to last 7 days
        action_type = request.GET.get('action_type', 'all')
        
        # Build the queryset
        cutoff_date = timezone.now() - timedelta(days=days)
        log_entries = LogEntry.objects.filter(
            action_time__gte=cutoff_date
        ).select_related('user', 'content_type')
        
        # Filter by action type if specified
        if action_type == 'addition':
            log_entries = log_entries.filter(action_flag=ADDITION)
        elif action_type == 'change':
            log_entries = log_entries.filter(action_flag=CHANGE)
        elif action_type == 'deletion':
            log_entries = log_entries.filter(action_flag=DELETION)
        
        # Order by most recent
        log_entries = log_entries.order_by('-action_time')[:50]  # Limit to 50 entries
        
        # Calculate statistics
        total_actions = LogEntry.objects.filter(action_time__gte=cutoff_date).count()
        additions = LogEntry.objects.filter(action_time__gte=cutoff_date, action_flag=ADDITION).count()
        changes = LogEntry.objects.filter(action_time__gte=cutoff_date, action_flag=CHANGE).count()
        deletions = LogEntry.objects.filter(action_time__gte=cutoff_date, action_flag=DELETION).count()
        
        context = {
            'log_entries': log_entries,
            'days': days,
            'action_type': action_type,
            'stats': {
                'total': total_actions,
                'additions': additions,
                'changes': changes,
                'deletions': deletions,
            },
            'title': f'Current Admin Actions (Last {days} days)',
            'opts': self.model._meta,
            'has_change_permission': True,
        }
        
        return render(request, 'admin/recent_actions.html', context)

    def users_watch_summary(self, request):
        # Get time filter from request
        time_filter = request.GET.get('time_filter', 'all')
        now = timezone.now()
        today = now.date()
        
        # Build base queryset
        base_filter = Q()
        
        if time_filter == 'today':
            base_filter = Q(userwatchhistory__watched_at__date=today)
        elif time_filter == 'this_week':
            start_week = today - timedelta(days=today.weekday())
            base_filter = Q(userwatchhistory__watched_at__date__gte=start_week)
        elif time_filter == 'this_month':
            start_month = today.replace(day=1)
            base_filter = Q(userwatchhistory__watched_at__date__gte=start_month)
        elif time_filter == 'last_month':
            first_this_month = today.replace(day=1)
            last_month = first_this_month - timedelta(days=1)
            first_last_month = last_month.replace(day=1)
            base_filter = Q(
                userwatchhistory__watched_at__date__gte=first_last_month,
                userwatchhistory__watched_at__date__lt=first_this_month
            )
        elif time_filter == 'this_year':
            start_year = today.replace(month=1, day=1)
            base_filter = Q(userwatchhistory__watched_at__date__gte=start_year)
        
        # Get users with their watch history count (filtered by time)
        if time_filter == 'all':
            users_with_history = User.objects.annotate(
                movies_watched=Count('userwatchhistory__movie', distinct=True),
                total_watches=Count('userwatchhistory')
            ).filter(movies_watched__gt=0).order_by('-movies_watched')
        else:
            users_with_history = User.objects.filter(base_filter).annotate(
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
                watch_filter = UserWatchHistory.objects.filter(user=selected_user)
                
                # Apply time filter to user details as well
                if time_filter != 'all':
                    if time_filter == 'today':
                        watch_filter = watch_filter.filter(watched_at__date=today)
                    elif time_filter == 'this_week':
                        start_week = today - timedelta(days=today.weekday())
                        watch_filter = watch_filter.filter(watched_at__date__gte=start_week)
                    elif time_filter == 'this_month':
                        start_month = today.replace(day=1)
                        watch_filter = watch_filter.filter(watched_at__date__gte=start_month)
                    elif time_filter == 'last_month':
                        first_this_month = today.replace(day=1)
                        last_month = first_this_month - timedelta(days=1)
                        first_last_month = last_month.replace(day=1)
                        watch_filter = watch_filter.filter(
                            watched_at__date__gte=first_last_month,
                            watched_at__date__lt=first_this_month
                        )
                    elif time_filter == 'this_year':
                        start_year = today.replace(month=1, day=1)
                        watch_filter = watch_filter.filter(watched_at__date__gte=start_year)
                
                user_watch_details = watch_filter.select_related('movie').order_by('-watched_at')
            except User.DoesNotExist:
                pass
        
        # Calculate summary statistics
        total_users = User.objects.filter(userwatchhistory__isnull=False).distinct().count()
        active_today = User.objects.filter(userwatchhistory__watched_at__date=today).distinct().count()
        active_this_week = User.objects.filter(
            userwatchhistory__watched_at__date__gte=today - timedelta(days=today.weekday())
        ).distinct().count()
        
        context = {
            'users_with_history': users_with_history,
            'user_watch_details': user_watch_details,
            'selected_user': selected_user,
            'time_filter': time_filter,
            'summary_stats': {
                'total_users': total_users,
                'active_today': active_today,
                'active_this_week': active_this_week,
            },
            'title': f'User Watch History Summary ({time_filter.replace("_", " ").title()})',
            'opts': User._meta,
            'has_change_permission': True,
        }
        
        return render(request, 'admin/watch_history_summary.html', context)

# Re-register Movie with the extended admin
admin.site.unregister(Movie)
admin.site.register(Movie, MovieAdminForSummary)

@admin.register(UserWatchHistory)
class UserWatchHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'movie', 'watched_at', 'time_since_watched', 'watch_day', 'watch_time')
    list_filter = (TimePeriodListFilter, HourRangeListFilter, 'watched_at', MovieYearListFilter)
    search_fields = ('user__username', 'movie__title')
    ordering = ('-watched_at',)
    date_hierarchy = 'watched_at'
    
    def time_since_watched(self, obj):
        now = timezone.now()
        diff = now - obj.watched_at
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    time_since_watched.short_description = 'Time Ago'
    
    def watch_day(self, obj):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return days[obj.watched_at.weekday()]
    watch_day.short_description = 'Day'
    
    def watch_time(self, obj):
        time = obj.watched_at.strftime('%I:%M %p')
        hour = obj.watched_at.hour
        
        if 6 <= hour < 12:
            period_color = '#28a745'  # Morning - Green
            period = 'Morning'
        elif 12 <= hour < 18:
            period_color = '#ffc107'  # Afternoon - Yellow
            period = 'Afternoon'
        elif 18 <= hour < 22:
            period_color = '#fd7e14'  # Evening - Orange
            period = 'Evening'
        else:
            period_color = '#6f42c1'  # Night - Purple
            period = 'Night'
            
        return format_html(
            '{} <span style="background: {}; color: white; padding: 1px 4px; border-radius: 2px; font-size: 0.8em;">{}</span>',
            time, period_color, period
        )
    watch_time.short_description = 'Time & Period'
    
    # Add link to the summary view
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = 'User Watch History - Individual Records'
        extra_context['summary_url'] = reverse('admin:users_watch_summary')
        
        # Add statistics to the context
        now = timezone.now()
        today = now.date()
        
        total_watches = UserWatchHistory.objects.count()
        today_watches = UserWatchHistory.objects.filter(watched_at__date=today).count()
        this_week_watches = UserWatchHistory.objects.filter(
            watched_at__date__gte=today - timedelta(days=today.weekday())
        ).count()
        this_month_watches = UserWatchHistory.objects.filter(
            watched_at__date__gte=today.replace(day=1)
        ).count()
        
        extra_context['stats'] = {
            'total': total_watches,
            'today': today_watches,
            'this_week': this_week_watches,
            'this_month': this_month_watches,
        }
        
        return super().changelist_view(request, extra_context=extra_context)
