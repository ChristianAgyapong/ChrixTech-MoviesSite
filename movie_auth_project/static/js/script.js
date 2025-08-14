const API_KEY = '949258ff4ff329d48e662c7badcd4ac9';
const BASE_URL = 'https://api.themoviedb.org/3';

const searchInput = document.getElementById('search');
const searchButton = document.getElementById('searchButton');
const genreSelect = document.getElementById('genreSelect');
const sortSelect = document.getElementById('sortSelect');
const moviesContainer = document.getElementById('movies');

let currentPage = 1;
let totalPages = 1; // Track total available pages
let currentQuery = '';
let currentGenre = '';
let currentMode = 'trending';
let isFetching = false;
let hasMoreData = true; // Track if more data is available

const movieCache = new Map(); // Cache for movie data
const trailerCache = new Map(); // Cache for trailer data

// Django integration - sync with server
let userFavorites = [];
let userViews = 0;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ----- Django Integration Functions -----
async function loadUserDataFromServer() {
  try {
    const response = await fetch('/api/get-user-data/');
    const data = await response.json();
    userFavorites = data.favorites || [];
    userViews = data.views || 0;
    
    // Sync with localStorage for backward compatibility
    localStorage.setItem('favorites', JSON.stringify(userFavorites));
    localStorage.setItem('views', userViews.toString());
  } catch (error) {
    console.warn('Could not load user data from server, using localStorage');
    userFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    userViews = parseInt(localStorage.getItem('views') || '0');
  }
}

async function saveUserDataToServer() {
  try {
    await fetch('/api/save-user-data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify({
        favorites: userFavorites,
        views: userViews
      })
    });
  } catch (error) {
    console.warn('Could not save user data to server');
  }
}

function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return '';
}

// ----- Initialization -----
async function init() {
  await loadUserDataFromServer();
  fetchGenres();
  switchMode('trending');
  loadStats();
}

// ----- Fetch Genre List -----
async function fetchGenres() {
  const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  const data = await res.json();
  data.genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    genreSelect.appendChild(opt);
  });
}

// ----- Mode Switching -----
function switchMode(mode) {
  currentMode = mode;
  currentPage = 1;
  hasMoreData = true; // Reset for new mode
  clearUIIndicators(); // Clear any existing indicators
  
  // Update navigation states (works for both main nav and sidebar)
  document.querySelectorAll('[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  
  fetchMoviesByMode(mode);
}

// ----- Enhanced Fetch Movies by Mode -----
async function fetchMoviesByMode(mode, append = false) {
  if (!hasMoreData && append) return; // Stop if no more data available
  
  showSpinner();
  isFetching = true;
  
  let url = `${BASE_URL}/trending/movie/day?api_key=${API_KEY}&page=${currentPage}`;
  if (mode === 'top_rated') url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=${currentPage}`;
  else if (mode === 'upcoming') url = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=${currentPage}`;
  else if (mode === 'favorites') { 
    hideSpinner(); 
    isFetching = false; 
    return loadFavorites(); 
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Update pagination info
    totalPages = data.total_pages;
    hasMoreData = currentPage < totalPages;
    
    // Log progress for debugging
    if (!append) {
      console.log(`🎬 Loading ${mode} movies - Page ${currentPage}/${totalPages} (${data.total_results.toLocaleString()} total results)`);
    } else {
      console.log(`📄 Loading page ${currentPage}/${totalPages}`);
    }
    
    append ? appendMovies(data.results) : displayMovies(data.results);
    
  } catch (error) {
    console.error('Error fetching movies:', error);
    showErrorMessage('Failed to load movies. Please try again.');
  }
  
  isFetching = false;
  hideSpinner();
}

// ----- Enhanced Search & Filter -----
async function fetchMovies(query, append = false) {
  if (!query.trim()) return;
  if (!hasMoreData && append) return; // Stop if no more data available
  
  showSpinner();
  isFetching = true;
  currentQuery = query; // Save for infinite scroll
  
  try {
    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`);
    const data = await res.json();
    
    // Update pagination info
    totalPages = data.total_pages;
    hasMoreData = currentPage < totalPages;
    
    if (!append) {
      console.log(`🔍 Searching "${query}" - Page ${currentPage}/${totalPages} (${data.total_results.toLocaleString()} results found)`);
    }
    
    append ? appendMovies(data.results) : displayMovies(data.results);
    
  } catch (error) {
    console.error('Error searching movies:', error);
    showErrorMessage('Search failed. Please try again.');
  }
  
  isFetching = false;
  hideSpinner();
}

async function fetchMoviesByGenre(genreId, append = false) {
  if (!genreId) return;
  if (!hasMoreData && append) return; // Stop if no more data available
  
  showSpinner();
  isFetching = true;
  currentGenre = genreId; // Save for infinite scroll
  
  try {
    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${currentPage}&sort_by=popularity.desc`);
    const data = await res.json();
    
    // Update pagination info
    totalPages = data.total_pages;
    hasMoreData = currentPage < totalPages;
    
    if (!append) {
      console.log(`🎭 Loading genre ${genreId} movies - Page ${currentPage}/${totalPages} (${data.total_results.toLocaleString()} results)`);
    }
    
    append ? appendMovies(data.results) : displayMovies(data.results);
    
  } catch (error) {
    console.error('Error fetching genre movies:', error);
    showErrorMessage('Failed to load genre movies. Please try again.');
  }
  
  isFetching = false;
  hideSpinner();
}

// ----- Fetch Trailer -----
async function fetchTrailer(movieId) {
  // Check cache first
  if (trailerCache.has(movieId)) {
    return trailerCache.get(movieId);
  }
  
  const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
  const data = await res.json();
  const trailer = data.results.find(iv => iv.type === 'Trailer');
  
  // Store in cache
  trailerCache.set(movieId, trailer);
  return trailer;
}

function getVideoEmbedURL(v) {
  if (!v) return '';
  if (v.site === 'YouTube') return `https://www.youtube.com/embed/${v.key}`;
  if (v.site === 'Vimeo') return `https://player.vimeo.com/video/${v.key}`;
  if (v.site === 'Dailymotion') return `https://www.dailymotion.com/embed/video/${v.key}`;
  return '';
}

// ----- Enhanced Render Movies -----
function displayMovies(arr) { 
  moviesContainer.innerHTML = '';
  clearUIIndicators(); // Clear any previous indicators
  
  if (!arr.length) {
    moviesContainer.innerHTML = `
      <div style="text-align:center; grid-column: 1/-1; padding: 3rem; color: #888;">
        <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 1.2rem; margin: 0;">No movies found</p>
        <p style="font-size: 0.9rem; margin: 0.5rem 0 0 0; opacity: 0.7;">Try adjusting your search or filters</p>
      </div>
    `;
    updateStats(0, false);
    return;
  }
  
  updateStats(arr.length, false); 
  arr.forEach(async m => moviesContainer.appendChild(await createMovieCard(m))); 
}

function appendMovies(arr) {
  if (!arr.length) return;
  
  arr.forEach(async m => { 
    moviesContainer.appendChild(await createMovieCard(m)); 
    updateStats(1, true); 
  }); 
}

// ----- Create Movie Card -----
async function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie';
  card.dataset.id = movie.id; // For event delegation

  const trailer = await fetchTrailer(movie.id);
  
  // Optimize image loading - use smaller images for mobile
  const isMobile = window.innerWidth <= 768;
  const imageSize = isMobile ? 'w300' : 'w500'; // Smaller images on mobile
  const poster = movie.poster_path ? `https://image.tmdb.org/t/p/${imageSize}${movie.poster_path}` : '';
  
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
  const isFav = isFavorite(movie.id);
  const trailerEmbed = trailer ? `<div class="trailer" id="trailer-${movie.id}" style="display:none;"><iframe src="${getVideoEmbedURL(trailer)}" allowfullscreen></iframe></div>` : '';

  // Use icons only on mobile, full text on desktop
  const watchText = isMobile ? '🎬' : '🎬 Watch';
  const favText = isMobile ? (isFav ? '💔' : '❤️') : (isFav ? '💔 Remove Favorite' : '❤️ Add to Favorites');

  // Implement lazy loading
  card.innerHTML = `
    <img loading="lazy" src="${poster}" alt="${movie.title}" onclick="openModal(${movie.id})">
    <h3>${movie.title}</h3>
    <p>Year: ${year}</p>
    <p>Rating: ${movie.vote_average}</p>
    <div class="buttons-row">
      <button class="watch-button" onclick="toggleTrailer('${movie.id}')">${watchText}</button>
      <button class="watch-button" onclick="toggleFavorite(${movie.id}, this)">${favText}</button>
    </div> ${trailerEmbed}
  `;
  return card;
}

// ----- Toggle Trailer + Count -----
function toggleTrailer(id) {
  const div = document.getElementById(`trailer-${id}`);
  if (!div) return;
  div.style.display = div.style.display === 'block' ? 'none' : 'block';
  if (div.style.display === 'block') addView();
}

async function addView() {
  userViews++;
  localStorage.setItem('views', userViews.toString());
  updateStats(0, false);
  await saveUserDataToServer(); // Sync with Django
}

// ----- Favorites Handling -----
function isFavorite(id) { 
  return userFavorites.includes(id); 
}

async function toggleFavorite(id, btn) {
  const idx = userFavorites.indexOf(id);
  const isMobile = window.innerWidth <= 768;
  
  if (idx > -1) { 
    userFavorites.splice(idx, 1); 
    btn.textContent = isMobile ? '❤️' : '❤️ Add to Favorites'; 
  } else { 
    userFavorites.push(id); 
    btn.textContent = isMobile ? '💔' : '💔 Remove Favorite'; 
  }
  
  localStorage.setItem('favorites', JSON.stringify(userFavorites));
  updateStats(0, false);
  await saveUserDataToServer(); // Sync with Django
}

// ----- Load Favorites Mode -----
async function loadFavorites() {
  if (!userFavorites.length) { 
    moviesContainer.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No favorites saved.</p>'; 
    updateStats(0, false);
    return; 
  }
  
  showSpinner();
  try {
    const data = await Promise.all(userFavorites.map(id => 
      fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json())
    ));
    displayMovies(data);
  } catch (error) {
    console.error('Error loading favorites:', error);
    moviesContainer.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error loading favorites.</p>';
  }
  hideSpinner();
}

// ----- Stats Handling -----
function loadStats() { updateStats(0, false); }
function updateStats(count = 0, append = false) {
  document.getElementById('stat-movies').textContent = append ? parseInt(document.getElementById('stat-movies').textContent)+count : count;
  document.getElementById('stat-favorites').textContent = userFavorites.length;
  document.getElementById('stat-views').textContent = userViews;
}

// ----- Modal Logic -----
async function openModal(id) {
  const modal = document.getElementById('movieModal');
  modal.style.display = 'flex';
  const body = document.getElementById('modal-details');
  
  // Show a smaller loading indicator on mobile
  const isMobile = window.innerWidth <= 768;
  const spinnerSize = isMobile ? '20px' : '30px';
  
  body.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; flex-direction:column; padding:${isMobile ? '20px' : '40px'};">
      <div style="width:${spinnerSize}; height:${spinnerSize}; border:3px solid #23232b; border-top:3px solid #ff4b6e; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:10px;"></div>
      <p style="font-size:${isMobile ? '14px' : '16px'};">Loading movie details...</p>
    </div>
  `;

  // Check cache first
  const cacheKey = `movie-${id}`;
  if (movieCache.has(cacheKey)) {
    const cachedData = movieCache.get(cacheKey);
    renderModalContent(cachedData.m, cachedData.c, cachedData.p, cachedData.r);
    return;
  }

  // Fetch movie data
  const [m,c,p,r] = await Promise.all([
    fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}`).then(r=>r.json())
  ]);
  
  // Store in cache
  movieCache.set(cacheKey, {m, c, p, r});
  
  renderModalContent(m, c, p, r);
}

// Separate function for rendering modal content
function renderModalContent(m, c, p, r) {
  const isMobile = window.innerWidth <= 768;
  const body = document.getElementById('modal-details');
  
  const cast = c.cast.slice(0,5).map(x=>x.name).join(', ');
  const providers = (p.results?.US?.flatrate || []).map(x=>x.provider_name).join(', ') || 'Not available';
  
  // Show fewer related movies on mobile
  const numRelated = isMobile ? 4 : 6;
  const related = r.results.slice(0,numRelated).map(x=>
    `<img loading="lazy" src="https://image.tmdb.org/t/p/${isMobile ? 'w92' : 'w200'}${x.poster_path}" 
    onclick="openModal(${x.id})" title="${x.title}" />`
  ).join('');

  // More compact layout for mobile
  body.innerHTML = `
    <h2 style="margin-top:0;font-size:${isMobile ? '1.5rem' : '2rem'}">${m.title}</h2>
    <p><strong>Overview:</strong> ${m.overview}</p>
    <p><strong>Cast:</strong> ${cast}</p>
    <p><strong>Runtime:</strong> ${m.runtime} mins • <strong>Released:</strong> ${m.release_date}</p>
    <p><strong>Watch Providers:</strong> ${providers}</p>
    <h3>Related Movies</h3><div class="related-movies">${related}</div>
    ${isMobile ? '<button onclick="closeModal()" style="width:100%;margin-top:1rem;padding:0.6rem;background:#ff4b6e;border:none;color:white;border-radius:0.5rem;font-weight:bold">Close</button>' : ''}
  `;
  
  // Prevent body scrolling when modal is open
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('movieModal').style.display = 'none';
  document.body.style.overflow = 'auto'; // Re-enable scrolling
}

// ----- Enhanced Event Listeners -----
searchButton.addEventListener('click', () => {
  if(searchInput.value.trim()) {
    currentPage = 1; 
    currentMode = 'search';
    hasMoreData = true; // Reset for new search
    fetchMovies(searchInput.value);
  }
});

searchInput.addEventListener('keypress', e => { 
  if(e.key === 'Enter') searchButton.click(); 
});

// Real-time search with debouncing
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();
  
  if (query.length >= 2) {
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      currentMode = 'search';
      hasMoreData = true;
      fetchMovies(query);
    }, 500); // Wait 500ms after user stops typing
  } else if (query.length === 0) {
    clearTimeout(searchTimeout);
    switchMode('trending'); // Return to trending when search is cleared
  }
});

genreSelect.addEventListener('change', () => { 
  currentPage = 1; 
  currentMode = 'genre';
  hasMoreData = true; // Reset for new genre
  fetchMoviesByGenre(genreSelect.value); 
});

sortSelect.addEventListener('change', () => switchMode(sortSelect.value));

// Check if nav buttons exist (they might not due to sidebar-only navigation)
const navButtons = document.querySelectorAll('[data-mode]');
navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

// ----- Enhanced Infinite Scroll -----
window.addEventListener('scroll', throttle(() => {
  // Only proceed if we're not fetching and not in favorites mode and have more data
  if (isFetching || currentMode === 'favorites' || !hasMoreData) return;
  
  // Calculate scroll position
  const scrollTop = window.pageYOffset;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  
  // Trigger loading when user is 800px from bottom (earlier trigger for better UX)
  if (scrollTop + windowHeight >= documentHeight - 800) {
    currentPage++;
    console.log(`📜 Infinite scroll triggered - Loading page ${currentPage}`);
    
    if (['trending', 'top_rated', 'upcoming'].includes(currentMode)) {
      fetchMoviesByMode(currentMode, true);
    } else if (currentMode === 'search' && currentQuery) {
      fetchMovies(currentQuery, true);
    } else if (currentMode === 'genre' && currentGenre) {
      fetchMoviesByGenre(currentGenre, true);
    }
  }
}, 200)); // Reduced throttle time for more responsive loading

// ----- UI Feedback Functions -----
function clearUIIndicators() {
  const indicators = ['bottom-loading', 'end-message', 'error-toast'];
  indicators.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.remove();
  });
}

function showEndMessage() {
  if (document.getElementById('end-message')) return; // Don't show multiple times
  
  const endMessage = document.createElement('div');
  endMessage.id = 'end-message';
  endMessage.style.cssText = `
    text-align: center;
    padding: 2rem;
    color: #888;
    font-size: 0.9rem;
    grid-column: 1 / -1;
    border-top: 1px solid #333;
    margin-top: 1rem;
  `;
  endMessage.innerHTML = `
    <div style="opacity: 0.8;">
      <i class="fas fa-check-circle" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #ff4b6e;"></i>
      <p style="margin: 0; font-weight: 500;">🎉 You've reached the end!</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem;">
        Loaded ${currentPage} pages in ${currentMode} mode
      </p>
    </div>
  `;
  moviesContainer.appendChild(endMessage);
}

function showErrorMessage(message) {
  let errorDiv = document.getElementById('error-toast');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-toast';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
      z-index: 10000;
      max-width: 300px;
      transform: translateX(350px);
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
  }
  
  errorDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <i class="fas fa-exclamation-triangle"></i>
      <span>${message}</span>
      <button onclick="hideErrorMessage()" style="
        background: none; border: none; color: white; 
        font-size: 1.2rem; cursor: pointer; margin-left: auto;
      ">&times;</button>
    </div>
  `;
  
  // Slide in
  setTimeout(() => errorDiv.style.transform = 'translateX(0)', 100);
  
  // Auto hide after 5 seconds
  setTimeout(hideErrorMessage, 5000);
}

function hideErrorMessage() {
  const errorDiv = document.getElementById('error-toast');
  if (errorDiv) {
    errorDiv.style.transform = 'translateX(350px)';
    setTimeout(() => errorDiv.remove(), 300);
  }
}

// ----- Keyboard Support -----
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

// ----- Spinner Functions -----
function showSpinner() {
  // Create a minimal loading indicator if it doesn't exist
  let spinner = document.getElementById('loadingSpinner');
  const isMobile = window.innerWidth <= 768;
  
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    
    // Smaller, more compact spinner for mobile
    spinner.innerHTML = `
      <div class="spinner-container">
        <div class="spinner-circle"></div>
        ${isMobile ? '' : '<div class="spinner-text">Loading...</div>'}
      </div>
    `;
    document.body.appendChild(spinner);
    
    // Add the style if it doesn't exist
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = `
        #loadingSpinner {
          position: fixed;
          bottom: ${isMobile ? '10px' : '20px'};
          right: ${isMobile ? '10px' : '20px'};
          background: rgba(24, 24, 28, 0.9);
          padding: ${isMobile ? '8px' : '10px 20px'};
          border-radius: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          color: #fff;
          font-size: 14px;
          z-index: 1000;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }
        .spinner-container {
          display: flex;
          align-items: center;
          gap: ${isMobile ? '0' : '10px'};
        }
        .spinner-circle {
          width: ${isMobile ? '16px' : '20px'};
          height: ${isMobile ? '16px' : '20px'};
          border: 3px solid #333;
          border-top: 3px solid #ff4b6e;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .spinner-text {
          font-weight: 500;
          font-size: 0.9rem;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `;
      document.head.appendChild(style);
    }
  }
  
  spinner.style.display = 'flex';
  spinner.style.opacity = '1';
}

function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.opacity = '0';
    setTimeout(() => {
      spinner.style.display = 'none';
    }, 300);
  }
}

// ----- Utility Functions -----
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Make functions globally accessible for inline onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleTrailer = toggleTrailer;
window.toggleFavorite = toggleFavorite;
window.hideErrorMessage = hideErrorMessage;

// Show end message when no more data is available
window.addEventListener('scroll', throttle(() => {
  if (!hasMoreData && currentMode !== 'favorites' && !document.getElementById('end-message')) {
    const moviesCount = document.querySelectorAll('.movie').length;
    if (moviesCount > 20) { // Only show end message if we've loaded a decent amount
      showEndMessage();
    }
  }
}, 1000));

console.log('🎬 Enhanced Infinite Scroll Movie App Loaded!');
console.log('📊 Features: Unlimited scrolling, smart pagination, real-time search, performance optimized');