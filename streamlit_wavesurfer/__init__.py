__all__ = ["wavesurfer", "Region", "RegionColormap", "WaveSurferOptions"]

import base64
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import numpy as np
import requests
import soundfile as sf
import streamlit as st
import streamlit.components.v1 as components
from streamlit import url_util

AudioData = str | bytes | io.BytesIO | np.ndarray | io.FileIO


# When False => run: npm start
# When True => run: npm run build
_RELEASE = False

Colormap = Literal[
    "jet",
    "hsv",
    "hot",
    "cool",
    "spring",
    "summer",
    "autumn",
    "winter",
    "bone",
    "copper",
    "greys",
    "YIGnBu",
    "greens",
    "YIOrRd",
    "bluered",
    "RdBu",
    "picnic",
    "rainbow",
    "portland",
    "blackbody",
    "earth",
    "electric",
    "magma",
    "viridis",
    "inferno",
    "plasma",
    "turbo",
    "cubehelix",
    "alpha",
    "bathymetry",
    "cdom",
    "chlorophyll",
    "density",
]


@st.cache_data
def _convert_to_base64(audio_data: Optional[AudioData]) -> Optional[str]:
    """Convert different types of audio data to base64 string.

    Parameters:
    ----------
    audio_data : Optional[MediaData]
        Audio data, can be:
        - File path (str or pathlib.Path)
        - URL (str)
        - Raw audio data (bytes, BytesIO)
        - Numpy array (numpy.ndarray)
        - File object

    Returns:
    -------
    Optional[str]
        Base64 encoded audio data string or None if conversion fails.

    Raises:
    ------
    ValueError
        If audio data is None.
    """
    if audio_data is None:
        raise ValueError("Audio data cannot be None")

    if isinstance(audio_data, (str, Path)):
        # If it's a file path.
        audio_data = str(audio_data)
        if Path(audio_data).exists():
            with open(audio_data, "rb") as f:
                audio_bytes = f.read()
                audio_base64 = base64.b64encode(audio_bytes).decode()
                ext = Path(audio_data).suffix.lower()
                mime_type = {
                    ".wav": "audio/wav",
                    ".mp3": "audio/mpeg",
                    ".ogg": "audio/ogg",
                }.get(ext, "audio/wav")
                return f"data:{mime_type};base64,{audio_base64}"
        elif url_util.is_url(audio_data, allowed_schemas=("http", "https", "data")):
            # Try to download the audio from the URL.
            response = requests.get(audio_data)
            if response.status_code == 200:
                audio_bytes = response.content
                audio_base64 = base64.b64encode(audio_bytes).decode()
                return f"data:audio/wav;base64,{audio_base64}"
            else:
                # Fail a error.
                st.error(f"Failed to download audio from URL: {audio_data}")

        # If the audio already is a base64 string, return it as is.
        return audio_data

    elif isinstance(audio_data, np.ndarray):
        # If it's a numpy array, convert it to WAV format.
        buffer = io.BytesIO()
        sf.write(buffer, audio_data, samplerate=16000, format="WAV")
        buffer.seek(0)
        audio_base64 = base64.b64encode(buffer.read()).decode()
        return f"data:audio/wav;base64,{audio_base64}"

    elif isinstance(audio_data, (bytes, bytearray)):
        # If it's a bytes or bytearray object.
        audio_base64 = base64.b64encode(audio_data).decode()
        return f"data:audio/wav;base64,{audio_base64}"

    elif isinstance(audio_data, io.BytesIO):
        # If it's a BytesIO object.
        audio_data.seek(0)
        audio_base64 = base64.b64encode(audio_data.read()).decode()
        return f"data:audio/wav;base64,{audio_base64}"

    elif isinstance(audio_data, (io.RawIOBase, io.BufferedReader)):
        # If it's a file object.
        audio_base64 = base64.b64encode(audio_data.read()).decode()
        # Try to get the MIME type from the file name.
        if hasattr(audio_data, "name"):
            ext = Path(audio_data.name).suffix.lower()
            mime_type = {
                ".wav": "audio/wav",
                ".mp3": "audio/mpeg",
                ".ogg": "audio/ogg",
                ".m4a": "audio/mp4",
                ".flac": "audio/flac",
                ".webm": "audio/webm",
            }.get(ext, "audio/wav")
        else:
            mime_type = "audio/wav"
        return f"data:{mime_type};base64,{audio_base64}"

    else:
        st.error(f"Unsupported audio data type: {type(audio_data)}")
        return None


@dataclass
class Region:
    start: float
    end: float
    content: str = ""
    color: Optional[str] = None
    drag: bool = False
    resize: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start": self.start,
            "end": self.end,
            "content": self.content,
            "color": self.color,
        }


@dataclass
class RegionList:
    regions: List[Region]

    def to_dict(self):
        return [region for region in self.regions]

    def __next__(self):
        return next(self.regions)

    def __iter__(self):
        return iter(self.regions)

    def __len__(self):
        return len(self.regions)

    def __getitem__(self, index):
        return self.regions[index]


@dataclass
class WaveSurferOptions:
    waveColor: str = "violet"
    progressColor: str = "purple"
    cursorWidth: int = 2
    minPxPerSec: int = 100
    fillParent: bool = True
    interact: bool = True
    dragToSeek: bool = True
    autoScroll: bool = True
    autoCenter: bool = True
    sampleRate: int = 44100
    height: int = 240
    width: int | str = "100%"
    barWidth: int = 0
    barGap: int = 0
    barRadius: int = 2
    normalize: bool = True
    hideScrollbar: bool = True
    showMinimap: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__


if not _RELEASE:
    _component_func = components.declare_component(
        "wavesurfer",
        url="http://localhost:3001",
    )
else:
    parent_dir = Path(__file__).parent
    build_dir = parent_dir / "frontend" / "dist"
    print(build_dir)
    _component_func = components.declare_component("wavesurfer", path=str(build_dir))


def wavesurfer(
    audio_src: str,
    regions: Optional[RegionList] | List[Region] | List[dict] = None,
    key: Optional[str] = None,
    wave_options: WaveSurferOptions = None,
    region_colormap: Optional[Colormap] = None,
    show_spectrogram: bool = False,
    show_minimap: bool = False,
    show_controls: bool = True,
) -> bool:
    """Nice audio/video player with audio track selection support.

    User can select one of many provided audio tracks (one for each actor) and switch between them in real time.
    All audio tracks (and video of provided) are synchronized.

    Returns:
     False when not yet initialized (something is loading), and True when ready.
    """

    audio_url = _convert_to_base64(audio_src)

    component_value = _component_func(
        audio_src=audio_url,
        regions=None,
        key=key,
        default=0,
        wave_options=wave_options.to_dict(),
        region_colormap=region_colormap,
        spectrogram=show_spectrogram,
        minimap=show_minimap,
        controls=show_controls,
    )
    return component_value


if not _RELEASE:
    import json
    from pathlib import Path

    import pandas as pd
    import streamlit as st

    @st.cache_data
    def regions() -> List[Region]:
        """Sample regions from the audio file."""
        regions_path = Path(__file__).parent / "frontend" / "public" / "because.json"
        with open(regions_path, "r") as f:
            regions = json.load(f)
        return regions

    @st.cache_data
    def audio_src() -> str:
        """Sample audio source from the audio file."""
        audio_path = Path(__file__).parent / "frontend" / "public" / "because.mp3"
        return str(audio_path.absolute())

    st.set_page_config(layout="wide")

    regions = RegionList(regions())
    audio_file_path = Path(__file__).parent / "frontend" / "public" / "because.mp3"
    colormap_options = list(Colormap.__args__)
    colormap_selection = st.selectbox(
        "Select a colormap",
        colormap_options,
        index=colormap_options.index("magma"),
    )
    cols = st.columns(2)
    with cols[0]:
        wavecolor_selection = st.color_picker("Select a wave color", value="#4f4f4f")

    with cols[1]:
        progresscolor_selection = st.color_picker(
            "Select a progress color", value="#3F51B5"
        )
    # Initialize regions in session state if not already present
    if "regions" not in st.session_state:
        st.session_state.regions = regions
        st.session_state._last_ts = 0

    # Create the wavesurfer component
    state = wavesurfer(
        audio_src=str(audio_file_path.absolute()),
        key="wavesurfer",
        regions=st.session_state.regions,  # Always use the current session state regions
        wave_options=WaveSurferOptions(
            waveColor=wavecolor_selection,
            progressColor=progresscolor_selection,
            autoScroll=True,
            fillParent=True,
            height=300,
        ),
        region_colormap=colormap_selection,
        show_spectrogram=False,
        show_minimap=False,
        show_controls=False,
    )

    # Only update session_state.regions when state["ts"] is new
    if state and "ts" in state:
        last_ts = st.session_state.get("_last_ts", 0)
        if state["ts"] != last_ts:
            st.session_state.regions = RegionList(state["regions"])
            st.session_state["_last_ts"] = state["ts"]

    # Display whatever is in session_state.regions
    df = pd.DataFrame(
        st.session_state.regions.to_dict(),
        columns=["id", "start", "end", "content"],
    )
    st.dataframe(df)
