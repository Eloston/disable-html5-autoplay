(function() {
    function BrowserControlsDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return (element.controls == true);
        };

        var self = this;

        self.m_element = element;

        if (element.autoplay == true) {
            element.autoplay = false;
        };

        element.disabled_play = element.play;

        element.pause();

        element.play = function() {
            element.dispatchEvent(new Event("play"));
            element.dispatchEvent(new Event("playing"));
            if (element.paused == true) {
                element.dispatchEvent(new Event("pause"));
            };
        };

        self.unregister_element = function() {
            if (self.m_element.hasOwnProperty("disabled_play")) {
                self.m_element.play = self.m_element.disabled_play;
                delete self.m_element.disabled_play;
            };
        };
    };

    function YouTubeDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return false;
        };

        var self = this;

        self.m_element = element;

        self.unregister_element = function() {
        };
    };

    function VideojsDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return false;
        };

        var self = this;

        self.m_element = element;

        self.unregister_element = function() {
        };
    };

    function add_element(media_element) {
        if (!m_elements.has(media_element)) {
            for (delegate_type of DELEGATE_TYPES) {
                if (delegate_type(media_element, true) == true) {
                    m_elements.set(media_element, new delegate_type(media_element, false));
                };
            };
        };
    };

    function remove_element(media_element) {
        if (m_elements.has(media_element)) {
            m_elements.get(media_element).unregister_element();
            m_elements.delete(media_element);
        };
    };

    DELEGATE_TYPES = [BrowserControlsDelegate, YouTubeDelegate, VideojsDelegate];
    var m_elements = new Map();
    var m_mutation_observer = new MutationObserver(function(mutation_records) {
        for (mutation of mutation_records) {
            if (mutation.target instanceof HTMLMediaElement) {
                add_element(mutation.target);
            };
            for (added_node of Array.prototype.slice.call(mutation.addedNodes)) {
                if (added_node instanceof HTMLMediaElement) {
                    add_element(added_node);
                };
            };
            for (removed_node of Array.prototype.slice.call(mutation.removedNodes)) {
                if (removed_node instanceof HTMLMediaElement) {
                    remove_element(removed_node);
                };
            };
        };
    });

    m_mutation_observer.observe(document, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
    });

    for (media_element of Array.prototype.slice.call(document.querySelectorAll("audio, video"))) {
        add_element(media_element);
    };
})();
