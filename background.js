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

function g_error_handler(value) {
    console.error(value);
}

const PROTOCOL = {
    PAGE_FRAME: {
        PORT_NAME: "frame"
    },
    POPUP: {
        PORT_NAME: "popup",
        INITIALIZE: "initialize"
    }
};

class TabInstance {
    constructor(tabid) {
        this._tab_id = tabid;
        this._pageframe_port = null;
        this._popup_port = null;
        this._metadata = new Object(); // TODO: Initialize actual tab metadata here
    }

    _api_error_logging_callback() {
        if (chrome.runtime.lastError) {
            g_error_handler(chrome.runtime.lastError);
        }
    }

    _pageframe_port_onmessage(message) {
    }

    _pageframe_port_ondisconnect() {
        this._pageframe_port = null;
        // TODO: Initialize tab metadata here
    }

    _popup_port_onmessage(message) {
    }

    _popup_port_ondisconnect() {
        this._popup_port = null;
    }

    _set_browser_action_icon(active) {
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
            tabId: this._tab_id,
            path: icon_set
        }, this._api_error_logging_callback.bind(this));
    }

    _set_browser_action_badge(value) {
        chrome.browserAction.setBadgeText({
            tabId: this._tab_id,
            text: value
        });
    }

    reload_tab() {
        chrome.tabs.reload(this._tab_id, new Object(), this._api_error_logging_callback.bind(this));
    }

    get_current_mode() {
    }

    get_pending_mode() {
    }

    get_statistics() {
    }

    deconstruct() {
        // TODO: Unregister event handlers and delete all links to this object (excluding TabManager)
        // Also reset browser action back to original state?
    }

    // Move stuff using tabid from TabManager to this class
    // Add callbacks here to listen to tabid changes
}

class TabManager {
    constructor() {
        // TODO: Should this change to WeakMap?
        this._instances = new Map(); // mapping: tab id -> TabInstance

        this._port_bootstrap_functions = new WeakMap();
    }

    _api_error_logging_callback() {
        if (chrome.runtime.lastError) {
            g_error_handler(chrome.runtime.lastError);
        }
    }

    _popup_port_onmessage_boostrap(port, message) {
        if (message.action = PROTOCOL.POPUP.INITIALIZE) {
            if (message.tabid.constructor == Number) {
                port.onMessage.removeListener(this._port_bootstrap_functions.get(port));
                this._port_bootstrap_functions.delete(port);
                let tab_instance = this._get_tab_instance(message.tabid);
                port.onMessage.addListener(tab_instance._popup_port_onmessage.bind(tab_instance));
                port.onDisconnect.addListener(tab_instance._popup_port_ondisconnect.bind(tab_instance));
            } else {
                // Throw error
            }
        } else {
            // Throw error
        }
    }

    _on_port_connect(port) {
        if (port.name == PROTOCOL.PAGE_FRAME.PORT_NAME && ("tab" in port.sender)) {
            if (port.sender.tab.id.constructor === Number) {
                let tab_instance = this._get_tab_instance(message.tabid);
                port.onMessage.addListener(tab_instance._pageframe_port_onmessage.bind(tab_instance));
                port.onDisconnect.addListener(tab_instance._pageframe_port_ondisconnect.bind(tab_instance));
            } else {
                // Throw error
            }
        } else if (port.name == PROTOCOL.POPUP.PORT_NAME && !("tab" in port.sender)) {
            let bootstrap_function = this._popup_port_onmessage_bootstrap.bind(this, port);
            port.onMessage.addListener(bootstrap_function);
            this._port_bootstrap_functions.set(port, bootstrap_function);
        }
    }

    _add_tab_instance(tabid) {
        if (this._instances.has(tabid)) {
            // Throw error
        } else {
            this._instances.set(tabid, new TabInstance(tabid));
        }
    }

    _get_tab_instance(tabid) {
        if (!this.has_tab_instance(tabid)) {
            // Throw error
        }
        return this._instances.get(tabid);

    has_tab_instance(tabid) {
        return this._instances.has(tabid);
    }

    remove_tab_instance(tabid) {
        if (this._instances.has(tabid)) {
            tab_instance = this._instances.get(tabid)
            tab_instance.deconstruct();
            this._instances.remove(tabid);
        } else {
            // Throw error
        }
    }

    initialize() {
        chrome.browserAction.setBadgeBackgroundColor({
            color: [32, 32, 32, 200]
        });

        chrome.runtime.onConnect.addListener(this._on_port_connect.bind(this));
        // Put chrome.tabs and other event handlers here
    }
}

class StorageManager {
}

class OptionsManager {
}

g_tab_manager = new TabManager();
g_storage_manager = new StorageManager();
g_options_manager = new OptionsManager();
