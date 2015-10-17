OPTIONS_VERSION = 1;
STORAGE_KEYS = {
    VERSION: "version",
    DEFAULT_MODE: "default_mode",
    MODE_RULES: "mode_rules"
};
DISABLING_MODE = {
    AUTOBUFFER_AUTOPLAY: 2,
    AUTOPLAY: 1,
    NOTHING: 0
};
MODE_RULES_FORMAT = {
    MODE_AUTOBUFFER_AUTOPLAY: "autobuffer-and-autoplay",
    MODE_AUTOPLAY_ONLY: "autoplay-only",
    MODE_NOTHING: "nothing",
    COMMENT_ESCAPE: "#",
    COMMENT_ESCAPE_REGEX: new RegExp("#(.+)"),
    VALUE_DELIMITER: " ",
    RULE_DELIMITER: "\n",
};
MODE_RULES_FORMAT.MODE_MAP = (function() {
    return {
        [this.MODE_AUTOBUFFER_AUTOPLAY]: DISABLING_MODE.AUTOBUFFER_AUTOPLAY,
        [this.MODE_AUTOPLAY_ONLY]: DISABLING_MODE.AUTOPLAY,
        [this.MODE_NOTHING]: DISABLING_MODE.NOTHING
    }
}).bind(MODE_RULES_FORMAT)()
MODE_RULES_FORMAT.REVERSE_MODE_MAP = (function() {
    var new_obj = new Object();
    for (key in this.MODE_MAP) {
        new_obj[this.MODE_MAP[key]] = key;
    };
    return new_obj;
}).bind(MODE_RULES_FORMAT)();
PERMANENT_WHITELIST = [
    "https://chrome.google.com/webstore" // Chrome won't allow content scripts here
];
g_options = new Object();
g_tab_states = new Map();
g_ignore_storage_change_event = false;

function get_second_level_domain(url_string) {
    var url_parser = document.createElement("a");
    url_parser.href = url_string;
    var exploded_url = url_parser.hostname.split(".");
    return exploded_url[exploded_url.length - 2] + "." + exploded_url[exploded_url.length - 1];
};

function parse_storage(storage_values) {
    g_options.default_mode = storage_values[STORAGE_KEYS.DEFAULT_MODE];
    g_options.mode_rules = new Map();
    for (rule_line of storage_values[STORAGE_KEYS.MODE_RULES].split("\n")) {
        var parsed_line = rule_line.split(MODE_RULES_FORMAT.COMMENT_ESCAPE_REGEX)[0].split(MODE_RULES_FORMAT.VALUE_DELIMITER);
        if (parsed_line.length >= 2) {
            g_options.mode_rules.set(parsed_line[0], MODE_RULES_FORMAT.MODE_MAP[parsed_line[1]]);
        };
    };
};

function store_mode_rule(domain, new_mode) {
    chrome.storage.local.get(STORAGE_KEYS.MODE_RULES, function(storage_values) {
        var mode_rules_array = storage_values[STORAGE_KEYS.MODE_RULES].split(MODE_RULES_FORMAT.RULE_DELIMITER);
        for (var line_index = 0; line_index < mode_rules_array.length; line_index++) {
            var parsed_line = mode_rules_array[line_index].split(MODE_RULES_FORMAT.COMMENT_ESCAPE_REGEX)[0].split(MODE_RULES_FORMAT.VALUE_DELIMITER);
            if (parsed_line.length >= 2 && parsed_line[0] == domain && MODE_RULES_FORMAT.MODE_MAP[parsed_line[1]] != new_mode) {
                parsed_line[1] = MODE_RULES_FORMAT.REVERSE_MODE_MAP[new_mode];
                mode_rules_array[line_index] = parsed_line.join(" ") + (mode_rules_array[line_index].split(MODE_RULES_FORMAT.COMMENT_ESCAPE_REGEX)[1] || "");
                storage_values[STORAGE_KEYS.MODE_RULES] = mode_rules_array.join(MODE_RULES_FORMAT.RULE_DELIMITER);
                g_ignore_storage_change_event = true;
                chrome.storage.local.set(storage_values, function() {
                    chrome.runtime.lastError // TODO: Log into debug log
                });
                return;
            };
        };
        if (mode_rules_array.length == 1 && mode_rules_array[0].length == 0) {
            mode_rules_array.pop();
        };
        mode_rules_array.push(domain + MODE_RULES_FORMAT.VALUE_DELIMITER + MODE_RULES_FORMAT.REVERSE_MODE_MAP[new_mode]);
        storage_values[STORAGE_KEYS.MODE_RULES] = mode_rules_array.join(MODE_RULES_FORMAT.RULE_DELIMITER);
        g_ignore_storage_change_event = true;
        chrome.storage.local.set(storage_values, function() {
            chrome.runtime.lastError // TODO: Log into debug log
        });
    });
};

function initialize_options() {
    chrome.storage.local.get([STORAGE_KEYS.VERSION, STORAGE_KEYS.DEFAULT_MODE, STORAGE_KEYS.MODE_RULES], function(storage_values) {
        var storage_version = storage_values[STORAGE_KEYS.VERSION];
        if (storage_version == OPTIONS_VERSION) {
            parse_storage(storage_values);
        } else if (storage_version === undefined) {
            g_ignore_storage_change_event = true;
            chrome.storage.local.set({
                [STORAGE_KEYS.VERSION]: OPTIONS_VERSION,
                [STORAGE_KEYS.DEFAULT_MODE]: DISABLING_MODE.AUTOPLAY, // TODO: Change to AUTOBUFFER_AUTOPLAY
                [STORAGE_KEYS.MODE_RULES]: ""
            }, function() {
                if (!chrome.runtime.lastError) { // TODO: Log to debug log
                    initialize_options();
                };
            });
        };
    });
};

function get_mode_for_domain(domain) {
    if (g_options.mode_rules.has(domain)) {
        return g_options.mode_rules.get(domain);
    } else {
        return g_options.default_mode;
    };
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
            mode: tab_state.mode,
            pending_mode: tab_state.pending_mode,
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
            mode: DISABLING_MODE.NOTHING,
            pending_mode: -1,
            statistics: new Object()
        });
    };
};

function update_browser_action_icon(tabid, icon_active) {
    if (icon_active) {
        chrome.browserAction.setIcon({ tabId: tabid, path: { "19": "images/active_19.png", "38": "images/active_38.png" } }, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    } else {
        chrome.browserAction.setIcon({ tabId: tabid, path: { "19": "images/dormant_19.png", "38": "images/dormant_38.png" } }, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    };
};

chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (g_ignore_storage_change_event) {
        g_ignore_storage_change_event = false;
        return;
    };
    var new_values = new Object();
    if (STORAGE_KEYS.DEFAULT_MODE in changes) {
        if ("newValue" in changes[STORAGE_KEYS.DEFAULT_MODE]) {
            new_values.default_mode = changes[STORAGE_KEYS.DEFAULT_MODE].newValue;
        } else {
            console.error("background.js: chrome.storage.onChanged: The '" + STORAGE_KEYS.DEFAULT_MODE + "' key has been corrupt. Resetting all data...");
            g_ignore_storage_change_event = true;
            chrome.storage.local.clear(function () {
                initialize_options();
            });
            return;
        };
    } else {
        new_values.default_mode = g_options.default_mode;
    };
    if (STORAGE_KEYS.MODE_RULES in changes) {
        if ("newValue" in changes[STORAGE_KEYS.MODE_RULES]) {
            new_values.mode_rules = changes[STORAGE_KEYS.MODE_RULES].newValue;
        } else {
            console.error("background.js: chrome.storage.onChanged: The '" + STORAGE_KEYS.MODE_RULES + "' key has been corrupt. Resetting all data...");
            g_ignore_storage_change_event = true;
            chrome.storage.local.clear(function () {
                initialize_options();
            });
            return;
        };
    } else {
        new_values.mode_rules = g_options.mode_rules;
    };
    parse_storage(new_values);
    for (map_item_array of g_tab_states) {
        var new_domain_mode = get_mode_for_domain(map_item_array[1].domain_name);
        if (new_domain_mode == map_item_array[1].mode) {
            map_item_array[1].pending_mode = -1;
        } else {
            map_item_array[1].pending_mode = new_domain_mode;
        };
        update_popup(map_item_array[0], true);
    };
});

chrome.webNavigation.onBeforeNavigate.addListener(function(details) { // Update the browser action icon when navigating to these pages
    if (details.frameId == 0) {
        g_tab_states.delete(details.tabId);
        update_popup(details.tabId, true);
        update_browser_action_icon(details.tabId, false);
    };
}, { url: [{ urlPrefix: "chrome" }, { schemes: ["ftp"] }] });

chrome.webNavigation.onCommitted.addListener(function(details) {
    if (details.frameId == 0) {
        if (g_tab_states.has(details.tabId)) {
            g_tab_states.delete(details.tabId);
        };
        for (whitelisted_url of PERMANENT_WHITELIST) {
            if (details.url.startsWith(whitelisted_url)) {
                update_popup(details.tabId, true);
                update_browser_action_icon(details.tabId, false);
                return;
            };
        };
        g_tab_states.set(details.tabId, {
            mode: get_mode_for_domain(get_second_level_domain(details.url)),
            pending_mode: -1,
            domain_name: get_second_level_domain(details.url),
            media_statistics: new Object()
        });
        update_popup(details.tabId, true);
        update_browser_action_icon(details.tabId, g_tab_states.has(details.tabId) && (g_tab_states.get(details.tabId).mode != DISABLING_MODE.NOTHING));
    };
    if (g_tab_states.has(details.tabId) && (g_tab_states.get(details.tabId).mode != DISABLING_MODE.NOTHING)) {
        chrome.tabs.executeScript(details.tabId, {file: "content_script.js", allFrames: true, matchAboutBlank: true, runAt: "document_start"}, function() {
            chrome.runtime.lastError; // TODO: Log these errors into a debug log
        });
    };
}, { url: [{ schemes: ["http", "https", "file"] }] });

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (g_tab_states.has(tabId) && changeInfo.status === "complete") {
        // A tab's browser action icon is reset when a tab enters the complete state
        update_browser_action_icon(tabId, g_tab_states.get(tabId).mode != DISABLING_MODE.NOTHING);
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
                sendResponse([true, tab_state.mode, tab_state.pending_mode, tab_state.media_statistics]);
            } else {
                sendResponse([false, DISABLING_MODE.NOTHING, -1, new Object()]);
            };
            return false;
        } else if (message.action == "update_whitelist") {
            if (g_tab_states.has(message.tabid)) {
                var tab_state = g_tab_states.get(message.tabid);
                if (message.mode == DISABLING_MODE.NOTHING || message.mode == DISABLING_MODE.AUTOPLAY || message.mode == DISABLING_MODE.AUTOBUFFER_AUTOPLAY) {
                    g_options.mode_rules.set(tab_state.domain_name, message.mode);
                    store_mode_rule(tab_state.domain_name, message.mode);
                } else {
                    console.error("background.js: Invalid value for message.mode: " + JSON.stringify(message.mode));
                    return false;
                };
                if (tab_state.mode == message.mode) {
                    tab_state.pending_mode = -1;
                } else {
                    tab_state.pending_mode = message.mode;
                };
            } else {
                console.error("background.js: update_whitelist: Tab state does not exist");
                return false;
            };
        } else if (message.action == "reload_page") {
            if (g_tab_states.has(message.tabid)) {
                chrome.tabs.reload(message.tabid);
            } else {
                console.error("background.js: reload_page: Tab state does not exist");
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

initialize_options();
