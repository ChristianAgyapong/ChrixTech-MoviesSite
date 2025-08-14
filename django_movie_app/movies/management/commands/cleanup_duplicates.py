from django.core.management.base import BaseCommand
from django.db.models import Count
from movies.models import Movie, UserFavorite, UserWatchHistory
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Remove duplicate entries and clean up the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No data will be deleted')
            )

        # 1. Remove duplicate movies based on TMDB ID
        self.stdout.write('Checking for duplicate movies...')
        duplicate_movies = Movie.objects.values('tmdb_id').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        movies_removed = 0
        for duplicate in duplicate_movies:
            movies_with_same_tmdb_id = Movie.objects.filter(
                tmdb_id=duplicate['tmdb_id']
            ).order_by('created_at')
            
            # Keep the first one, delete the rest
            movies_to_delete = movies_with_same_tmdb_id[1:]
            
            if not dry_run:
                for movie in movies_to_delete:
                    # Update foreign key references before deletion
                    UserFavorite.objects.filter(movie=movie).update(
                        movie=movies_with_same_tmdb_id.first()
                    )
                    UserWatchHistory.objects.filter(movie=movie).update(
                        movie=movies_with_same_tmdb_id.first()
                    )
                    movie.delete()
            
            movies_removed += len(movies_to_delete)
            self.stdout.write(f'Found {len(movies_to_delete)} duplicates for TMDB ID {duplicate["tmdb_id"]}')

        self.stdout.write(
            self.style.SUCCESS(f'{"Would remove" if dry_run else "Removed"} {movies_removed} duplicate movies')
        )

        # 2. Remove duplicate favorites (user + movie combination)
        self.stdout.write('Checking for duplicate favorites...')
        duplicate_favorites = UserFavorite.objects.values('user', 'movie').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        favorites_removed = 0
        for duplicate in duplicate_favorites:
            favorites_with_same_user_movie = UserFavorite.objects.filter(
                user_id=duplicate['user'],
                movie_id=duplicate['movie']
            ).order_by('created_at')
            
            # Keep the first one, delete the rest
            favorites_to_delete = favorites_with_same_user_movie[1:]
            
            if not dry_run:
                for favorite in favorites_to_delete:
                    favorite.delete()
            
            favorites_removed += len(favorites_to_delete)

        self.stdout.write(
            self.style.SUCCESS(f'{"Would remove" if dry_run else "Removed"} {favorites_removed} duplicate favorites')
        )

        # 3. Remove duplicate watch history entries from same day
        self.stdout.write('Checking for duplicate watch history entries...')
        from django.db.models import Q
        from django.utils import timezone
        
        # Get all watch history entries grouped by user, movie, and date
        watch_entries = UserWatchHistory.objects.extra(
            select={'date_only': 'DATE(watched_at)'}
        ).values('user', 'movie', 'date_only').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        watch_history_removed = 0
        for entry in watch_entries:
            # Get all entries for this user/movie/date combination
            same_day_entries = UserWatchHistory.objects.filter(
                user_id=entry['user'],
                movie_id=entry['movie'],
                watched_at__date=entry['date_only']
            ).order_by('watched_at')
            
            # Keep the latest one from that day, delete the rest
            entries_list = list(same_day_entries)  # Convert to list for slicing
            entries_to_delete = entries_list[:-1] if len(entries_list) > 1 else []
            
            if entries_to_delete and not dry_run:
                for watch_entry in entries_to_delete:
                    watch_entry.delete()
            
            watch_history_removed += len(entries_to_delete)

        self.stdout.write(
            self.style.SUCCESS(f'{"Would remove" if dry_run else "Removed"} {watch_history_removed} duplicate watch history entries')
        )

        # 4. Clean up orphaned records
        self.stdout.write('Checking for orphaned records...')
        
        # Remove favorites for non-existent movies
        orphaned_favorites = UserFavorite.objects.filter(movie__isnull=True)
        orphaned_fav_count = orphaned_favorites.count()
        if not dry_run:
            orphaned_favorites.delete()

        # Remove watch history for non-existent movies
        orphaned_watch_history = UserWatchHistory.objects.filter(movie__isnull=True)
        orphaned_watch_count = orphaned_watch_history.count()
        if not dry_run:
            orphaned_watch_history.delete()

        # Remove favorites and watch history for non-existent users
        orphaned_fav_users = UserFavorite.objects.filter(user__isnull=True)
        orphaned_fav_user_count = orphaned_fav_users.count()
        if not dry_run:
            orphaned_fav_users.delete()

        orphaned_watch_users = UserWatchHistory.objects.filter(user__isnull=True)
        orphaned_watch_user_count = orphaned_watch_users.count()
        if not dry_run:
            orphaned_watch_users.delete()

        total_orphaned = orphaned_fav_count + orphaned_watch_count + orphaned_fav_user_count + orphaned_watch_user_count
        
        self.stdout.write(
            self.style.SUCCESS(f'{"Would remove" if dry_run else "Removed"} {total_orphaned} orphaned records')
        )

        # Summary
        total_cleaned = movies_removed + favorites_removed + watch_history_removed + total_orphaned
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'\nDRY RUN SUMMARY: Would clean up {total_cleaned} total records')
            )
            self.stdout.write('Run without --dry-run to actually perform the cleanup')
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nCLEANUP COMPLETE: Cleaned up {total_cleaned} total records')
            )
