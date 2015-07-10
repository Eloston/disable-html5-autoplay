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
    if (message.action == "update_pageaction_icon") {
        update_pageaction_icon(sender.tab.id, message.suspended);
    } else if (message.action == "update_pageaction_visibility") {
        update_pageaction_visibility(sender.tab.id, message.visible);
    } else {
        console.error("background.js: handle_contentscript_message: Unknown message received: " + JSON.stringify(message));
    };
};

chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "click_pageaction"});
});

chrome.runtime.onMessage.addListener(handle_contentscript_message);
