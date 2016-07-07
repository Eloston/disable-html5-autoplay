"use strict";

function frame_script_code() {
    "use strict";

    class MediaDelegate {
        constructor(media_element) {
        }

        _cleanup() {
        }

        on_dom_add(media_element) {
        }

        on_dom_change(media_element) {
        }

        on_dom_remove(media_element) {
        }

        get_autoplay(media_element) {
        }

        set_autoplay(media_element, new_value) {
        }

        get_paused(media_element) {
        }

        get_played(media_element) {
        }

        call_play(media_element) {
        }

        call_load(media_element) {
        }
    }
}

const EVENT_MESSAGING_NAME = "DH5A" + Math.random().toString(36).slice(2);

function configure_frame_script_messaging_conduit() {
    function forward_message(customEventInit) {
        customEventInit.detail.sender = "frame";
        customEventInit.detail.destination = "background";
        chrome.runtime.sendMessage(customEventInit.detail);
    }

    window.addEventListener(EVENT_MESSAGING_NAME, forward_message);

    // In the case of running in an iframe: When the contents of the current iframe are set, event listeners are removed
    let document_observer = new MutationObserver(function(mutation_records) {
        window.addEventListener(EVENT_MESSAGING_NAME, forward_message);
    });
    document_observer.observe(document, { childList: true });
}

function inject_frame_script() {
    let frame_script_element = document.createElement("script");
    frame_script_element.textContent = "(" + frame_script_code.toString() + ")('" + EVENT_MESSAGING_NAME + "');";
    if (document.documentElement === null) { // In the case of running in an iframe: The contents may not have been set yet
        document.appendChild(frame_script_element);
        document.removeChild(frame_script_element);
    } else {
        document.documentElement.insertBefore(frame_script_element, document.documentElement.firstChild);
        document.documentElement.removeChild(frame_script_element);
    }
}

configure_frame_script_messaging_conduit();
inject_frame_script();
