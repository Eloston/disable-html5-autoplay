var g_tab_states = new Map();

function chrome_api_callback() {
    if (chrome.runtime.lastError) {
        console.log("background.js: chrome.runtime.lastError: " + chrome.runtime.lastError.message);
    };
};

function update_pageaction_icon(tabId, suspended) {
    if (suspended == true) {
        chrome.pageAction.setIcon({ tabId: tabId, path: { "19": "images/resume_19.png", "38": "images/resume_38.png" } }, chrome_api_callback);
        chrome.pageAction.setTitle({ tabId: tabId, title: "Resume HTML5 Media" });
        return;
    } else if (suspended == false) {
        chrome.pageAction.setIcon({ tabId: tabId, path: { "19": "images/suspend_19.png", "38": "images/resume_38.png" } }, chrome_api_callback);
        chrome.pageAction.setTitle({ tabId: tabId, title: "Suspend HTML5 Media" });
        return;
    } else {
        console.error("background.js: update_pageaction_icon: Invalid suspended value: " + JSON.stringify(suspended));
    };
};

function update_pageaction_visibility(tabId, visible) {
    if (visible == true) {
        chrome.pageAction.show(tabId);
    } else if (visible == false) {
        chrome.pageAction.hide(tabId);
    } else {
        console.error("background.js: update_pageaction_visibility: Unknown visible value: " + JSON.stringify(visible));
    };
};

function initialize_tab_state(tabId) {
    g_tab_states.set(tabId, {
        suspended: true,
        frames_with_media: new Set()
    });
    update_pageaction_icon(tabId, g_tab_states.get(tabId).suspended);
};

function handle_contentscript_message(message, sender, sendResponse) {
    if (message.action == "add_page") {
        if (!g_tab_states.has(sender.tab.id)) {
            console.error("background.js: handle_contentscript_message - add_page: Tab is not registered: " + sender.tab.id.toString());
            return false;
        };
        sendResponse(g_tab_states.get(sender.tab.id).suspended);
    } else if (message.action == "page_has_media") {
        if (!g_tab_states.has(sender.tab.id)) {
            console.error("background.js: handle_contentscript_message - page_has_media: Tab is not registered: " + sender.tab.id.toString());
            return false;
        };
        var already_visible = g_tab_states.get(sender.tab.id).frames_with_media.size > 0;
        if (message.has_media == true) {
            g_tab_states.get(sender.tab.id).frames_with_media.add(sender.frameId);
        } else if (message.has_media == false) {
            g_tab_states.get(sender.tab.id).frames_with_media.delete(sender.frameId);
        } else {
            console.error("background.js: handle_contentscript_message - page_has_media: Invalid value for message.has_media: " + JSON.stringify(message.has_media));
            return false;
        };
        var now_visible = g_tab_states.get(sender.tab.id).frames_with_media.size > 0;
        if (already_visible != now_visible) {
            update_pageaction_visibility(sender.tab.id, now_visible);
        };
    } else {
        console.error("background.js: handle_contentscript_message: Unknown message received: " + JSON.stringify(message));
    };
    return false;
};

chrome.pageAction.onClicked.addListener(function(tab) {
    if (!g_tab_states.has(tab.id)) {
        console.error("background.js: pageAction onClicked event: Tab with id is not registered: " + tab.id.toString());
        return false;
    };
    g_tab_states.get(tab.id).suspended = !g_tab_states.get(tab.id).suspended;
    update_pageaction_icon(tab.id, g_tab_states.get(tab.id).suspended);
    chrome.tabs.sendMessage(tab.id, {action: "update_suspended_state", suspended: g_tab_states.get(tab.id).suspended});
    return false;
});

chrome.runtime.onMessage.addListener(handle_contentscript_message);

chrome.tabs.onCreated.addListener(function(tab) {
    initialize_tab_state(tab.id);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.hasOwnProperty("url")) {
        g_tab_states.delete(tabId);
        initialize_tab_state(tabId);
    };
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    g_tab_states.delete(tabId);
});

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    g_tab_states.set(addedTabId, g_tab_states.get(removedTabId));
    g_tab_states.remove(removedTabId);
});

