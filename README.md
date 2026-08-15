# MediaBlock Pro

MediaBlock Pro is a Manifest V3 Chrome extension for screen privacy, media filtering, and safer browsing in public or shared spaces. It can block, blur, invert, grayscale, or reveal media on hover, and it now includes seeded Text Spoofing to make visible page text harder for nearby observers to read while keeping it readable for you.

[Download the latest ZIP](https://github.com/rachit9876/media-blocker-chrome/archive/refs/heads/main.zip)

## What's New

- **Text Spoofing:** Converts visible page text into deterministic, seed-based typoglycemic text.
- **Spoofing Seed:** Change the seed from Options. The same seed always produces the same transformation.
- **Domain Lock:** Require your universal password before opening selected websites.
- **Browser Lock:** Lock pages behind a password overlay.
- **URL Shortener:** Shorten current pages, links, images, video, and audio URLs, with recent history and QR preview.
- **Smart Dark Mode:** Applies a dark-style inversion only when the current site appears light.
- **Audio Tools:** Stable Volume compression, dialogue boost, and heavy bass cut profiles.

## Core Features

### Visual Privacy

- **Total Media Block:** Blocks images and videos using Chrome's `declarativeNetRequest` rules.
- **Smart Blur:** Applies blur to images, videos, embeds, canvas content, and background images.
- **Pixelation Mode:** Alternative visual filter for a mosaic-style privacy effect.
- **Invert Mode:** Inverts filtered media for lower-detail viewing.
- **Uniform Visuals:** Converts targeted media to grayscale.
- **Hover Reveal:** Temporarily reveals filtered media when hovering.
- **Target Controls:** Apply filtering to images, videos, or both.

### Text Privacy

- **Seeded Text Spoofing:** Scrambles the inner letters of visible words while preserving the first and last letters.
- **Deterministic Output:** The same seed and same word produce the same spoofed result, helping your brain adapt over time.
- **Dynamic Page Support:** Newly added and updated DOM text is transformed automatically.
- **Readable to Owner:** Designed for shoulder-surfing protection in offices, public transport, classrooms, cafes, and shared screens.

Text Spoofing works on normal webpage text. It does not affect text baked into images, videos, PDFs, canvas-rendered charts, or inaccessible closed shadow DOM.

### Media Behavior

- **Prevent Auto-Play:** Removes autoplay behavior and pauses newly loaded videos.
- **Auto-Mute Background Media:** Forces loaded videos to mute.
- **Stable Volume Engine:** Uses Web Audio compression to reduce loud spikes and boost quiet audio.
- **Audio Profiles:** Choose Flat, Dialogue Boost, or Heavy Bass Cut.

### Security And Utilities

- **Universal Password:** Used for browser lock and domain locks.
- **Domain Lock List:** Add domains like `reddit.com` or `youtube.com` in Options.
- **Force Right-Click And Copy:** Re-enables text selection, context menus, copy, paste, and drag behavior on restrictive sites.
- **Short URL Generator:** Copy shortened links from popup or context menu.
- **QR History:** View recent shortened URLs and expand QR codes for mobile scanning.
- **Keyboard Shortcut:** `Alt+S` can toggle your chosen action, including Text Spoofing.

## Popup Controls

The popup gives quick access to:

- Browser Lock
- Media Block
- Blur
- Invert
- Uniform Visuals
- Hover Reveal
- Force Right-Click
- Dark Mode
- Stable Volume
- Text Spoofing
- URL Shortener
- Image and video counters

## Options Page

The Options page includes:

- Image/video targeting
- Video autoplay prevention
- Auto-mute
- Force right-click
- Text Spoofing toggle
- Text Spoofing seed & live preview
- Blur mode and blur intensity
- Smart Dark Mode
- Stable Volume and EQ mode
- Universal password management
- Domain Lock management
- `Alt+S` shortcut action
- Short URL history and QR previews

## Installation

1. Download the ZIP from this repository.
2. Extract it to a folder.
3. Open Chrome and go to `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted extension folder.
7. Pin MediaBlock Pro to your toolbar for quick access.

## Permissions Used

- `storage`: Save extension settings, password hash, domain locks, and URL history.
- `declarativeNetRequest`: Block image and video requests efficiently.
- `declarativeNetRequestWithHostAccess`: Apply network rules across allowed sites.
- `scripting`: Run small page scripts for counters, clipboard writes, and alerts.
- `tabs`: Read the active tab URL for counters and URL shortening.
- `activeTab`: Interact with the currently active page.
- `clipboardWrite`: Copy shortened URLs.
- `contextMenus`: Add right-click URL shortening actions.
- `<all_urls>` host access: Apply media filtering, text spoofing, locks, and page protections across websites.

## Notes And Limitations

- Text Spoofing affects visible DOM text, including many dynamic pages and chat-style responses.
- Canvas-rendered text, chart labels, image text, video captions baked into video, and PDFs are outside normal DOM text handling.
- Stable Volume uses the Web Audio API and may not attach to every protected cross-origin media element.
- URL shortening depends on the external shortening service being reachable.
- Passwords are stored as SHA-256 hashes in local extension storage, not as plain text.

## Project Files

- `manifest.json`: Chrome extension manifest.
- `background.js`: Defaults, storage, badge state, DNR rules, shortcut handling, context menus, URL shortening, password checks.
- `content.js`: Page-side media filters, dark mode, lock overlays, video/audio behavior, force right-click, Text Spoofing.
- `popup.html` / `popup.js`: Quick controls and URL shortener.
- `options.html` / `options.js`: Advanced settings, domain locks, password settings, history, and seed controls.
- `rules/`: Declarative network request rules for image and video blocking.

## Version

Current manifest version: `4.3.0`.
