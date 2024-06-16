let watchHistory = [];

let titleCurrent;
let typeCurrent;


function refreshPlayer() {
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    var playerUrl;

    if ($('#moviePlayerButton').hasClass('active')) {
        if (!mediaCode) {
            showPlaceholder();
        } else {
            playerUrl = `https://vidsrc.pro/embed/movie/${mediaCode}?uwu=kk`;
            $('#player').attr('src', playerUrl).show();
            $('#placeholder').hide();
            replaceTitle();
            if (mediaCode.length >= 9 && mediaCode.slice(0, 2) === "tt" && mediaCode.length <= 11) {
                addToWatchHistory(mediaCode, typeCurrent, null, null);
            }
            if (typeCurrent === "series") {
                $('#seriesPlayerButton').click();
            }
        }
    } else {
        if (!mediaCode || !seasonNumber || !episodeNumber) {
            showPlaceholder();
        } else {
            playerUrl = `https://vidsrc.pro/embed/tv/${mediaCode}/${seasonNumber}/${episodeNumber}?uwu=kk`;
            $('#player').attr('src', playerUrl).show();
            $('#placeholder').hide();
            replaceTitle();
            if (mediaCode.length >= 9 && mediaCode.slice(0, 2) === "tt" && mediaCode.length <= 11) {
                addToWatchHistory(mediaCode, typeCurrent, seasonNumber, episodeNumber);
            }
            if (typeCurrent === "movie") {
                $('#moviePlayerButton').click();
            }
        }
    }
}

function replaceTitle() {
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    if (mediaCode) {
        var apiUrl = "https://www.omdbapi.com/?i=" + mediaCode + "&apikey=2169157";
        $.ajax({
            url: apiUrl,
            type: 'GET',
            async: false,
            success: function (data) {
                if (data.Response === "True") {
                    var title = data.Title;
                    titleCurrent = data.Title;
                    typeCurrent = data.Type;
                    if ($('#moviePlayerButton').hasClass('active')) {
                        $('#heading').text(title);
                    } else {
                        let seasonNumberPrepended = ("0" + seasonNumber).slice(-2);
                        let episodeNumberPrepended = ("0" + episodeNumber).slice(-2);
                        $('#heading').text(`${title} - S${seasonNumberPrepended}E${episodeNumberPrepended}`);
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
}

function showPlaceholder() {
    $('#player').hide();
    $('#placeholder').show();
}

function addToWatchHistory(mediaCode, type, season, episode) {
    let title = $('#heading').text();
    if (type === 'series') {
        season = season || 1;
        episode = episode || 1;
    }

    // Remove existing entry if any
    watchHistory = watchHistory.filter(item => item.mediaCode !== mediaCode || item.type !== type);

    // Add new entry
    watchHistory.push({ title, mediaCode, type, season, episode });

    // Update history in local storage
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));

    // Refresh history UI
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
            let li = $('<li>').text(displayText).attr('data-code', item.mediaCode).attr('data-type', item.type);
            if (item.type === 'series') {
                li.attr('data-season', item.season).attr('data-episode', item.episode);
            }
            $('#historyList').append(li);
        });
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

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

$(document).ready(function () {

    $(document).keydown(function (e) {
        if (e.key == 123 || e.key == "F12") {
            e.preventDefault();
            e.stopImmediatePropagation()
        }
        if (e.ctrlKey && e.shiftKey && e.key == 'I') {
            e.preventDefault();
            e.stopImmediatePropagation()
        }
        if (e.ctrlKey && e.shiftKey && e.key == 'C') {
            e.preventDefault();
            e.stopImmediatePropagation()
        }
        if (e.ctrlKey && e.shiftKey && e.key == 'J') {
            e.preventDefault();
            e.stopImmediatePropagation()
        }
        if (e.ctrlKey && e.key == 'U') {
            e.preventDefault();
            e.stopImmediatePropagation()
        }
    });

    $('#searchPageButton').click(function () {
        window.location.href = 'search.html';
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

    const debouncedRefreshPlayer = debounce(refreshPlayer, 300);
    const debouncedReplaceTitle = debounce(replaceTitle, 300);

    $('#mediaCode, #seasonNumber, #episodeNumber').blur(function () {
        debouncedRefreshPlayer();
        debouncedReplaceTitle();
    });

    loadWatchHistory();

    $('#historyList').on('click', 'li', function () {
        let code = $(this).data('code');
        let type = $(this).data('type');
        let season = $(this).data('season');
        let episode = $(this).data('episode');
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
    });

    $('#clearHistory').on('click', function () {
        if (confirm('Are you sure you want to clear your watch history? The page will refresh after clearing your watch history.')) {
            localStorage.clear();
            location.reload();
        } else {
            // Do nothing!
        }

    });

    $(window).on('load', function () {
        let code = $('#mediaCode').val();
        if (code) {
            refreshPlayer();
            replaceTitle();
        }
    });

    let loading = false;
    let moviesData = [];
    let currentSearchTerm = '';
    let currentPage = 1;
    const resultsPerPage = 25;
    $.getJSON("movies.json", function (data) {
        moviesData = data.movies;
    });

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

    // Search functionality
    $('#searchInput').on('keyup', debounce(function () {
        currentSearchTerm = $(this).val().toLowerCase();
        currentPage = 1; // Reset to the first page of results
        $('#searchResults').empty(); // Clear previous results
        if (currentSearchTerm) {
            $('#emptyState').addClass('hidden');
            displaySearchResults();
        } else {
            $('#emptyState').removeClass('hidden');
        }
    }, 300));

    // Scroll event for lazy loading
    $('#searchResults').on('scroll', function () {
        if (!loading && $(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
            displaySearchResults();
        }
    });

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
                var movieElement = `<div class="search-result-item"><div class="search-result-item-content">`;
                if (movie.Poster !== "") {
                    movieElement = movieElement + `<img class="poster" src="${movie.Poster}"/><div class="search-result-item-details>"<div class="search-result-item-title">
                        <a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${movie.title}</a>`
                } else {
                    movieElement = movieElement + `<img class="poster" src="PosterPlaceholder.png"/><div class="search-result-item-title">
                            <a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${movie.title}</a>`
                }

                // movieElement = movieElement + `<a href="https://www.imdb.com/title/${movie.imdb_id}/" class="search-result-link rating" target="_blank">IMDB</a>`
                movieElement = movieElement + `<div id="ratings">`
                if (movie.ratings.length === 0) {
                    movieElement = movieElement + `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>`
                    movieElement = movieElement + `<div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`
                    movieElement = movieElement + `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`

                }
                for (let i = 0; i < movie.ratings.length; i++) {
                    if (movie.ratings[i].Source === "Internet Movie Database") {
                        movieElement = movieElement + `<div class="center"><a href="https://www.imdb.com/title/${movie.imdb_id}/" title="IMDb Rating" target="_blank"><img width="25" src="IMDB.png"/></a><p class="rating">${movie.ratings[i].Value}</p></div>`
                        if (movie.ratings.length == 1) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`

                        }
                    } else if (movie.ratings[i].Source === "Rotten Tomatoes") {
                        if (i === 0) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>`
                        }
                        var rate = parseFloat(movie.ratings[i].Value);
                        if (rate >= 75) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="FreshTomato.png"/><p class="rating">${movie.ratings[i].Value}</p></div>`
                        } else if (rate >= 60) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="RedTomato.png"/><p class="rating">${movie.ratings[i].Value}</p></div>`
                        } else {
                            movieElement = movieElement + `<div class="center"><img width="25" src="RottenTomato.png"/><p class="rating">${movie.ratings[i].Value}</p></div>`
                        }
                        if (movie.ratings.length == 1) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyMetacritic.png"/><p class="rating">N/A</p></div>`
                        }
                        if (movie.ratings.length == 2 && i === 1) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="/images/EmptyMetacritic.png"/><p class="rating">N/A</p></div>`
                        }

                    } else if (movie.ratings[i].Source === "Metacritic") {
                        if (i === 0) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyIMDB.png"/><p class="rating">N/A</p></div>`
                            movieElement = movieElement + `<div class="center"><img width="25" src="EmptyTomato.png"/><p class="rating">N/A</p></div>`
                        } else if (i === 1) {
                            movieElement = movieElement + `<div class="center"><img width="25" src="IMDB.png"/><p class="rating">N/A</p></div>`
                        }
                        movieElement = movieElement + `<div class="center"><img width="25" src="Metacritic.png"/><p class="rating">${movie.ratings[i].Value}</p></div>`
                    }
                }
                movieElement = movieElement + "</div></div></div></div>"
                resultsContainer.append(movieElement);
            });
            currentPage++;
        }
        loading = false;
    }

});
