# Streamlit Wavesurfer Component

[![PyPI version](https://badge.fury.io/py/streamlit_wavesurfer.svg)](https://badge.fury.io/py/streamlit_wavesurfer)

Forked and extended from [PiotrDabkowski/streamlit_wavesurfer](https://github.com/PiotrDabkowski/streamlit_wavesurfer)

A powerful, extensible Streamlit component for interactive audio waveform visualization and annotation, powered by [wavesurfer.js](https://wavesurfer.xyz/).

## Features

- **Customizable Waveform**: Style the waveform and progress bar, set height, and more.
- **Regions**: Add, edit, and remove regions with callbacks to Python. Supports region metadata and color mapping with [colormap](https://github.com/bpostlethwaite/colormap).
- **Keyboard Shortcuts**: Nudge, play/pause, and and navigate regions with the keyboard for more for efficient annotation.
- **Plugin System**: Enable/disable [wavesurfer.js plugins](https://wavesurfer.xyz/docs/plugins/) (regions, spectrogram, timeline, zoom, hover, minimap, overlay) with type-safe configuration from Python.
- **Spectrogram View**: Visualize audio frequency content (enable via plugin).
- **Extensible**: Add your own plugins or overlays via my other project [wavesurfer-overlay-plugin](https://www.npmjs.com/package/wavesurfer-overlay-plugin).
- **Numpy Audio Support**: Load audio directly from numpy arrays or via popular python libs like librosa, pydub or soundfile.
- **Type-Safe, Modern React Frontend**: Built with Jotai, shadcn/ui, and TailwindCSS.

## Quickstart

### 1. Install

```bash
pip install streamlit-wavesurfer
```

### 2. Basic Usage

```python
import streamlit as st
from streamlit_wavesurfer import wavesurfer, Region

# Define regions
regions = [
    Region(start=0, end=5, content="Intro"),
    Region(start=5, end=10, content="Verse"),
]

# Display the waveform
wavesurfer(
    audio_src="https://example.com/audio.mp3",
    regions=regions,
    plugins=["regions", "timeline", "zoom"],  # Enable desired plugins
    show_controls=True,
)
```

### 3. Advanced: Custom Plugin Configuration

```python
from streamlit_wavesurfer import WaveSurferPluginConfiguration, OverlayPluginOptions

overlay_plugin = WaveSurferPluginConfiguration(
    name="overlay",
    options=OverlayPluginOptions(
        imageUrl="https://example.com/overlay.png",
        position="overlay",
        opacity=0.5,
    ),
)

wavesurfer(
    audio_src="https://example.com/audio.mp3",
    plugins=[overlay_plugin, "regions", "timeline"],
)
```

## Supported Plugins

- `regions`: Mark and annotate audio segments.
- `timeline`: Show time notches and labels.
- `zoom`: Zoom in/out of the waveform.
- `hover`: Show time on hover.
- `minimap`: Scrollbar-style mini waveform.
- `spectrogram`: Frequency visualization.
- `overlay`: Overlay images on the waveform.

See the [wavesurfer.js plugin docs](https://wavesurfer.xyz/docs/plugins/) for details.

## API

### `wavesurfer(...)`

| Argument         | Type      | Description                                                      |
|------------------|-----------|------------------------------------------------------------------|
| `audio_src`      | str       | URL or path to audio file (or base64/numpy, planned)             |
| `regions`        | list      | List of `Region` or dicts                                        |
| `plugins`        | list      | List of plugin names or `WaveSurferPluginConfiguration`          |
| `wave_options`   | object    | Waveform display options                                         |
| `region_colormap`| str       | Colormap for region coloring                                     |
| `show_controls`  | bool      | Show play/pause/skip controls                                    |
| `key`            | str       | Streamlit component key                                          |

Returns:  

- The current state, including regions and last update timestamp.

### `Region`

```python
Region(start: float, end: float, content: str, id: Optional[str] = None, color: Optional[str] = None)
```

## 🛠️ Development

- Frontend: React, TypeScript, Jotai, shadcn/ui, TailwindCSS
- Backend: Python, Streamlit
- Package manager: [bun](https://bun.sh/) (not npm)

### Build Frontend

```bash
cd streamlit_wavesurfer/frontend
bun install
bun run build
```

### Run Example App

```bash
streamlit run streamlit_wavesurfer/__init__.py
```

## Known Issues / TODO

- [ ] Allow skipping to region/time from Python
- [ ] Load audio from numpy arrays
- [ ] Region validation from Python
- [ ] Keyboard shortcuts require initial button press

See [wavesurfer.js docs](https://wavesurfer.xyz/) and [Streamlit docs](https://streamlit.io/) for more.

---

**Contributions welcome!**  
LICENSE MIT  
© 2025 Liam Power

---
