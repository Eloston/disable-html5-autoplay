var frame_script = document.createElement("script");
frame_script.src = chrome.extension.getURL("frame_script.js");
frame_script.onload = function() {
    this.parentNode.removeChild(this);
};
var old_document = document;
var old_window = window;
(document.head||document.documentElement).appendChild(frame_script);

function forward_message(customEventInit) {
    //console.log("received message");
    chrome.runtime.sendMessage(customEventInit.detail);
};

window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);

/*
document.addEventListener("DOMContentLoaded", function(event) {
    window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);
    if (old_document !== document) {
        console.log("document CHANGED!!!");
    } else if (old_window !== window) {
        console.log("window CHANGED!!!");
    };
});

document.addEventListener("pagehide", function(event) { console.log("pagehide!!!"); });
document.addEventListener("pageshow", function(event) { console.log("pageshow!!!"); });
*/
