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
            playerUrl = `https://vidsrc.pro/embed/movie/${mediaCode}`;
            $('#player').attr('src', playerUrl).show();
            $('#placeholder').hide();
            replaceTitle();
            addToWatchHistory(mediaCode, typeCurrent, null, null);
            console.log(typeCurrent)
            if (typeCurrent === "series") {
                $('#seriesPlayerButton').click();
            }
        }
    } else {
        if (!mediaCode || !seasonNumber || !episodeNumber) {
            showPlaceholder();
        } else {
            playerUrl = `https://vidsrc.pro/embed/tv/${mediaCode}/${seasonNumber}/${episodeNumber}`;
            $('#player').attr('src', playerUrl).show();
            $('#placeholder').hide();
            replaceTitle();
            addToWatchHistory(mediaCode, typeCurrent, seasonNumber, episodeNumber);
            console.log(typeCurrent)
            if (typeCurrent === "movie") {
                $('#moviePlayerButton').click();
            }
        }
    }
}

function replaceTitle() {
    console.log("replaceTitle")
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    if (mediaCode) {
        var apiUrl = "https://www.omdbapi.com/?i=" + mediaCode + "&apikey=d7985c9b";
        $.ajax({
            url: apiUrl,
            type: 'GET',
            async: false,
            success: function(data) {
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
            error: function() {
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
        watchHistory.forEach(item => {
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

$(document).ready(function() {
    $('#searchPageButton').click(function() {
        window.location.href = 'search.html';
    });

    $('#moviePlayerButton').click(function() {
        $('#moviePlayerButton').addClass('active');
        $('#seriesPlayerButton').removeClass('active');
        $('#seasonNumber').hide();
        $('#episodeNumber').hide();
        $('#mediaType').val('movie');
        $('#heading').text("Media Player");
        showPlaceholder();
    });

    $('#seriesPlayerButton').click(function() {
        $('#seriesPlayerButton').addClass('active');
        $('#moviePlayerButton').removeClass('active');
        $('#seasonNumber').show();
        $('#episodeNumber').show();
        $('#mediaType').val('series');
        $('#heading').text("Media Player");
        showPlaceholder();
    });

    $('#mediaCode, #seasonNumber, #episodeNumber').blur(function() {
        refreshPlayer();
        replaceTitle();
    });

    loadWatchHistory();

    $('#historyList').on('click', 'li', function() {
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

    $(window).on('load', function() {
        let code = $('#mediaCode').val();
        if (code) {
            refreshPlayer();
            replaceTitle();
        }
    });

    let moviesData = [];
    let currentSearchTerm = '';
    let currentPage = 1;
    const resultsPerPage = 25;
    let loading = false;
    $.getJSON("movies.json", function(data) {
        moviesData = data.movies;
    });

    // Search functionality
    $('#searchInput').on('keyup', function() {
        currentSearchTerm = $(this).val().toLowerCase();
        currentPage = 1; // Reset to the first page of results
        $('#searchResults').empty(); // Clear previous results
        if (currentSearchTerm) {
            $('#emptyState').addClass('hidden');
            displaySearchResults();
        } else {
            $('#emptyState').removeClass('hidden');
        }
    });

    // Scroll event for lazy loading
    $('#searchResults').on('scroll', function() {
        if (!loading && $(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
            displaySearchResults();
        }
    });

    function displaySearchResults() {
        loading = true;
        const resultsContainer = $('#searchResults');
        const filteredMovies = moviesData.filter(movie => movie.title.toLowerCase().includes(currentSearchTerm));
        const start = (currentPage - 1) * resultsPerPage;
        const end = start + resultsPerPage;
        const moviesToDisplay = filteredMovies.slice(start, end);

        if (moviesToDisplay.length === 0 && currentPage === 1) {
            resultsContainer.append('<div class="search-result-item">No movies found</div>');
        } else {
            moviesToDisplay.forEach(movie => {
                const movieElement = `
                    <div class="search-result-item">
                        <a href="index.html?imdb_id=${movie.imdb_id}" class="search-result-link">${movie.title}</a>
                        <div>Quality: ${movie.quality}</div>
                    </div>
                `;
                resultsContainer.append(movieElement);
            });
            currentPage++;
        }
        loading = false;
    }
    
});
