DELEGATE_NAMES = {
    "browser_controls": "(Browser Controls)",
    "youtube": "YouTube",
    "video.js": "Video.js",
    "jwplayer": "JWPlayer",
    "unknown": "(Unknown Type)"
};

function send_message(message, responseCallback) {
    message.sender = "popup";
    message.destination = "background";
    if (responseCallback instanceof Function) {
        chrome.runtime.sendMessage(message, new Object(), responseCallback);
    } else {
        chrome.runtime.sendMessage(message);
    };
};

function clear_data() {
    for (element_id of ["media-element-count", "autoplay-attempts", "statistics"]) {
        var current_element = document.getElementById(element_id);
        while (current_element.firstChild) {
            current_element.removeChild(current_element.firstChild);
        };
    };
};

function set_data(can_run, autoplay_enabled, statistics) {
    var autoplay_toggle_checkbox = document.getElementById("autoplay-toggle");
    var media_element_count_element = document.getElementById("media-element-count");
    var autoplay_attempts_element = document.getElementById("autoplay-attempts");
    var statistics_element = document.getElementById("statistics");
    autoplay_toggle_checkbox.checked = autoplay_enabled;
    autoplay_toggle_checkbox.disabled = !can_run;
    if (can_run) {
        document.getElementById("can-run-is-false").hidden = "hidden";
    }
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

function initialize_data(response_array) {
    set_data(response_array[0], response_array[1], response_array[2]);
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.sender == "background" && message.destination == "popup" && message.action == "update_popup") {
        if (message.tabid == g_tab_id) {
            clear_data();
            set_data(message.can_run, message.autoplay_enabled, message.statistics);
        };
    };
});

document.getElementById("autoplay-toggle").addEventListener("mouseup", function(event) {
    var autoplay_toggle_element = document.getElementById("autoplay-toggle");
    if (autoplay_toggle_element.disabled === true) {
        return;
    };
    var click_reload_element = document.getElementById("click-reload");
    if (click_reload_element.hasAttribute("hidden")) {
        click_reload_element.removeAttribute("hidden");
    } else {
        click_reload_element.setAttribute("hidden", "hidden");
    };
});

document.getElementById("click-reload").addEventListener("mouseup", function(event) {
    document.getElementById("click-reload").setAttribute("hidden", "hidden");
    send_message({action: "update_whitelist", autoplay_enabled: document.getElementById("autoplay-toggle").checked, tabid: g_tab_id});
});

var manifest_details = chrome.runtime.getManifest();
document.getElementById("extension-name").appendChild(document.createTextNode(manifest_details.name));
document.getElementById("extension-version").appendChild(document.createTextNode(manifest_details.version));

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    g_tab_id = tabs[0].id;
    send_message({action: "initialize_popup", tabid: g_tab_id}, initialize_data);
});
