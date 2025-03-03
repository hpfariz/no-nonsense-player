let watchHistory = [];
let titleCurrent;
let typeCurrent;
let moviesData = [];
let loading = false;
let currentSearchTerm = '';
let currentPage = 1;
const resultsPerPage = 25;
let autoNextEpisodeEnabled = true; // Default auto next episode to on

$(document).ready(function () {
    initLocalStorage();
    loadWatchHistory();
    restoreSourceSelection();
    blockDevToolsKeys();
    setupMessageListener(); // Set up listener for iframe messages

    // Navigation
    $('#searchPageButton').click(() => window.location.href = 'search.html');
    $('#backToPlayer').click(() => window.location.href = 'index.html');

    $('#moviePlayerButton').click(function () {
        switchToMoviePlayer();
    });

    $('#seriesPlayerButton').click(function () {
        switchToSeriesPlayer();
    });

    $('#sourceSelector').change(function() {
        saveSourceSelection();
        refreshPlayer();
    });

    $('#mediaCode, #seasonNumber, #episodeNumber').blur(debounce(function () {
        refreshPlayer();
    }, 300));

    // Resume playback functionality
    $('#resumePlayback').click(function() {
        const progressTime = $(this).data('time');
        const player = document.getElementById('player');
        
        // Send message to iframe to seek to the saved time
        player.contentWindow.postMessage({ 
            type: 'seekTo', 
            time: progressTime 
        }, '*');
        
        $('#continueWatching').addClass('hidden');
    });

    $('#startOver').click(function() {
        $('#continueWatching').addClass('hidden');
        
        // Clear saved progress
        const mediaCode = $('#mediaCode').val();
        const type = $('#mediaType').val();
        const season = $('#seasonNumber').val();
        const episode = $('#episodeNumber').val();
        
        clearVideoProgress(mediaCode, type, season, episode);
    });

    // Auto Next Episode Toggle
    $('#autoNextEpisode').click(function() {
        autoNextEpisodeEnabled = !autoNextEpisodeEnabled;
        $(this).find('span').text(autoNextEpisodeEnabled ? 'ON' : 'OFF');
        localStorage.setItem('autoNextEpisode', autoNextEpisodeEnabled);
    });

    // Restore auto next episode setting
    if (localStorage.getItem('autoNextEpisode') !== null) {
        autoNextEpisodeEnabled = localStorage.getItem('autoNextEpisode') === 'true';
        $('#autoNextEpisode').find('span').text(autoNextEpisodeEnabled ? 'ON' : 'OFF');
    }
    
    // History events
    $('#historyList').on('click', 'li', function (e) {
        if (!$(e.target).hasClass('delete-history-item')) {
            loadHistoryItem($(this));
        }
    });

    $('#historyList').on('click', '.delete-history-item', function (e) {
        e.stopPropagation();
        if (confirm('Remove this item from history?')) {
            let li = $(this).closest('li');
            removeFromWatchHistory(li.data('code'), li.data('type'), li.data('season'), li.data('episode'));
        }
    });

    $('#clearHistory').on('click', function () {
        if (confirm('Are you sure you want to clear your watch history? The page will refresh after clearing your watch history.')) {
            localStorage.clear();
            location.reload();
        }
    });

    $(window).on('load', function () {
        let code = $('#mediaCode').val();
        if (code) {
            refreshPlayer();
        }
    });

    // If on search page
    if (window.location.pathname.includes('search.html')) {
        $.getJSON("movies.json", function (data) {
            moviesData = data.movies;
        });

        $('#searchInput').on('input', debounce(handleSearchInput, 300));
        $('#searchResults').on('scroll', tryLoadMoreResults);
    }

    // Toggle theatre mode: just toggle the class on main
    $('#toggleTheatreBtn').click(function() {
        $('main').toggleClass('theatre-mode');
        // After toggling theatre mode, scroll to the player
        $('html, body').animate({
            scrollTop: $('.separator').offset().top
        }, 500);
    });
});

/* ------------------- Video Progress Functions ------------------- */

function setupMessageListener() {
    // Listen for messages from the iframe
    window.addEventListener('message', function(event) {
        // Make sure to check origin for security in production
        
        if (event.data.type === 'videoProgress') {
            // Save current playback position
            const mediaCode = $('#mediaCode').val();
            const type = $('#mediaType').val();
            const season = $('#seasonNumber').val();
            const episode = $('#episodeNumber').val();
            
            saveVideoProgress(mediaCode, type, season, episode, event.data.currentTime);
        }
        
        else if (event.data.type === 'videoEnded') {
            // Auto play next episode if enabled and in series mode
            if (autoNextEpisodeEnabled && $('#seriesPlayerButton').hasClass('active')) {
                let currentEpisode = parseInt($('#episodeNumber').val());
                $('#episodeNumber').val(currentEpisode + 1);
                refreshPlayer();
            }
        }
    });
}

function saveVideoProgress(mediaCode, type, season, episode, currentTime) {
    if (!mediaCode) return;
    
    const key = type === 'movie' 
        ? `progress_${mediaCode}` 
        : `progress_${mediaCode}_s${season}_e${episode}`;
    
    // Only save if we have meaningful progress (more than 10 seconds)
    if (currentTime > 10) {
        localStorage.setItem(key, currentTime);
    }
}

function loadVideoProgress(mediaCode, type, season, episode) {
    if (!mediaCode) return null;
    
    const key = type === 'movie' 
        ? `progress_${mediaCode}` 
        : `progress_${mediaCode}_s${season}_e${episode}`;
    
    return localStorage.getItem(key);
}

function clearVideoProgress(mediaCode, type, season, episode) {
    if (!mediaCode) return;
    
    const key = type === 'movie' 
        ? `progress_${mediaCode}` 
        : `progress_${mediaCode}_s${season}_e${episode}`;
    
    localStorage.removeItem(key);
}

function checkAndDisplayResumeOption(mediaCode, type, season, episode) {
    const progress = loadVideoProgress(mediaCode, type, season, episode);
    
    if (progress) {
        // Format time for display (convert seconds to MM:SS)
        const minutes = Math.floor(progress / 60);
        const seconds = Math.floor(progress % 60);
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        $('#resumeTime').text(formattedTime);
        $('#resumePlayback').data('time', progress);
        $('#continueWatching').removeClass('hidden');
    } else {
        $('#continueWatching').addClass('hidden');
    }
}

/* ------------------- Player Functions ------------------- */

function refreshPlayer() {
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    var sourceType = $('#sourceSelector').val();
    
    // Clear any previous media info
    $('#mediaInfoPanel').addClass('hidden');
    $('#mediaInfoContent').empty();

    if ($('#moviePlayerButton').hasClass('active')) {
        // Movie view
        if (!mediaCode) {
            showPlaceholder();
            return;
        }
        showLoadingIndicator();
        const playerUrl = getPlayerUrl(sourceType, 'movie', mediaCode);
        $('#player').attr('src', playerUrl).show();
        $('#placeholder').hide();
        $('#mediaType').val('movie');
        
        // Check for resume option
        checkAndDisplayResumeOption(mediaCode, 'movie');
        
        // Show movie info
        fetchAndDisplayMediaInfo(mediaCode);
        
        // Hide auto next episode button for movies
        $('#autoNextEpisode').addClass('hidden');
        
        replaceTitle(mediaCode, 'movie');
    } else {
        // Series view
        if (!mediaCode || !seasonNumber || !episodeNumber) {
            showPlaceholder();
            return;
        }
        showLoadingIndicator();
        const playerUrl = getPlayerUrl(sourceType, 'series', mediaCode, seasonNumber, episodeNumber);
        $('#player').attr('src', playerUrl).show();
        $('#placeholder').hide();
        $('#mediaType').val('series');
        
        // Check for resume option
        checkAndDisplayResumeOption(mediaCode, 'series', seasonNumber, episodeNumber);
        
        // Show series info
        fetchAndDisplayMediaInfo(mediaCode);
        
        // Show auto next episode button for series
        $('#autoNextEpisode').removeClass('hidden');
        
        replaceTitle(mediaCode, 'series', seasonNumber, episodeNumber);
    }
}

function replaceTitle(mediaCode, type, seasonNumber, episodeNumber) {
    if (!mediaCode) {
        $('#heading').text("Media Player");
        return;
    }

    $.ajax({
        url: "https://www.omdbapi.com/?i=" + mediaCode + "&apikey=2169157",
        type: 'GET',
        success: function (data) {
            if (data.Response === "True") {
                titleCurrent = data.Title;
                typeCurrent = data.Type;

                if (type === 'movie') {
                    $('#heading').text(data.Title);
                } else {
                    let s = ("0" + (seasonNumber || 1)).slice(-2);
                    let e = ("0" + (episodeNumber || 1)).slice(-2);
                    $('#heading').text(`${data.Title} - S${s}E${e}`);
                }

                // Add to watch history after we have the correct title
                if (isValidImdbCode(mediaCode)) {
                    addToWatchHistory(mediaCode, type, seasonNumber, episodeNumber);
                }

            } else {
                $('#heading').text("Media Player");
            }
        },
        error: function () {
            $('#heading').text("Media Player");
        }
    });
}

/* ------------------- Enhanced Media Info Functions ------------------- */

function fetchAndDisplayMediaInfo(mediaCode) {
    if (!isValidImdbCode(mediaCode)) return;
    
    $.ajax({
        url: `https://www.omdbapi.com/?i=${mediaCode}&plot=full&apikey=2169157`,
        type: 'GET',
        success: function (data) {
            if (data.Response === "True") {
                displayMediaInfo(data);
            }
        },
        error: function () {
            console.log("Failed to fetch media info");
        }
    });
}

function displayMediaInfo(data) {
    // Create a structured media info panel
    const mediaInfoHTML = `
        <div class="media-info-wrapper">
            <div class="media-poster">
                <img src="${data.Poster !== 'N/A' ? data.Poster : 'PosterPlaceholder.png'}" alt="${data.Title} Poster">
            </div>
            <div class="media-details">
                <h3>${data.Title} (${data.Year})</h3>
                <p><strong>Rating:</strong> ${data.Rated} | <strong>Runtime:</strong> ${data.Runtime}</p>
                <p><strong>Genre:</strong> ${data.Genre}</p>
                <p><strong>Director:</strong> ${data.Director}</p>
                <p><strong>Actors:</strong> ${data.Actors}</p>
                <div class="plot-section">
                    <h4>Plot</h4>
                    <p>${data.Plot}</p>
                </div>
                <div class="ratings-section">
                    <h4>Ratings</h4>
                    <ul>
                        ${data.Ratings.map(rating => `<li>${rating.Source}: ${rating.Value}</li>`).join('')}
                    </ul>
                </div>
                <div class="links-section">
                    <a href="https://www.imdb.com/title/${data.imdbID}/" target="_blank" class="imdb-link">View on IMDb</a>
                </div>
            </div>
        </div>
    `;
    
    $('#mediaInfoContent').html(mediaInfoHTML);
    $('#mediaInfoPanel').removeClass('hidden');
}

/* ------------------- Helper & Utility Functions ------------------- */

function isValidImdbCode(code) {
    return code.length >= 9 && code.startsWith("tt") && code.length <= 11;
}

function getPlayerUrl(source, type, code, season, episode) {
    $('#player').off('load').on('load', function() {
        hideLoadingIndicator();
    });

    if (type === 'movie') {
        if (source === "vidsrc") {
            return `https://embed.su/embed/movie/${code}?uwu=kk`;
        } else if (source === "superembed") {
            return `https://multiembed.mov/directstream.php?video_id=${code}`;
        } else if (source === "vidsrccc") {
            return `https://vidsrc.cc/v2/embed/movie/${code}?autoPlay=false`;
        }
    } else {
        // series
        if (source === "vidsrc") {
            return `https://embed.su/embed/tv/${code}/${season}/${episode}?uwu=kk`;
        } else if (source === "superembed") {
            return `https://multiembed.mov/directstream.php?video_id=${code}&s=${season}&e=${episode}`;
        } else if (source === "vidsrccc") {
            return `https://vidsrc.cc/v2/embed/tv/${code}/${season}/${episode}?autoPlay=false`;
        }
    }
    return '';
}

function showPlaceholder() {
    $('#player').hide();
    $('#loadingIndicator').addClass('hidden');
    $('#placeholder').show();
    $('#continueWatching').addClass('hidden');
    $('#mediaInfoPanel').addClass('hidden');
}

function showLoadingIndicator() {
    $('#loadingIndicator').removeClass('hidden');
    $('#player').hide();
    $('#continueWatching').addClass('hidden');
}

function hideLoadingIndicator() {
    $('#loadingIndicator').addClass('hidden');
    $('#player').show();
}

/* ------------------- Watch History Functions ------------------- */

function addToWatchHistory(mediaCode, type, season, episode) {
    let title = $('#heading').text();
    if (type === 'series') {
        season = season || 1;
        episode = episode || 1;
    }

    // Remove existing entry if any
    watchHistory = watchHistory.filter(item =>
        !(item.mediaCode === mediaCode && item.type === type && ((type === 'movie') || (item.season === season && item.episode === episode)))
    );

    // Add new entry
    watchHistory.push({ title, mediaCode, type, season, episode });
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    displayWatchHistory();
}

function displayWatchHistory() {
    $('#historyList').empty();
    if (watchHistory.length > 0) {
        let fragment = document.createDocumentFragment();
        watchHistory.slice().reverse().forEach(item => {
            let li = $('<li>')
                .attr('data-code', item.mediaCode)
                .attr('data-type', item.type);

            if (item.type === 'series') {
                li.attr('data-season', item.season).attr('data-episode', item.episode);
            }

            let displayText = `${item.title} (${item.mediaCode})`;
            if (item.type === 'series') {
                let s = ("0" + item.season).slice(-2);
                let e = ("0" + item.episode).slice(-2);
                displayText += ` - S${s}E${e}`;
            }

            let textSpan = $('<span>').text(displayText);
            let deleteBtn = $('<button>')
                .addClass('delete-history-item')
                .text('X');

            li.append(textSpan, deleteBtn);
            fragment.appendChild(li[0]);
        });
        $('#historyList').append(fragment);
        $('#watchHistory').show();
    } else {
        $('#watchHistory').hide();
    }
}

function loadWatchHistory() {
    let storedHistory = localStorage.getItem('watchHistory');
    if (storedHistory) {
        watchHistory = JSON.parse(storedHistory);
        displayWatchHistory();
    }
}

function removeFromWatchHistory(mediaCode, type, season, episode) {
    if (type === 'series') {
        watchHistory = watchHistory.filter(item => !(item.mediaCode === mediaCode && item.type === type && item.season == season && item.episode == episode));
    } else {
        watchHistory = watchHistory.filter(item => !(item.mediaCode === mediaCode && item.type === type));
    }
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    displayWatchHistory();
}

function loadHistoryItem(li) {
    let code = li.data('code');
    let type = li.data('type');
    let season = li.data('season');
    let episode = li.data('episode');

    $('#mediaCode').val(code);
    if (type === 'series') {
        $('#seasonNumber').val(season);
        $('#episodeNumber').val(episode);
        $('#seriesPlayerButton').click();
    } else {
        $('#moviePlayerButton').click();
    }
    refreshPlayer();
}

/* ------------------- Search & Lazy Loading ------------------- */

function handleSearchInput() {
    currentSearchTerm = $('#searchInput').val().toLowerCase().trim();
    currentPage = 1;
    $('#searchResults').empty();

    if (currentSearchTerm) {
        $('#emptyState').addClass('hidden');
        displaySearchResults();
    } else {
        $('#emptyState').removeClass('hidden');
    }
}

function displaySearchResults() {
    if (!currentSearchTerm) {
        return;
    }

    loading = true;

    const resultsContainer = $('#searchResults');
    const filteredMovies = searchMovies(currentSearchTerm, moviesData);
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const moviesToDisplay = filteredMovies.slice(start, end);

    if (moviesToDisplay.length === 0 && currentPage === 1) {
        resultsContainer.append('<div class="search-result-item">No results found</div>');
        loading = false;
        return;
    }

    let fragment = document.createDocumentFragment();
    moviesToDisplay.forEach(movie => {
        const movieElement = buildSearchResultElement(movie, currentSearchTerm);
        fragment.appendChild(movieElement[0]);
    });
    resultsContainer.append(fragment);
    currentPage++;
    loading = false;
}

function tryLoadMoreResults() {
    if (!loading && $(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight - 10) {
        if (currentSearchTerm) {
            displaySearchResults();
        }
    }
}

// Main search function - replaces the existing searchMovies function
function searchMovies(query, movies) {
    if (!query || query.length < 2) return []; // Don't search for very short queries
    
    const normalizedQuery = normalizeString(query);
    const queryTokens = tokenizeString(normalizedQuery);
    
    // First pass: compute relevance scores for all movies
    const scoredMovies = movies.map(movie => {
        const title = normalizeString(movie.title);
        const score = calculateRelevanceScore(title, normalizedQuery, queryTokens);
        return { movie, score };
    });
    
    // Filter out irrelevant results and sort by score (highest first)
    return scoredMovies
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.movie);
}

// Calculate relevance score based on multiple matching criteria
function calculateRelevanceScore(title, normalizedQuery, queryTokens) {
    const titleTokens = tokenizeString(title);
    let score = 0;
    
    // Exact match gets highest priority
    if (title === normalizedQuery) {
        return 100;
    }
    
    // Title starts with query (weighted heavily)
    if (title.startsWith(normalizedQuery)) {
        score += 50;
    }
    
    // Title contains the exact query as a substring
    if (title.includes(normalizedQuery)) {
        score += 30;
    }
    
    // Check for word boundary matches
    const titleWords = title.split(/\s+/);
    for (const word of titleWords) {
        if (word === normalizedQuery) {
            score += 20; // Exact word match
        }
        
        // Word starts with query
        if (word.startsWith(normalizedQuery)) {
            score += 10;
        }
    }
    
    // Count the number of query tokens found in the title
    let matchedTokens = 0;
    const foundTokens = new Set();
    
    for (const queryToken of queryTokens) {
        // Skip very short tokens (like "a", "an", "the")
        if (queryToken.length < 2) continue;
        
        // Check for token matches
        let tokenFound = false;
        
        for (const titleToken of titleTokens) {
            if (titleToken === queryToken) {
                // Exact token match
                matchedTokens += 3;
                tokenFound = true;
                break;
            } else if (titleToken.startsWith(queryToken)) {
                // Title token starts with query token
                matchedTokens += 2;
                tokenFound = true;
                break;
            } else if (titleToken.includes(queryToken)) {
                // Title token contains query token
                matchedTokens += 1;
                tokenFound = true;
                break;
            }
        }
        
        if (tokenFound) {
            foundTokens.add(queryToken);
        }
    }
    
    // Add token match score
    score += matchedTokens * 5;
    
    // Bonus for matching all query tokens (ensures all search terms are found)
    if (foundTokens.size === queryTokens.filter(t => t.length >= 2).length && queryTokens.length > 0) {
        score += 25;
    }
    
    // Proximity bonus - terms that appear close together score higher
    if (queryTokens.length > 1) {
        const proximityScore = calculateProximityScore(title, queryTokens);
        score += proximityScore;
    }
    
    // Penalize long titles slightly (to prioritize concise matches when scores are otherwise close)
    score -= Math.log(Math.max(title.length, 1)) * 0.5;
    
    return Math.max(0, score);
}

// Calculate how close search terms appear to each other in the title
function calculateProximityScore(title, queryTokens) {
    if (queryTokens.length <= 1) return 0;
    
    const positions = [];
    
    // Find positions of all query tokens in the title
    for (const token of queryTokens) {
        if (token.length < 2) continue;
        
        const pos = title.indexOf(token);
        if (pos >= 0) {
            positions.push(pos);
        }
    }
    
    if (positions.length <= 1) return 0;
    
    // Sort positions and calculate distance between terms
    positions.sort((a, b) => a - b);
    const distance = positions[positions.length - 1] - positions[0];
    
    // Closer terms get higher score
    return Math.max(0, 10 - Math.min(distance / 5, 10));
}

// Enhanced tokenization with stopword removal
function tokenizeString(str) {
    // Remove common stopwords that add noise to search
    const stopwords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
        'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 
        'about', 'of', 'as'
    ]);
    
    // Split on spaces and other separators
    return str.split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
        .filter(token => token.length > 0 && !stopwords.has(token.toLowerCase()));
}

// Normalize string for comparison
function normalizeString(str) {
    return str.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^\w\s-]/g, ''); // Keep only alphanumeric, spaces, and hyphens
}

// Enhanced highlight function that preserves original case
function highlightQuery(text, query) {
    if (!query || query.length < 2) return text;
    
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);
    
    // First try to highlight the whole query
    if (normalizedText.includes(normalizedQuery)) {
        const regex = new RegExp(`(${escapeRegex(normalizedQuery)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    // Then try to highlight individual tokens
    let highlighted = text;
    for (const token of queryTokens) {
        const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
    }
    
    return highlighted;
}

// Improved escaping function for regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Function to extract year from title if present (for better matching)
function extractYearFromTitle(title) {
    const yearMatch = title.match(/\((\d{4})\)$/);
    if (yearMatch && yearMatch[1]) {
        return {
            titleWithoutYear: title.replace(/\s*\(\d{4}\)$/, '').trim(),
            year: parseInt(yearMatch[1])
        };
    }
    return { titleWithoutYear: title, year: null };
}

// Fuzzy matching for typo tolerance
function calculateLevenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    return matrix[a.length][b.length];
}

function buildSearchResultElement(movie, query) {
    let ratingsHtml = buildRatingsHTML(movie);
    let posterUrl = movie.Poster || "PosterPlaceholder.png";
    let titleWithHighlight = highlightQuery(movie.title, query);

    const movieElement = $(`
        <div class="search-result-item">
            <div class="search-result-item-content">
                <img class="poster" src="${posterUrl}" alt="Poster"/>
                <div>
                    <div class="search-result-item-title">
                        <a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${titleWithHighlight}</a>
                        ${ratingsHtml}
                    </div>
                </div>
            </div>
        </div>
    `);
    return movieElement;
}

function highlightQuery(text, query) {
    if (!query) return text;
    const queryTokens = tokenizeString(query);
    let highlighted = text;
    queryTokens.forEach(token => {
        let regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
    });
    return highlighted;
}

function buildRatingsHTML(movie) {
    if (!movie.ratings || movie.ratings.length === 0) {
        return `
            <div id="ratings">
                <div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>
                <div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>
                <div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>
            </div>
        `;
    }

    let imdbRating = 'N/A';
    let tomatoRating = 'N/A';
    let metaRating = 'N/A';

    movie.ratings.forEach(r => {
        if (r.Source === "Internet Movie Database") {
            imdbRating = r.Value;
        } else if (r.Source === "Rotten Tomatoes") {
            tomatoRating = r.Value;
        } else if (r.Source === "Metacritic") {
            metaRating = r.Value;
        }
    });

    let tomatoIcon = 'EmptyTomato.png';
    if (tomatoRating !== 'N/A') {
        let rate = parseFloat(tomatoRating);
        if (!isNaN(rate)) {
            if (rate >= 75) {
                tomatoIcon = "FreshTomato.png";
            } else if (rate >= 60) {
                tomatoIcon = "RedTomato.png";
            } else {
                tomatoIcon = "RottenTomato.png";
            }
        }
    }

    let imdbIcon = imdbRating !== 'N/A' ? 'IMDB.png' : 'EmptyIMDB.png';
    let metaIcon = metaRating !== 'N/A' ? 'Metacritic.png' : 'EmptyMetacritic.png';

    return `
        <div id="ratings">
            <div class="center">
                <a href="https://www.imdb.com/title/${movie.imdb_id}/" title="IMDb Rating" target="_blank">
                    <img width="25" src="${imdbIcon}"/>
                </a>
                <p class="rating">${imdbRating}</p>
            </div>
            <div class="center"><img width="25" src="${tomatoIcon}"/><p class="rating">${tomatoRating}</p></div>
            <div class="center"><img width="25" src="${metaIcon}"/><p class="rating">${metaRating}</p></div>
        </div>
    `;
}

/* ------------------- Player Switching ------------------- */

function switchToMoviePlayer() {
    $('#moviePlayerButton').addClass('active');
    $('#seriesPlayerButton').removeClass('active');
    $('#seasonNumber').hide();
    $('#episodeNumber').hide();
    $('#mediaType').val('movie');
    $('#heading').text("Media Player");
    $('#autoNextEpisode').addClass('hidden');
    showPlaceholder();
}

function switchToSeriesPlayer() {
    $('#seriesPlayerButton').addClass('active');
    $('#moviePlayerButton').removeClass('active');
    $('#seasonNumber').show();
    $('#episodeNumber').show();
    $('#mediaType').val('series');
    $('#heading').text("Media Player");
    $('#autoNextEpisode').removeClass('hidden');
    showPlaceholder();
}

/* ------------------- Local Storage (Source) ------------------- */

function saveSourceSelection() {
    const selectedSource = $('#sourceSelector').val();
    localStorage.setItem('preferredSource', selectedSource);
}

function restoreSourceSelection() {
    const preferredSource = localStorage.getItem('preferredSource');
    if (preferredSource) {
        $('#sourceSelector').val(preferredSource);
    }
}

/* ------------------- Utility ------------------- */

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function initLocalStorage() {
    if (!localStorage.getItem('watchHistory')) {
        localStorage.setItem('watchHistory', '[]');
    }
    if (localStorage.getItem('autoNextEpisode') === null) {
        localStorage.setItem('autoNextEpisode', 'true');
    }
}

function blockDevToolsKeys() {
    $(document).keydown(function (e) {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U
        if (e.key == 123 || e.key == "F12") {
            e.preventDefault();
        }
        if (e.ctrlKey && e.shiftKey && ['I','C','J'].includes(e.key)) {
            e.preventDefault();
        }
        if (e.ctrlKey && e.key == 'U') {
            e.preventDefault();
        }
    });
}