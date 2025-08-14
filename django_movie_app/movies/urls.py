from django.urls import path
from . import views

app_name = 'movies'

urlpatterns = [
    path('', views.landing, name='landing'),
    path('home/', views.home, name='home'),
    path('movies/', views.movies_list, name='movies_list'),
    path('movie/<int:tmdb_id>/', views.movie_detail, name='movie_detail'),
    path('favorites/', views.favorites, name='favorites'),
    path('history/', views.watch_history, name='watch_history'),
    path('settings/', views.settings, name='settings'),
    path('export-data/', views.export_data, name='export_data'),
    path('api/toggle-favorite/', views.toggle_favorite, name='toggle_favorite'),
    path('api/add-to-history/', views.add_to_watch_history, name='add_to_watch_history'),
]
