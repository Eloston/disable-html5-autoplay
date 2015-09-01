# Disable HTML5 Autoplay
**An extension for Chromium-based browsers that disables autoplay of all HTML5 audio and video**

This extension disables HTML5 media autoplay on all websites. It requires little to no user interaction and should work on all websites without breaking functionality. 

Here are some of its features with some technical details:
* Stops media with the `autoplay` attribute
* Works on dynamically-inserted elements and all iframes
* Toggle autoplay on second-level domains (will be saved across browser sessions in the future)
* Media player-specific code to prevent the controls from breaking
* Prevents unauthorized invocations of the `play()` function via detecting user input events (for media without special code)
  * Fires `play`, `playing`, and `pause` events manually during an unauthorized invocation

To see a list of features to be implemented, check out the [TODO file](https://github.com/Eloston/disable-html5-autoplay/blob/master/TODO) in the repository.

## Using this extension

After installation, the extension will function on all new tabs.

This extension creates an icon next to the address bar (which is called a Browser Action.) The icon properties have tab-specific meanings:
* When the icon has color, this means that autoplay is disabled.
* When the icon is a light grey, this means that autoplay is enabled.
* The number that appears over the icon is the number of autoplay attempts.

When the Browser Action is clicked, a popup will appear with the following:
* A checkbox to toggle autoplay for the current page's second-level domain. When unchecked, autoplay is disabled. When checked, autoplay is enabled.
* A section displaying the total number of autoplay attempts and the total number of media elements
* A section with the number of media elements and the number of autoplay attempts for each media player type.

## Installation

Currently, only Chrome/Chromium and Opera are supported. Firefox will be supported when [WebExtensions](https://wiki.mozilla.org/WebExtensions) has matured enough to support all the features necessary.

### Install from Chrome Webstore

* [Webstore page](https://chrome.google.com/webstore/detail/disable-html5-autoplay/efdhoaajjjgckpbkoglidkeendpkolai)
* [Webstore CRX download link (for advanced users)](https://clients2.google.com/service/update2/crx?prodversion=44&response=redirect&x=id%3Defdhoaajjjgckpbkoglidkeendpkolai%26uc)

### Install from Opera Addons

* [Opera Addons page](https://addons.opera.com/en/extensions/details/disable-html5-autoplay/)
* [Opera Addons NEX download link (for advanced users)](https://addons.opera.com/extensions/download/disable-html5-autoplay/)

### Install from source

1. Download and unpack the source code:
  * [Tagged versions](https://github.com/Eloston/disable-html5-autoplay/releases)
  * master branch source code: [.tar.gz](https://github.com/Eloston/ungoogled-chromium/archive/master.tar.gz) or [.zip](https://github.com/Eloston/ungoogled-chromium/archive/master.zip)
2. In `chrome://extensions/`, enable Developer mode
3. Use "Load unpacked extension..." and select the folder containing the extension source code

