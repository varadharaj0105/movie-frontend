const api = {
  base: 'https://movie-backend-1g7r.onrender.com',
  popularMovies: '/popular-movies',
  search: '/search',
  watchlist: '/watchlist',
  favorites: '/favorites',
  tmdbBase: 'https://api.themoviedb.org/3',
  tmdbKey: '115e33c14008ba1af27e83986081b3f5',
};

const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results-message');
const moviesList = document.getElementById('movies-list');
const searchBar = document.getElementById('search-bar');

// Central alert handler
function showAlert(message, type = 'info', actions = []) {
  const alertBox = document.createElement('div');
  alertBox.className = `custom-alert alert-${type}`;
  alertBox.innerHTML = `<div>${message}</div>`;

  if (actions.length > 0) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'alert-actions';

    actions.forEach(({ text, onClick }) => {
      const btn = document.createElement('button');
      btn.className = 'alert-btn';
      btn.textContent = text;
      btn.onclick = () => {
        onClick?.();
        alertBox.remove();
      };
      actionsContainer.appendChild(btn);
    });

    alertBox.appendChild(actionsContainer);
  }

  document.body.appendChild(alertBox);

  requestAnimationFrame(() => {
    alertBox.classList.add('show');
  });

  if (actions.length === 0) {
    setTimeout(() => {
      alertBox.classList.remove('show');
      setTimeout(() => alertBox.remove(), 300);
    }, 4000);
  }
}

window.onload = fetchMovies;

async function fetchMovies() {
  loadingMessage.style.display = 'block';
  noResultsMessage.style.display = 'none';

  try {
    const res = await fetch(`${api.base}${api.popularMovies}`);
    if (!res.ok) throw new Error('Failed to fetch movies');

    const movies = await res.json();
    displayMovies(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    noResultsMessage.style.display = 'block';
    noResultsMessage.textContent = 'Failed to load movies. Please try again later.';
  } finally {
    loadingMessage.style.display = 'none';
  }
}

async function searchMovies() {
  const query = searchBar.value.trim();
  loadingMessage.style.display = 'block';
  noResultsMessage.style.display = 'none';

  if (query === '') {
    fetchMovies();
    return;
  }

  try {
    const res = await fetch(`${api.base}${api.search}?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Failed to search: ${res.statusText}`);

    const movies = await res.json();
    if (movies.error) {
      showAlert(movies.error);
      return;
    }

    displayMovies(movies);
  } catch (error) {
    console.error('Error searching movies:', error);
    showAlert('Error searching movie data: ' + error.message);
  } finally {
    loadingMessage.style.display = 'none';
  }
}

function displayMovies(movies) {
  moviesList.innerHTML = '';

  if (!movies || movies.length === 0) {
    noResultsMessage.style.display = 'block';
    return;
  }

  movies.forEach(movie => {
    const movieDiv = document.createElement('div');
    movieDiv.classList.add('movie-item');

    const movieTitle = document.createElement('h3');
    movieTitle.textContent = movie.title || movie.name || 'Untitled';

    const moviePoster = document.createElement('img');
    moviePoster.src = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : 'default-image.jpg';
    moviePoster.alt = movie.title || movie.name || 'Poster';

    movieDiv.addEventListener('click', () => {
      window.location.href = `movieDetails.html?id=${movie.id}`;
    });

    movieDiv.appendChild(movieTitle);
    movieDiv.appendChild(moviePoster);
    moviesList.appendChild(movieDiv);
  });
}

async function fetchMoviesByIds(movieIds) {
  const promises = movieIds.map(id =>
    fetch(`${api.tmdbBase}/movie/${id}?api_key=${api.tmdbKey}`)
      .then(res => res.json())
      .catch(() => null)
  );
  const movies = await Promise.all(promises);
  return movies.filter(movie => movie && movie.id);
}

async function loadWatchlist() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    showAlert('Please log in first');
    return;
  }

  try {
    const res = await fetch(`${api.base}${api.watchlist}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      showAlert('Session expired. Please log in again.');
      window.location.href = '/login';
      return;
    }

    const saved = await res.json();
    const movieDetails = await fetchMoviesByIds(saved.map(m => m.movieId));
    displayMovies(movieDetails);
  } catch (error) {
    console.error('Error loading watchlist:', error);
    showAlert('Failed to load watchlist.');
  }
}

async function loadFavorites() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    showAlert('Please log in first');
    return;
  }

  try {
    const res = await fetch(`${api.base}${api.favorites}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      showAlert('Session expired. Please log in again.');
      window.location.href = '/login';
      return;
    }

    const saved = await res.json();
    const movieDetails = await fetchMoviesByIds(saved.map(m => m.movieId));
    displayMovies(movieDetails);
  } catch (error) {
    console.error('Error loading favorites:', error);
    showAlert('Failed to load favorites.');
  }
}
