__all__ = ["wavesurfer", "Region"]
import random
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import streamlit as st
import streamlit.components.v1 as components
from streamlit import _main
from streamlit.elements.media import AudioProto, marshall_audio

# When False => run: npm start
# When True => run: npm run build
_RELEASE = False


@dataclass
class Region:
    start: float
    end: float
    content: str = ""
    color: Optional[str] = None
    drag: bool = False
    resize: bool = False

    def to_dict(self):
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
    barWidth: int = 3
    barGap: int = 1
    barRadius: int = 2
    normalize: bool = True
    hideScrollbar: bool = True

    def to_dict(self):
        return {
            "waveColor": self.waveColor,
            "progressColor": self.progressColor,
            "cursorWidth": self.cursorWidth,
            "minPxPerSec": self.minPxPerSec,
            "fillParent": self.fillParent,
            "interact": self.interact,
            "dragToSeek": self.dragToSeek,
            "autoScroll": self.autoScroll,
            "autoCenter": self.autoCenter,
            "sampleRate": self.sampleRate,
            "height": self.height,
            "width": self.width,
            "barWidth": self.barWidth,
            "barGap": self.barGap,
            "barRadius": self.barRadius,
            "normalize": self.normalize,
            "hideScrollbar": self.hideScrollbar,
        }


if not _RELEASE:
    _component_func = components.declare_component(
        "wavesurfer",
        url="http://localhost:3001",
    )
else:
    parent_dir = Path(__file__).parent
    build_dir = parent_dir / "frontend" / "build"
    _component_func = components.declare_component("wavesurfer", path=str(build_dir))


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
            raise ValueError(f"Provided audio file {audio_src} does not exist!")
        session = st.runtime.get_instance()._session_mgr.list_active_sessions()[0]
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
                raise ValueError(f"Provided audio file {audio_src} does not exist!")
            # Serve the file through the dev server
            return f"http://localhost:3001/{audio_path.name}"
        else:
            return audio_src


def wavesurfer(
    audio_src: str,
    regions: RegionList,
    key: Optional[str] = None,
    wave_options: WaveSurferOptions = None,
) -> bool:
    """Nice audio/video player with audio track selection support.

    User can select one of many provided audio tracks (one for each actor) and switch between them in real time.
    All audio tracks (and video of provided) are synchronized.

    Returns:
     False when not yet initialized (something is loading), and True when ready.
    """

    audio_url = resolve_audio_src(audio_src)

    if not regions:
        regions = []

    component_value = _component_func(
        audio_src=audio_url,
        regions=regions.to_dict(),
        key=key,
        default=0,
        wave_options=wave_options.to_dict(),
    )
    return bool(component_value)


if not _RELEASE:
    import json
    import random
    from pathlib import Path

    import streamlit as st

    st.set_page_config(layout="wide")

    regions = []

    regions_path = Path(__file__).parent / "frontend" / "public" / "because.json"
    with open(regions_path, "r") as f:
        regions = json.load(f)
    regions = RegionList(regions)
    audio_file_path = Path(__file__).parent / "frontend" / "public" / "because.mp3"
    print(regions)
    num_clicks = wavesurfer(
        audio_src=str(audio_file_path.absolute()),
        regions=regions,
        key="wavesurfer",
        wave_options=WaveSurferOptions(
            waveColor="#ddd",
            progressColor="#3F51B5",
            autoScroll=True,
            fillParent=True,
            height=300,
        ),
    )
