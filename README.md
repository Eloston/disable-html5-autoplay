# Disable HTML5 Autoplay
**A Google Chrome extension that disables autoplay of all HTML5 audio and video**

This extension disables autoplay on all websites. Unlike others that simply pause the media or strip the autoplay attribute in HTML, this extension will also prevent JavaScript from playing the media. Furthermore, dynamically added media will be parsed by this extension.<br />
<br />
When you enter a website, this extension will pause all media on the page. ![A green play icon](https://github.com/Eloston/suspend-html5-media/raw/master/images/resume_19.png "A green play icon") will show up in the address bar. To allow all media to play, click this icon. If you do not click this icon, audio and video will not play.<br />
<br />
After you click this icon, it will change into ![A yellow pause icon](https://github.com/Eloston/suspend-html5-media/raw/master/images/suspend_19.png "A yellow pause icon"). In this mode, all media will be able to play. Clicking this button will pause any new media on the page and revert to ![A green play icon](https://github.com/Eloston/suspend-html5-media/raw/master/images/resume_19.png "A green play icon").<br />
<br />
If the icon is not present in the address bar, that means there are no media on the page.

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

