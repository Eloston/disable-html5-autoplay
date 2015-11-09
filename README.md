# ![(Disable HTML5 Autoplay logo should be here)](https://raw.githubusercontent.com/Eloston/disable-html5-autoplay/master/images/icon_48.png "Logo for Disable HTML5 Autoplay") Disable HTML5 Autoplay
**An extension for Chromium-based browsers that disables autoplay of all HTML5 audio and video**

This extension disables HTML5 media autoplay on all websites. It requires little to no user interaction and should work on all websites without breaking functionality. 

Here are some of its features with some technical details:
* Stops media with the `autoplay` attribute
* Works on dynamically-inserted elements and all iframes
* Toggle autoplay on second-level domains (will be saved across browser sessions in the future)
* Media player-specific code to prevent the controls from breaking
* Prevents unauthorized invocations of the `play()` function via detecting user input events (for media without special code)
  * Fires `play`, `playing`, and `pause` events manually during an unauthorized invocation

Head over to the [Wiki](/Eloston/disable-html5-autoplay/wiki) for more information.

## Installation

Currently, only Chrome/Chromium and Opera are supported. Firefox will be supported when [WebExtensions](https://wiki.mozilla.org/WebExtensions) has matured enough to support all the features necessary.

### Install from Chrome Webstore

* [Webstore page](https://chrome.google.com/webstore/detail/disable-html5-autoplay/efdhoaajjjgckpbkoglidkeendpkolai)
* [Webstore CRX download link (for advanced users)](https://clients2.google.com/service/update2/crx?prodversion=44&response=redirect&x=id%3Defdhoaajjjgckpbkoglidkeendpkolai%26uc)

### Install from Opera Addons

* [Opera Addons page](https://addons.opera.com/en/extensions/details/disable-html5-autoplay/)
* [Opera Addons NEX download link (for advanced users)](https://addons.opera.com/extensions/download/disable-html5-autoplay/)

### Install from source (All supported browsers)

1. Download and unpack the source code:
  * [Tagged versions](https://github.com/Eloston/disable-html5-autoplay/releases)
  * master branch source code: [.tar.gz](https://github.com/Eloston/ungoogled-chromium/archive/master.tar.gz) or [.zip](https://github.com/Eloston/ungoogled-chromium/archive/master.zip)
2. In `chrome://extensions/`, enable Developer mode
3. Use "Load unpacked extension..." and select the folder containing the extension source code

## License

[Read the LICENSE file for more information](LICENSE)
