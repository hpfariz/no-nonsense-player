let watchHistory = [];
let titleCurrent;
let typeCurrent;
let moviesData = [];
let loading = false;
let currentSearchTerm = '';
let currentPage = 1;
const resultsPerPage = 25;

$(document).ready(function () {
    initLocalStorage();
    loadWatchHistory();
    restoreSourceSelection();
    blockDevToolsKeys();

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

    // Toggle theatre mode
    $('#toggleTheatreBtn').click(function() {
        $('main').toggleClass('theatre-mode');
    });
});

/* ------------------- Player Functions ------------------- */

function refreshPlayer() {
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    var sourceType = $('#sourceSelector').val();

    if ($('#moviePlayerButton').hasClass('active')) {
        if (!mediaCode) {
            showPlaceholder();
            return;
        }
        showLoadingIndicator();
        const playerUrl = getPlayerUrl(sourceType, 'movie', mediaCode);
        $('#player').attr('src', playerUrl).show();
        $('#placeholder').hide();
        replaceTitle(mediaCode, 'movie');
    } else {
        if (!mediaCode || !seasonNumber || !episodeNumber) {
            showPlaceholder();
            return;
        }
        showLoadingIndicator();
        const playerUrl = getPlayerUrl(sourceType, 'series', mediaCode, seasonNumber, episodeNumber);
        $('#player').attr('src', playerUrl).show();
        $('#placeholder').hide();
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

/* ... Other functions (addToWatchHistory, displayWatchHistory, searchMovies, etc.) remain unchanged ... */

/* ------------------- Utility & Initialization Functions ------------------- */

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
}

function showLoadingIndicator() {
    $('#loadingIndicator').removeClass('hidden');
    $('#player').hide();
}

function hideLoadingIndicator() {
    $('#loadingIndicator').addClass('hidden');
    $('#player').show();
}

/* ... History, Search, and Debounce functions remain unchanged ... */

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
}

function blockDevToolsKeys() {
    $(document).keydown(function (e) {
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

function normalizeString(str) {
    return str.trim().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\W_]+/g, '');
}

function tokenizeString(str) {
    return str.split(/\s+/);
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
