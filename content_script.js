function get_all_media_elements() {
    return Array.prototype.slice.call(document.querySelectorAll("audio, video"));
};

function update_has_media(has_media) {
    if (!(has_media == m_has_media)) {
        send_message({action: "frame_has_media", has_media: has_media});
        m_has_media = has_media;
    };
};

function page_update(suspend, media_elements, first_time) {
    for (element of media_elements) {
        for (handler of EVENT_HANDLERS) {
            if (suspend == true) {
                if (first_time == true) {
                    element.pause();
                };
                element.addEventListener(handler.event, handler.callback, false);
            } else if (suspend == false) {
                element.removeEventListener(handler.event, handler.callback, false);
            } else {
                console.error("window_script.js: page_update: Unknown value for suspend: " + JSON.stringify(suspend));
            };
        };
    };
};

function frame_initialize(suspended) {
    m_suspended = suspended;

    var all_media_elements = get_all_media_elements();
    update_has_media(all_media_elements.length > 0);
    page_update(m_suspended, all_media_elements, true);

    m_mutation_observer.observe(document, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
    });
};

EVENT_HANDLERS = [
    {event: "play", callback: function(event) { event.target.pause(); } }
];
var m_suspended = undefined;
var m_has_media = false;
var mutation_observer_callback = function(mutations_array) {
    update_has_media(get_all_media_elements().length > 0);
    var media_elements = new Array();
    for (mutation of mutations_array) {
        if (mutation.target.nodeType == 1) { // ELEMENT_NODE
            if (mutation.target instanceof HTMLMediaElement) {
                media_elements.push(mutation.target);
            };
        };
    };
    page_update(m_suspended, media_elements, false);
}
var m_mutation_observer = new MutationObserver(mutation_observer_callback);
