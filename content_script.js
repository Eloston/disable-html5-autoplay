function forward_message(customEventInit) {
    chrome.runtime.sendMessage(customEventInit.detail);
};

window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);

document_observer = new MutationObserver(function(mutation_records) {
    window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", forward_message);
});

document_observer.observe(document, { childList: true });

var frame_script_element = document.createElement("script");
frame_script_element.textContent = "(" + frame_script_code.toString() + ")();";
frame_script_element.addEventListener("load", function(event) {
    if ("parentNode" in this) {
        this.parentNode.removeChild(this);
    };
});
(document.head||document.documentElement).appendChild(frame_script_element);
