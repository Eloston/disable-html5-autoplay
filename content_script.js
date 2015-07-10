document.addEventListener("SuspendHTML5MediaEvent_ToContentScript", function(message) {
    chrome.runtime.sendMessage(message.detail);
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    setTimeout(document.dispatchEvent(new CustomEvent("SuspendHTML5MediaEvent_ToInjectedScript", { detail: message })), 0);
});

injection_script_element = document.createElement("script");
injection_script_element.src = chrome.extension.getURL("injection_code.js");
(document.head||document.documentElement).appendChild(injection_script_element);
injection_script_element.onload = function() {
    this.parentNode.removeChild(injection_script_element);
};
