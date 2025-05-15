const API_BASE = 'https://movie-backend-1g7r.onrender.com';
let currentMovieId = null;

function showAlert(message, type = 'info', options = {}) {
  const alertDiv = document.createElement('div');
  alertDiv.classList.add('alert', `alert-${type}`);
  alertDiv.innerHTML = `<p>${message}</p>`;

  if (options.confirm) {
    const yesBtn = document.createElement('button');
    yesBtn.textContent = 'Yes';
    yesBtn.classList.add('alert-btn');
    yesBtn.onclick = () => {
      alertDiv.remove();
      options.onConfirm?.();
    };

    const noBtn = document.createElement('button');
    noBtn.textContent = 'No';
    noBtn.classList.add('alert-btn');
    noBtn.onclick = () => {
      alertDiv.remove();
      options.onCancel?.();
    };

    const btnWrapper = document.createElement('div');
    btnWrapper.classList.add('alert-actions');
    btnWrapper.appendChild(yesBtn);
    btnWrapper.appendChild(noBtn);
    alertDiv.appendChild(btnWrapper);
  } else {
    setTimeout(() => alertDiv.remove(), 3000);
  }

  document.body.appendChild(alertDiv);
}


function getTokenOrAlert() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    showAlert('Please log in first.', 'warning');
    return null;
  }
  return token;
}

// Load Movie Details
// Load Movie Details
async function loadMovieDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');
  currentMovieId = movieId;
  const loadingSpinner = document.getElementById('loading-spinner');
  const container = document.getElementById('movie-details');

  if (!movieId) {
    container.innerHTML = "<p>Movie ID is missing!</p>";
    return;
  }

  loadingSpinner.style.display = 'block';

  try {
    const res = await fetch(`${API_BASE}/fullMovieDetails?id=${movieId}`);
    if (!res.ok) throw new Error('Failed to fetch movie');
    const movie = await res.json();

    const dbRes = await fetch(`${API_BASE}/api/ratings/${movieId}`);
    const dbData = await dbRes.json();
    const dbScore = parseFloat(dbData.totalScore) || 0;
    const dbCount = parseInt(dbData.count) || 0;

    loadingSpinner.style.display = 'none';

    const imdbRating = movie.omdb?.imdbRating !== 'N/A' ? parseFloat(movie.omdb.imdbRating) : 0;
    const imdbVotes = movie.omdb?.imdbVotes !== 'N/A' ? parseInt(movie.omdb.imdbVotes.replace(/,/g, '')) : 0;
    const tmdbRating = movie.vote_average || 0;
    const tmdbVotes = movie.vote_count || 0;

    const totalWeightedScore = (imdbRating * imdbVotes) + (tmdbRating * tmdbVotes) + dbScore;
    const totalVotes = imdbVotes + tmdbVotes + dbCount;
    const combinedRating = totalVotes > 0 ? (totalWeightedScore / totalVotes).toFixed(1) : 'N/A';

    const genres = movie.omdb?.Genre || (movie.genres?.map(g => g.name).join(', ') || 'N/A');
    const boxOffice = movie.omdb?.BoxOffice !== 'N/A' ? movie.omdb.BoxOffice : 'N/A';

    const castHTML = movie.cast?.length
      ? movie.cast.map(actor => `
        <article class="actor">
          <img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" alt="${actor.name}" />
          <p>${actor.name} as <strong>${actor.character}</strong></p>
        </article>
      `).join('')
      : '<p>No cast information available.</p>';

    const trailerHTML = `
      <section class="trailer">
        <h3>Watch Trailer</h3><br>
        <a href="${movie.trailer || `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`}" target="_blank">
          Click here to ${movie.trailer ? 'watch the trailer' : 'search for trailers on YouTube'}
        </a>
      </section>`;

    const watchProviders = await (await fetch(`${API_BASE}/watch-providers?id=${movieId}`)).json();
    const watchHTML = createWatchProviderHTML(watchProviders.flatrate || [], movie.title);

    container.innerHTML = `
      <article class="movie-header">
        <section class="movie-poster">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="Poster of ${movie.title}" />
        </section>
        <section class="movie-info">
          <h1>${movie.title}</h1>
          <div class="rating">
            <span class="rating-value">${combinedRating}</span>
            <span class="rating-count">(${totalVotes} votes)</span>
          </div>
          <p class="release-date"><strong>Release Date:</strong> ${movie.release_date}</p>
          <p class="overview"><strong>Overview:</strong> ${movie.overview}</p>
          <p class="genres"><strong>Genres:</strong> ${genres}</p>
          <p class="box-office"><strong>Box Office:</strong> ${boxOffice}</p>
          <button id="add-to-watchlist">Add to Watchlist</button>
          <button id="add-to-favorites">Add to Favorites</button>
        </section>
      </article>

      <section id="rating-section">
        <h3>Rate This Movie</h3>
        <div id="user-rating-input-area">
          <input type="number" id="ratingScore" min="0" max="10" step="0.5" placeholder="Rate 0–10">
          <button id="submit-rating-button">Submit Rating</button>
        </div>
      </section>

      <section class="movie-cast">
        <h3>Top Cast</h3>
        <div class="cast-list">${castHTML}</div>
      </section>

      ${trailerHTML}
      ${watchHTML}

      <section id="comments-section">
        <h3>Comments</h3>
        <div id="comments-list"></div>
        <h4>Leave a Comment</h4>
        <textarea id="commentText" placeholder="Write your comment here..."></textarea><br>
        <button id="post-comment-button">Post Comment</button>
      </section>
    `;

    await checkFavoriteStatus(movieId);
    await checkWatchlistStatus(movieId);
    await loadComments(movieId);
    fetchRating(movieId);

    document.getElementById('add-to-watchlist').addEventListener('click', () => addToWatchlist(currentMovieId));
    document.getElementById('add-to-favorites').addEventListener('click', () => toggleFavorite(currentMovieId));

    // Attach rating button listener
    document.getElementById('submit-rating-button')?.addEventListener('click', () => {
      const score = parseFloat(document.getElementById('ratingScore').value);
      if (!isNaN(score)) {
        postRating(currentMovieId, score);
      } else {
        alert('Please enter a valid rating between 0 and 10.');
      }
    });

    // Attach comment button listener
    document.getElementById('post-comment-button')?.addEventListener('click', () => {
      const text = document.getElementById('commentText').value.trim();
      if (text.length > 0) {
        postComment(currentMovieId, text);
      } else {
        alert('Comment cannot be empty.');
      }
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error loading movie details: ${err.message}</p>`;
    loadingSpinner.style.display = 'none';
  }
}



// Provider Links
function createWatchProviderHTML(providers, movieTitle) {
  const getProviderLink = (name, title) => {
    const query = encodeURIComponent(title.trim());
    const key = name.toLowerCase().replace(/\s+/g, '');
    const urls = {
      disneyplus: `https://www.hotstar.com/in/search?q=${query}`,
      hotstar: `https://www.hotstar.com/in/search?q=${query}`,
      netflix: `https://www.netflix.com/search?q=${query}`,
      amazonprimevideo: `https://www.amazon.in/s?k=${query}&i=instant-video`,
      zee5: `https://www.zee5.com/search?q=${query}`,
      sonyliv: `https://www.sonyliv.com/search/${query}`,
      aha: `https://www.aha.video/search?q=${query}`,
      jiocinema: `https://www.jiocinema.com/search/${query}`,
      voot: `https://www.voot.com/search?q=${query}`,
      mxplayer: `https://www.mxplayer.in/search?q=${query}`,
      youtube: `https://www.youtube.com/results?search_query=${query}`,
      hoichoi: `https://www.hoichoi.tv/search?q=${query}`,
      erosnow: `https://erosnow.com/search/all/${query}`
    };
    return urls[key] || `https://www.google.com/search?q=${query} ${encodeURIComponent(name)}`;
  };

  return providers.length
    ? `<section class="watch-section">
        <h3>Available On</h3>
        <div class="watch-providers">
          ${providers.map(p => `
            <a href="${getProviderLink(p.provider_name, movieTitle)}" class="provider" target="_blank">
              <img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}" />
              <p>${p.provider_name}</p>
            </a>`).join('')}
        </div>
      </section>`
    : `<section class="watch-section"><h3>Streaming Info</h3><p>No streaming providers found for your region.</p></section>`;
}

// Favorite & Watchlist
async function checkFavoriteStatus(movieId) {
  const token = getTokenOrAlert();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/favorites`, { headers: { 'Authorization': `Bearer ${token}` } });
    const favorites = await res.json();
    document.getElementById('add-to-favorites').textContent = favorites.some(f => f.movieId === parseInt(movieId))
      ? 'Remove from Favorites' : 'Add to Favorites';
  } catch (err) {
    console.error('Favorite check failed:', err);
  }
}

async function checkWatchlistStatus(movieId) {
  const token = getTokenOrAlert();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/watchlist`, { headers: { 'Authorization': `Bearer ${token}` } });
    const list = await res.json();
    document.getElementById('add-to-watchlist').textContent = list.some(f => f.movieId === parseInt(movieId))
      ? 'Remove from Watchlist' : 'Add to Watchlist';
  } catch (err) {
    console.error('Watchlist check failed:', err);
  }
}

async function toggleFavorite(movieId) {
  const token = getTokenOrAlert();
  if (!token) return;

  const button = document.getElementById('add-to-favorites');
  const isAdding = button.textContent === 'Add to Favorites';
  const method = isAdding ? 'POST' : 'DELETE';
  const endpoint = isAdding ? '/favorites' : `/favorites/${movieId}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: isAdding ? JSON.stringify({ movieId }) : null
    });
    const result = await res.json();
    showAlert(result.message || 'Updated!');
    button.textContent = isAdding ? 'Remove from Favorites' : 'Add to Favorites';
  } catch (err) {
    console.error('Favorite toggle error:', err);
  }
}

async function addToWatchlist(movieId) {
  const token = getTokenOrAlert();
  if (!token) return;

  const button = document.getElementById('add-to-watchlist');
  const isAdding = button.textContent === 'Add to Watchlist';
  const method = isAdding ? 'POST' : 'DELETE';
  const endpoint = isAdding ? '/watchlist' : `/watchlist/${movieId}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: isAdding ? JSON.stringify({ movieId }) : null
    });
    const result = await res.json();
    showAlert(result.message || 'Updated!');
    button.textContent = isAdding ? 'Remove from Watchlist' : 'Add to Watchlist';
  } catch (err) {
    console.error('Watchlist toggle error:', err);
  }
}

// Rating
function displayRating(score) {
  const starsContainer = document.getElementById('stars-container');
  if (!starsContainer) return;
  starsContainer.innerHTML = '';
  const full = Math.floor(score / 2);
  const half = (score / 2) % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < full; i++) starsContainer.append(createStarElement('filled'));
  if (half) starsContainer.append(createStarElement('filled'));
  for (let i = 0; i < empty; i++) starsContainer.append(createStarElement('empty'));
}
function createStarElement(type) {
  const star = document.createElement('div');
  star.classList.add('star', type);
  return star;
}

async function postRating(movieId, score) {
  const token = getTokenOrAlert();
  const ratingBtn = document.getElementById('submit-rating-button');
  if (!token || isNaN(score) || score < 0 || score > 10) return showAlert("Rating must be between 0 and 10", 'warning');

  try {
    const res = await fetch(`${API_BASE}/api/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ movieId, score })
    });

    if (res.ok) {
      showAlert('Rating submitted!', 'info');
      ratingBtn.disabled = true; // ✅ Disable the button
      ratingBtn.textContent = 'Rated';
      await loadMovieDetails(); // refresh the view
    } else {
      showAlert('Rating failed.', 'danger');
    }
  } catch (err) {
    // showAlert('Rating error.', 'danger');
  }
}

async function fetchRating(movieId) {
  try {
    const res = await fetch(`${API_BASE}/api/ratings/${movieId}`);
    const data = await res.json();

    const ratingBtn = document.getElementById('submit-rating-button');

    if (data.totalScore !== undefined && data.count > 0) {
      const avg = data.totalScore / data.count;
      displayRating(avg);
      ratingBtn.disabled = true;
      ratingBtn.textContent = 'Rated';
    }
  } catch (err) {
    console.error(err);
  }
}


// Comments
async function postComment(movieId, commentText) {
  const token = getTokenOrAlert();
  if (!token || !commentText.trim()) return showAlert('Please write a comment.', 'warning');

  const postButton = document.getElementById('post-comment-button');
  postButton.disabled = true;  // Disable button while posting

  try {
    const res = await fetch(`${API_BASE}/api/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ movieId, text: commentText })
    });

    const data = await res.json();
    if (res.ok) {
      showAlert('Comment posted!', 'info');
      loadComments(movieId); // Reload comments after posting
      document.getElementById('commentText').value = ''; // Clear comment box
    } else {
      showAlert(data.error || 'Failed to post comment', 'danger');
    }
  } catch (err) {
    console.error(err);
    showAlert('Comment error', 'danger');
  } finally {
    postButton.disabled = false; // Re-enable the button after post attempt
  }
}


async function loadComments(movieId) {
  const list = document.getElementById('comments-list');
  const token = localStorage.getItem('authToken');
  let currentUserId = null;

  // Get user ID from token (you can also expose it from backend in a safer way)
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId = payload.userId;
    } catch (e) {
      console.error('Invalid token:', e);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/comments/${movieId}`);
    const comments = await res.json();
    list.innerHTML = comments.length === 0
      ? '<p>No comments yet.</p>'
      : comments.map(c => `
        <div class="comment">
          <p><strong>${c.username}</strong>: ${c.text}</p>
          <p><small>${new Date(c.createdAt).toLocaleString()}</small></p>
          ${currentUserId === c.userId ? `<button onclick="deleteComment(${c.id})">Delete</button>` : ''}
        </div>`).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p>Error loading comments.</p>';
  }
}

function deleteComment(commentId) {
  const token = getTokenOrAlert();
  if (!token) return;

  showAlert('Are you sure you want to delete this comment?', 'warning', {
    confirm: true,
    onConfirm: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        const data = await res.json();

        if (res.ok) {
          showAlert(data.message, 'info');
          loadComments(currentMovieId);
        } else {
          showAlert(data.error || 'Failed to delete comment', 'danger');
        }
      } catch (err) {
        console.error(err);
        showAlert('Comment delete error', 'danger');
      }
    },
    onCancel: () => {
      showAlert('Deletion cancelled.', 'info');
    }
  });
}


// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  loadMovieDetails();
  document.getElementById('post-comment-button')?.addEventListener('click', () => {
    const commentText = document.getElementById('commentText').value;
    postComment(currentMovieId, commentText);
  });
  document.getElementById('submit-rating-button')?.addEventListener('click', () => {
    const ratingScore = parseFloat(document.getElementById('ratingScore').value);
    postRating(currentMovieId, ratingScore);
  });
});
