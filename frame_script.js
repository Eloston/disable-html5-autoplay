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
            if (element.classList.contains("html5-main-video") && element.parentElement.classList.contains("html5-video-container")) {
                var root_player_id = element.parentElement.parentElement.parentElement.id;
                if (((root_player_id == "player-api") || (root_player_id == "upsell-video") || (root_player_id == "player")) && window.hasOwnProperty("yt")) {
                    if (yt.hasOwnProperty("player")) {
                        return yt.player.hasOwnProperty("getPlayerByElement");
                    };
                };
            };
            return false;
        };

        var self = this;

        self.m_element = element;

        var ytinstance = yt.player.getPlayerByElement(element.parentElement.parentElement.parentElement);

        var disable_yt_autoplay = function() {
            var init_state = ytinstance.getPlayerState();

            if (init_state == 1) {
                ytinstance.pauseVideo();
                ytinstance.seekTo(0);
            };
            self.should_pause = (init_state == 5) || (init_state == 3) || (init_state == -1);
            ytinstance.addEventListener("onStateChange", function(new_state) {
                if ((new_state == 5) || (new_state == -1)) {
                    self.should_pause = true;
                } else if ((new_state == 1) && (self.should_pause == true)) {
                    self.should_pause = false;
                    ytinstance.pauseVideo();
                    ytinstance.seekTo(0);
                };
            });
        };

        if (ytinstance.hasOwnProperty("getPlayerState") == true) {
            disable_yt_autoplay();
        } else {
            ytinstance.addEventListener("onReady", disable_yt_autoplay);
        };

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

    function JWPlayerDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return (element.classList.contains("jw-video") && element.parentElement.classList.contains("jw-media") && element.parentElement.parentElement.classList.contains("jwplayer") && window.hasOwnProperty("jwplayer"));
        };

        var self = this;

        self.m_element = element;

        var jwinstance = jwplayer(element.parentElement.parentElement);

        if (jwinstance.hasOwnProperty("once") == true) {
            jwinstance.once("play", function(e) {
                if (e.oldstate == "buffering") {
                    setTimeout(function() { jwinstance.pause(); }, 0);
                };
            });
        } else if (jwinstance.hasOwnProperty("onPlay") == true) {
            self.already_stopped = false;
            jwinstance.onPlay(function(e) {
                if (self.already_stopped == true) {
                    return;
                };
                if (e.oldstate == "buffering") {
                    self.already_stopped = true;
                    setTimeout(function() { jwinstance.pause(); }, 0);
                };
            });
        };

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

    DELEGATE_TYPES = [BrowserControlsDelegate, YouTubeDelegate, VideojsDelegate, JWPlayerDelegate];
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
