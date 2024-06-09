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
        }
    } else {
        if (!mediaCode || !seasonNumber || !episodeNumber) {
            showPlaceholder();
        } else {
            playerUrl = `https://vidsrc.pro/embed/tv/${mediaCode}/${seasonNumber}/${episodeNumber}`;
            $('#player').attr('src', playerUrl).show();
            $('#placeholder').hide();
        }
    }
}

function replaceTitle() {
    var mediaCode = $('#mediaCode').val().trim();
    var seasonNumber = $('#seasonNumber').val().trim();
    var episodeNumber = $('#episodeNumber').val().trim();
    if (mediaCode) {
        var apiUrl = "https://www.omdbapi.com/?i=" + mediaCode + "&apikey=d7985c9b";
        $.ajax({
            url: apiUrl,
            type: 'GET',
            success: function(data) {
                if (data.Response === "True") {
                    var title = data.Title;
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

$(document).ready(function() {
    $('#moviePlayerButton').click(function() {
        $(this).addClass('active');
        $('#seriesPlayerButton').removeClass('active');
        $('#seasonNumber').addClass('hidden');
        $('#episodeNumber').addClass('hidden');
        refreshPlayer();
        replaceTitle();
    });

    $('#seriesPlayerButton').click(function() {
        $(this).addClass('active');
        $('#moviePlayerButton').removeClass('active');
        $('#seasonNumber').removeClass('hidden');
        $('#episodeNumber').removeClass('hidden');
        refreshPlayer();
        replaceTitle();
    });

    $('#mediaCode, #seasonNumber, #episodeNumber').on('input', function() {
        refreshPlayer();
        replaceTitle();
    });

    $('#searchButton').click(function() {
        window.location.href = 'search.html';
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
    
    refreshPlayer(); // Initialize the state
    replaceTitle();
});
