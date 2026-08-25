# QR Code Studio

> Generate QR codes for text, URLs, Wi-Fi, email, phone, SMS, and vCards with custom colors and error-correction levels, and scan QR codes from your camera or an uploaded image. 100% client-side.

**Live:** <https://bayhaqy.my.id/apps/qr-studio/>

---

## What it does

QR Code Studio has two modes:

- **Generate** — pick a content type, fill in the form, and a live QR preview updates as you type. Customize colors, size, error-correction level, and margin. Download as PNG or SVG, or copy the PNG to your clipboard.
- **Scan** — point your camera at a QR code, or upload an image. Detected content is shown with a copy button and (for URLs, email, phone, SMS) an "Open" button.

Everything runs in your browser. The camera feed never leaves your device.

## Features

### Generate

- 7 content types: Text, URL, Wi-Fi, Email, Phone, SMS, vCard
- Per-type input forms that adapt automatically
- Wi-Fi QR formatted as `WIFI:T:WPA;S:<ssid>;P:<pass>;H:<hidden>;;` (spec-compliant)
- vCard 3.0 output with name, organization, phone, email, URL
- Foreground/background color pickers (default black on white)
- Size slider 128–1024 px
- Error correction L / M / Q / H (7% / 15% / 25% / 30%)
- Margin slider 0–10 modules
- Live preview canvas
- Download as PNG or SVG (full resolution)
- Copy PNG to clipboard
- "Load sample" button fills a Wi-Fi QR (SSID `MyHomeWiFi`, WPA, password `Welcome2024`)

### Scan

- Live camera feed with scanning overlay and animated scan line
- Front/back camera selector (auto-populates after permission granted)
- Uses `getUserMedia` + `<video>` + canvas frame extraction + `jsQR`
- Frame downscaled to max 640 px for performance, both color inversions tried
- "Open" button for URL / mailto / tel / smsto / WIFI codes
- "Upload image" alternative for scanning a QR from a file
- Session-only scan history (last 10, no persistence)
- Camera stream stops automatically when you switch tabs or close the page
- Haptic feedback on detection (where supported)

## How to use

1. **Pick a mode** — Generate or Scan (top tabs).
2. **Generate**: choose a content type, fill in the form, watch the preview update live.
3. **Customize** (optional): change colors, size, error-correction, margin.
4. **Export**: download PNG, SVG, or copy PNG to clipboard.
5. **Scan**: click "Start camera", allow permission, point at a QR. Or click "Upload image" to scan a file.

Try the sample button ("Load sample") to instantly generate a Wi-Fi QR code.

## Content type formats

| Type | Output format |
|---|---|
| Text | Raw text |
| URL | Raw URL (e.g. `https://example.com`) |
| Wi-Fi | `WIFI:T:WPA;S:MyHomeWiFi;P:Welcome2024;H:false;;` |
| Email | `mailto:to@example.com?subject=...&body=...` |
| Phone | `tel:+6281234567890` |
| SMS | `smsto:+6281234567890:Hello there` |
| vCard | Full vCard 3.0 (`BEGIN:VCARD ... END:VCARD`) |

Special characters in Wi-Fi SSIDs/passwords and vCard fields are escaped per spec.

## Tech

- **HTML + CSS + vanilla JavaScript** in a single file. No build step, no framework.
- **QR generation**: [`qrcode@1.5.4`](https://www.npmjs.com/package/qrcode) loaded via jsDelivr CDN.
- **QR scanning**: [`jsqr@1.4.0`](https://www.npmjs.com/package/jsqr) loaded via jsDelivr CDN. Pure JavaScript, no camera-UI library.
- **Camera**: `navigator.mediaDevices.getUserMedia` + `<video>` element + `requestAnimationFrame` loop. Frames drawn to a hidden canvas, then `getImageData` is passed to `jsQR`.
- **Clipboard**: `navigator.clipboard.write` with `ClipboardItem` for PNG copy.
- **System fonts only** (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`).

## Sample API call

The core generation and scanning logic is plain JavaScript you can copy into any page:

```javascript
// Generate a QR code to a canvas
QRCode.toCanvas(
  document.getElementById('canvas'),
  'WIFI:T:WPA;S:MyHomeWiFi;P:Welcome2024;H:false;;',
  {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: { dark: '#000000', light: '#FFFFFF' }
  },
  (err) => { if (err) console.error(err); }
);

// Generate SVG markup
QRCode.toString(
  'https://bayhaqy.my.id/',
  { type: 'svg', errorCorrectionLevel: 'M', margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' } },
  (err, svg) => { if (!err) document.body.insertAdjacentHTML('beforeend', svg); }
);

// Scan one frame from a video element
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
canvas.getContext('2d').drawImage(video, 0, 0);
const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
const code = jsQR(img.data, img.width, img.height);
if (code) console.log('Detected:', code.data);
```

## Privacy

- The camera feed is processed locally frame by frame. No frame is ever uploaded.
- Scan history is in-memory only and disappears when the page is closed.
- No analytics, no cookies, no network requests after the page loads.

## Browser support

- **Generate**: works in any modern browser (Chrome, Firefox, Safari, Edge).
- **Scan (camera)**: requires `getUserMedia` — works in Chrome, Firefox, Safari (iOS 11+), Edge. Requires HTTPS or `localhost`.
- **Scan (image upload)**: works everywhere.
- **Copy PNG to clipboard**: Chrome, Edge, Safari. Falls back to download elsewhere.

## Self-hosting

```bash
git clone https://github.com/bayhaqy/apps.git
cd apps
python3 -m http.server 8080
# open http://localhost:8080/qr-studio/
```

The two CDN libraries are required for full functionality. To run fully offline, download them into a local `lib/` folder and update the `<script src>` tags.

## Author

**Achmad Bayhaqy** — [bayhaqy.my.id](https://bayhaqy.my.id/) · [GitHub](https://github.com/bayhaqy)

## License

MIT — see [`LICENSE`](../LICENSE) in the repo root.
