PERMANENT_WHITELIST = [
    "https://chrome.google.com/webstore" // Chrome won't allow content scripts here
];
g_whitelist = new Set();
g_tab_states = new Map();

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

function update_popup(tabid, reset) {
    if (g_tab_states.has(tabid)) {
        var tab_state = g_tab_states.get(tabid);
        chrome.runtime.sendMessage({
            sender: "background",
            destination: "popup",
            action: "update_popup",
            reset: reset,
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
            reset: reset,
            can_run: false,
            tabid: tabid,
            autoplay_enabled: true,
            statistics: new Object()
        });
    };
};

function update_browser_action_icon(tabid, autoplay_enabled) {
    if (autoplay_enabled) {
        chrome.browserAction.setIcon({ tabId: tabid, path: { "19": "images/dormant_19.png", "38": "images/dormant_38.png" } }, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    } else {
        chrome.browserAction.setIcon({ tabId: tabid, path: { "19": "images/active_19.png", "38": "images/active_38.png" } }, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    };
};

chrome.webNavigation.onBeforeNavigate.addListener(function(details) { // Update the browser action icon when navigating to these pages
    if (details.frameId == 0) {
        g_tab_states.delete(details.tabId);
        update_popup(details.tabId, true);
        update_browser_action_icon(details.tabId, true);
    };
}, { url: [{ urlPrefix: "chrome" }, { schemes: ["ftp"] }] });

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
        for (whitelisted_url of PERMANENT_WHITELIST) {
            if (details.url.startsWith(whitelisted_url)) {
                update_popup(details.tabId, true);
                update_browser_action_icon(details.tabId, true);
                return;
            };
        };
        g_tab_states.set(details.tabId, { autoplay_enabled: autoplay_enabled, domain_name: domain_name, media_statistics: new Object() });
        update_popup(details.tabId, true);
        update_browser_action_icon(details.tabId, !g_tab_states.has(details.tabId) || g_tab_states.get(details.tabId).autoplay_enabled);
    };
    if (g_tab_states.has(details.tabId) && !g_tab_states.get(details.tabId).autoplay_enabled) {
        chrome.tabs.executeScript(details.tabId, {file: "content_script.js", allFrames: true, matchAboutBlank: true, runAt: "document_start"}, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    };
}, { url: [{ schemes: ["http", "https", "file"] }] });

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (g_tab_states.has(tabId) && changeInfo.status === "complete") {
        // A tab's browser action icon is reset when a tab enters the complete state
        update_browser_action_icon(tabId, g_tab_states.get(tabId).autoplay_enabled);
    };
});

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
        } else if (message.action == "remove_media_element") {
            if (tab_state.hasOwnProperty(message.element_type)) {
                tab_state[message.element_type].count = tab_state[message.element_type].count - 1;
                if (tab_state[message.element_type].count < 0) {
                    tab_state[message.element_type].count = 0;
                };
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
        update_popup(sender.tab.id, false);
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
