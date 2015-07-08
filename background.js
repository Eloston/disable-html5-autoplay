function update_pageaction(response) {
    if (response.suspended == true) {
        chrome.pageAction.setIcon({ tabId: response.tabid, path: { "19": "images/resume_19.png", "38": "images/resume_38.png" } });
        chrome.pageAction.setTitle({ tabId: response.tabid, title: "Resume HTML5 media" });
        return;
    } else if (response.suspended == false) {
        chrome.pageAction.setIcon({ tabId: response.tabid, path: { "19": "images/suspend_19.png", "38": "images/resume_38.png" } });
        chrome.pageAction.setTitle({ tabId: response.tabid, title: "Suspend HTML5 media" });
        return;
    } else {
        console.error("background.js: Invalid suspended value: " + response.suspended);
    };
};

function show_pageaction(tabid) {
    chrome.pageAction.show(tabid);
};

function hide_pageaction(tabid) {
    chrome.pageAction.hide(tabid);
};

function handle_contentscript_message(message, sender, sendResponse) {
    if (message.action == "page_created") {
        chrome.pageAction.show(sender.tab.id);
        update_pageaction({tabid: sender.tab.id, suspended: message.suspended});
    } else if (message.action == "show_pageaction") {
        show_pageaction(sender.tab.id);
    } else if (message.action == "hide_pageaction") {
        hide_pageaction(sender.tab.id);
    } else {
        console.error("background.js: Unknown message received: " + message);
    };
};

chrome.pageAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, ["pageaction_clicked", tab.id], {}, update_pageaction);
});

chrome.runtime.onMessage.addListener(handle_contentscript_message);
