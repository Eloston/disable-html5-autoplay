DELEGATE_NAMES = {
    "browser_controls": "(Browser Controls)",
    "youtube": "YouTube",
    "video.js": "Video.js",
    "jwplayer": "JWPlayer",
    "unknown": "(Unknown Type)"
};
DISABLING_MODE = {
    AUTOBUFFER_AUTOPLAY: 2,
    AUTOPLAY: 1,
    NOTHING: 0
};
ELEMENTS = {
    CLICK_RELOAD: "click-reload",
    MAIN_HEADING: "main-heading",
    EXTENSION_NAME: "extension-name",
    EXTENSION_VERSION: "extension-version",
    MODE_SETTINGS: "mode-settings",
    MODE_SETTING_ALL: "mode-setting-all",
    MODE_SETTING_AUTOPLAY_ONLY: "mode-setting-autoplay-only",
    MODE_SETTING_NONE: "mode-setting-none",
    CAN_RUN_IS_FALSE: "can-run-is-false",
    MEDIA_ELEMENT_COUNT: "media-element-count",
    AUTOPLAY_ATTEMPTS: "autoplay-attempts",
    STATISTICS: "statistics"
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
    for (element_id of [ELEMENTS.MEDIA_ELEMENT_COUNT, ELEMENTS.AUTOPLAY_ATTEMPTS, ELEMENTS.STATISTICS]) {
        var current_element = document.getElementById(element_id);
        while (current_element.firstChild) {
            current_element.removeChild(current_element.firstChild);
        };
    };
};

function update_click_reload_position(click_reload_element) {
    // TODO: There has to be a better way to make elements stick to the bottom of pages than using JavaScript hacks when the whole popup isn't rendered all at once
    var click_reload_element = click_reload_element || document.getElementById(ELEMENTS.CLICK_RELOAD);
    if (click_reload_element.hasAttribute("hidden")) {
        return;
    };
    click_reload_element.style.top = 0;
    var content_height = Math.max(document.documentElement.scrollHeight, document.documentElement.offsetHeight, document.documentElement.clientHeight, document.body.scrollHeight, document.body.offsetHeight, document.body.clientHeight);
    var click_reload_element_current_style = getComputedStyle(click_reload_element);
    var full_element_height = click_reload_element.getBoundingClientRect().height + parseInt(click_reload_element_current_style.marginTop, 10) + parseInt(click_reload_element_current_style.marginBottom, 10);
    click_reload_element.style.top = (content_height - full_element_height).toString() + "px";
};

var mode_settings = {
    get mode() {
        //opt_all = document.getElementById(ELEMENTS.MODE_SETTING_ALL);
        opt_autoplay = document.getElementById(ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY);
        opt_none = document.getElementById(ELEMENTS.MODE_SETTING_NONE);
        if (opt_none.checked) {
            return DISABLING_MODE.NOTHING;
        } else if (opt_autoplay.checked) {
            return DISABLING_MODE.AUTOPLAY;
        //} else if (opt_all.checked) {
        //    return DISABLING_MODE.AUTOBUFFER_AUTOPLAY;
        } else {
            console.error("popup.js: mode_settings get mode: No mode is selected");
        };
    },
    set mode(new_mode) {
        //opt_all = document.getElementById(ELEMENTS.MODE_SETTING_ALL);
        opt_autoplay = document.getElementById(ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY);
        opt_none = document.getElementById(ELEMENTS.MODE_SETTING_NONE);
        //opt_all.checked = false;
        opt_autoplay.checked = false;
        opt_none.checked = false;
        if (new_mode == DISABLING_MODE.AUTOBUFFER_AUTOPLAY) {
            //opt_all.checked = true;
        } else if (new_mode == DISABLING_MODE.AUTOPLAY) {
            opt_autoplay.checked = true;
        } else if (new_mode == DISABLING_MODE.NOTHING) {
            opt_none.checked = true;
        } else {
            console.error("popup.js: mode_settings set mode: Invalid mode setting: " + JSON.stringify(new_mode));
        };
        this.current_mode = new_mode;
    },
    current_mode: -1,
    get disabled() {
        return document.getElementById(ELEMENTS.MODE_SETTINGS).disabled;
    },
    set disabled(new_state) {
        var div_elem = document.getElementById(ELEMENTS.MODE_SETTINGS);
        if (new_state) {
            div_elem.setAttribute("disabled", "disabled");
        } else {
            div_elem.removeAttribute("disabled");
        };
        div_elem.disabled = new_state;
        for (element of Array.prototype.slice.call(div_elem.children)) {
            element.disabled = new_state
            if (new_state) {
                element.setAttribute("disabled", "disabled");
            } else {
                element.removeAttribute("disabled");
            };
        };
    },
    update_click_reload_visibility: function(new_mode) {
        var click_reload_element = document.getElementById(ELEMENTS.CLICK_RELOAD);
        if (new_mode === mode_settings.current_mode) {
            click_reload_element.setAttribute("hidden", "hidden");
        } else {
            click_reload_element.removeAttribute("hidden");
            update_click_reload_position(click_reload_element);
        };
    },
    fire_event: function(new_mode) {
        this.update_click_reload_visibility(new_mode);
        if (!this.disabled) {
            send_message({action: "update_whitelist", mode: mode_settings.mode, tabid: g_tab_id});
        };
    },
    initialize: function() {
        //document.getElementById(ELEMENTS.MODE_SETTING_ALL).addEventListener("change", (function() { this.fire_event(DISABLING_MODE.AUTOBUFFER_AUTOPLAY); }).bind(this));
        document.getElementById(ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY).addEventListener("change", (function() { this.fire_event(DISABLING_MODE.AUTOPLAY); }).bind(this));
        document.getElementById(ELEMENTS.MODE_SETTING_NONE).addEventListener("change", (function() { this.fire_event(DISABLING_MODE.NOTHING); }).bind(this));
    }
};
mode_settings.initialize();

function set_data(reset, can_run, mode, pending_mode, statistics) {
    var media_element_count_element = document.getElementById(ELEMENTS.MEDIA_ELEMENT_COUNT);
    var autoplay_attempts_element = document.getElementById(ELEMENTS.AUTOPLAY_ATTEMPTS);
    var statistics_element = document.getElementById(ELEMENTS.STATISTICS);
    mode_settings.disabled = !can_run;
    if (pending_mode != -1) {
        mode_settings.mode = pending_mode;
        mode_settings.current_mode = mode;
    } else if (reset) {
        mode_settings.mode = mode;
    } else {
        mode_settings.current_mode = mode;
    };
    if (can_run) {
        document.getElementById(ELEMENTS.CAN_RUN_IS_FALSE).hidden = "hidden";
    } else {
        document.getElementById(ELEMENTS.CAN_RUN_IS_FALSE).removeAttribute("hidden");
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
    mode_settings.update_click_reload_visibility(mode_settings.mode);
};

function initialize_data(response_array) {
    set_data(true, response_array[0], response_array[1], response_array[2], response_array[3]);
};

function reload_page_callback(event) {
    event.preventDefault();
    document.getElementById(ELEMENTS.CLICK_RELOAD).setAttribute("hidden", "hidden");
    send_message({action: "reload_page", tabid: g_tab_id});
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.sender == "background" && message.destination == "popup" && message.action == "update_popup") {
        if (message.tabid == g_tab_id) {
            clear_data();
            set_data(message.reset, message.can_run, message.mode, message.pending_mode, message.statistics);
            update_click_reload_position();
        };
    };
});

for (event_name of ["mouseup", "touchend"]) {
    document.getElementById(ELEMENTS.CLICK_RELOAD).addEventListener(event_name, reload_page_callback);
    document.getElementById(ELEMENTS.MAIN_HEADING).addEventListener(event_name, function(event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage(function() {
            chrome.runtime.lastError; // TODO: Log this in the debug log
        });
    });
};

var manifest_details = chrome.runtime.getManifest();
document.getElementById(ELEMENTS.EXTENSION_NAME).appendChild(document.createTextNode(manifest_details.name));
document.getElementById(ELEMENTS.EXTENSION_VERSION).appendChild(document.createTextNode(manifest_details.version));

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    g_tab_id = tabs[0].id;
    send_message({action: "initialize_popup", tabid: g_tab_id}, initialize_data);
});
