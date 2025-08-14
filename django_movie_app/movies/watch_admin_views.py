from django.contrib import admin
from django.shortcuts import render
from django.http import HttpResponse
from django.urls import path
from django.contrib.auth.models import User
from django.db.models import Count, Q
from movies.models import UserWatchHistory

class WatchHistoryAdminView:
    def get_urls(self):
        urls = [
            path('users-watch-summary/', self.users_watch_summary, name='users_watch_summary'),
        ]
        return urls

    def users_watch_summary(self, request):
        # Get users with their watch history count
        users_with_history = User.objects.annotate(
            movies_watched=Count('userwatchhistory', distinct=True),
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
        }
        
        return render(request, 'admin/watch_history_summary.html', context)

# Register the custom view
watch_history_view = WatchHistoryAdminView()
admin.site.get_urls = lambda: admin.site.get_urls() + watch_history_view.get_urls()
