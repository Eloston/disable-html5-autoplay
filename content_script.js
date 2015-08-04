function forward_message(customEventInit) {
    chrome.runtime.sendMessage(customEventInit.detail);
};

window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);

document_observer = new MutationObserver(function(mutation_records) {
    window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);
});

document_observer.observe(document, { childList: true });

var frame_script = document.createElement("script");
frame_script.src = chrome.extension.getURL("frame_script.js");
frame_script.onload = function() {
    if (this.hasOwnProperty("parentNode")) {
        this.parentNode.removeChild(this);
    };
};
(document.head||document.documentElement).appendChild(frame_script);
