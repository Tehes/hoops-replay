# Starter Template for Web or Progressive Web App (PWA)

This is a versatile starter template designed to help you build either a traditional website or a
Progressive Web Application (PWA) with minimal setup. It includes essential features like responsive
design, caching for offline support (if used as a PWA), and basic asset management.

## Features

- **Responsive Design**: Includes styles and meta tags for mobile compatibility.
- **Service Worker** (PWA mode): Cache‑first + Stale‑While‑Revalidate strategy; works offline after
  the first online visit.
- **PWA Manifest** (PWA mode): A manifest file for adding the app to home screens on mobile devices.
- **Deno Lint & Format**: The included `deno.json` sets up `deno lint` (recommended rules) and
  `deno fmt` (tabs, 4‑space tab width, 100 char max line length, semicolons).
- **Favicons**: Ready‑to‑use SVG (`favicon.svg`) and PNG (`180x180.png`) favicons are included. All
  modern browsers already render SVG favicons; Safari follows in autumn 2025 with iOS 26, so a PNG
  fallback remains essential.

## Optional: Server-side Endpoints via Deno Deploy

This template optionally supports server-side or edge endpoints using **Deno Deploy**.

- Endpoints live in `api/main.js`.
- All code (frontend + API) resides in the same GitHub Pages repository.
- Client-side code and Deno-specific code are strictly separated.
- If you don’t need server-side functionality, you can simply ignore or remove the `api/` folder.

## Structure

```bash
├── index.html         # Main entry point
├── css/
│   └── style.css      # Base styles, responsive design, dark mode support
├── js/
│   ├── app.js         # Main JavaScript, includes initialization and SW configuration
│   └── service-worker-registration.js # Browser-side SW registration and cleanup
├── api/
│   └── main.js        # Optional server-side endpoints (Deno Deploy)
├── data/              # Optional static data (JSON, lookups, seeds)
├── icons/             # Application icons / favicons
├── svg/               # UI SVG icons
├── manifest.json      # PWA manifest (only for PWA usage)
├── service-worker.js  # Service worker (only for PWA usage)
├── deno.json          # Deno linting & formatting config
├── AGENTS.md          # AI / agent coding guidelines
├── .nojekyll          # Required for GitHub Pages
├── README.md
└── LICENSE.txt
```

## Installation

1. Clone or download the repository using your preferred method (via Git, GitHub CLI, or downloading
   the ZIP).
2. Open the project in your preferred text editor.
3. Serve the project using any local server solution of your choice (e.g., using Live Server from
   your editor or another tool).

## Initial Setup

This template can be used in two different ways: as a **standard website** or as a **Progressive Web
App (PWA)**. Depending on which type of app you want to build, follow the instructions below.

### 1. As a Standard Website

If you're building a regular website, some features related to PWAs are unnecessary and can be
removed or commented out:

#### Required Changes for Standard Website

- **Manifest file**: You can remove or ignore `manifest.json` as it's only needed for PWAs.

- **Service Worker**: You don't need a service worker. In `js/app.js`, set `USE_SERVICE_WORKER` to
  `false` to ensure that no service worker is registered and that any previously registered service
  worker is unregistered. The registration and cleanup logic itself lives in
  `js/service-worker-registration.js`:

  ```javascript
  const USE_SERVICE_WORKER = false;
  ```

- **Meta Tags**: You can remove or ignore the following meta tags in `index.html`:

  ```html
  <link rel="manifest" href="manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="--yourSiteName--">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  ```

- **CSS for PWAs**: The following CSS rules are important for PWAs, but may not be necessary for a
  standard website:
  - **`user-select: none;`** and **`-webkit-user-select: none;`**: These rules prevent users from
    selecting text. In standard websites, this might not be necessary, but for PWAs, where
    interactions like clicking and swiping are important, it can prevent unwanted text selection.
  - **`-webkit-touch-callout: none;`**: This rule disables the touch-and-hold menu on iOS (e.g., for
    "Copy" or "Save Image"), which can be useful in PWAs where such actions are not relevant. You
    can remove or comment it out if not needed for your use case.

  ```css
  body {
   user-select: none; /* Prevents text selection */
   -webkit-user-select: none; /* Prevents text selection on older WebKit-based browsers */
   -webkit-touch-callout: none; /* Disables the long-press menu on iOS */
  }
  ```

### 2. As a Progressive Web App (PWA)

If you want to take full advantage of PWA features, follow these steps to ensure everything is set
up correctly:

#### Required Changes for PWA

- **Manifest File**: Make sure `manifest.json` is properly configured. Replace the placeholders
  (`--yourSiteName--`, `--your description--`) with the actual name, description, and icons of your
  app.

  Example:

  ```json
  {
   "short_name": "MyApp",
   "name": "My Application",
   "description": "A brief description of My Application.",
   "icons": [
    {
     "src": "icons/favicon.svg",
     "type": "image/svg+xml",
     "sizes": "any"
    },
    {
     "src": "icons/180x180.png",
     "type": "image/png",
     "sizes": "180x180"
    }
   ],
   "start_url": "/",
   "scope": "/",
   "background_color": "#eee",
   "display": "standalone",
   "theme_color": "#eee"
  }
  ```

- **Service Worker**: In `js/app.js`, set `USE_SERVICE_WORKER` to `true` and define
  `SERVICE_WORKER_VERSION`. The browser-side registration and cleanup logic lives in
  `js/service-worker-registration.js`. The Service Worker will be registered with a versioned URL
  like `service-worker.js?v=...`, ensuring that updates are always detected by the browser:

  ```javascript
  const USE_SERVICE_WORKER = true;
  const SERVICE_WORKER_VERSION = "2026-03-12-v1";
  ```

- **Cache Naming**: The Service Worker extracts the `v` parameter from its registration URL and uses
  it to generate a versioned cache name. You don't need to change `CACHE_NAME` manually.

- **Meta Tags**: Ensure the PWA-specific meta tags are included in your `index.html` for mobile
  compatibility and PWA installation:

  ```html
  <link rel="manifest" href="manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="MyApp">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  ```

- **CSS (Touch-Action)**: Keep the following line in your `style.css` to disable double-tap zoom on
  mobile devices, improving the mobile experience:

  ```css
  /* disable double tap to zoom. only use in mobile-pwa */
  touch-action: manipulation;
  ```

### Optional: `touchstart` Event Listener

- **JavaScript Touch Event**: The `touchstart` event listener was previously used to handle touch
  interactions on older iOS devices. While it is no longer necessary for most modern devices and
  browsers, you can leave the code commented out and re-enable it if you experience touch
  interaction issues:

  ```javascript
  // document.addEventListener("touchstart", function() {}, false);
  ```

### Customizing Styles

The template includes basic CSS with variables for easy customization. Colors and themes are set for
both light and dark modes:

```css
:root {
 --bg-color: hsl(0, 0%, 95%);
 --font-color: hsl(0, 0%, 20%);
}

@media (prefers-color-scheme: dark) {
 :root {
  --bg-color: hsl(0, 0%, 20%);
  --font-color: hsl(0, 0%, 90%);
 }
}
```

Feel free to modify the styles to match your branding.

### Favicons

The template already ships with two optimized favicon formats stored in `icons/`:

| File          | Type / Size | Purpose                                                                                      |
| ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `favicon.svg` | SVG, any    | Primary favicon for browsers with SVG support (Chrome, Firefox, Edge, Android Browser, etc.) |
| `180x180.png` | PNG 180×180 | Fallback for current Safari versions and used as `apple-touch-icon` on iOS                   |

Reference both in `index.html` to ensure maximum compatibility:

```html
<link rel="shortcut icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="shortcut icon" href="icons/favicon.png">
<link rel="apple-touch-icon" href="icons/180x180.png">
```

_Browser support note:_ SVG favicons work in all major browsers today. Safari will add support
starting with iOS 26/macOS Safari (planned for autumn 2025). Keep the PNG fallback until then.

### .nojekyll

If you plan to deploy this project on GitHub Pages, the `.nojekyll` file is essential. It prevents
GitHub Pages from ignoring files and folders that start with an underscore (`_`), and ensures your
manually configured service worker and custom directory structure are served as-is—without
interference from GitHub's Jekyll processing pipeline.

You don't need to modify this file—its mere presence is enough.

### Deno.json

A strict `.deno.json` keeps formatting and linting consistent across the codebase:

```jsonc
{
 "fmt": {
  "useTabs": true,
  "indentWidth": 4,
  "lineWidth": 100,
  "singleQuote": false,
  "semiColons": true
 },
 "lint": {
  "rules": { "tags": ["recommended"] }
 }
}
```

- **Format:** `deno fmt`
- **Lint:** `deno lint`

Adjust the values to suit your team’s conventions if necessary.

### Summary

- For a **standard website**, disable or remove PWA-specific features like the service worker,
  manifest file, and touch-related CSS/JavaScript.
- For a **PWA**, ensure that the manifest file, service worker, and PWA-related meta tags are
  activated to provide offline support and a seamless mobile experience.

This template provides a flexible starting point for both traditional websites and Progressive Web
Apps!
