(function() {
    function send_message(message) {
        window.dispatchEvent(new CustomEvent("DisableHTML5AutoplayEvent_ToContentScript", { detail: message }));
    };

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

    function update_media_element_count(delegate_constructor, should_add) {
        var delegate_name = DELEGATE_NAMES[DELEGATE_TYPES.indexOf(delegate_constructor)];
        var message = { element_type: delegate_name };
        if (should_add == true) {
            message.action = "add_media_element";
        } else if (should_add == false) {
            message.action = "remove_media_element";
        } else {
            console.error("frame_script.js: Unknown should_add value: " + JSON.stringify(should_add));
            return;
        };
        send_message(message);
    };

    function record_autoplay_attempt(delegate_obj) {
        send_message({ action: "add_autoplay_attempt", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(delegate_obj.constructor)] });
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
            record_autoplay_attempt(self);
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
            ytinstance.removeEventListener("onReady", disable_yt_autoplay);
            var init_state = ytinstance.getPlayerState();

            if (init_state == 1) {
                ytinstance.pauseVideo();
                record_autoplay_attempt(self);
            };
            self.should_pause = (init_state == 5) || (init_state == 3) || (init_state == -1);
            ytinstance.addEventListener("onStateChange", function(new_state) {
                if (new_state == -1) {
                    self.should_pause = true;
                } else if ((new_state == 1) && (self.should_pause == true)) {
                    self.should_pause = false;
                    ytinstance.pauseVideo();
                    record_autoplay_attempt(self);
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
            vjsinstance.one("play", function() { record_autoplay_attempt(self); vjsinstance.pause(); });
        } else {
            var TIMEOUT = 1500;
            self.last_event = -2000;

            function input_callback(event) {
                self.last_event = performance.now();
            };

            for (event_type of ["keydown", "keyup", "mousedown", "mouseup"]) {
                element.parentElement.addEventListener(event_type, input_callback, true);
            };

            vjsinstance.on("play", function() {
                if ((performance.now() - self.last_event) > TIMEOUT) {
                    record_autoplay_attempt(self);
                    vjsinstance.pause();
                };
            });
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
                    setTimeout(function() { record_autoplay_attempt(self); jwinstance.pause(); }, 0);
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
                    setTimeout(function() { record_autoplay_attempt(self); jwinstance.pause(); }, 0);
                };
            });
        };

        self.unregister_element = function() {
        };
    };

    function UnknownDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return true;
        };

        var self = this;

        self.event_call_count = 0;

        modify_element_play(element, function() {
            record_autoplay_attempt(self);
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

    function add_element(media_element) { // TODO: Split this function up into add_element and element_mutated
        if (m_elements.has(media_element)) {
            // TODO: Move autoplay attribute removal into base delegate
            if (!m_elements.get(media_element).hasOwnProperty("autoplay_removal_count")) {
                m_elements.get(media_element).autoplay_removal_count = 0;
            };
            if ((media_element.autoplay == true) && (m_elements.get(media_element).autoplay_removal_count <= 10)) {
                m_elements.get(media_element).autoplay_removal_count += 1;
                media_element.autoplay = false;
                media_element.pause();
                send_message({ action: "add_autoplay_attempt", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(UnknownDelegate)] });
            };
            if (m_elements.get(media_element).constructor(media_element, true) == false) {
                remove_element(media_element);
            } else if (m_elements.get(media_element) instanceof UnknownDelegate) {
                for (delegate_type of DELEGATE_TYPES) {
                    if (!(delegate_type == UnknownDelegate)) {
                        if (delegate_type(media_element, true) == true) {
                            update_media_element_count(delegate_type, true);
                            m_elements.set(media_element, new delegate_type(media_element, false));
                            return;
                        };
                    };
                };
                return;
            } else {
                return;
            };
        };
        if (media_element.autoplay == true) {
            media_element.autoplay = false;
            media_element.pause();
            send_message({ action: "add_autoplay_attempt", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(UnknownDelegate)] });
        };
        for (delegate_type of DELEGATE_TYPES) {
            if (delegate_type(media_element, true) == true) {
                update_media_element_count(delegate_type, true);
                m_elements.set(media_element, new delegate_type(media_element, false));
                return;
            };
        };
    };

    function remove_element(media_element) {
        if (m_elements.has(media_element)) {
            m_elements.get(media_element).unregister_element();
            update_media_element_count(m_elements.get(media_element).constructor, false);
            m_elements.delete(media_element);
        };
    };

    DELEGATE_TYPES = [BrowserControlsDelegate, YouTubeDelegate, VideojsDelegate, JWPlayerDelegate, UnknownDelegate];
    DELEGATE_NAMES = ["browser_controls", "youtube", "video.js", "jwplayer", "unknown"];
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
