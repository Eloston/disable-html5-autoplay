(function() {
    function UserInputEventMonitor() {
        var self = this;

        function input_callback(event) {
            self.last_event = performance.now();
        };

        self.initialize = function() {
            if (!self.configured) {
                self.configured = true;
                for (event_type of ["click", "keypress"]) {
                    window.addEventListener(event_type, input_callback, true);
                };
            };
        };

        self.reached_timeout = function() {
            return (performance.now() - self.last_event) < TIMEOUT;
        };

        var TIMEOUT = 1500;

        self.last_event = -2000;
        self.configured = false;
    };

    function modify_element_play(element, player_callback) {
        m_event_monitor.initialize();
        element.disabled_play = element.play;
        element.play = function() {
            if (m_event_monitor.reached_timeout() == true) {
                element.disabled_play();
            } else {
                player_callback();
            };
        };
    };

    function restore_element_play(element) {
        if (element.hasOwnProperty("disabled_play") == true) {
            element.play = element.disabled_play;
            delete element.disabled_play;
        };
    };

    function BrowserControlsDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return (element.controls == true);
        };

        var self = this;

        self.m_element = element;

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
            };
            self.should_pause = (init_state == 5) || (init_state == 3) || (init_state == -1);
            ytinstance.addEventListener("onStateChange", function(new_state) {
                if ((new_state == 5) || (new_state == -1)) {
                    self.should_pause = true;
                } else if ((new_state == 1) && (self.should_pause == true)) {
                    self.should_pause = false;
                    ytinstance.pauseVideo();
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
            if (element.classList.contains("vjs-tech") == true) {
                return element.parentElement.classList.contains("video-js") && window.hasOwnProperty("videojs");
            };
            return false;
        };

        var self = this;

        self.m_element = element;

        var vjsinstance = videojs(element.parentElement.id);
        if (vjsinstance.autoplay() == true) {
            vjsinstance.autoplay(false);
            vjsinstance.one("play", function() { vjsinstance.pause(); });
        };

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

    function GenericDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return true;
        };

        var self = this;

        self.event_call_count = 0;

        modify_element_play(element, function() {
            if (self.event_call_count < 5) {
                self.event_call_count++;
                element.dispatchEvent(new Event("play"));
                element.dispatchEvent(new Event("playing"));
                if (element.paused == true) {
                    setTimeout(function() { element.dispatchEvent(new Event("pause")); }, 100);
                };
            };
        });

        self.unregister_element = function() {
            restore_element_play(element);
        };
    };

    function add_element(media_element) {
        if (m_elements.has(media_element)) {
            if (m_elements.get(media_element).constructor(media_element, true) == false) {
                remove_element(media_element);
            } else if (m_elements.get(media_element) instanceof GenericDelegate) {
                for (delegate_type of DELEGATE_TYPES) {
                    if (!(delegate_type == GenericDelegate)) {
                        if (delegate_type(media_element, true) == true) {
                            m_elements.set(media_element, new delegate_type(media_element, false));
                            return;
                        };
                    };
                };
                return;
            } else {
                return;
            };
        } else {
            if (media_element.autoplay == true) {
                media_element.autoplay = false;
                media_element.pause();
            };
        };
        for (delegate_type of DELEGATE_TYPES) {
            if (delegate_type(media_element, true) == true) {
                m_elements.set(media_element, new delegate_type(media_element, false));
                return;
            };
        };
    };

    function remove_element(media_element) {
        if (m_elements.has(media_element)) {
            m_elements.get(media_element).unregister_element();
            m_elements.delete(media_element);
        };
    };

    DELEGATE_TYPES = [BrowserControlsDelegate, YouTubeDelegate, VideojsDelegate, JWPlayerDelegate, GenericDelegate];
    var m_elements = new Map();
    var m_event_monitor = new UserInputEventMonitor();
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
