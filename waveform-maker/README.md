# Audio Waveform Video Maker

Audio Waveform Video Maker is a free, private, 100% client-side tool that turns any audio file (MP3, WAV, OGG, M4A, AAC, FLAC) into an animated waveform video ready for TikTok, Reels, and YouTube Shorts. Drop in your audio, pick a background and waveform style, optionally add a title and subtitle, and render a WebM video directly in your browser — nothing is uploaded, no sign-up, no watermark.

**Live:** <https://bayhaqy.my.id/apps/waveform-maker/>

---

## Why use it

Most "audio visualizer" tools are server-based SaaS: you upload your audio, wait in a queue, accept a watermark, and pay for HD export. Waveform Maker runs entirely in your browser using native Web APIs — your audio never leaves your device, the render is real-time, and the output is yours.

| Online visualizer tools | Waveform Maker |
| --- | --- |
| Audio uploaded to a server | Audio decoded in-browser, never leaves your device |
| Free tier adds a watermark | No watermark, ever |
| Queue / wait time for render | Render starts immediately, real-time capture |
| Account and email required | No account, no sign-up |
| Limited templates and colors | Four styles, gradient colors, custom background, text overlay |
| Exports locked behind paywall | Free WebM download, ready for TikTok/Reels/Shorts |
| Tracks your usage | Zero analytics, zero cookies |

## Features

- **Dropzone for audio** — drag-and-drop or click to browse MP3, WAV, OGG, M4A, AAC, FLAC. The file is decoded locally with the Web Audio API and pre-computed into ~50 peaks per second for smooth visualization.
- **Four waveform styles** — `bars` (vertical bars from baseline), `line` (filled waveform shape), `mirror` (symmetric bars from center), `radial` (circular bars radiating outward).
- **Three aspect ratios** — 9:16 (540×960) for TikTok/Reels, 1:1 (720×720) for Instagram feed, 16:9 (960×540) for YouTube Shorts. Switch instantly.
- **Custom background** — upload a JPG/PNG (cover-fit) or use a solid color. Adjustable dark overlay (0–80%) for text readability.
- **Color control** — solid or 2-stop gradient for the waveform. Independent color for solid background and text overlay.
- **Text overlay** — optional title at top, subtitle/handle at bottom, with font picker (Inter / System / Poppins) and color picker. Auto-sized to frame width, with text shadow for readability.
- **Live preview canvas** — left pane shows the waveform animation synced to audio playback. Press play in the transport bar to preview before rendering.
- **Real-time render with progress** — MediaRecorder captures canvas + audio in real time. Progress bar shows elapsed and remaining time. A 60-second clip renders in ~60 seconds.
- **WebM output** — VP9 + Opus by default (with VP8 fallback). Safari may produce MP4 (H.264 + AAC). Filename: `waveform-{YYYYMMDD-HHMMSS}.webm`.
- **100% client-side** — no uploads, no tracking, no cookies, no sign-up. Works offline after first load. The only localStorage key is `waveform-theme` for theme persistence.

## How to use

1. **Drop your audio.** Drag-and-drop an MP3, WAV, OGG, M4A, AAC, or FLAC file onto the dropzone (or click to browse). The app decodes it with `AudioContext.decodeAudioData` and shows filename, duration, sample rate, channels, and size. A play/pause button and seek bar appear for preview.
2. **Customize the look.** Pick an aspect ratio (9:16 / 1:1 / 16:9), a waveform style (bars / line / mirror / radial), waveform position (center / bottom / top), size (30–100%), color mode (solid / 2-stop gradient), background image (optional) or solid color, dark overlay (0–80%), and optional title + subtitle text with font and color.
3. **Preview the animation.** Press the play button in the audio bar. The live preview canvas on the left renders the waveform scrolling in sync with playback. Adjust settings and see them update in real time.
4. **Render the video.** Click **Render video**. The app records the canvas + audio stream in real time using MediaRecorder. A progress bar shows elapsed time and remaining estimate. Keep the browser tab focused for best results. Optional **Mute during render** checkbox silences your speakers while still recording audio into the file.
5. **Download and post.** When the render completes, a download button appears. The file is saved as `waveform-{timestamp}.webm` (or `.mp4` on Safari). Upload directly to TikTok, Instagram Reels, or YouTube Shorts — they all accept WebM. Need MP4? Convert with HandBrake, ffmpeg, or any online converter.

## Running locally

This is a single self-contained HTML file. Three options:

- **Open directly:** double-click `index.html` to open in your browser. All features work from `file://`. (Some browsers restrict `AudioContext` on `file://` until you interact with the page — click anywhere first.)
- **Python server:** `python3 -m http.server 8099` in this directory, then visit `http://localhost:8099/`.
- **Self-host:** copy the `waveform-maker/` folder to any static web host (GitHub Pages, Netlify, Vercel, nginx, Apache). No build step, no backend.

## Project structure

```
waveform-maker/
├── index.html   # Single self-contained file: all CSS + JS inline, zero dependencies
└── README.md    # This file
```

## How it works

Waveform Maker uses three native browser APIs in sequence. No external libraries, no CDN dependencies (after first load).

### 1. Audio decode (Web Audio API)

When you drop an audio file, the app reads it as an `ArrayBuffer` and calls `AudioContext.decodeAudioData()` to get a PCM `AudioBuffer`. From the buffer's first channel, it pre-computes a fixed array of amplitude peaks — one peak per 1/50 second of audio (capped at 5,000 peaks total). Each peak is the maximum absolute sample value within its block, normalized to 0–1 against the loudest peak in the file. This peak array drives both the live preview and the rendered waveform — no real-time analysis needed.

```js
const arrayBuf = await file.arrayBuffer();
const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
const channel = audioBuf.getChannelData(0);
const totalPeaks = Math.min(5000, Math.floor(audioBuf.duration * 50));
const block = Math.floor(channel.length / totalPeaks);
const peaks = [];
for (let i = 0; i < totalPeaks; i++) {
  let max = 0;
  for (let j = i * block; j < (i + 1) * block; j++) {
    const v = Math.abs(channel[j]);
    if (v > max) max = v;
  }
  peaks.push(max);
}
```

### 2. Frame rendering (Canvas API)

The app uses a single `<canvas>` whose internal pixel size matches the chosen aspect ratio (540×960 for 9:16, etc.). A `drawFrameAt(currentTime)` function paints each frame in four layers:

1. **Background** — if a user-uploaded image exists, draw it cover-fit; otherwise fill with the chosen solid color.
2. **Dark overlay** — semi-transparent black rectangle (0–80% opacity) for text readability.
3. **Waveform** — read a sliding window of ~96 peaks centered on the current playback time, then render it according to the chosen style (bars / line / mirror / radial). Color is solid or a vertical 2-stop linear gradient.
4. **Text overlay** — optional title (top) and subtitle (bottom) with the chosen font and color, sized relative to frame width, with a soft text shadow.

During live preview, a `requestAnimationFrame` loop calls `drawFrameAt(audioEl.currentTime)` every frame. The same function is used during rendering — there is no separate render path. WYSIWYG.

### 3. Video capture (MediaRecorder API)

Rendering combines the canvas video track with the audio stream into a single `MediaStream`, then records it in real time:

```js
const canvasStream = canvas.captureStream(30);                  // 30 fps video
const audioDest = audioCtx.createMediaStreamDestination();      // audio destination
sourceNode.connect(audioDest);                                  // route audio in
const combined = new MediaStream([
  ...canvasStream.getVideoTracks(),
  ...audioDest.stream.getAudioTracks()
]);
const recorder = new MediaRecorder(combined, {
  mimeType: 'video/webm;codecs=vp9,opus',
  videoBitsPerSecond: 4_000_000
});
recorder.start(200);                          // collect chunks every 200 ms
audioEl.play();                                // start playback (drives the rAF loop)
// ... on audio 'ended' event, after a 250 ms flush:
recorder.stop();
// recorder.onstop → new Blob(chunks, {type:'video/webm'}) → download URL
```

The renderer picks the best supported MIME type in order: `video/webm;codecs=vp9,opus` → `vp8,opus` → `vp9` → `vp8` → `video/webm` → `video/mp4` (Safari fallback). The output file extension matches the actual format.

## Browser support

| Feature | Chrome | Firefox | Edge | Safari | Opera |
| --- | --- | --- | --- | --- | --- |
| Web Audio decode (MP3/WAV/OGG) | ✓ | ✓ | ✓ | ✓ (no OGG) | ✓ |
| Canvas rendering | ✓ | ✓ | ✓ | ✓ | ✓ |
| MediaRecorder (WebM) | ✓ | ✓ | ✓ | ✗ | ✓ |
| MediaRecorder (MP4) | ✗ | ✗ | ✗ | ~14+ experimental | ✗ |
| canvas.captureStream | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Full app (render WebM)** | **✓** | **✓** | **✓** | **partial** | **✓** |

For reliable rendering, use Chrome, Firefox, or Edge on desktop. Safari 14+ has partial support: it can decode audio and render canvas, but MediaRecorder may produce files without audio or fail outright. iOS Safari does not support MediaRecorder reliably.

## Limitations

- **Real-time render** — MediaRecorder captures in real time. A 60-second clip takes ~60 seconds to render. There is no faster native approach without external libraries (ffmpeg.wasm would add ~25 MB to the page).
- **WebM, not MP4** — Chrome, Firefox, and Edge output WebM (VP9 + Opus). MP4 recording is not yet consistently supported. TikTok, Reels, and Shorts all accept WebM uploads natively. For MP4, convert with HandBrake or ffmpeg.
- **Memory bound** — decoding a 10-minute audio file into PCM can use several hundred MB of RAM. Files over ~50 MB or 30 minutes may slow down or fail on low-memory devices.
- **Tab must stay focused** — browsers throttle `requestAnimationFrame` in background tabs, which can cause dropped frames during render. Keep the tab visible while rendering.
- **No audio track omission** — the audio is always included in the output. The "Mute during render" checkbox only silences your speakers, not the recording. Use a video editor to strip audio if needed.
- **No persistence** — settings are not saved between sessions. Refresh the page and you start fresh.
- **No undo** — settings changes are immediate. To revert, change the setting back manually.
- **Single file at a time** — there is no batch queue. Render one file, download, then load the next.

## Privacy

- **No uploads.** Your audio file is read into browser memory with the File API and decoded with the Web Audio API. It is never transmitted to any server.
- **No tracking.** No analytics, no cookies, no third-party scripts. The page does not load any external resources (no CDN, no Google Fonts, no tracking pixels).
- **No server.** This is a static HTML file. There is no backend that could log or store your data even if it wanted to.
- **localStorage.** The only data stored on your device is the `waveform-theme` key (value: `"light"` or `"dark"`) for theme persistence. Clearing your browser data removes it.
- **Verify it yourself.** Open DevTools → Network tab and load an audio file. You will see no network requests containing audio data.

## Tech stack

- **Web Audio API** — `AudioContext`, `decodeAudioData`, `createMediaElementSource`, `createMediaStreamDestination` for audio decode, routing, and capture.
- **Canvas API** — 2D canvas rendering for the waveform, background, overlay, and text. Frame-composable `drawFrameAt()` function used for both preview and render.
- **MediaRecorder API** — real-time capture of `canvas.captureStream(30)` + audio destination stream into a WebM/MP4 Blob.
- **HTMLAudioElement** — drives playback for both preview and render; provides `currentTime`, `play()`, `pause()`, and `ended` events.
- **File API & URL.createObjectURL** — loads audio and background image files into memory without uploads.
- **Vanilla JavaScript** — no framework, no bundler, no dependencies. Single IIFE in one `<script>` block.
- **CSS custom properties** — light/dark theming via `[data-theme]` attribute on `<html>`.

## License

MIT License — free to use, modify, distribute, and self-host. Attribution appreciated but not required.

## Credits

Built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Powered entirely by native browser APIs (Web Audio, Canvas, MediaRecorder). Inspired by the need for a truly private, no-sign-up alternative to server-based audio visualizer tools.

See also: [BayMerge](https://bayhaqy.my.id/apps/baymerge/) (offline PDF merger), [Image Optimizer](https://bayhaqy.my.id/apps/image-optimizer/) (offline image compression), [Link-in-Bio Builder](https://bayhaqy.my.id/apps/link-in-bio/) — more 100% client-side apps in the same collection.
