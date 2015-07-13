# Disable HTML5 Autoplay
**A Google Chrome extension that disables autoplay of HTML5 audio and video**

This extension creates an icon in the address bar. It has two states:<br />
- ![A green play button icon](https://github.com/Eloston/suspend-html5-media/raw/master/images/resume_19.png "A green play button icon"): All HTML5 media is "suspended". During suspension, they will pause and their JavaScript API methods will be replaced with dummy functions. Click this icon to "resume" all media.
- ![A yellow pause button icon](https://github.com/Eloston/suspend-html5-media/raw/master/images/suspend_19.png "A yellow pause button icon"): All HTML5 media are in their original, untouched state. Click this icon to "suspend" all media.
<br />
<br />
The extension will suspend all media on page load.

## Installation

- Download the source code (easiest way is to download a [.tar.gz](https://github.com/Eloston/ungoogled-chromium/archive/master.tar.gz) or [.zip](https://github.com/Eloston/ungoogled-chromium/archive/master.zip) of the master branch)
- In `chrome://extensions/`, enable Developer mode
- Use "Load unpacked extension..." and select the folder containing the extension source code

## TODO

- Add page-specific and player-specific handlers to deal with JavaScript-based controls breaking (e.g. YouTube)
- Add website blacklisting xor whitelisting(?)
- Add statistics for functions called during suspension(?)

