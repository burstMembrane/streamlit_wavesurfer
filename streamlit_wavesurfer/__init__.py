__all__ = ["wavesurfer", "Region", "RegionColormap", "WaveSurferOptions"]


import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import streamlit as st
import streamlit.components.v1 as components
from streamlit import _main
from streamlit.elements.media import AudioProto, marshall_audio

# When False => run: npm start
# When True => run: npm run build
_RELEASE = True


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
    _component_func = components.declare_component(
        "wavesurfer", path=str(build_dir))


def resolve_audio_src(audio_src: str) -> str:
    """Resolve the audio source URL based on the environment and source type.

    Args:
        audio_src: The audio source path or URL

    Returns:
        The resolved audio URL

    Raises:
        ValueError: If the audio file doesn't exist
    """
    if _RELEASE and not audio_src.startswith("http"):
        audio_path = Path(audio_src)
        if not audio_path.exists():
            raise ValueError(
                f"Provided audio file {audio_src} does not exist!")
        session = st.runtime.get_instance(
        )._session_mgr.list_active_sessions()[0]
        st_base_url = urllib.parse.urlunparse(
            [
                session.client.request.protocol,
                session.client.request.host,
                "",
                "",
                "",
                "",
            ]
        )

        p = AudioProto()
        # TODO: This can take a lot more formats, like numpy arrays etc -- lets add that later
        marshall_audio(
            data=str(audio_path),
            coordinates=_main.dg._get_delta_path_str(),
            proto=p,
            mimetype="audio/wav",
            start_time=0,
            end_time=10,
            sample_rate=None,
        )

        return st_base_url + p.url
    else:
        # In development mode, we need to serve the file through the dev server
        if not audio_src.startswith("http"):
            audio_path = Path(audio_src)
            if not audio_path.exists():
                raise ValueError(
                    f"Provided audio file {audio_src} does not exist!")
            # Serve the file through the dev server
            return f"http://localhost:3001/{audio_path.name}"
        else:
            return audio_src


def wavesurfer(
    audio_src: str,
    regions: Optional[RegionList] | List[Region] | List[dict] = None,
    key: Optional[str] = None,
    wave_options: WaveSurferOptions = None,
    region_colormap: Optional[Colormap] = None,
    show_spectrogram: bool = False,
    show_minimap: bool = False,
) -> bool:
    """Nice audio/video player with audio track selection support.

    User can select one of many provided audio tracks (one for each actor) and switch between them in real time.
    All audio tracks (and video of provided) are synchronized.

    Returns:
     False when not yet initialized (something is loading), and True when ready.
    """

    audio_url = resolve_audio_src(audio_src)
    st.write(wave_options.to_dict())

    # Handle regions input

    component_value = _component_func(
        audio_src=audio_url,
        regions=None,
        key=key,
        default=0,
        wave_options=wave_options.to_dict(),
        region_colormap=region_colormap,
        show_spectrogram=show_spectrogram,
        show_minimap=show_minimap,
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
        regions_path = Path(__file__).parent / "frontend" / \
            "public" / "because.json"
        with open(regions_path, "r") as f:
            regions = json.load(f)
        return regions

    @st.cache_data
    def audio_src() -> str:
        """Sample audio source from the audio file."""
        audio_path = Path(__file__).parent / "frontend" / \
            "public" / "because.mp3"
        return str(audio_path.absolute())

    st.set_page_config(layout="wide")

    regions = RegionList(regions())
    audio_file_path = Path(__file__).parent / \
        "frontend" / "public" / "because.mp3"
    colormap_options = list(Colormap.__args__)
    colormap_selection = st.selectbox(
        "Select a colormap",
        colormap_options,
        index=colormap_options.index("magma"),
    )
    cols = st.columns(2)
    with cols[0]:
        wavecolor_selection = st.color_picker(
            "Select a wave color", value="#4f4f4f")

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
