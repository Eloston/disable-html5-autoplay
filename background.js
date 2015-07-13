var g_tab_states = new Map();

function chrome_api_callback() {
    if (chrome.runtime.lastError) {
        console.log("background.js: chrome.runtime.lastError: " + chrome.runtime.lastError.message);
    };
};

function update_pageaction_icon(tabid, suspended) {
    if (suspended == true) {
        chrome.pageAction.setIcon({ tabId: tabid, path: { "19": "images/resume_19.png", "38": "images/resume_38.png" } }, chrome_api_callback);
        chrome.pageAction.setTitle({ tabId: tabid, title: "Resume HTML5 Media" });
        return;
    } else if (suspended == false) {
        chrome.pageAction.setIcon({ tabId: tabid, path: { "19": "images/suspend_19.png", "38": "images/resume_38.png" } }, chrome_api_callback);
        chrome.pageAction.setTitle({ tabId: tabid, title: "Suspend HTML5 Media" });
        return;
    } else {
        console.error("background.js: update_pageaction_icon: Invalid suspended value: " + JSON.stringify(suspended));
    };
};

function update_pageaction_visibility(tabid, visible) {
    if (visible == true) {
        chrome.pageAction.show(tabid);
    } else if (visible == false) {
        chrome.pageAction.hide(tabid);
    } else {
        console.error("background.js: update_pageaction_visibility: Unknown visible value: " + JSON.stringify(visible));
    };
};

function handle_contentscript_message(message, sender, sendResponse) {
    if (message.action == "add_page") {
        if (sender.frameId == 0) {
            if (g_tab_states.has(sender.tab.id)) {
                g_tab_states.delete(sender.tab.id);
            };
            g_tab_states.set(sender.tab.id, {
                suspended: true,
                frames_with_media: new Set()
            });
            update_pageaction_icon(sender.tab.id, g_tab_states.get(sender.tab.id).suspended);
        } else {
            if (!g_tab_states.has(sender.tab.id)) {
                console.error("background.js: handle_contentscript_message - add_page: Tried to add frame, but tab was not registered in g_tab_states");
                return false;
            };
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
