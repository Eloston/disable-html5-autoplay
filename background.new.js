"use strict";

function g_error_handler(value) {
    console.error(value);
}

class PopupsManager {
    constructor() {
        this._MESSAGING = {
            PORT_NAME: "popup",
            SEND: {
                MODES_UPDATED: "modes_updated",
                STATISTICS_UPDATED: "statistics_updated"
            },
            RECEIVE: {
                INITIALIZE: "initialize",
                RELOAD_TAB: "reload_tab",
                CONFIGURE_PENDING_MODE: "configure_pending_mode"
            }
        }

        this._ports_tabid_mapping = new Map();
    }

    _get_port_by_tabid(tabid) {
        for (let map_entry of this._ports_tabid_mapping) {
            if (map_entry[1] === tabid) {
                return map_entry[0];
            }
        }
    }

    _get_tabid_by_port(port) {
        return this._ports_tabid_mapping.get(port);
    }

    _set_port_for_tabid(tabid, port) {
        this._ports_tabid_mapping.set(port, tabid);
    }

    _runtime_onconnect_handler(port) {
        if (port.name == this._MESSAGING.PORT_NAME && !("tab" in port.sender)) {
            port.onMessage.addListener(this._port_onmessage_handler.bind(this, port));
            port.onDisconnect.addListener(this._port_ondisconnect_handler.bind(this, port));
        }
    }

    _port_onmessage_handler(port, message) {
        switch (message.action) {
            case this._MESSAGING.RECEIVE.INITIALIZE:
                if (message.tabid.constructor === Number) {
                    // Get tab object information and send modes updated and statistics updated
                } else {
                    g_error_handler("message.tabid is not a number. Message: " + JSON.stringify(message));
                }
                break;
            case this._MESSAGING.RECEIVE.RELOAD_TAB:
                let tab_id = this._get_tabid_by_port(port);
                // Check if tab_id is in tab states
                break;
            case this._MESSAGING.RECEIVE.CONFIGURE_PENDING_MODE:
                this.send_new_pending_modes();
                break;
            default:
                g_error_handler("Unknown message.action. Message: " + JSON.stringify(message));
        }
    }

    _port_ondisconnect_handler(port) {
        this._ports_tabid_mapping.delete(port);
    }

    send_modes_updated(tabid, current_mode, pending_mode) {
        this._get_port_by_tabid(tabid).postMessage({
            action: this._MESSAGING.SEND.MODES_UPDATED,
            current_mode: current_mode,
            pending_mode: pending_mode
        });
    }

    send_statistics_updated(tabid, statistics) {
        this._get_port_by_tabid(tabid).postMessage({
            action: this._MESSAGING.SEND.STATISTICS_UPDATED,
            statistics: statistics
        });
    }

    send_new_pending_modes() {
    }

    initialize() {
        chrome.runtime.onConnect.addListener(this._runtime_onconnect_handler.bind(this));
    }
}

class PageFramesManager {
    constructor() {
        this._MESSAGING = {
            PORT_NAME: "frame"
        }

        this._ports_tabid_mapping = new Map();
    }

    _get_port_by_tabid(tabid) {
        for (let map_entry of this._ports_tabid_mapping) {
            if (map_entry[1] === tabid) {
                return map_entry[0];
            }
        }
    }

    _get_tabid_by_port(port) {
        return this._ports_tabid_mapping.get(port);
    }

    _set_port_for_tabid(tabid, port) {
        this._ports_tabid_mapping.set(port, tabid);
    }

    _runtime_onconnect_handler(port) {
        if (port.name == this._MESSAGING.PORT_NAME && ("tab" in port.sender)) {
            port.onMessage.addListener(this._port_onmessage_handler.bind(this, port));
            port.onDisconnect.addListener(this._port_ondisconnect_handler.bind(this, port));
            // Add to this._ports_tabid_mapping
        }
    }

    _port_onmessage_handler(port, message) {
    }

    _port_ondisconnect_handler(port) {
        this._ports_tabid_mapping.delete(port);
    }

    initialize() {
        chrome.runtime.onConnect.addListener(this._runtime_onconnect_handler.bind(this));
    }
}

class TabManager {
    constructor() {
        this._tab_metadata = new Map();
    }

    _api_error_logging_callback() {
        if (chrome.runtime.lastError) {
            g_error_handler(chrome.runtime.lastError);
        }
    }

    _set_browser_action_icon(tabid, active) {
        if (active) {
            var icon_set = {
                "19": "images/active_19.png",
                "38": "images/active_38.png"
            };
        } else {
            var icon_set = {
                "19": "images/dormant_19.png",
                "38": "images/dormant_38.png"
            };
        }
        chrome.browserAction.setIcon({
            tabId: tabid,
            path: icon_set
        }, this._api_error_logging_callback);
    }

    _set_browser_action_badge(tabid, value) {
    }

    get_tab_metadata(tabid) {
    }

    reload_tab(tabid) {
    }

    initialize() {
        chrome.browserAction.setBadgeBackgroundColor({
            color: [32, 32, 32, 200]
        });
    }
}

class StorageManager {
}

class OptionsManager {
}

g_popups_manager = new PopupsManager();
g_page_frames_manager = new PageFramesManager();
g_tab_manager = new TabManager();
g_storage_manager = new StorageManager();
g_options_manager = new OptionsManager();
