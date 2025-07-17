const API_KEY = '949258ff4ff329d48e662c7badcd4ac9';
const BASE_URL = 'https://api.themoviedb.org/3';

const searchInput = document.getElementById('search');
const searchButton = document.getElementById('searchButton');
const genreSelect = document.getElementById('genreSelect');
const sortSelect = document.getElementById('sortSelect');
const moviesContainer = document.getElementById('movies');
const favoritesButton = document.querySelector('.nav-btn[data-mode="favorites"]');
const trendingButton = document.querySelector('.nav-btn[data-mode="trending"]');
const topRatedButton = document.querySelector('.nav-btn[data-mode="top_rated"]');
const upcomingButton = document.querySelector('.nav-btn[data-mode="upcoming"]');

let currentPage = 1;
let currentQuery = '';
let currentGenre = '';
let currentMode = 'trending';
let isFetching = false;

const movieCache = new Map(); // Cache for movie data
const trailerCache = new Map(); // Cache for trailer data

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ----- Initialization -----
function init() {
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
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  fetchMoviesByMode(mode);
}

// ----- Fetch Movies by Mode -----
async function fetchMoviesByMode(mode, append = false) {
  showSpinner();
  isFetching = true;
  let url = `${BASE_URL}/trending/movie/day?api_key=${API_KEY}&page=${currentPage}`;
  if (mode === 'top_rated') url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=${currentPage}`;
  else if (mode === 'upcoming') url = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&page=${currentPage}`;
  else if (mode === 'favorites') { hideSpinner(); return loadFavorites(); }

  const res = await fetch(url);
  const data = await res.json();
  append ? appendMovies(data.results) : displayMovies(data.results);
  isFetching = false;
  hideSpinner();
}

// ----- Search & Filter -----
async function fetchMovies(query, append = false) {
  showSpinner();
  isFetching = true;
  const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}`);
  const data = await res.json();
  append ? appendMovies(data.results) : displayMovies(data.results);
  isFetching = false;
  hideSpinner();
}

async function fetchMoviesByGenre(genreId, append = false) {
  showSpinner();
  isFetching = true;
  const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${currentPage}`);
  const data = await res.json();
  append ? appendMovies(data.results) : displayMovies(data.results);
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

// ----- Render Movies -----
function displayMovies(arr) { moviesContainer.innerHTML = ''; updateStats(arr.length, false); arr.forEach(async m => moviesContainer.appendChild(await createMovieCard(m))); }
function appendMovies(arr) { arr.forEach(async m => { moviesContainer.appendChild(await createMovieCard(m)); updateStats(1, true); }); }

// ----- Create Movie Card -----
async function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie';

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

function addView() {
  const v = parseInt(localStorage.getItem('views') || '0') + 1;
  localStorage.setItem('views', v);
  updateStats(0, false);
}

// ----- Favorites Handling -----
function isFavorite(id) { const arr = JSON.parse(localStorage.getItem('favorites') || '[]'); return arr.includes(id); }
function toggleFavorite(id, btn) {
  const arr = JSON.parse(localStorage.getItem('favorites') || '[]');
  const idx = arr.indexOf(id);
  const isMobile = window.innerWidth <= 768;
  
  if (idx > -1) { 
    arr.splice(idx, 1); 
    btn.textContent = isMobile ? '❤️' : '❤️ Add to Favorites'; 
  } else { 
    arr.push(id); 
    btn.textContent = isMobile ? '💔' : '💔 Remove Favorite'; 
  }
  
  localStorage.setItem('favorites', JSON.stringify(arr));
  updateStats(0, false);
}

// ----- Load Favorites Mode -----
async function loadFavorites() {
  const ids = JSON.parse(localStorage.getItem('favorites') || '[]');
  if (!ids.length) { moviesContainer.innerHTML = '<p style="text-align:center;">No favorites saved.</p>'; return; }
  const data = await Promise.all(ids.map(id => fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json())));
  displayMovies(data);
}

// ----- Stats Handling -----
function loadStats() { updateStats(0, false); }
function updateStats(count = 0, append = false) {
  document.getElementById('stat-movies').textContent = append ? parseInt(document.getElementById('stat-movies').textContent)+count : count;
  document.getElementById('stat-favorites').textContent = JSON.parse(localStorage.getItem('favorites') || '[]').length;
  document.getElementById('stat-views').textContent = parseInt(localStorage.getItem('views') || '0');
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

// ----- Event Listeners -----
searchButton.addEventListener('click', ()=> {
  if(searchInput.value.trim()) {
    currentPage=1; currentMode='search';
    fetchMovies(searchInput.value);
  }
});
searchInput.addEventListener('keypress', e=>{ if(e.key==='Enter') searchButton.click(); });
genreSelect.addEventListener('change', ()=>{ currentPage=1; currentMode='genre'; fetchMoviesByGenre(genreSelect.value); });
sortSelect.addEventListener('change', ()=>switchMode(sortSelect.value));
trendingButton.addEventListener('click', ()=>switchMode('trending'));
topRatedButton.addEventListener('click', ()=>switchMode('top_rated'));
upcomingButton.addEventListener('click', ()=>switchMode('upcoming'));
favoritesButton.addEventListener('click', ()=>switchMode('favorites'));

// ----- Infinite Scroll -----
window.addEventListener('scroll', throttle(() => {
  if(window.innerHeight+window.scrollY >= document.body.offsetHeight-200 && !isFetching && currentMode!=='favorites') {
    currentPage++;
    if(['trending','top_rated','upcoming'].includes(currentMode)) fetchMoviesByMode(currentMode, true);
    else if(currentMode==='search') fetchMovies(currentQuery, true);
    else if(currentMode==='genre') fetchMoviesByGenre(currentGenre, true);
  }
}, 300)); // Check only every 300ms

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
          background: rgba(24, 24, 28, 0.85);
          padding: ${isMobile ? '8px' : '10px 20px'};
          border-radius: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          color: #fff;
          font-size: 14px;
          z-index: 1000;
          display: flex;
          align-items: center;
          transition: opacity 0.3s;
        }
        .spinner-container {
          display: flex;
          align-items: center;
          gap: ${isMobile ? '0' : '10px'};
        }
        .spinner-circle {
          width: ${isMobile ? '14px' : '18px'};
          height: ${isMobile ? '14px' : '18px'};
          border: ${isMobile ? '2px' : '3px'} solid #23232b;
          border-top: ${isMobile ? '2px' : '3px'} solid #ff4b6e;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .spinner-text {
          font-weight: 500;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `;
      document.head.appendChild(style);
    }
  }
  
  spinner.style.display = 'block';
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

// Add this throttle function
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
