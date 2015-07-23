var frame_script = document.createElement("script");
frame_script.src = chrome.extension.getURL("frame_script.js");
frame_script.onload = function() {
    this.parentNode.removeChild(this);
};
document.documentElement.appendChild(frame_script);
