function get_all_media_elements() {
    return Array.prototype.slice.call(document.querySelectorAll("audio, video"));
};

function update_pageaction_icon(suspended) {
    chrome.runtime.sendMessage({action: "update_pageaction_icon", suspended: suspended});
};

function update_pageaction_visibility(visible) {
    if (!(visible == g_pageaction_visible)) {
        chrome.runtime.sendMessage({action: "update_pageaction_visibility", visible: visible});
        g_pageaction_visible = visible;
    };
};

function page_update(suspend, media_elements) {
    if (suspend == true) {
        for (element of Array.prototype.slice.call(document.querySelectorAll('.ytp-button-pause'))) {
            element.click();
        };
    };
    for (element of media_elements) {
        for (replacement of ATTRIBUTE_REPLACEMENT) {
            var disabled_equivalent = "disabled_" + replacement.attribute
            if (suspend == true) {
                element.pause();
                if (!element.hasAttribute(disabled_equivalent)) {
                    element.setAttribute(disabled_equivalent, element.getAttribute(replacement.attribute));
                    if (replacement.stub_type == "function") {
                        element.setAttribute(replacement.attribute, function() { replacement.stub_value(replacement.attribute); });
                    } else {
                        console.error("page_code.js: page_update: Unknown value for replacement.stub_type: " + replacement.stub_type);
                    };
                };
            } else if (suspend == false) {
                if (element.hasAttribute(disabled_equivalent)) {
                    element.setAttribute(replacement.attribute, element.getAttribute(disabled_equivalent));
                    element.removeAttribute(disabled_equivalent);
                };
            } else {
                console.error("page_code.js: page_update: Unknown value for suspend: " + suspend);
            };
        };
    };
};

function handle_backgroundscript_message(message, sender, sendResponse) {
    if (message.action == "click_pageaction") {
        g_suspended = !g_suspended;
        page_update(g_suspended, get_all_media_elements());
        update_pageaction_icon(g_suspended);
    } else {
        console.error("page_code.js: handle_backgroundscript_message: Unknown message received: " + message);
    };
};

function tab_init() {
    update_pageaction_icon(g_suspended);
    var all_media_elements = get_all_media_elements();
    update_pageaction_visibility(all_media_elements.length > 0);
    page_update(g_suspended, all_media_elements);

    g_mutation_observer.observe(document, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
    });

    chrome.runtime.onMessage.addListener(handle_backgroundscript_message);
}; 

function suspended_call(name) {
    console.log("page_code.js: " + name + "() was called during suspension.");
};

var ATTRIBUTE_REPLACEMENT = [
    {attribute: "play", stub_type: "function", stub_value: suspended_call},
    {attribute: "oncanplay", stub_type: "function", stub_value: suspended_call},
    {attribute: "onplay", stub_type: "function", stub_value: suspended_call}
];
var g_suspended = true;
var g_pageaction_visible = false;
var g_mutation_observer = new MutationObserver(function(mutations_array) {
    update_pageaction_visibility(get_all_media_elements().length > 0);
    var media_elements = new Array();
    for (mutation of mutations_array) {
        if (mutation.target.nodeType == 1) { // ELEMENT_NODE
            if (mutation.target instanceof HTMLMediaElement) {
                media_elements.push(mutation.target);
            };
        };
    };
    page_update(g_suspended, media_elements);
});

tab_init();
