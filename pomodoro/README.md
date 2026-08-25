# Pomodoro Tracker with Ambient Sound Studio

A configurable focus timer paired with a procedural ambient sound mixer. Five background sounds — rain, cafe, ocean waves, white noise and birds — are generated live in your browser through the Web Audio API. No audio files are downloaded, no network requests are made, and nothing leaves your device.

**Live:** <https://bayhaqy.my.id/apps/pomodoro/>

## Features

- **Three configurable modes** — Focus (default 25 min), Short Break (5 min), Long Break (15 min). All durations editable in settings.
- **SVG progress ring** — depletes as the session runs, color-coded red for focus and teal for breaks.
- **Start / Pause / Reset / Skip** controls. Timer uses wall-clock timestamps so it stays accurate even if the tab is throttled.
- **Daily session counter** — tracks completed focus sessions per calendar day, persisted in `localStorage` under `pomodoro-state`. Resets automatically when the date changes.
- **Ambient sound mixer** with five procedurally generated sounds, each with its own volume slider. Multiple sounds layer simultaneously. Master volume control.
- **Settings panel** — focus/short/long durations, long-break cadence, auto-start toggles, completion chime, browser notifications, chime volume.
- **Load sample preset** — instantly applies 50/10/30 durations with rain at 40% and cafe at 20%.
- **Browser notifications** — optional, requested on first start when enabled in settings.
- **Dark mode** — persisted in `localStorage` under `apps-theme`.
- **Offline & private** — single HTML file, no external scripts, no audio assets, no analytics.

## Procedural audio generation

All sounds are synthesized at runtime with the Web Audio API. No audio files are bundled or fetched.

| Sound | Algorithm |
|-------|-----------|
| **Rain** | White noise → 2.4 kHz lowpass → 350 Hz highpass → gain. Removes harsh highs and rumble, leaves the midband hiss of steady rain. |
| **Cafe** | Pink noise → 500 Hz bandpass (Q=0.7) → gain, plus randomly scheduled 150 ms filtered noise bursts (1.5–4 kHz, Q=5) to simulate cups and chatter. |
| **Ocean Waves** | Brown noise → 600 Hz lowpass → gain, modulated by a 0.1 Hz sine LFO (depth 0.3) for wave swell. |
| **White Noise** | Raw white noise buffer, looped, no filtering. |
| **Birds** | Scheduled oscillator chirps at random 1.5–3.5 s intervals. Each chirp is a 200 ms sine blip with an exponential frequency sweep (2.2–4.2 kHz), 40% of chirps trigger a follow-up chirp 150–270 ms later. |
| **Chime** | Three-note ascending bell (C5-E5-G5), each note a sine fundamental plus a 2× harmonic, with exponential decay. |

Noise buffers (white, pink, brown) are pre-generated once into `AudioBuffer` objects (2–4 seconds each) and looped via `AudioBufferSourceNode`. Pink noise uses Paul Kellet's algorithm; brown noise is an integrated random walk.

The entire engine is a single `SoundEngine` object with lazy `AudioContext` initialization triggered by the first user gesture (required by browser autoplay policies).

## How to use

1. **Press Start** — the timer counts down from the focus duration (default 25 min). The ring depletes as time passes.
2. **Optionally enable ambient sounds** — click any sound toggle in the mixer. Adjust each volume independently; multiple sounds layer.
3. **When focus ends** — a chime plays and a short break starts (auto or manual). The session counter increments by one.
4. **After every N focus sessions** (default 4) — a long break replaces the short break. Use Reset to restart the current mode, or Skip to advance immediately.
5. **Customize in Settings** — change durations, toggle auto-start, enable browser notifications, or press Load sample preset to try 50/10/30 with rain + cafe.

## Tech

- Single static HTML file with inline CSS and JS — ~46 KB total, no build step.
- Web Audio API for all sound synthesis (zero audio files).
- SVG circle with `stroke-dashoffset` for the progress ring.
- `Date.now()` timestamps for accurate countdown (immune to `setInterval` throttling).
- CSS custom properties drive dark mode via `[data-theme="dark"]`.
- System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`) for body, `ui-monospace` for the timer display.
- Mobile-responsive grid layout.

## Sample "API" call

This is a static page with no HTTP API. Internally the sound engine can be driven from the browser console:

```js
// Enable rain at 40% and cafe at 20%
window.__pomodoro.SoundEngine.toggle('rain', true);
window.__pomodoro.SoundEngine.setVolume('rain', 0.4);
window.__pomodoro.SoundEngine.toggle('cafe', true);
window.__pomodoro.SoundEngine.setVolume('cafe', 0.2);

// Or trigger a chime manually
window.__pomodoro.SoundEngine.chime(0.6);

// Read current settings
window.__pomodoro.getSettings();
```

For programmatic use in your own project, the core sound generation pattern is:

```js
const ctx = new AudioContext();
const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource();
src.buffer = buffer; src.loop = true;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass'; lp.frequency.value = 2400;
src.connect(lp); lp.connect(ctx.destination);
src.start();
```

## Author

Built by [Achmad Bayhaqy](https://bayhaqy.my.id/). Source on [GitHub](https://github.com/bayhaqy/apps).
