g_window_script = function(suspended) {
    var self = this;

    function send_message(message) {
        window.dispatchEvent(new CustomEvent("DisableHTML5AutoplayEvent_ToContentScript", { detail: message }));
    };

    function add_message_listener(callback_function) {
        window.addEventListener("DisableHTML5AutoplayEvent_ToWindowScript", function(customEventInit) { callback_function(customEventInit.detail); });
    };

    function get_all_media_elements() {
        return Array.prototype.slice.call(document.querySelectorAll("audio, video"));
    };

    function update_has_media(has_media) {
        if (!(has_media == self.m_has_media)) {
            send_message({action: "page_has_media", has_media: has_media});
            self.m_has_media = has_media;
        };
    };

    function page_update(suspend, media_elements, first_time) {
        for (element of media_elements) {
            for (replacement of PROPERTY_REPLACEMENT) {
                var disabled_equivalent = "disabled_" + replacement.property;
                if (suspend == true) {
                    if (first_time == true) {
                        element.pause();
                    };
                    if (!(disabled_equivalent in element)) {
                        element[disabled_equivalent] = element[replacement.property];
                        if (replacement.stub_type == "function") {
                            element[replacement.property] = function() { replacement.stub_value(element); };
                        } else if (replacement.stub_type == "value") {
                            element[replacement.property] = replacement.stub_value;
                        } else {
                            console.error("window_script.js: page_update: Unknown value for replacement.stub_type: " + JSON.stringify(replacement.stub_type));
                        };
                    };
                } else if (suspend == false) {
                    if (disabled_equivalent in element) {
                        element[replacement.property] = element[disabled_equivalent];
                        delete element[disabled_equivalent];
                    };
                } else {
                    console.error("window_script.js: page_update: Unknown value for suspend: " + JSON.stringify(suspend));
                };
            };
        };
    };

    function handle_backgroundscript_message(message) {
        if (message.action == "update_suspended_state") {
            self.m_suspended = message.suspended;
            page_update(self.m_suspended, get_all_media_elements(), false);
        } else {
            console.error("window_script.js: handle_backgroundscript_message: Unknown message received: " + JSON.stringify(message));
        };
    };

    PROPERTY_REPLACEMENT = [
        {property: "play", stub_type: "function", stub_value: function(element) { setTimeout(element.pause(), 0); } }
    ];
    self.m_suspended = suspended;
    self.m_has_media = false;
    var mutation_observer_callback = function(mutations_array) {
        update_has_media(get_all_media_elements().length > 0);
        var media_elements = new Array();
        for (mutation of mutations_array) {
            if (mutation.target.nodeType == 1) { // ELEMENT_NODE
                if (mutation.target instanceof HTMLMediaElement) {
                    media_elements.push(mutation.target);
                };
            };
        };
        page_update(self.m_suspended, media_elements, false);
    }
    self.m_mutation_observer = new MutationObserver(mutation_observer_callback);

    var all_media_elements = get_all_media_elements();
    update_has_media(all_media_elements.length > 0);
    page_update(self.m_suspended, all_media_elements, true);

    self.m_mutation_observer.observe(document, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
    });

    add_message_listener(handle_backgroundscript_message);
};

function initialize_window_script(suspended) {
    var window_script_element = document.createElement("script");
    window_script_element.textContent = "new (" + g_window_script.toString() + ")(" + suspended.toString() + ");";
    window_script_element.onload = function() {
        this.parentNode.removeChild(window_script_element);
    };
    (document.head||document.documentElement).appendChild(window_script_element);
};

window.addEventListener("DisableHTML5AutoplayEvent_ToContentScript", function(message) {
    chrome.runtime.sendMessage(message.detail);
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    window.dispatchEvent(new CustomEvent("DisableHTML5AutoplayEvent_ToWindowScript", { detail: message }));
});

chrome.runtime.sendMessage({action: "add_page"}, initialize_window_script);
