"use strict";

/*********************************************************************************

    Disable HTML5 Autoplay: A webbrowser extension to disable HTML5 autoplaying
    Copyright (C) 2016  Eloston

    This file is part of Disable HTML5 Autoplay.

    Disable HTML5 Autoplay is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Disable HTML5 Autoplay is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Disable HTML5 Autoplay.  If not, see <http://www.gnu.org/licenses/>.

********************************************************************************/

window.onerror = function(error_message, script_url, line_number, column_number, error_object) {
    document.getElementById("error-popup").hidden = false;
}

document.getElementById("error-popup").hidden = true;

function g_error_handler(value) {
    console.error(value);
    document.getElementById("error-popup").hidden = false;
}



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
    UNDEFINED: -1
}
const MODE_NAMES = {
    [MODES.AUTOBUFFER_AUTOPLAY]: "Autobuffer and Autoplay",
    //[MODES.AUTOPLAY]: "Autoplay only",
    [MODES.AUTOPLAY]: "Autoplay",
    [MODES.NOTHING]: "Nothing",
    [MODES.UNDEFINED]: "(Loading...)"
}
const ELEMENTS = {
    CLICK_RELOAD: "click-reload",
    MAIN_HEADING: "main-heading",
    EXTENSION_NAME: "extension-name",
    EXTENSION_VERSION: "extension-version",
    MODE_SETTINGS: "mode-settings",
    MODE_SETTING_ALL: "mode-setting-all",
    MODE_SETTING_AUTOPLAY_ONLY: "mode-setting-autoplay-only",
    MODE_SETTING_NONE: "mode-setting-none",
    CURRENT_MODE: "current-mode",
    MEDIA_ELEMENT_COUNT: "media-element-count",
    AUTOPLAY_ATTEMPTS: "autoplay-attempts",
    STATISTICS: "statistics"
}
const MESSAGING = {
    PORT_NAME: "popup",
    SEND: {
        INITIALIZE: "initialize",
        RELOAD_TAB: "reload_tab",
        CONFIGURE_PENDING_MODE: "configure_pending_mode"
    },
    RECEIVE: {
        MODES_UPDATED: "modes_updated",
        STATISTICS_UPDATED: "statistics_updated"
    }
}



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
            case MESSAGING.RECEIVE.MODES_UPDATED:
            case MESSAGING.RECEIVE.STATISTICS_UPDATED:
                this._fire_event_listeners(message);
                break;
            default:
                g_error_handler("popup.js: Unknown message.action received: " + JSON.stringify(message.action));
        };
    }

    initialize() {
        this.port = chrome.runtime.connect({name: MESSAGING.PORT_NAME});

        this.port.onMessage.addListener(this._port_onmessage_callback.bind(this));

        chrome.tabs.query({active: true, currentWindow: true}, (function(tabs) {
            if (chrome.runtime.lastError) {
                g_error_handler(chrome.runtime.lastError);
            }
            this.send_message({action: MESSAGING.SEND.INITIALIZE, tabid: tabs[0].id});
        }).bind(this));
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

class InterfaceManager {
    _send_new_pending_mode(new_mode) {
        g_messaging_manager.send_message({
            action: MESSAGING.SEND.CONFIGURE_PENDING_MODE,
            pending_mode: new_mode
        });
    }

    _reload_tab() {
        g_messaging_manager.send_message({action: MESSAGING.SEND.RELOAD_TAB});
    }

    _modes_updated_message_callback(message) {
        this._set_modes(message.current_mode, message.pending_mode);
    }

    _statistics_updated_message_callback(message) {
        this._update_statistics(message.statistics);
    }

    _set_modes(current_mode, pending_mode) {
        var mode_switch_setting = MODES.UNDEFINED;

        switch (pending_mode) {
            case MODES.UNDEFINED:
                switch (current_mode) {
                    case MODES.UNDEFINED:
                        break;
                    case MODES.AUTOPLAY:
                    case MODES.NOTHING:
                        mode_switch_setting = current_mode;
                        break;
                    default:
                        g_error_handler("Unknown mode for current mode: " + JSON.stringify(current_mode));
                        return;
                }
                break;
            case MODES.AUTOPLAY:
            case MODES.NOTHING:
                mode_switch_setting = pending_mode;
                break;
            default:
                g_error_handler("Unknown mode for pending mode: " + JSON.stringify(pending_mode));
                return;
        }

        document.getElementsByClassName("slide-button")[0].hidden = false;

        switch (mode_switch_setting) {
            case MODES.UNDEFINED:
                document.getElementsByClassName("slide-button")[0].hidden = true;
                break;
            case MODES.AUTOPLAY:
                document.getElementById(ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY).checked = true;
                break;
            case MODES.NOTHING:
                document.getElementById(ELEMENTS.MODE_SETTING_NONE).checked = true;
                break;
            default:
                g_error_handler("Unknown mode for mode_switch_setting: " + JSON.stringify(mode_switch_setting));
                return;
        }

        document.getElementById(ELEMENTS.CURRENT_MODE).textContent = MODE_NAMES[current_mode];

        this._update_reload_dialog_visibility(pending_mode != MODES.UNDEFINED && current_mode != pending_mode);
    }

    _update_statistics(statistics) {
        var total_count = 0;
        var total_attempts = 0;

        var div_statistics_container = document.getElementById(ELEMENTS.STATISTICS);

        if (Object.keys(statistics).length === 0) {
            while (div_statistics_container.firstChild) {
                div_statistics_container.removeChild(div_statistics_container.firstChild);
            }
            div_statistics_container.appendChild(document.createTextNode("(None detected)"));
        } else if (div_statistics_container.firstChild instanceof Text) {
            div_statistics_container.removeChild(div_statistics_container.firstChild);
        }

        for (let media_type in statistics) {
            var container_id = "statistics-" + media_type + "-container";
            var count_id = "statistics-" + media_type + "-count";
            var attempts_id = "statistics-" + media_type + "-attempts";

            var span_count;
            var span_attempts;

            if (document.getElementById(container_id) == null) {
                let div_container = document.createElement("div");
                div_container.id = container_id;

                let p_title = document.createElement("p");
                let b_title = document.createElement("b");
                b_title.classList.add("darker-text");
                b_title.appendChild(document.createTextNode(DELEGATE_NAMES[media_type]));
                p_title.appendChild(b_title);
                div_container.appendChild(p_title);

                let p_count = document.createElement("p");
                p_count.appendChild(document.createTextNode("Count: "));
                span_count = document.createElement("span");
                span_count.id = count_id;
                span_count.classList.add("darker-text");
                p_count.appendChild(span_count);
                div_container.appendChild(p_count);

                let p_attempts = document.createElement("p");
                p_attempts.appendChild(document.createTextNode("Attempts: "));
                span_attempts = document.createElement("span");
                span_attempts.id = attempts_id;
                span_attempts.classList.add("darker-text");
                p_attempts.appendChild(span_attempts);
                div_container.appendChild(p_attempts);

                div_statistics_container.appendChild(div_container);
            }

            span_count = span_count || document.getElementById(count_id);
            while (span_count.firstChild) {
                span_count.removeChild(span_count.firstChild);
            }
            span_count.appendChild(document.createTextNode(statistics[media_type].count.toString()));
            total_count += statistics[media_type].count;

            span_attempts = span_attempts || document.getElementById(attempts_id);
            while (span_attempts.firstChild) {
                span_attempts.removeChild(span_attempts.firstChild);
            }
            span_attempts.appendChild(document.createTextNode(statistics[media_type].attempts.toString()));
            total_attempts += statistics[media_type].attempts;
        }

        var span_media_element_count = document.getElementById(ELEMENTS.MEDIA_ELEMENT_COUNT);
        while (span_media_element_count.firstChild) {
            span_media_element_count.removeChild(span_media_element_count.firstChild);
        }
        span_media_element_count.appendChild(document.createTextNode(total_count.toString()));

        var span_autoplay_attempts = document.getElementById(ELEMENTS.AUTOPLAY_ATTEMPTS);
        while (span_autoplay_attempts.firstChild) {
            span_autoplay_attempts.removeChild(span_autoplay_attempts.firstChild);
        }
        span_autoplay_attempts.appendChild(document.createTextNode(total_attempts.toString()));
    }

    _title_bar_interact_callback(event) {
        event.preventDefault();
        chrome.runtime.openOptionsPage(function() {
            if (chrome.runtime.lastError) {
                g_error_handler(chrome.runtime.lastError);
            }
        });
    }

    _mode_switch_interact_callback(event) {
        var new_mode;
        switch (event.target.id) {
            case ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY:
                new_mode = MODES.AUTOPLAY;
                break;
            case ELEMENTS.MODE_SETTING_NONE:
                new_mode = MODES.NOTHING;
                break;
            default:
                g_error_handler("Unknown element id in _mode_switch_interact_callback(): " + event.target.id);
                return;
        }
        this._send_new_pending_mode(new_mode);
    }

    _reload_dialog_interact_callback(event) {
        event.preventDefault();
        document.getElementById(ELEMENTS.CLICK_RELOAD).hidden = true;
        this._reload_tab();
    }

    _update_reload_dialog_visibility(is_visible) {
        document.getElementById(ELEMENTS.CLICK_RELOAD).hidden = !is_visible;
    }

    initialize() {
        var manifest_details = chrome.runtime.getManifest();
        document.getElementById(ELEMENTS.EXTENSION_NAME).appendChild(document.createTextNode(manifest_details.name));
        document.getElementById(ELEMENTS.EXTENSION_VERSION).appendChild(document.createTextNode(manifest_details.version));

        g_messaging_manager.add_event_listener(MESSAGING.RECEIVE.MODES_UPDATED, this._modes_updated_message_callback.bind(this));
        g_messaging_manager.add_event_listener(MESSAGING.RECEIVE.STATISTICS_UPDATED, this._statistics_updated_message_callback.bind(this));

        this._set_modes(MODES.UNDEFINED, MODES.UNDEFINED);
        this._update_statistics(new Object());

        for (let event_name of ["mouseup", "touchend"]) {
            document.getElementById(ELEMENTS.CLICK_RELOAD).addEventListener(event_name, this._reload_dialog_interact_callback.bind(this));
            document.getElementById(ELEMENTS.MAIN_HEADING).addEventListener(event_name, this._title_bar_interact_callback.bind(this));
        };

        for (let element_id of [ELEMENTS.MODE_SETTING_AUTOPLAY_ONLY, ELEMENTS.MODE_SETTING_NONE]) {
            document.getElementById(element_id).addEventListener("change", this._mode_switch_interact_callback.bind(this));
        }
    }
}



var g_messaging_manager = new MessagingManager();
var g_interface_manager = new InterfaceManager();

g_interface_manager.initialize();
g_messaging_manager.initialize();
