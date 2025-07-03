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

init();

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
  const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results.find(iv => iv.type === 'Trailer');
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
  const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
  const isFav = isFavorite(movie.id);
  const trailerEmbed = trailer ? `<div class="trailer" id="trailer-${movie.id}" style="display:none;"><iframe src="${getVideoEmbedURL(trailer)}" allowfullscreen></iframe></div>` : '';

  card.innerHTML = `
    <img src="${poster}" alt="${movie.title}" onclick="openModal(${movie.id})">
    <h3>${movie.title}</h3>
    <p>Year: ${year}</p>
    <p>Rating: ${movie.vote_average}</p>
    <div class="buttons-row">
      <button class="watch-button" onclick="toggleTrailer('${movie.id}')">🎬 Watch Trailer</button>
      <button class="watch-button" onclick="toggleFavorite(${movie.id}, this)">${isFav ? '💔 Remove Favorite' : '❤️ Add to Favorites'}</button>
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
  if (idx > -1) { arr.splice(idx,1); btn.textContent = '❤️ Add to Favorites'; }
  else { arr.push(id); btn.textContent = '💔 Remove Favorite'; }
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
  modal.style.display = 'block';
  const body = document.getElementById('modal-details');
  body.innerHTML = 'Loading...';

  const [m,c,p,r] = await Promise.all([
    fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`).then(r=>r.json()),
    fetch(`${BASE_URL}/movie/${id}/similar?api_key=${API_KEY}`).then(r=>r.json())
  ]);

  const cast = c.cast.slice(0,5).map(x=>x.name).join(', ');
  const providers = (p.results?.US?.flatrate || []).map(x=>x.provider_name).join(', ') || 'Not available';
  const related = r.results.slice(0,6).map(x=>`<img src="https://image.tmdb.org/t/p/w200${x.poster_path}" onclick="openModal(${x.id})" title="${x.title}" />`).join('');

  body.innerHTML = `
    <h2>${m.title}</h2>
    <p><strong>Overview:</strong> ${m.overview}</p>
    <p><strong>Cast:</strong> ${cast}</p>
    <p><strong>Runtime:</strong> ${m.runtime} mins • <strong>Released:</strong> ${m.release_date}</p>
    <p><strong>Watch Providers:</strong> ${providers}</p>
    <h3>Related Movies</h3><div class="related-movies">${related}</div>
  `;
}

function closeModal() {
  document.getElementById('movieModal').style.display = 'none';
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
window.addEventListener('scroll', ()=> {
  if(window.innerHeight+window.scrollY >= document.body.offsetHeight-200 && !isFetching && currentMode!=='favorites') {
    currentPage++;
    if(['trending','top_rated','upcoming'].includes(currentMode)) fetchMoviesByMode(currentMode, true);
    else if(currentMode==='search') fetchMovies(currentQuery, true);
    else if(currentMode==='genre') fetchMoviesByGenre(currentGenre, true);
  }
});

function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}
