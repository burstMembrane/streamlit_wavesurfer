__all__ = ["wavesurfer", "Region"]
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import streamlit.components.v1 as components

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


if not _RELEASE:
    _component_func = components.declare_component(
        "wavesurfer",
        url="http://localhost:3001",
    )
else:
    parent_dir = Path(__file__).parent
    build_dir = parent_dir / "frontend" / "build"
    _component_func = components.declare_component("wavesurfer", path=str(build_dir))


def wavesurfer(
    audio_src: str,
    regions: List[Region],
    key: Optional[str] = None,
) -> bool:
    """Nice audio/video player with audio track selection support.

    User can select one of many provided audio tracks (one for each actor) and switch between them in real time.
    All audio tracks (and video of provided) are synchronized.

    Returns:
     False when not yet initialized (something is loading), and True when ready.
    """
    import urllib.parse

    import streamlit as st
    from streamlit import _main
    from streamlit.elements.media import AudioProto, marshall_audio

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
        marshall_audio(
            data=str(audio_path),
            coordinates=_main.dg._get_delta_path_str(),
            proto=p,
            mimetype="audio/wav",
            start_time=0,
            sample_rate=None,
        )

        audio_url = st_base_url + p.url
    else:
        # In development mode, we need to serve the file through the dev server
        if not audio_src.startswith("http"):
            audio_path = Path(audio_src)
            if not audio_path.exists():
                raise ValueError(f"Provided audio file {audio_src} does not exist!")
            # Serve the file through the dev server
            audio_url = f"http://localhost:3001/{audio_path.name}"
        else:
            audio_url = audio_src

    if not regions:
        regions = []
    component_value = _component_func(
        audio_src=audio_url,
        key=key,
        default=0,
    )
    return bool(component_value)


# For development, displays stub audio_selector.
if not _RELEASE:
    import random
    from pathlib import Path

    import streamlit as st

    st.set_page_config(layout="wide")

    regions = []
    for e in range(30):
        regions.append(
            Region(
                start=1.0 + e,
                end=2.0 + e,
                content=f"hello{e}" * random.randrange(1, 4),
            )
        )

    # debug with st audio
    audio_file_path = Path(__file__).parent / "frontend" / "public" / "because.mp3"
    st.write(f"DEBUG: {audio_file_path}")
    # st.audio(str(audio_file_path.absolute()))

    num_clicks = wavesurfer(
        audio_src=str(audio_file_path.absolute()),
        regions=regions,
        key="wavesurfer",
    )
