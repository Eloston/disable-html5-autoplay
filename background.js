BROWSER_ACTION_ICON_STATES = {
    DORMANT: 0,
    ACTIVE: 1,
    DORMANT_WHITELISTED: 2,
    ACTIVE_WHITELISTED: 3
};
PERMANENT_WHITELIST = [
    "https://chrome.google.com/webstore"
];
g_whitelist = new Set();
g_tab_states = new Map();
g_browser_action_icon_updater = new function() {
    var self = this;

    self.m_pending = new Map();

    function update_tab_icon(tabId) {
        if (!g_tab_states.has(tabId)) {
            return;
        };
        if (self.m_pending.get(tabId).pending == BROWSER_ACTION_ICON_STATES.DORMANT) {
            chrome.browserAction.setIcon({ tabId: tabId, path: { "19": "images/dormant_19.png", "38": "images/dormant_38.png" } });
        } else if (self.m_pending.get(tabId).pending == BROWSER_ACTION_ICON_STATES.ACTIVE) {
            chrome.browserAction.setIcon({ tabId: tabId, path: { "19": "images/active_19.png", "38": "images/active_38.png" } });
        } else {
            console.error("background.js: Invalid Browser Action icon state: " + self.m_pending.get(tabId).toString());
            return;
        };
        self.m_pending.get(tabId).last_update = performance.now();
    };

    function run_update_when_ready(tabId) {
        if (performance.now() - self.m_pending.get(tabId).last_update > 500) {
            update_tab_icon(tabId);
        } else {
            setTimeout(function() { update_tab_icon(tabId); }, performance.now() - self.m_pending.get(tabId).last_update);
        };
    };

    self.update_state = function(tabId, state) {
        if (self.m_pending.has(tabId)) {
            self.m_pending.get(tabId).pending = state;
        } else {
            self.m_pending.set(tabId, { pending: state, last_update: -9001 });
        };
        run_update_when_ready(tabId);
    };
};

function get_second_level_domain(url_string) {
    var url_parser = document.createElement("a");
    url_parser.href = url_string;
    var exploded_url = url_parser.hostname.split(".");
    return exploded_url[exploded_url.length - 2] + "." + exploded_url[exploded_url.length - 1];
};

function send_tab_message(tabid, message, options) {
    message.sender = "background";
    message.destination = "frame";
    chrome.tabs.sendMessage(tabid, message, options);
};

function update_popup(tabid) {
    if (g_tab_states.has(tabid)) {
        var tab_state = g_tab_states.get(tabid);
        chrome.runtime.sendMessage({
            sender: "background",
            destination: "popup",
            action: "update_popup",
            can_run: true,
            tabid: tabid,
            autoplay_enabled: tab_state.autoplay_enabled,
            statistics: tab_state.media_statistics
        });
    } else {
        chrome.runtime.sendMessage({
            sender: "background",
            destination: "popup",
            action: "update_popup",
            can_run: false,
            tabid: tabid,
            autoplay_enabled: true,
            statistics: new Object()
        });
    };
};

function set_active_icon(tabId) {
    if (g_tab_states.get(tabId).browser_action_icon_active == false) {
        g_browser_action_icon_updater.update_state(tabId, BROWSER_ACTION_ICON_STATES.ACTIVE);
        g_tab_states.get(tabId).browser_action_icon_active = true;
    };
};

function set_dormant_icon(tabId) {
    if (g_tab_states.get(tabId).browser_action_icon_active == true) {
        g_browser_action_icon_updater.update_state(tabId, BROWSER_ACTION_ICON_STATES.DORMANT);
        g_tab_states.get(tabId).browser_action_icon_active = false;
    };
};

chrome.webNavigation.onCommitted.addListener(function(details) {
    if (details.frameId == 0) {
        if (g_tab_states.has(details.tabId)) {
            g_tab_states.delete(details.tabId);
        };
        var domain_name = get_second_level_domain(details.url);
        var autoplay_enabled = false;
        for (whitelisted_domain of g_whitelist) {
            if (domain_name == whitelisted_domain) {
                autoplay_enabled = true;
                break;
            };
        };
        g_tab_states.set(details.tabId, { autoplay_enabled: autoplay_enabled, browser_action_icon_active: false, domain_name: domain_name, media_statistics: new Object() });
    };
    for (whitelisted_url of PERMANENT_WHITELIST) {
        if (details.url.startsWith(whitelisted_url)) {
            g_tab_states.delete(details.tabId);
            update_popup(details.tabId);
            return;
        };
    };
    update_popup(details.tabId);
    if (g_tab_states.has(details.tabId) && !g_tab_states.get(details.tabId).autoplay_enabled) {
        for (filename of ["frame_script.js", "content_script.js"]) {
            chrome.tabs.executeScript(details.tabId, {file: filename, allFrames: true, matchAboutBlank: true, runAt: "document_start"});
        };
    };
}, { url: [{ schemes: ["http", "https", "file"] }] });

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    if (g_tab_states.has(tabId)) {
        g_tab_states.delete(tabId);
    };
});

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    if (g_tab_states.has(removedTabId) && !g_tab_states.has(addedTabId)) {
        g_tab_states.set(addedTabId, g_tab_states.get(removedTabId));
        g_tab_states.delete(removedTabId);
    };
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!("sender" in message) || !("destination" in message)) {
        return false;
    };
    if (!(message.destination == "background") || (message.sender == "background")) {
        return false;
    };
    if (message.sender == "frame") {
        if (!("tab" in sender)) {
            // Tab is being unloaded
            return false;
        };
        if (!g_tab_states.has(sender.tab.id)) {
            console.error("background.js: Tab is not registered: " + sender.tab.id.toString());
            return false;
        };
        var tab_state = g_tab_states.get(sender.tab.id).media_statistics;
        if (message.action == "add_media_element") {
            if (tab_state.hasOwnProperty(message.element_type)) {
                tab_state[message.element_type].count = tab_state[message.element_type].count + 1;
            } else {
                tab_state[message.element_type] = { count: 1, attempts: 0 };
            };
            set_active_icon(sender.tab.id);
        } else if (message.action == "remove_media_element") {
            if (tab_state.hasOwnProperty(message.element_type)) {
                tab_state[message.element_type].count = tab_state[message.element_type].count - 1;
                if (tab_state[message.element_type].count < 0) {
                    tab_state[message.element_type].count = 0;
                };
            };
            var total_count = 0;
            for (element_type in tab_state) {
                total_count = total_count + tab_state[element_type].count;
            };
            if (total_count == 0) {
                set_dormant_icon(sender.tab.id);
            };
        } else if (message.action == "add_autoplay_attempts") {
            if (!tab_state.hasOwnProperty(message.element_type)) {
                tab_state[message.element_type] = { count: 0, attempts: 0 };
            };
            tab_state[message.element_type].attempts += message.count;
            var total_attempts = 0;
            for (element_type in tab_state) {
                total_attempts = total_attempts + tab_state[element_type].attempts;
            };
            chrome.browserAction.setBadgeText({ tabId: sender.tab.id, text: total_attempts.toString() });
        } else {
            console.error("background.js: Unknown message.action received from frame: " + JSON.stringify(message));
            return false;
        };
        update_popup(sender.tab.id);
    } else if (!("tab" in sender) && (message.sender == "popup")) {
        if (message.action == "initialize_popup") {
            if (g_tab_states.has(message.tabid)) {
                var tab_state = g_tab_states.get(message.tabid);
                sendResponse([true, tab_state.autoplay_enabled, tab_state.media_statistics]);
            } else {
                sendResponse([false, true, new Object()]);
            };
            return false;
        } else if (message.action == "update_whitelist") {
            if (g_tab_states.has(message.tabid)) {
                var tab_state = g_tab_states.get(message.tabid);
                if (message.autoplay_enabled == true) {
                    g_whitelist.add(tab_state.domain_name);
                } else if (message.autoplay_enabled == false) {
                    g_whitelist.delete(tab_state.domain_name);
                } else {
                    console.error("background.js: Invalid value for message.autoplay_enabled: " + JSON.stringify(message.autoplay_enabled));
                    return false;
                };
                chrome.tabs.reload(message.tabid);
            } else {
                console.error("background.js: update_whitelist: Tab state does not exist");
                return false;
            };
        } else {
            console.error("background.js: Unknown message.action received from popup: " + JSON.stringify(message));
            return false;
        };
    } else {
        console.error("background.js: Invalid message received: " + JSON.stringify(message));
    };
    return false;
});

chrome.browserAction.setBadgeBackgroundColor({color: [32, 32, 32, 200]});
