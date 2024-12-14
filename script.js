let watchHistory = [];
let titleCurrent;
let typeCurrent;
let loading = false;
let moviesData = [];
let currentSearchTerm = '';
let currentPage = 1;
const resultsPerPage = 25;

// Helper Functions
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function isValidImdbCode(mediaCode) {
    return mediaCode.length >= 9 && mediaCode.slice(0, 2) === "tt" && mediaCode.length <= 11;
}

function getPlayerUrl(mediaCode, seasonNumber, episodeNumber, sourceType, isMovie) {
    // Returns the correct URL based on type (movie/series) and source
    if (isMovie) {
        if (sourceType === "vidsrc") {
            return `https://embed.su/embed/movie/${mediaCode}?uwu=kk`;
        } else if (sourceType === "superembed") {
            return `https://multiembed.mov/directstream.php?video_id=${mediaCode}`;
        } else if (sourceType === "vidsrccc") {
            return `https://vidsrc.cc/v2/embed/movie/${mediaCode}?autoPlay=false`;
        }
    } else {
        if (sourceType === "vidsrc") {
            return `https://embed.su/embed/tv/${mediaCode}/${seasonNumber}/${episodeNumber}?uwu=kk`;
        } else if (sourceType === "superembed") {
            return `https://multiembed.mov/directstream.php?video_id=${mediaCode}&s=${seasonNumber}&e=${episodeNumber}`;
        } else if (sourceType === "vidsrccc") {
            return `https://vidsrc.cc/v2/embed/tv/${mediaCode}/${seasonNumber}/${episodeNumber}?autoPlay=false`;
        }
    }
    return '';
}

function showPlaceholder() {
    $('#player').hide();
    $('#placeholder').show();
}

function refreshPlayer() {
    const mediaCode = $('#mediaCode').val().trim();
    const seasonNumber = $('#seasonNumber').val().trim();
    const episodeNumber = $('#episodeNumber').val().trim();
    const sourceType = $('#sourceSelector').val();
    const isMovie = $('#moviePlayerButton').hasClass('active');

    if (!mediaCode || (!isMovie && (!seasonNumber || !episodeNumber))) {
        showPlaceholder();
        return;
    }

    const playerUrl = getPlayerUrl(mediaCode, seasonNumber, episodeNumber, sourceType, isMovie);
    if (!playerUrl) {
        showPlaceholder();
        return;
    }

    $('#player').attr('src', playerUrl).show();
    $('#placeholder').hide();
    replaceTitle();

    if (isValidImdbCode(mediaCode)) {
        addToWatchHistory(mediaCode, isMovie ? "movie" : "series", isMovie ? null : seasonNumber, isMovie ? null : episodeNumber);
    }

    // Switch view if needed
    if (typeCurrent === "series" && isMovie) {
        $('#seriesPlayerButton').click();
    } else if (typeCurrent === "movie" && !isMovie) {
        $('#moviePlayerButton').click();
    }
}

function replaceTitle() {
    const mediaCode = $('#mediaCode').val().trim();
    const seasonNumber = $('#seasonNumber').val().trim();
    const episodeNumber = $('#episodeNumber').val().trim();

    if (!mediaCode) {
        $('#heading').text("Media Player");
        return;
    }

    const apiUrl = "https://www.omdbapi.com/?i=" + mediaCode + "&apikey=2169157";
    $.ajax({
        url: apiUrl,
        type: 'GET',
        async: false,
        success: function (data) {
            if (data.Response === "True") {
                titleCurrent = data.Title;
                typeCurrent = data.Type;
                if ($('#moviePlayerButton').hasClass('active')) {
                    $('#heading').text(data.Title);
                } else {
                    let seasonNumberPrepended = ("0" + seasonNumber).slice(-2);
                    let episodeNumberPrepended = ("0" + episodeNumber).slice(-2);
                    $('#heading').text(`${data.Title} - S${seasonNumberPrepended}E${episodeNumberPrepended}`);
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

function addToWatchHistory(mediaCode, type, season, episode) {
    let title = $('#heading').text();
    if (type === 'series') {
        season = season || 1;
        episode = episode || 1;
    }

    watchHistory = watchHistory.filter(item => {
        return !(item.mediaCode === mediaCode && item.type === type && (type === 'movie' || (item.season === season && item.episode === episode)));
    });

    watchHistory.push({ title, mediaCode, type, season, episode });
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    displayWatchHistory();
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

function displayWatchHistory() {
    $('#historyList').empty();
    if (watchHistory.length > 0) {
        watchHistory.slice().reverse().forEach(item => {
            let displayText = `${item.title} (${item.mediaCode})`;
            if (item.type === 'series') {
                let season = ("0" + item.season).slice(-2);
                let episode = ("0" + item.episode).slice(-2);
                displayText += ` - S${season}E${episode}`;
            }

            const li = $('<li>')
                .attr('data-code', item.mediaCode)
                .attr('data-type', item.type);

            if (item.type === 'series') {
                li.attr('data-season', item.season).attr('data-episode', item.episode);
            }

            const textSpan = $('<span>').text(displayText);
            const deleteBtn = $('<button>')
                .addClass('delete-history-item')
                .text('X')
                .click(function (e) {
                    e.stopPropagation();
                    removeFromWatchHistory(item.mediaCode, item.type, item.season, item.episode);
                });

            li.append(textSpan, deleteBtn);
            $('#historyList').append(li);
        });
        $('#watchHistory').show();
    } else {
        $('#watchHistory').hide();
    }
}

function loadWatchHistory() {
    const storedHistory = localStorage.getItem('watchHistory');
    if (storedHistory) {
        watchHistory = JSON.parse(storedHistory);
        displayWatchHistory();
    }
}

function normalizeString(str) {
    return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\W_]+/g, '');
}

function tokenizeString(str) {
    return str.split(/\s+/);
}

function searchMovies(query, movies) {
    const normalizedQueryTokens = tokenizeString(normalizeString(query));

    return movies.filter(movie => {
        const normalizedTitle = normalizeString(movie.title);
        const titleTokens = tokenizeString(normalizedTitle);
        return normalizedQueryTokens.every(token => titleTokens.some(titleToken => titleToken.includes(token)));
    });
}

function displaySearchResults() {
    loading = true;
    const resultsContainer = $('#searchResults');
    const filteredMovies = searchMovies(currentSearchTerm, moviesData);
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const moviesToDisplay = filteredMovies.slice(start, end);

    if (moviesToDisplay.length === 0 && currentPage === 1) {
        resultsContainer.append('<div class="search-result-item">No movies found</div>');
    } else {
        moviesToDisplay.forEach(movie => {
            let movieElement = `<div class="search-result-item"><div class="search-result-item-content">`;
            if (movie.Poster !== "") {
                movieElement += `<img class="poster" src="${movie.Poster}"/><div class="search-result-item-details"><div class="search-result-item-title"><a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${movie.title}</a>`;
            } else {
                movieElement += `<img class="poster" src="PosterPlaceholder.png"/><div class="search-result-item-title"><a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${movie.title}</a>`;
            }

            movieElement += `<div id="ratings">`;

            if (movie.ratings.length === 0) {
                movieElement += `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>`;
                movieElement += `<div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`;
                movieElement += `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`;
            }

            for (let i = 0; i < movie.ratings.length; i++) {
                const rating = movie.ratings[i];
                if (rating.Source === "Internet Movie Database") {
                    movieElement += `<div class="center"><a href="https://www.imdb.com/title/${movie.imdb_id}/" title="IMDb Rating" target="_blank"><img width="25" src="IMDB.png"/></a><p class="rating">${rating.Value}</p></div>`;
                    if (movie.ratings.length === 1) {
                        movieElement += `<div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`;
                        movieElement += `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`;
                    }
                } else if (rating.Source === "Rotten Tomatoes") {
                    if (i === 0) {
                        movieElement += `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>`;
                    }
                    const rateVal = parseFloat(rating.Value);
                    let tomatoImg = "RottenTomato.png";
                    if (rateVal >= 75) {
                        tomatoImg = "FreshTomato.png";
                    } else if (rateVal >= 60) {
                        tomatoImg = "RedTomato.png";
                    }
                    movieElement += `<div class="center"><img width="25" src="${tomatoImg}"/><p class="rating">${rating.Value}</p></div>`;
                    if (movie.ratings.length === 1) {
                        movieElement += `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`;
                    }
                    if (movie.ratings.length === 2 && i === 1) {
                        movieElement += `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`;
                    }
                } else if (rating.Source === "Metacritic") {
                    if (i === 0) {
                        movieElement += `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div><div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`;
                    } else if (i === 1) {
                        movieElement += `<div class="center"><img width="25" src="IMDB.png"/><p class="rating">N/A</p></div>`;
                    }
                    movieElement += `<div class="center"><img width="25" src="Metacritic.png"/><p class="rating">${rating.Value}</p></div>`;
                }
            }

            movieElement += "</div></div></div></div>";
            resultsContainer.append(movieElement);
        });
        currentPage++;
    }
    loading = false;
}

// Document Ready
$(document).ready(function () {
    $('#searchPageButton').click(function() {
        window.location.href = 'search.html';
    });

    $(document).keydown(function (e) {
        // Prevent dev tools shortcuts
        if (e.key == 123 || e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && (e.key == 'I' || e.key == 'C' || e.key == 'J')) ||
            (e.ctrlKey && e.key == 'U')) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    });

    $('#backToPlayer').click(function () {
        window.location.href = 'index.html';
    });

    $('#moviePlayerButton').click(function () {
        $('#moviePlayerButton').addClass('active');
        $('#seriesPlayerButton').removeClass('active');
        $('#seasonNumber').hide();
        $('#episodeNumber').hide();
        $('#mediaType').val('movie');
        $('#heading').text("Media Player");
        showPlaceholder();
    });

    $('#seriesPlayerButton').click(function () {
        $('#seriesPlayerButton').addClass('active');
        $('#moviePlayerButton').removeClass('active');
        $('#seasonNumber').show();
        $('#episodeNumber').show();
        $('#mediaType').val('series');
        $('#heading').text("Media Player");
        showPlaceholder();
    });
    
    $('#sourceSelector').change(function() {
        refreshPlayer();
    });

    const debouncedRefreshPlayer = debounce(refreshPlayer, 300);
    const debouncedReplaceTitle = debounce(replaceTitle, 300);

    $('#mediaCode, #seasonNumber, #episodeNumber').blur(function () {
        debouncedRefreshPlayer();
        debouncedReplaceTitle();
    });

    loadWatchHistory();

    $('#historyList').on('click', 'li', function (e) {
        // If clicked on li text (not delete button)
        if (!$(e.target).hasClass('delete-history-item')) {
            const code = $(this).data('code');
            const type = $(this).data('type');
            const season = $(this).data('season');
            const episode = $(this).data('episode');
            $('#mediaCode').val(code);
            if (type === 'series') {
                $('#seasonNumber').val(season);
                $('#episodeNumber').val(episode);
                $('#seriesPlayerButton').click();
            } else {
                $('#moviePlayerButton').click();
            }
            refreshPlayer();
            replaceTitle();
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
            replaceTitle();
        }
    });

    // Load movie data (for search functionality)
    $.getJSON("movies.json", function (data) {
        moviesData = data.movies;
    });

    $('#searchInput').on('keyup', debounce(function () {
        currentSearchTerm = $(this).val().toLowerCase();
        currentPage = 1;
        $('#searchResults').empty();
        if (currentSearchTerm) {
            $('#emptyState').addClass('hidden');
            displaySearchResults();
        } else {
            $('#emptyState').removeClass('hidden');
        }
    }, 300));

    $('#searchResults').on('scroll', function () {
        if (!loading && $(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
            displaySearchResults();
        }
    });
});
