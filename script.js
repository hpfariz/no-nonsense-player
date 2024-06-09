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

    refreshPlayer(); // Initialize the state
    replaceTitle();
});
