"use strict";

// Exception catcher

window.onerror = function(error_message, script_url, line_number, column_number, error_object) {
    document.getElementById("error-popup").hidden = false;
    document.getElementById("error-message").value = "Line: " + line_number +
        "\nColumn: " + column_number +
        "\nMessage: " + error_message +
        "\nScript URL: " + script_url +
        "\nError object: " + JSON.stringify(error_object);
}

// Constants

const DELEGATE_NAMES = {
    "browser_controls": "(Browser Controls)",
    "youtube": "YouTube",
    "video.js": "Video.js",
    "jwplayer": "JWPlayer",
    "unknown": "(Unknown Type)"
}
const MODES = {
    AUTOBUFFER_AUTOPLAY: 2,
    AUTOPLAY: 1,
    NOTHING: 0,
    INITIALIZING: -1
}
const MODE_NAMES = {
    [MODES.AUTOBUFFER_AUTOPLAY]: "Autobuffer and Autoplay",
    //[MODES.AUTOPLAY]: "Autoplay only",
    [MODES.AUTOPLAY]: "Autoplay",
    [MODES.NOTHING]: "Nothing"
}
const ELEMENTS = {
    ERROR_POPUP: "error-popup",
    CLICK_RELOAD: "click-reload",
    MAIN_HEADING: "main-heading",
    EXTENSION_NAME: "extension-name",
    EXTENSION_VERSION: "extension-version",
    MODE_SETTINGS: "mode-settings",
    MODE_SETTING_ALL: "mode-setting-all",
    MODE_SETTING_AUTOPLAY_ONLY: "mode-setting-autoplay-only",
    MODE_SETTING_NONE: "mode-setting-none",
    CURRENT_MODE: "current-mode",
    CAN_RUN_IS_FALSE: "can-run-is-false",
    MEDIA_ELEMENT_COUNT: "media-element-count",
    AUTOPLAY_ATTEMPTS: "autoplay-attempts",
    STATISTICS: "statistics"
}
const MESSAGING = {
    POPUP: {
        PORT_NAME: "popup",
        INITIALIZE: "initialize",
        MODERULE_SWITCH_CHANGED: "moderule_switch_changed",
        RELOAD_TAB: "reload_tab",
        UPDATE_MODERULE_SETTING: "update_moderule_setting",
        UPDATE_STATISTICS: "update_statistics",
        UPDATE_POPUP: "update_popup"
    }
}
const EVENTS = {
    TABSTATE: {
        CURRENT_MODE_UPDATE: "current_mode_update",
        PENDING_MODE_UPDATE: "pending_mode_update",
        STATISTICS_UPATE: "statistics_update"
    }
}

// Class definitions

class MessagingManager {
    constructor() {
        this._event_handlers = new Map();
    }

    _fire_event_listeners(message) {
        if (!this._event_handlers.has(message.action)) {
            return;
        }
        for (let event_handler of this._event_handlers.get(message.action)) {
            event_handler(message);
        }
    }

    _port_onmessage_callback(message) {
        switch (message.action) {
            //case MESSAGING.POPUP.UPDATE_MODERULE_SETTING:
            //case MESSAGING.POPUP.UPDATE_STATISTICS:
            case MESSAGING.POPUP.UPDATE_POPUP:
                this._fire_event_listeners(message);
                break;
            default:
                console.error("popup.js: Unknown message.action received: " + JSON.stringify(message.action));
        };
    }

    initialize() {
        this.port = chrome.runtime.connect({name: MESSAGING.POPUP.PORT_NAME});

        this.port.onMessage.addListener(this._port_onmessage_callback.bind(this));

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            this.send_message({action: MESSAGING.POPUP.INITIALIZE, tabid: tabs[0].id});
        });
    }

    send_message(message) {
        this.port.postMessage(message);
    }

    add_event_listener(message_action, event_handler) {
        if (!this._event_handlers.has(message_action)) {
            this._event_handlers.set(message_action, new Array());
        }
        this._event_handlers.get(message_action).push(event_handler);
    }
}

class TabStateManager {
    constructor() {
        this.current_mode = MODES.INITIALIZING;
        this.pending_mode = MODES.INITIALIZING;
        this.statistics = new Object();
    }

    _update_moderule_setting_message_callback(message) {
    }

    _update_statistics_message_callback(message) {
    }

    _update_popup_message_callback(message) { // TODO: Remove this callback
    }

    _fire_event_listeners(event_type, event_value) {
    }

    initialize() {
        g_messaging_manager.add_event_listener(MESSAGING.POPUP.UPDATE_POPUP, this._update_popup_message_callback.bind(this));
    }

    send_new_pending_mode(new_mode) {
    }

    add_event_listener(event_type, event_handler) {
    }
}

class InterfaceManager {
    constructor() {
        this._reload_dialog_visible = false;
    }

    _set_current_mode(mode) {
    }

    _set_pending_mode(mode) {
    }

    _set_statistics(statistics) {
    }

    _title_bar_interact_callback(event) {
    }

    _mode_switch_interact_callback(event) {
    }

    _reload_dialog_interact_callback(event) {
    }

    _update_reload_dialog_visibility(is_visible) {
        this._reload_dialog_visible = is_visible;
    }

    initialize() {
    }
}

// Initialization

var g_messaging_manager = new MessagingManager();
var g_tab_state_manager = new TabStateManager();
var g_interface_manager = new InterfaceManager();

g_tab_state_manager.initialize();
g_interface_manager.initialize();
g_messaging_manager.initialize();

// Hide error popup

document.getElementById(ELEMENTS.ERROR_POPUP).hidden = true;
