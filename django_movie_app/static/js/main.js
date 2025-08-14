// CSRF token for Django AJAX requests
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

// Sidebar functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const hamburgerBtnNav = document.querySelector('.hamburger-btn-nav');
    
    if (sidebar && overlay) {
        const isActive = sidebar.classList.contains('active');
        
        if (isActive) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            if (hamburgerBtn) hamburgerBtn.classList.remove('active');
            if (hamburgerBtnNav) hamburgerBtnNav.classList.remove('active');
            document.body.style.overflow = 'auto';
        } else {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            if (hamburgerBtn) hamburgerBtn.classList.add('active');
            if (hamburgerBtnNav) hamburgerBtnNav.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
}

// Close sidebar when clicking on a link (mobile)
document.addEventListener('DOMContentLoaded', function() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't close for non-navigation links
            if (!this.href || this.href.includes('#')) {
                return;
            }
            
            // Close sidebar when navigating
            setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    toggleSidebar();
                }
            }, 100);
        });
    });
    
    // Close sidebar on window resize if very large screen
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1200) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const hamburgerBtn = document.querySelector('.hamburger-btn');
            const hamburgerBtnNav = document.querySelector('.hamburger-btn-nav');
            
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                if (hamburgerBtn) hamburgerBtn.classList.remove('active');
                if (hamburgerBtnNav) hamburgerBtnNav.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
    });
});

// Show genre filter (placeholder function)
function showGenreFilter() {
    // Redirect to discover page with genre selector
    window.location.href = '/movies/';
}

// Show settings (placeholder function)
function showSettings() {
    showMessage('Settings feature coming soon!', 'info');
}

// Request tracking to prevent duplicates
const requestCache = new Map();
const requestTimeouts = new Map();

// Debounce function to prevent multiple rapid requests
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create a unique key for tracking requests
function createRequestKey(url, method, data) {
    return `${method}:${url}:${JSON.stringify(data)}`;
}

// Safe API call with duplicate prevention
async function safeApiCall(url, options, cacheKey) {
    // Check if this exact request is already in progress
    if (requestCache.has(cacheKey)) {
        console.log('Request already in progress:', cacheKey);
        return requestCache.get(cacheKey);
    }
    
    // Create the request promise
    const requestPromise = fetch(url, options);
    
    // Cache the promise
    requestCache.set(cacheKey, requestPromise);
    
    try {
        const response = await requestPromise;
        const data = await response.json();
        
        // Clear cache after successful response
        requestCache.delete(cacheKey);
        
        return { response, data };
    } catch (error) {
        // Clear cache on error too
        requestCache.delete(cacheKey);
        throw error;
    }
}

// Toggle favorite status with duplicate prevention
async function toggleFavorite(tmdbId, element) {
    // Disable button to prevent rapid clicks
    if (element.disabled) return;
    element.disabled = true;
    
    const originalText = element.innerHTML;
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    const cacheKey = createRequestKey('/api/toggle-favorite/', 'POST', { tmdb_id: tmdbId });
    
    try {
        const { response, data } = await safeApiCall('/api/toggle-favorite/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                tmdb_id: tmdbId
            })
        }, cacheKey);
        
        if (response.ok) {
            // Update button appearance
            if (data.is_favorite) {
                element.classList.add('favorited');
                element.innerHTML = '<i class="fas fa-heart"></i> Favorited';
                element.style.background = '#dc3545';
            } else {
                element.classList.remove('favorited');
                element.innerHTML = '<i class="far fa-heart"></i> Favorite';
                element.style.background = '#28a745';
            }
            
            // Show success message
            showMessage(data.message, 'success');
            
            // Update favorite icon if exists
            const favoriteIcon = document.querySelector(`.favorite-icon[data-movie-id="${tmdbId}"]`);
            if (favoriteIcon) {
                favoriteIcon.classList.toggle('favorited', data.is_favorite);
                favoriteIcon.innerHTML = data.is_favorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
            }
            
            // Update movie cards if they exist on the page
            updateMovieCardFavoriteStatus(tmdbId, data.is_favorite);
            
        } else {
            showMessage(data.error || 'Error updating favorite', 'error');
            element.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error updating favorite', 'error');
        element.innerHTML = originalText;
    } finally {
        // Re-enable button after short delay
        setTimeout(() => {
            element.disabled = false;
        }, 1000);
    }
}

// Update movie card favorite status across the page
function updateMovieCardFavoriteStatus(tmdbId, isFavorite) {
    const movieCards = document.querySelectorAll(`[data-movie-id="${tmdbId}"]`);
    movieCards.forEach(card => {
        const favoriteBtn = card.querySelector('.favorite-btn, .btn-favorite');
        if (favoriteBtn) {
            if (isFavorite) {
                favoriteBtn.classList.add('favorited');
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Favorited';
                favoriteBtn.style.background = '#dc3545';
            } else {
                favoriteBtn.classList.remove('favorited');
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Favorite';
                favoriteBtn.style.background = '#28a745';
            }
        }
    });
}

// Add to watch history with duplicate prevention
async function addToWatchHistory(tmdbId, element = null) {
    const cacheKey = createRequestKey('/api/add-to-history/', 'POST', { tmdb_id: tmdbId });
    
    // Show loading state if element provided
    if (element) {
        element.disabled = true;
        const originalText = element.innerHTML;
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }
    
    try {
        const { response, data } = await safeApiCall('/api/add-to-history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                tmdb_id: tmdbId
            })
        }, cacheKey);
        
        if (response.ok) {
            const action = data.action || 'added';
            showMessage(`Movie ${action} to watch history`, 'success');
            
            // Update button state if movie was marked as watched
            if (data.is_watched && element) {
                element.disabled = true;
                element.classList.remove('btn-secondary');
                element.classList.add('btn-success');
                element.innerHTML = '<i class="fas fa-check-circle"></i> Already Watched';
            }
        } else {
            showMessage(data.error || 'Error adding to watch history', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error adding to watch history', 'error');
    } finally {
        if (element) {
            setTimeout(() => {
                element.disabled = false;
                element.innerHTML = '<i class="fas fa-eye"></i> Watched';
            }, 1000);
        }
    }
}

// Show message notification
function showMessage(message, type = 'info') {
    const messagesContainer = document.querySelector('.messages') || createMessagesContainer();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        ${message}
        <button class="close-message" onclick="this.parentElement.remove()">×</button>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Create messages container if it doesn't exist
function createMessagesContainer() {
    const container = document.createElement('div');
    container.className = 'messages';
    document.body.appendChild(container);
    return container;
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
});

// Handle movie poster clicks
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for movie posters
    const moviePosters = document.querySelectorAll('.movie-poster');
    moviePosters.forEach(poster => {
        poster.addEventListener('click', function() {
            const movieId = this.dataset.movieId;
            if (movieId) {
                window.location.href = `/movie/${movieId}/`;
            }
        });
    });
    
    // Add click handlers for favorite icons
    const favoriteIcons = document.querySelectorAll('.favorite-icon');
    favoriteIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const movieId = this.dataset.movieId;
            if (movieId) {
                toggleFavorite(movieId, this);
            }
        });
    });
    
    // Auto-hide messages after 5 seconds
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        setTimeout(() => {
            if (message.parentNode) {
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 300);
            }
        }, 5000);
    });
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Search form enhancement
const searchForm = document.querySelector('.search-form');
if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
        const searchInput = this.querySelector('input[name="search"]');
        if (searchInput && !searchInput.value.trim()) {
            e.preventDefault();
            showMessage('Please enter a search term', 'warning');
            searchInput.focus();
        }
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add loading state to forms
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
    });
});

// Keyboard navigation for modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="flex"]');
        if (openModal) {
            closeModal(openModal.id);
        }
    }
});

// Infinite scroll (if needed)
let isLoading = false;

function loadMoreMovies() {
    if (isLoading) return;
    
    const loadMoreBtn = document.querySelector('.load-more');
    if (!loadMoreBtn) return;
    
    isLoading = true;
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    loadMoreBtn.disabled = true;
    
    // Implementation would depend on the specific page
    // This is a placeholder for infinite scroll functionality
}

window.addEventListener('scroll', function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        loadMoreMovies();
    }
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality with debouncing and duplicate prevention
let currentSearchController = null;
let lastSearchQuery = '';
let searchResultsCache = new Map();
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const debouncedSearch = debounce(async function(query) {
    await performSearch(query);
}, 300);

async function performSearch(query) {
    if (!query || query.length < 2) {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        return;
    }
    
    // Check if this query was recently searched
    const cacheKey = `search:${query.toLowerCase()}`;
    const cachedResult = searchResultsCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp < SEARCH_CACHE_DURATION)) {
        console.log('Using cached search results for:', query);
        displaySearchResults(cachedResult.data);
        return;
    }
    
    // Abort previous search if still running
    if (currentSearchController) {
        currentSearchController.abort();
    }
    
    // Create new AbortController for this search
    currentSearchController = new AbortController();
    
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    }
    
    try {
        const response = await fetch(`/api/search/?q=${encodeURIComponent(query)}`, {
            signal: currentSearchController.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the results
        searchResultsCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean old cache entries (keep only last 10 searches)
        if (searchResultsCache.size > 10) {
            const oldestKey = searchResultsCache.keys().next().value;
            searchResultsCache.delete(oldestKey);
        }
        
        displaySearchResults(data);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="error">Search failed. Please try again.</div>';
            }
        }
    } finally {
        currentSearchController = null;
    }
}

function displaySearchResults(data) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    if (!data.movies || data.movies.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No movies found</div>';
        return;
    }
    
    let html = '<div class="search-results-grid">';
    
    data.movies.forEach(movie => {
        const poster = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` 
            : '/static/images/no-poster.jpg';
            
        const isFavorite = movie.is_favorite || false;
        
        html += `
            <div class="search-result-card" data-movie-id="${movie.tmdb_id}">
                <img src="${poster}" alt="${movie.title}" loading="lazy">
                <div class="card-content">
                    <h3>${movie.title}</h3>
                    <p class="release-year">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</p>
                    <p class="rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                    <div class="action-buttons">
                        <button 
                            class="btn-favorite ${isFavorite ? 'favorited' : ''}" 
                            onclick="toggleFavorite(${movie.tmdb_id}, this)"
                            style="background: ${isFavorite ? '#dc3545' : '#28a745'}"
                        >
                            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                            ${isFavorite ? 'Favorited' : 'Favorite'}
                        </button>
                        <button 
                            class="btn-watch" 
                            onclick="addToWatchHistory(${movie.tmdb_id}, this)"
                        >
                            <i class="fas fa-eye"></i> Watched
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsContainer.innerHTML = html;
}

// Enhanced DOMContentLoaded for search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (query !== lastSearchQuery) {
                lastSearchQuery = query;
                debouncedSearch(query);
            }
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                lastSearchQuery = '';
                const resultsContainer = document.getElementById('search-results');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '';
                }
            }
        });
    }
    
    // Clear cache periodically to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of searchResultsCache.entries()) {
            if (now - value.timestamp > SEARCH_CACHE_DURATION) {
                searchResultsCache.delete(key);
            }
        }
        
        for (const [key, value] of requestCache.entries()) {
            // Clear any stale request cache entries
            if (now - (value.startTime || 0) > 30000) { // 30 seconds
                requestCache.delete(key);
            }
        }
    }, 60000); // Clean up every minute
});

// Apply debouncing to scroll events
window.addEventListener('scroll', debounce(function() {
    // Scroll-based functionality here
}, 100));
