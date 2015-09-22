DELEGATE_NAMES = {
    "browser_controls": "(Browser Controls)",
    "youtube": "YouTube",
    "video.js": "Video.js",
    "jwplayer": "JWPlayer",
    "unknown": "(Unknown Type)"
};

function send_message(message, responseCallback) {
    message.sender = "popup";
    message.destination = "background";
    if (responseCallback instanceof Function) {
        chrome.runtime.sendMessage(message, new Object(), responseCallback);
    } else {
        chrome.runtime.sendMessage(message);
    };
};

function clear_data() {
    for (element_id of ["media-element-count", "autoplay-attempts", "statistics"]) {
        var current_element = document.getElementById(element_id);
        while (current_element.firstChild) {
            current_element.removeChild(current_element.firstChild);
        };
    };
};

var mode_settings = {
    get mode() {
        //opt_all = document.getElementById("mode-setting-all");
        opt_autoplay = document.getElementById("mode-setting-autoplay-only");
        opt_none = document.getElementById("mode-setting-none");
        if (opt_none.checked) {
            return 0;
        } else if (opt_autoplay.checked) {
            return 1;
        //} else if (opt_all.checked) {
        //    return 2;
        } else {
            console.error("popup.js: mode_settings get mode: No mode is selected");
        };
    },
    set mode(new_mode) {
        //opt_all = document.getElementById("mode-setting-all");
        opt_autoplay = document.getElementById("mode-setting-autoplay-only");
        opt_none = document.getElementById("mode-setting-none");
        //opt_all.checked = false;
        opt_autoplay.checked = false;
        opt_none.checked = false;
        if (new_mode == 2) {
            //opt_all.checked = true;
        } else if (new_mode == 1) {
            opt_autoplay.checked = true;
        } else if (new_mode == 0) {
            opt_none.checked = true;
        } else {
            console.error("popup.js: mode_settings set mode: Invalid mode setting: " + JSON.stringify(new_mode));
        };
        this.current_mode = new_mode;
    },
    current_mode: -1,
    get disabled() {
        return document.getElementById("mode-settings").disabled;
    },
    set disabled(new_state) {
        var div_elem = document.getElementById("mode-settings");
        div_elem.disabled = new_state;
        for (element of Array.prototype.slice.call(div_elem.children)) {
            element.disabled = new_state;
        };
    },
    fire_event: function(new_mode) {
        var click_reload_element = document.getElementById("click-reload");
        if (new_mode === mode_settings.current_mode) {
            click_reload_element.setAttribute("hidden", "hidden");
        } else {
            click_reload_element.removeAttribute("hidden");
        };
    },
    initialize: function() {
        document.getElementById("mode-setting-all").addEventListener("change", (function() { this.fire_event(2); }).bind(this));
        document.getElementById("mode-setting-autoplay-only").addEventListener("change", (function() { this.fire_event(1); }).bind(this));
        document.getElementById("mode-setting-none").addEventListener("change", (function() { this.fire_event(0); }).bind(this));
    }
};
mode_settings.initialize();

function set_data(reset, can_run, autoplay_enabled, statistics) {
    var media_element_count_element = document.getElementById("media-element-count");
    var autoplay_attempts_element = document.getElementById("autoplay-attempts");
    var statistics_element = document.getElementById("statistics");
    mode_settings.disabled = !can_run;
    if (reset) {
        if (autoplay_enabled) {
            mode_settings.mode = 0;
        } else {
            mode_settings.mode = 1;
        };
    } else {
        if (autoplay_enabled) {
            mode_settings.current_mode = 0;
        } else {
            mode_settings.current_mode = 1;
        };
    };
    mode_settings.fire_event(mode_settings.mode);
    if (can_run) {
        document.getElementById("can-run-is-false").hidden = "hidden";
    } else {
        document.getElementById("can-run-is-false").removeAttribute("hidden");
    };
    if (Object.keys(statistics).length > 0) {
        var total_count = 0;
        var total_attempts = 0;
        for (delegate_name in statistics) {
            total_count += statistics[delegate_name].count;
            total_attempts += statistics[delegate_name].attempts;
            var p_element = document.createElement("p");
            var bold_element = document.createElement("b");
            bold_element.classList.add("darker-text");
            bold_element.appendChild(document.createTextNode(DELEGATE_NAMES[delegate_name]));
            p_element.appendChild(bold_element);
            p_element.appendChild(document.createElement("br"));
            p_element.appendChild(document.createTextNode("Count: "));
            var count_span = document.createElement("span");
            count_span.classList.add("darker-text");
            count_span.appendChild(document.createTextNode(statistics[delegate_name].count.toString()));
            p_element.appendChild(count_span);
            p_element.appendChild(document.createElement("br"));
            p_element.appendChild(document.createTextNode("Attempts: "));
            var attempt_span = document.createElement("span");
            attempt_span.classList.add("darker-text");
            attempt_span.appendChild(document.createTextNode(statistics[delegate_name].attempts.toString()));
            p_element.appendChild(attempt_span);
            statistics_element.appendChild(p_element);
        };
        media_element_count_element.appendChild(document.createTextNode(total_count.toString()));
        autoplay_attempts_element.appendChild(document.createTextNode(total_attempts.toString()));
    } else {
        media_element_count_element.appendChild(document.createTextNode("0"));
        autoplay_attempts_element.appendChild(document.createTextNode("0"));
        statistics_element.appendChild(document.createTextNode("(None recorded)"));
    };
};

function initialize_data(response_array) {
    set_data(true, response_array[0], response_array[1], response_array[2]);
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.sender == "background" && message.destination == "popup" && message.action == "update_popup") {
        if (message.tabid == g_tab_id) {
            clear_data();
            set_data(message.reset, message.can_run, message.autoplay_enabled, message.statistics);
        };
    };
});

document.getElementById("click-reload").addEventListener("mouseup", function(event) {
    document.getElementById("click-reload").setAttribute("hidden", "hidden");
    send_message({action: "update_whitelist", autoplay_enabled: mode_settings.mode == 0, tabid: g_tab_id});
});

var manifest_details = chrome.runtime.getManifest();
document.getElementById("extension-name").appendChild(document.createTextNode(manifest_details.name));
document.getElementById("extension-version").appendChild(document.createTextNode(manifest_details.version));

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    g_tab_id = tabs[0].id;
    send_message({action: "initialize_popup", tabid: g_tab_id}, initialize_data);
});
