from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


def home(request):
    """Serve the main movie app page (requires authentication)"""
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'movies/index.html', {'user': request.user})


def login_view(request):
    """Handle user login"""
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        # Try to find user by email
        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            messages.error(request, 'No account found with this email address.')
            return render(request, 'auth/login.html')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f'Welcome back, {user.username}!')
            return redirect('home')
        else:
            messages.error(request, 'Invalid email or password.')
    
    return render(request, 'auth/login.html')


def signup_view(request):
    """Handle user registration"""
    if request.user.is_authenticated:
        return redirect('home')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        # Basic validation
        if password1 != password2:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'auth/signup.html')
        
        if len(password1) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'auth/signup.html')
        
        # Check if username or email already exists
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists.')
            return render(request, 'auth/signup.html')
            
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email already registered.')
            return render(request, 'auth/signup.html')
        
        # Create user
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password1
            )
            messages.success(request, f'Account created successfully! You can now log in.')
            return redirect('login')
        except Exception as e:
            messages.error(request, 'Error creating account. Please try again.')
    
    return render(request, 'auth/signup.html')


def logout_view(request):
    """Handle user logout"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('login')


@login_required
@csrf_exempt
def save_user_data(request):
    """Save user-specific data (favorites, views) to session"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            request.session['user_favorites'] = data.get('favorites', [])
            request.session['user_views'] = data.get('views', 0)
            return JsonResponse({'status': 'success'})
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'})
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'})


@login_required
def get_user_data(request):
    """Get user-specific data from session"""
    return JsonResponse({
        'favorites': request.session.get('user_favorites', []),
        'views': request.session.get('user_views', 0)
    })
