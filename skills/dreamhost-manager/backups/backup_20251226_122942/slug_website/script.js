
document.addEventListener('DOMContentLoaded', function() {
    var iframeElement   = document.querySelector('iframe');
    var iframeElementID = iframeElement.id;
    var widget1         = SC.Widget(iframeElement);
    var newVolume       = 20; // Volume level (0-100)

    widget1.setVolume(newVolume);
});
