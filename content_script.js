function frame_script_code(m_frame_event_name) {
    function send_message(message) {
        setTimeout(function() { window.dispatchEvent(new CustomEvent(m_frame_event_name, { detail: message })); }, 0);
    };

    function UserInputEventMonitor() {
        var self = this;

        function input_callback(event) {
            self.last_event = performance.now();
        };

        function init_handlers() {
            for (event_type of ["keydown", "keyup", "mousedown", "mouseup"]) {
                window.addEventListener(event_type, input_callback, true);
            };
        };
        init_handlers();
        var document_observer = new MutationObserver(function(mutation_records) {
            init_handlers();
        });
        document_observer.observe(document, { childList: true });

        self.reached_timeout = function() {
            return (performance.now() - self.last_event) < TIMEOUT;
        };

        var TIMEOUT = 1500;

        self.last_event = -2000;
        self.configured = false;
    };

    function update_media_element_count(delegate_constructor, should_add) { // TODO: Move to BaseDelegate class
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

    function record_autoplay_attempt(delegate_obj) { // TODO: Move to BaseDelegate class
        send_message({ action: "add_autoplay_attempts", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(delegate_obj.constructor)], count: 1 });
    };

    function BrowserControlsDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            return (element.controls == true);
        };

        var self = this;

        if (!element.paused) {
            record_autoplay_attempt(self);
            element.pause();
        };

        self.last_call = -2000;
        self.pseudo_events = {
            play: new Event("play"),
            playing: new Event("playing"),
            pause: new Event("pause")
        };

        Object.defineProperty(element, "play", {
            configurable: true,
            writable: false,
            enumerable: true,
            value: function() {
                record_autoplay_attempt(self);
                if ((performance.now() - self.last_call) > 10 && ((self.pseudo_events.play.eventPhase + self.pseudo_events.playing.eventPhase + self.pseudo_events.pause.eventPhase) == Event.NONE)) {
                    self.last_call = performance.now();
                    element.dispatchEvent(self.pseudo_events.play);
                    element.dispatchEvent(self.pseudo_events.playing);
                    if (element.paused == true) {
                        setTimeout(function() { element.dispatchEvent(self.pseudo_events.pause); }, 100);
                    };
                };
            }
        });

        self.unregister_element = function() {
            Object.defineProperty(element, "play", {
                writable: true,
                configurable: true,
                enumerable: true,
                value: HTMLMediaElement.prototype.play
            });
        };
    };

    function YouTubeDelegate(element, check_type_matches) {
        if (check_type_matches == true) {
            if (element.classList.contains("html5-main-video") && element.parentElement.classList.contains("html5-video-container")) {
                var root_player_id = element.parentElement.parentElement.parentElement.id;
                if (((root_player_id == "player-api") || (root_player_id == "upsell-video") || (root_player_id == "player")) && window.hasOwnProperty("yt")) {
                    return yt.hasOwnProperty("player");
                };
            };
            return false;
        };

        var self = this;

        self.can_play = false;
        self.pending_pausevideo_call = false;
        self.fully_initialized = false;
        self.ytinstance = null;

        Object.defineProperty(element, "play", {
            configurable: true,
            writable: false,
            enumerable: true,
            value: function() {
                if (self.can_play || (self.fully_initialized && self.ytinstance.getPlayerState() == 2)) {
                    self.can_play = true;
                    m_prototype_play.call(element);
                } else {
                    if (self.fully_initialized) {
                        setTimeout(function() { self.ytinstance.pauseVideo(); self.can_play = true; }, 0);
                    } else {
                        self.pending_pausevideo_call = true;
                    };
                };
            }
        });

        function on_state_changed_listener(new_state) {
            if (new_state == 5 || new_state == 2) {
                self.can_play = true;
            } else if (new_state == -1) {
                self.can_play = false;
                self.ytinstance.playVideo();
            };
        };

        function get_player_or_wait() {
            if (!(yt.player.hasOwnProperty("getPlayerByElement") && (yt.player.getPlayerByElement instanceof Function))) {
                setTimeout(get_player_or_wait, 1);
                return;
            };

            self.ytinstance = yt.player.getPlayerByElement(element.parentElement.parentElement.parentElement);

            function run_functions_or_wait() {
                if ((self.ytinstance.pauseVideo instanceof Function) && (self.ytinstance.addEventListener instanceof Function) && (self.ytinstance.getPlayerState instanceof Function)) {
                    self.fully_initialized = true;
                    if (self.ytinstance.getPlayerState() == -1) {
                        self.ytinstance.playVideo();
                    } else if (self.pending_pausevideo_call) {
                        self.ytinstance.playVideo();
                        self.pending_pausevideo_call = false;
                    };
                    self.ytinstance.addEventListener("onStateChange", on_state_changed_listener);
                } else {
                    setTimeout(run_functions_or_wait, 1);
                };
            };

            run_functions_or_wait();
        };

        get_player_or_wait();

        self.unregister_element = function() {
            Object.defineProperty(element, "play", {
                writable: true,
                configurable: true,
                enumerable: true,
                value: HTMLMediaElement.prototype.play
            });
            self.ytinstance.removeEventListener("onStateChange", on_state_changed_listener);
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

        if (!element.paused) {
            element.pause();
            record_autoplay_attempt(self);
        };

        var vjsinstance = videojs(element.parentElement.id);
        if (vjsinstance.autoplay() == true) {
            vjsinstance.on("play", function() {
                if (vjsinstance.autoplay() == true) {
                    vjsinstance.autoplay(false);
                    record_autoplay_attempt(self);
                    vjsinstance.pause();
                };
            });
        } else {
            var TIMEOUT = 1500;
            self.last_event = -2000;

            function input_callback(event) {
                self.last_event = performance.now();
            };

            for (event_type of ["keydown", "keyup", "mousedown", "mouseup"]) {
                window.addEventListener(event_type, input_callback, true);
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

        if (!element.paused) {
            element.pause();
            record_autoplay_attempt(self);
        };

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

        if (!element.paused) {
            record_autoplay_attempt(self);
            element.pause();
        };

        self.last_call = -2000;
        self.pseudo_events = {
            play: new Event("play"),
            playing: new Event("playing"),
            pause: new Event("pause")
        };
        Object.defineProperty(element, "play", {
            configurable: true,
            writable: false,
            enumerable: true,
            value: function() {
                if (m_event_monitor.reached_timeout() == true) {
                    m_prototype_play.call(element);
                } else {
                    record_autoplay_attempt(self);
                    if ((performance.now() - self.last_call) > 10 && ((self.pseudo_events.play.eventPhase + self.pseudo_events.playing.eventPhase + self.pseudo_events.pause.eventPhase) == Event.NONE)) {
                        self.last_call = performance.now();
                        element.dispatchEvent(self.pseudo_events.play);
                        element.dispatchEvent(self.pseudo_events.playing);
                        if (element.paused == true) {
                            setTimeout(function() { element.dispatchEvent(self.pseudo_events.pause); }, 100);
                        };
                    };
                };
            }
        });

        self.unregister_element = function() {
            Object.defineProperty(element, "play", {
                writable: true,
                configurable: true,
                enumerable: true,
                value: HTMLMediaElement.prototype.play
            });
        };
    };

    function add_regular_play(element, delegate_type) { // TODO: Move this into BaseDelegate constructor
        Object.defineProperty(element, "play", {
            configurable: true,
            writable: false,
            enumerable: true,
            value: m_prototype_play
        });
        if (m_undelegated_elements.has(element)) {
            send_message({ action: "add_autoplay_attempts", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(delegate_type)], count: m_undelegated_elements.get(element) });
            m_undelegated_elements.delete(element);
        };
    };

    function add_element(media_element) { // TODO: Split this function up into add_element and element_mutated
        if (m_elements.has(media_element)) {
            // TODO: Move autoplay attribute removal into BaseDelegate
            if (!m_elements.get(media_element).hasOwnProperty("autoplay_removal_count")) {
                m_elements.get(media_element).autoplay_removal_count = 0;
            };
            if ((media_element.autoplay == true) && (m_elements.get(media_element).autoplay_removal_count <= 10)) {
                m_elements.get(media_element).autoplay_removal_count = m_elements.get(media_element).autoplay_removal_count + 1;
                media_element.autoplay = false;
                media_element.pause();
                send_message({ action: "add_autoplay_attempts", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(UnknownDelegate)], count: 1 });
            };
            if (m_elements.get(media_element).constructor(media_element, true) == false) {
                remove_element(media_element);
            } else if (m_elements.get(media_element) instanceof UnknownDelegate) {
                for (delegate_type of DELEGATE_TYPES) {
                    if (!(delegate_type == UnknownDelegate)) {
                        if (delegate_type(media_element, true) == true) {
                            remove_element(media_element);
                            update_media_element_count(delegate_type, true);
                            add_regular_play(media_element, delegate_type);
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
            send_message({ action: "add_autoplay_attempts", element_type: DELEGATE_NAMES[DELEGATE_TYPES.indexOf(UnknownDelegate)], count: 1 });
        };
        for (delegate_type of DELEGATE_TYPES) {
            if (delegate_type(media_element, true) == true) {
                update_media_element_count(delegate_type, true);
                add_regular_play(media_element, delegate_type);
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
    var m_undelegated_elements = new Map();
    var m_prototype_play = HTMLMediaElement.prototype.play
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
        writable: false,
        configurable: false,
        enumerable: true,
        value: function() {
            var self = this;
            if (m_undelegated_elements.has(self)) {
                m_undelegated_elements.set(self, m_undelegated_elements.get(self) + 1);
                if (m_undelegated_elements.get(self) > 10) {
                    return;
                };
            } else {
                m_undelegated_elements.set(self, 1);
            };
            // TODO: Move event firing into delegate initialization. Some media players work better if no events are fired (espeically the pause event)
            if (self.hasOwnProperty("pseudo_events")) {
                if ((self.pseudo_events.play.eventPhase + self.pseudo_events.playing.eventPhase + self.pseudo_events.pause.eventPhase) > Event.NONE) {
                    return;
                };
            } else {
                self.pseudo_events = {
                    play: new Event("play"),
                    playing: new Event("playing"),
                    pause: new Event("pause")
                };
            };
            self.dispatchEvent(self.pseudo_events.play);
            self.dispatchEvent(self.pseudo_events.playing);
            setTimeout(function() { self.dispatchEvent(self.pseudo_events.pause); }, 100);
        }
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
};

function initialize_content_script() {
    if (!(window.location.dh5a_is_initialized === true)) {
        window.location.dh5a_is_initialized = true;

        function forward_message(customEventInit) {
            customEventInit.detail.sender = "frame";
            customEventInit.detail.destination = "background";
            chrome.runtime.sendMessage(customEventInit.detail);
        };

        var frame_event_name = "DH5A" + Math.random().toString(36).slice(2);

        window.addEventListener(frame_event_name, forward_message);

        document_observer = new MutationObserver(function(mutation_records) {
            window.addEventListener(frame_event_name, forward_message);
        });

        document_observer.observe(document, { childList: true });

        var frame_script_element = document.createElement("script");
        frame_script_element.textContent = "(" + frame_script_code.toString() + ")('" + frame_event_name + "');";
        if (document.documentElement === null) {
            document.appendChild(frame_script_element);
            document.removeChild(frame_script_element);
        } else {
            document.documentElement.insertBefore(frame_script_element, document.documentElement.firstChild);
            document.documentElement.removeChild(frame_script_element);
        };
    };
};

function handle_message(event) {
    if (event.data == "DisableHTML5Autoplay_Initialize") {
        initialize_content_script();
        window.removeEventListener("message", handle_message, false);
    };
};

window.addEventListener("message", handle_message, false);
window.postMessage("DisableHTML5Autoplay_Initialize", "*");
