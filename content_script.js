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
document.documentElement.appendChild(frame_script_element);
document.documentElement.removeChild(frame_script_element);
