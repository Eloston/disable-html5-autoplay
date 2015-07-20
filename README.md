# Disable HTML5 Autoplay
**A Google Chrome extension that disables autoplay of all HTML5 audio and video**

This extension disables autoplay on all websites. Unlike others that simply pause the media or strip the autoplay attribute in HTML, this extension will also prevent JavaScript from playing the media. Furthermore, dynamically added media will be parsed by this extension.

## Installation

### Install from Chrome Webstore

* [Webstore page](https://chrome.google.com/webstore/detail/disable-html5-autoplay/efdhoaajjjgckpbkoglidkeendpkolai)
* [Webstore CRX download link (for advanced users)](https://clients2.google.com/service/update2/crx?prodversion=43&response=redirect&x=id%3Defdhoaajjjgckpbkoglidkeendpkolai%26uc)

### Install from source

1. Download and unpack the source code:
  * [Tagged versions](https://github.com/Eloston/disable-html5-autoplay/releases)
  * master branch source code: [.tar.gz](https://github.com/Eloston/ungoogled-chromium/archive/master.tar.gz) or [.zip](https://github.com/Eloston/ungoogled-chromium/archive/master.zip)
2. In `chrome://extensions/`, enable Developer mode
3. Use "Load unpacked extension..." and select the folder containing the extension source code

## TODO

- Add website blacklisting xor whitelisting(?)
- Add statistics for functions called during suspension(?)

