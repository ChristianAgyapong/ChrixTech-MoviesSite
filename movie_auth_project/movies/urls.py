from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('api/save-user-data/', views.save_user_data, name='save_user_data'),
    path('api/get-user-data/', views.get_user_data, name='get_user_data'),
]
