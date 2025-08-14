#!/usr/bin/env python
"""
Simple script to cleanup duplicate watch history entries before migration
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cinema_chronicles.settings')
django.setup()

from movies.models import UserWatchHistory
from django.db.models import Count

def cleanup_duplicates():
    print("Cleaning up duplicate watch history entries...")
    
    # Find user-movie pairs with multiple entries
    duplicates = UserWatchHistory.objects.values('user', 'movie').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    total_removed = 0
    
    for duplicate in duplicates:
        user_id = duplicate['user']
        movie_id = duplicate['movie']
        count = duplicate['count']
        
        # Get all entries for this user-movie combination, ordered by date
        entries = list(UserWatchHistory.objects.filter(
            user_id=user_id,
            movie_id=movie_id
        ).order_by('watched_at'))
        
        # Keep the latest entry, delete the rest
        if len(entries) > 1:
            entries_to_delete = entries[:-1]  # All except the last one
            
            print(f"User {user_id}, Movie {movie_id}: Removing {len(entries_to_delete)} duplicates, keeping latest entry")
            
            for entry in entries_to_delete:
                entry.delete()
                total_removed += 1
    
    print(f"Removed {total_removed} duplicate watch history entries")

if __name__ == "__main__":
    cleanup_duplicates()
