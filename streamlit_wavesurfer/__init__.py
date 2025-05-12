__all__ = [
    "wavesurfer",
    "Region",
    "RegionColormap",
    "WaveSurferOptions",
    "RegionList",
    "WaveSurferPluginConfigurationList",
]


from pathlib import Path
from typing import List, Literal, Optional

import streamlit as st
import streamlit.components.v1 as components

from streamlit_wavesurfer.utils import (
    DEFAULT_PLUGINS,
    AudioData,
    Colormap,
    ImageData,
    OverlayPluginOptions,
    Region,
    RegionList,
    WaveSurferOptions,
    WaveSurferPluginConfiguration,
    WaveSurferPluginConfigurationList,
    ZoomPluginOptions,
    audio_to_base64,
    image_to_base64,
)

# When False => run: npm start
# When True => run: npm run build
_RELEASE = False
if not _RELEASE:
    st.set_page_config(layout="wide")

    _component_func = components.declare_component(
        "wavesurfer",
        url="http://localhost:3001",
    )
else:
    parent_dir = Path(__file__).parent
    build_dir = parent_dir / "frontend" / "dist"
    build_dir = build_dir.absolute()
    if not build_dir.exists():
        raise FileNotFoundError(f"Build directory {build_dir} does not exist")
    _component_func = components.declare_component("wavesurfer", path=build_dir)


def wavesurfer(
    audio_src: str,
    regions: Optional[RegionList] | List[Region] | List[dict] = None,
    key: Optional[str] = None,
    wave_options: WaveSurferOptions = None,
    region_colormap: Optional[Colormap] = None,
    show_controls: bool = True,
    plugins: Optional[
        List[Literal["regions", "spectrogram", "timeline", "zoom", "hover", "minimap"]]
    ] = None,
) -> bool:
    """Nice audio/video player with audio track selection support.

    User can select one of many provided audio tracks (one for each actor) and switch between them in real time.
    All audio tracks (and video of provided) are synchronized.

    Returns:
     False when not yet initialized (something is loading), and True when ready.
    """
    if plugins is None:
        plugins = DEFAULT_PLUGINS
    # plugin config
    plugin_configurations = None
    # if the plugins is a list, convert it to a WaveSurferPluginConfigurationList
    if isinstance(plugins, list):
        # uf we're just a list of plugin names, configer to wave
        if all(isinstance(plugin, str) for plugin in plugins):
            plugins = WaveSurferPluginConfigurationList.from_name_list(plugins)
        else:
            plugins = WaveSurferPluginConfigurationList(plugins=plugins)
        # conver to dict
        plugin_configurations = plugins.to_dict()
    if wave_options is None:
        wave_options = WaveSurferOptions().to_dict()

    # if we jsut get  alist of plguin names,
    # if the wave_options is the dataclass, convert it to a dict
    if isinstance(wave_options, WaveSurferOptions):
        wave_options = wave_options.to_dict()
    audio_url: AudioData = audio_to_base64(audio_src)

    component_value = _component_func(
        audio_src=audio_url,
        regions=regions.to_dict() if regions else None,
        key=key,
        default=0,
        wave_options=wave_options,
        region_colormap=region_colormap,
        controls=show_controls,
        plugin_configurations=plugin_configurations,
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

    @st.cache_data
    def image_src() -> str:
        """Sample image source from the image file."""

        image_path = Path(__file__).parent / "frontend" / "public" / "because.png"
        return str(image_path.absolute())

    image_url: ImageData = image_to_base64(image_src())

    regions = RegionList(regions())
    colormap_options = list(Colormap.__args__)
    colormap_selection = st.selectbox(
        "Select a colormap",
        colormap_options,
        index=colormap_options.index("cool"),
    )
    cols = st.columns(2)
    with cols[0]:
        wavecolor_selection = st.color_picker("Select a wave color", value="#cccccc")
    with cols[1]:
        progresscolor_selection = st.color_picker(
            "Select a progress color", value="#cccccc"
        )
    # Initialize regions in session state if not already present
    if "regions" not in st.session_state:
        st.session_state.regions = regions
        st.session_state._last_ts = 0
    # overlay plugin options
    overlay_plugin_configuration = WaveSurferPluginConfiguration(
        name="overlay",
        options=OverlayPluginOptions(
            imageUrl=image_url,
            position="overlay",
            opacity=1.0,
            # hideWaveform=True,
        ),
    )
    zoom_plugin_configuration = WaveSurferPluginConfiguration(
        name="zoom",
        options=ZoomPluginOptions().__default_options__(),
    )
    # Create the wavesurfer component
    state = wavesurfer(
        audio_src=audio_src(),
        key="wavesurfer",
        regions=st.session_state.regions,  # Always use the current session state regions
        wave_options=WaveSurferOptions(
            waveColor=wavecolor_selection,
            progressColor=progresscolor_selection,
            autoScroll=True,
            autoCenter=True,
            height=512,
        ),
        plugins=[overlay_plugin_configuration, zoom_plugin_configuration],
        region_colormap=colormap_selection,
        show_controls=True,
    )
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
