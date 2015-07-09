function update_pageaction_icon(tabid, suspended) {
    if (suspended == true) {
        chrome.pageAction.setIcon({ tabId: tabid, path: { "19": "images/resume_19.png", "38": "images/resume_38.png" } });
        chrome.pageAction.setTitle({ tabId: tabid, title: "Resume HTML5 media" });
        return;
    } else if (suspended == false) {
        chrome.pageAction.setIcon({ tabId: tabid, path: { "19": "images/suspend_19.png", "38": "images/resume_38.png" } });
        chrome.pageAction.setTitle({ tabId: tabid, title: "Suspend HTML5 media" });
        return;
    } else {
        console.error("background.js: update_pageaction_icon: Invalid suspended value: " + suspended);
    };
};

function update_pageaction_visibility(tabid, visible) {
    if (visible == true) {
        chrome.pageAction.show(tabid);
    } else if (visible == false) {
        chrome.pageAction.hide(tabid);
    } else {
        console.error("background.js: update_pageaction_visibility: Unknown visible value: " + visible);
    };
};

function handle_contentscript_message(message, sender, sendResponse) {
    if (message.action == "update_pageaction_icon") {
        update_pageaction_icon(sender.tab.id, message.suspended);
    } else if (message.action == "update_pageaction_visibility") {
        update_pageaction_visibility(sender.tab.id, message.visible);
    } else {
        console.error("background.js: handle_contentscript_message: Unknown message received: " + message);
    };
};

chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "click_pageaction"});
});

chrome.runtime.onMessage.addListener(handle_contentscript_message);
