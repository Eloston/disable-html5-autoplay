/*********************************************************************************

    Disable HTML5 Autoplay: A webbrowser extension to disable HTML5 autoplaying
    Copyright (C) 2016  Eloston

    This file is part of Disable HTML5 Autoplay.

    Disable HTML5 Autoplay is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Disable HTML5 Autoplay is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Disable HTML5 Autoplay.  If not, see <http://www.gnu.org/licenses/>.

********************************************************************************/

OPTIONS_VERSION = 1;
STORAGE_KEYS = {
    VERSION: "version",
    DEFAULT_MODE: "default_mode",
    MODE_RULES: "mode_rules"
};
MODE_RULES_FORMAT = {
    MODE_AUTOBUFFER_AUTOPLAY: "autobuffer-and-autoplay",
    MODE_AUTOPLAY_ONLY: "autoplay-only",
    MODE_NOTHING: "nothing",
    PREVENT_DELETION_ARGUMENT: "prevent-deletion",
    COMMENT_ESCAPE: "#",
    COMMENT_ESCAPE_REGEX: new RegExp("#(.+)"),
    VALUE_DELIMITER: " ",
    RULE_DELIMITER: "\n",
};
DISABLING_MODE = {
    AUTOBUFFER_AUTOPLAY: 2,
    AUTOPLAY: 1,
    NOTHING: 0
};
MODE_RULES_FORMAT.MODE_MAP = (function() {
    return {
        [this.MODE_AUTOBUFFER_AUTOPLAY]: DISABLING_MODE.AUTOBUFFER_AUTOPLAY,
        [this.MODE_AUTOPLAY_ONLY]: DISABLING_MODE.AUTOPLAY,
        [this.MODE_NOTHING]: DISABLING_MODE.NOTHING
    }
}).bind(MODE_RULES_FORMAT)()
ELEMENTS = {
    EXTENSION_NAME: "extension-name",
    EXTENSION_VERSION: "extension-version",
    DEFAULT_MODE: "default-mode",
    DEFAULT_MODE_SAVING_STATUS: "default-mode-saving-status",
    RESET_MODE_RULES: "reset-mode-rules",
    SAVE_MODE_RULES: "save-mode-rules",
    SAVE_MODE_RULES_STATUS: "save-mode-rules-status",
    MODE_RULES: "mode-rules"
};
SAVED_TEXT_VISIBILITY_TIMEOUT = 2500;
g_ignore_event_handler = false;
g_raw_mode_rules = null;

function clear_element_children(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    };
};

function set_element_text(element, new_text) {
    clear_element_children(element);
    element.appendChild(document.createTextNode(new_text));
};

function validate_mode_rules(raw_mode_rules) {
    var used_domains = new Set();
    var rules_array = raw_mode_rules.split(MODE_RULES_FORMAT.RULE_DELIMITER);
    for (var line_index = 0; line_index < rules_array.length; line_index++) {
        var rule_parts = rules_array[line_index].split(MODE_RULES_FORMAT.COMMENT_ESCAPE_REGEX)[0].split(MODE_RULES_FORMAT.VALUE_DELIMITER);
        if (rule_parts.length >= 2) {
            if (rule_parts[0].length > 0) {
                //if (!(rule_parts[1] == MODE_RULES_FORMAT.MODE_AUTOBUFFER_AUTOPLAY || rule_parts[1] == MODE_RULES_FORMAT.MODE_AUTOPLAY_ONLY || rule_parts[1] == MODE_RULES_FORMAT.MODE_NOTHING)) {
                if (!(rule_parts[1] == MODE_RULES_FORMAT.MODE_AUTOPLAY_ONLY || rule_parts[1] == MODE_RULES_FORMAT.MODE_NOTHING)) {
                    return [false, "The domain \"" + rule_parts[0] + "\" has an unknown mode \"" + rule_parts[1] + "\""];
                };
                if (used_domains.has(rule_parts[0])) {
                    return [false, "The domain \"" + rule_parts[0] + "\" has been used more than once"];
                } else {
                    used_domains.add(rule_parts[0]);
                };
                if (rule_parts.length > 2 && rule_parts[2].length > 0 && rule_parts[2] != MODE_RULES_FORMAT.PREVENT_DELETION_ARGUMENT) {
                    return [false, "The domain \"" + rule_parts[0] + "\" has an unknown argument \"" + rule_parts[2] + "\""]
                };
            } else {
                return [false, "There is a line missing a domain name"];
            };
        } else if (rule_parts.length == 1 && rule_parts[0].length > 0) {
            return [false, "The domain \"" + rule_parts[0] + "\" is missing a mode"];
        };
    };
    return [true];
};

chrome.storage.local.get([STORAGE_KEYS.VERSION, STORAGE_KEYS.DEFAULT_MODE, STORAGE_KEYS.MODE_RULES], function(storage_values) {
    if (storage_values[STORAGE_KEYS.VERSION] == OPTIONS_VERSION) {
        g_raw_mode_rules = storage_values[STORAGE_KEYS.MODE_RULES];
        var default_mode_element = document.getElementById(ELEMENTS.DEFAULT_MODE);
        default_mode_element.removeAttribute("disabled");
        default_mode_element.value = storage_values[STORAGE_KEYS.DEFAULT_MODE].toString();
        default_mode_element.addEventListener("change", function(event) {
            default_mode_element.setAttribute("disabled", "disabled");
            set_element_text(document.getElementById(ELEMENTS.DEFAULT_MODE_SAVING_STATUS), "Saving...");
            g_ignore_event_handler = true;
            chrome.storage.local.set({
                [STORAGE_KEYS.DEFAULT_MODE]: parseInt(event.target.value)
            }, function() {
                default_mode_element.removeAttribute("disabled");
                set_element_text(document.getElementById(ELEMENTS.DEFAULT_MODE_SAVING_STATUS), "Saved!");
                setTimeout(function() {
                    clear_element_children(document.getElementById(ELEMENTS.DEFAULT_MODE_SAVING_STATUS));
                }, SAVED_TEXT_VISIBILITY_TIMEOUT);
            });
        });
        clear_element_children(document.getElementById(ELEMENTS.DEFAULT_MODE_SAVING_STATUS));
        mode_rules_element = document.getElementById(ELEMENTS.MODE_RULES);
        mode_rules_element.value = g_raw_mode_rules;
        mode_rules_element.removeAttribute("disabled");
        reset_mode_rules_button = document.getElementById(ELEMENTS.RESET_MODE_RULES);
        save_mode_rules_button = document.getElementById(ELEMENTS.SAVE_MODE_RULES);
        mode_rules_element.addEventListener("input", function(event) {
            if (event.target.value.length != g_raw_mode_rules.length || event.target.value != g_raw_mode_rules) {
                reset_mode_rules_button.removeAttribute("disabled");
                save_mode_rules_button.removeAttribute("disabled");
            } else {
                clear_element_children(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS));
                reset_mode_rules_button.setAttribute("disabled", "disabled");
                save_mode_rules_button.setAttribute("disabled", "disabled");
            };
        });
        for (event_name of ["mouseup", "touchend"]) {
            document.getElementById(ELEMENTS.RESET_MODE_RULES).addEventListener(event_name, function(event) {
                event.preventDefault();
                clear_element_children(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS));
                mode_rules_element.value = g_raw_mode_rules;
                reset_mode_rules_button.setAttribute("disabled", "disabled");
                save_mode_rules_button.setAttribute("disabled", "disabled");
            });
            document.getElementById(ELEMENTS.SAVE_MODE_RULES).addEventListener(event_name, function(event) {
                event.preventDefault();
                reset_mode_rules_button.setAttribute("disabled", "disabled");
                save_mode_rules_button.setAttribute("disabled", "disabled");
                set_element_text(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS), "Validating...");
                var validation_result = validate_mode_rules(mode_rules_element.value);
                if (validation_result[0] === true) {
                    set_element_text(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS), "Saving...");
                    g_raw_mode_rules = mode_rules_element.value;
                    g_ignore_event_handler = true;
                    chrome.storage.local.set({
                        [STORAGE_KEYS.MODE_RULES]: mode_rules_element.value
                        }, function() {
                            set_element_text(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS), "Saved!");
                            setTimeout(function() {
                                clear_element_children(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS));
                            }, SAVED_TEXT_VISIBILITY_TIMEOUT);
                    });
                } else {
                    set_element_text(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS), "Error: " + validation_result[1]);
                    reset_mode_rules_button.removeAttribute("disabled");
                    save_mode_rules_button.removeAttribute("disabled");
                };
            });
        };
        clear_element_children(document.getElementById(ELEMENTS.SAVE_MODE_RULES_STATUS));
    } else {
        for (element_id of [ELEMENTS.DEFAULT_MODE_SAVING_STATUS, ELEMENTS.SAVE_MODE_RULES_STATUS, ELEMENTS.MODE_RULES]) {
            document.getElementById(element_id).textContent = "Error: Cannot load incompatible options version: " + JSON.stringify(storage_values[STORAGE_KEYS.VERSION]);
        };
    };
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (g_ignore_event_handler) {
        g_ignore_event_handler = false;
        return;
    };
    window.location.reload();
});

var manifest_details = chrome.runtime.getManifest();
document.getElementById(ELEMENTS.EXTENSION_NAME).appendChild(document.createTextNode(manifest_details.name));
document.getElementById(ELEMENTS.EXTENSION_VERSION).appendChild(document.createTextNode(manifest_details.version));
