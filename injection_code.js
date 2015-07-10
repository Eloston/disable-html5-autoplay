var suspend_html5_media_injection_code_instance = new function() {
    var self = this;

    function send_message(message) {
        setTimeout(document.dispatchEvent(new CustomEvent("SuspendHTML5MediaEvent_ToContentScript", { detail: message })), 0);
    };

    function add_message_listener(callback_function) {
        document.addEventListener("SuspendHTML5MediaEvent_ToInjectedScript", function(customEventInit) { callback_function(customEventInit.detail); });
    };

    function get_all_media_elements() {
        return Array.prototype.slice.call(document.querySelectorAll("audio, video"));
    };

    function update_pageaction_icon(suspended) {
        send_message({action: "update_pageaction_icon", suspended: suspended});
    };

    function update_pageaction_visibility(visible) {
        if (!(visible == self.m_pageaction_visible)) {
            send_message({action: "update_pageaction_visibility", visible: visible});
            self.m_pageaction_visible = visible;
        };
    };

    function page_update(suspend, media_elements) {
        for (element of media_elements) {
            for (replacement of ATTRIBUTE_REPLACEMENT) {
                var disabled_equivalent = "disabled_" + replacement.attribute
                if (suspend == true) {
                    element.pause();
                    if (!(disabled_equivalent in element)) {
                        element[disabled_equivalent] = element[replacement.attribute];
                        if (replacement.stub_type == "function") {
                            element[replacement.attribute] = function() { replacement.stub_value(replacement.attribute); };
                        } else if (replacement.stub_type == "value") {
                            element[replacement.attribute] = replacement.stub_value;
                        } else {
                            console.error("injection_code.js: page_update: Unknown value for replacement.stub_type: " + JSON.stringify(replacement.stub_type));
                        };
                    };
                } else if (suspend == false) {
                    if (disabled_equivalent in element) {
                        element[replacement.attribute] = element[disabled_equivalent];
                        delete element[disabled_equivalent];
                    };
                } else {
                    console.error("injection_code.js: page_update: Unknown value for suspend: " + JSON.stringify(suspend));
                };
            };
        };
    };

    function handle_backgroundscript_message(message) {
        if (message.action == "click_pageaction") {
            self.m_suspended = !self.m_suspended;
            page_update(self.m_suspended, get_all_media_elements());
            update_pageaction_icon(self.m_suspended);
        } else {
            console.error("injection_code.js: handle_backgroundscript_message: Unknown message received: " + JSON.stringify(message));
        };
    };

    function page_init() {
        update_pageaction_icon(self.m_suspended);
        var all_media_elements = get_all_media_elements();
        update_pageaction_visibility(all_media_elements.length > 0);
        page_update(self.m_suspended, all_media_elements);

        self.m_mutation_observer.observe(document, {
            childList: true,
            attributes: true,
            characterData: true,
            subtree: true
        });

        add_message_listener(handle_backgroundscript_message);
    }; 

    function suspended_call(name) {
        console.log("injection_code.js: " + name + "() was called during suspension.");
    };

    ATTRIBUTE_REPLACEMENT = [
        {attribute: "play", stub_type: "function", stub_value: suspended_call},
        {attribute: "oncanplay", stub_type: "function", stub_value: suspended_call},
        {attribute: "onplay", stub_type: "function", stub_value: suspended_call}
    ];
    self.m_suspended = true;
    self.m_pageaction_visible = false;
    var mutation_observer_callback = function(mutations_array) {
        update_pageaction_visibility(get_all_media_elements().length > 0);
        var media_elements = new Array();
        for (mutation of mutations_array) {
            if (mutation.target.nodeType == 1) { // ELEMENT_NODE
                if (mutation.target instanceof HTMLMediaElement) {
                    media_elements.push(mutation.target);
                };
            };
        };
        page_update(self.m_suspended, media_elements);
    }
    self.m_mutation_observer = new MutationObserver(mutation_observer_callback);

    page_init();
};
