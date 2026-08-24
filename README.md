# MediaBlock Pro

MediaBlock Pro is a Manifest V3 Chrome extension for screen privacy, media filtering, and safer browsing in public or shared spaces. It can block, blur, invert, grayscale, or reveal media on hover. It also includes seeded Text Spoofing to protect your screen from shoulder surfers, Visual Image Search, QR code generation, and more.

[Download the latest ZIP](https://github.com/rachit9876/media-blocker-chrome/archive/refs/heads/main.zip)

## What's New

- **Visual Image Search & Snipping Tool:** Right-click to search images via Google Lens, Yandex, or TinEye. Use the "Search Area" tool in the popup to snip and search any part of your screen!
- **Tab Scoped Settings:** Click "ALL TABS / THIS TAB" in the popup to apply filters and privacy modes to only the currently active tab without affecting the rest of your browser.
- **QR Code Generator:** Right-click to generate a QR code for the current page, link, or media. A custom QR generator is also available in the popup.
- **Text Spoofing:** Converts visible page text into deterministic, seed-based typoglycemic text to prevent shoulder-surfing.
- **Domain Lock & Browser Lock:** Require your universal password before opening selected websites or lock the entire browser.
- **URL Shortener:** Shorten current pages, links, images, video, and audio URLs, with recent history and QR preview.
- **Smart Dark Mode:** Applies a dark-style inversion only when the current site appears light.
- **Advanced Audio Tools:** Stable Volume compression, Mono Audio, dialogue boost, and heavy bass cut profiles.

## Core Features

### Visual Privacy

- **Total Media Block:** Blocks images and videos using Chrome's `declarativeNetRequest` rules.
- **Smart Blur & Pixelation:** Applies blur or mosaic filters to images, videos, embeds, canvas content, and background images.
- **Invert & Uniform Mode:** Inverts filtered media for lower-detail viewing or converts targeted media to grayscale.
- **Hover Reveal:** Temporarily reveals filtered media when hovering.
- **Target Controls:** Apply filtering to images, videos, or both.

### Text Privacy

- **Seeded Text Spoofing:** Scrambles the inner letters of visible words while preserving the first and last letters.
- **Deterministic Output:** The same seed always produces the same spoofed result, helping your brain adapt over time.
- **Dynamic Page Support:** Newly added and updated DOM text is transformed automatically.

### Media & Audio Behavior

- **Stable Volume Engine:** Uses Web Audio compression to reduce loud spikes and boost quiet audio.
- **Mono Audio Downmixer:** Combines stereo channels into mono for single-earbud listening.
- **Audio Profiles:** Choose Flat, Dialogue Boost, or Heavy Bass Cut.

### Security And Utilities

- **Universal Password:** Used for browser lock and domain locks.
- **Domain Lock List:** Add domains like `reddit.com` or `youtube.com` in Options.
- **Force Right-Click And Copy:** Re-enables text selection, context menus, copy, paste, and drag behavior on restrictive sites.
- **Short URL Generator:** Copy shortened links from popup or context menu.
- **Visual Search by Image:** Context menu options to reverse image search via Google Lens, Yandex, and TinEye.
- **Keyboard Shortcut:** `Alt+S` can toggle your chosen action.

## Popup Controls

The popup gives quick access to:

- Scope Toggle (All Tabs vs This Tab)
- Browser Lock
- Media Block, Blur, Invert, Uniform Visuals, Hover Reveal
- Force Right-Click
- Dark Mode
- Stable Volume & Mono Audio
- Text Spoofing
- URL Shortener & Custom QR Code Generator
- Area Snipping Tool (Visual Search)
- Image and video counters

## Options Page

The Options page includes:

- Media targeting controls (Images vs Videos)
- Blur mode (Blur/Pixelate) and blur intensity
- Audio EQ profiles (Stable Volume target LUFS, Dialogue, Cinema, Bass cut/boost)
- Text Spoofing seed & live preview
- Universal password management & Domain Lock list
- `Alt+S` shortcut action configuration
- Short URL history and high-res QR previews

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
- `scripting`: Run small page scripts for counters, snipping tools, clipboard writes, and alerts.
- `tabs`: Read the active tab URL for counters, screenshots, and URL shortening.
- `activeTab`: Interact with the currently active page.
- `clipboardWrite`: Copy shortened URLs.
- `contextMenus`: Add right-click URL shortening, QR generation, and image search actions.
- `<all_urls>` host access: Apply media filtering, text spoofing, locks, and page protections across websites.

## Project Files

- `manifest.json`: Chrome extension manifest.
- `background.js`: State management, DNR rules, shortcut handling, context menus, URL shortening, visual search uploaders, password checks.
- `content.js`: Page-side media filters, smart dark mode, lock overlays, Web Audio API processing, force right-click, Text Spoofing observer.
- `selector.js`: Screen area selection and snipping tool UI for Visual Search.
- `popup.html` / `popup.js`: Quick controls, URL shortener, QR generator, snipping tool trigger, and tab scoping logic.
- `options.html` / `options.js`: Advanced settings, domain locks, history, and live previews.
- `rules/`: Declarative network request rules for media blocking.

## Version

Current manifest version: `4.4.0`.
