g_tab_states = new Map();

function set_active_icon(tabId) {
    if (g_tab_states.get(tabId).browser_action_icon_active == false) {
        chrome.browserAction.setIcon({ tabId: tabId, path: { "19": "images/active_19.png", "38": "images/active_38.png" } });
        g_tab_states.get(tabId).browser_action_icon_active = true;
    };
};

function set_dormant_icon(tabId) {
    if (g_tab_states.get(tabId).browser_action_icon_active == true) {
        chrome.browserAction.setIcon({ tabId: tabId, path: { "19": "images/dormant_19.png", "38": "images/dormant_38.png" } });
        g_tab_states.get(tabId).browser_action_icon_active = false;
    };
};

chrome.webNavigation.onCommitted.addListener(function(details) {
    if (details.frameId == 0) {
        if (g_tab_states.has(details.tabId)) {
            g_tab_states.delete(details.tabId);
        };
        g_tab_states.set(details.tabId, { browser_action_icon_active: false, media_statistics: new Object() });
    };
}, { url: [{ schemes: ["http", "https", "file"] }] });

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!sender.hasOwnProperty("tab")) {
        // Page is being unloaded
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
    } else if (message.action == "add_autoplay_attempt") {
        if (tab_state.hasOwnProperty(message.element_type)) {
            tab_state[message.element_type].attempts = tab_state[message.element_type].attempts + 1;
            var total_attempts = 0;
            for (element_type in tab_state) {
                total_attempts = total_attempts + tab_state[element_type].attempts;
            };
            chrome.browserAction.setBadgeText({ tabId: sender.tab.id, text: total_attempts.toString() });
        } else {
            console.error("background.js: Tried to add autoplay attempt to a media type never encountered");
            return false;
        };
    } else {
        console.error("background.js: Unknown message.action received: " + JSON.stringify(message));
    };
    return false;
});

chrome.browserAction.setBadgeBackgroundColor({color: [32, 32, 32, 200]});
