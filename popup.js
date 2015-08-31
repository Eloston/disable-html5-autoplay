DELEGATE_NAMES = {
    "browser_controls": "(Browser Controls)",
    "youtube": "YouTube",
    "video.js": "Video.js",
    "jwplayer": "JWPlayer",
    "unknown": "(Unknown Type)"
};

function send_message(message, responseCallback) {
    message.sender = "popup";
    chrome.runtime.sendMessage(message, {}, responseCallback);
};

function reset_data() {
    for (element_id of ["media-element-count", "autoplay-attempts", "statistics"]) {
        var current_element = document.getElementById(element_id);
        while (current_element.firstChild) {
            current_element.removeChild(current_element.firstChild);
        };
    };
};

function initialize_data(statistics) {
    var media_element_count_element = document.getElementById("media-element-count");
    var autoplay_attempts_element = document.getElementById("autoplay-attempts");
    var statistics_element = document.getElementById("statistics");
    if (Object.keys(statistics).length > 0) {
        var total_count = 0;
        var total_attempts = 0;
        for (delegate_name in statistics) {
            total_count += statistics[delegate_name].count;
            total_attempts += statistics[delegate_name].attempts;
            var p_element = document.createElement("p");
            var bold_element = document.createElement("b");
            bold_element.classList.add("darker-text");
            bold_element.appendChild(document.createTextNode(DELEGATE_NAMES[delegate_name]));
            p_element.appendChild(bold_element);
            p_element.appendChild(document.createElement("br"));
            p_element.appendChild(document.createTextNode("Count: "));
            var count_span = document.createElement("span");
            count_span.classList.add("darker-text");
            count_span.appendChild(document.createTextNode(statistics[delegate_name].count.toString()));
            p_element.appendChild(count_span);
            p_element.appendChild(document.createElement("br"));
            p_element.appendChild(document.createTextNode("Attempts: "));
            var attempt_span = document.createElement("span");
            attempt_span.classList.add("darker-text");
            attempt_span.appendChild(document.createTextNode(statistics[delegate_name].attempts.toString()));
            p_element.appendChild(attempt_span);
            statistics_element.appendChild(p_element);
        };
        media_element_count_element.appendChild(document.createTextNode(total_count.toString()));
        autoplay_attempts_element.appendChild(document.createTextNode(total_attempts.toString()));
    } else {
        media_element_count_element.appendChild(document.createTextNode("0"));
        autoplay_attempts_element.appendChild(document.createTextNode("0"));
        statistics_element.appendChild(document.createTextNode("(None recorded)"));
    };
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.sender == "background" && message.action == "update_popup") {
        if (message.tabid == g_tab_id) {
            reset_data();
            initialize_data(message.statistics);
        };
    };
});

var manifest_details = chrome.runtime.getManifest();
document.getElementById("extension-name").appendChild(document.createTextNode(manifest_details.name));
document.getElementById("extension-version").appendChild(document.createTextNode(manifest_details.version));

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    g_tab_id = tabs[0].id;
    send_message({action: "initialize_popup", tabid: g_tab_id}, initialize_data);
});
