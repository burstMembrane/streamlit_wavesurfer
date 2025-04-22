# Streamlit Wavesurfer Component

## Features

- [x] Styling customization
- [x] Play pause/skip buttons
- [x] Region start and end callbacks
- [ ] Allow SKIP to region from python with ID so that we can click a region in the interface and skip to it from streamlit
  - [ ] Allow skip to time? then we can just pass through the region start from python (or both)
- [x] Keyboard shortcuts for nudge etc
- [ ] Load audio from numpy arrays
- [ ] Region validation from python?
- [ ] Spectrogram view (is this another component?)

## Bug Fixes

- [ ] Region state management -- need one source of truth, never double up regions (can we use react query?)
- [ ] FIX: need to press a btton before keyboard shortcuts work.
