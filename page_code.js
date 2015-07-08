function iterate(array_obj, function_obj) {
    for (var i = 0; i < array_obj.length; i++) {
        function_obj(array_obj[i]);
    };
};

function update_pageaction_visibility(audio_list, video_list) {
    if (audio_list.length > 0 || video_list.length > 0) {
        chrome.runtime.sendMessage({action: "show_pageaction"});
    } else {
        chrome.runtime.sendMessage({action: "hide_pageaction"});
    };
};

function suspended_call(name) {
    console.log("page_code.js: " + name + "() was called during suspension.");
};

function suspend_media(media) {
    if (!media.hasAttribute("original_play")) {
        media.original_play = media.play;
    };
    media.play = function() { suspended_call("play"); };
    media.pause();
    if (media.hasAttribute("oncanplay")) {
        media.disabled_oncanplay = media.oncanplay;
        media.oncanplay = function() { suspended_call("oncanplay"); };
    };
    if (media.hasAttribute("onplay")) {
        media.disabled_onplay = media.onplay;
        media.onplay = function() { suspended_call("onplay"); };
    };
};

function resume_media(media) {
    media.play = media.original_play;
    if (media.hasAttribute("disabled_oncanplay")) {
        media.oncanplay = media.disabled_oncanplay
        media.removeAttribute("disabled_oncanplay")
    };
    if (media.hasAttribute("disabled_onplay")) {
        media.onplay = media.disabled_onplay
        media.removeAttribute("disabled_onplay")
    };
};

function do_suspension() {
    var youtube_button = document.querySelector('.ytp-button-pause')
    if (youtube_button) {
        youtube_button.click();
    };
    var video_list = document.querySelectorAll('video');
    iterate(video_list, suspend_media);
    var audio_list = document.querySelectorAll('audio');
    iterate(audio_list, suspend_media);
    update_pageaction_visibility(audio_list, video_list);
    suspended = true;
};

function do_resumption() {
    var video_list = document.querySelectorAll('video');
    iterate(video_list, resume_media);
    var audio_list = document.querySelectorAll('audio');
    iterate(audio_list, resume_media);
    update_pageaction_visibility(audio_list, video_list);
    suspended = false;
};

function handle_background_message(message, sender, sendResponse) {
    if (message[0] == "pageaction_clicked") {
        if (suspended == true) {
            do_resumption();
        } else if (suspended == false) {
            do_suspension();
        } else {
            console.error("page_code.js: Unknown suspended value: " + suspended);
        };
        sendResponse({tabid: message[1], suspended: suspended})
    } else {
        console.error("page_code.js: Unknown message received: " + message[0]);
    };
};

function page_updated_callback() {
    if (suspended == true) {
        do_suspension();
    };
};

chrome.runtime.onMessage.addListener(handle_background_message);
var suspended = undefined;
do_suspension();
chrome.runtime.sendMessage({action: "page_created", suspended: suspended});
var mutation_observer = new MutationObserver(function(mutations) {
    page_updated_callback();
});
mutation_observer.observe(document, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true
});
