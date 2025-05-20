__all__ = [
    "wavesurfer",
    "Region",
    "RegionColormap",
    "WaveSurferOptions",
    "RegionList",
    "WaveSurferPluginConfigurationList",
]


from os import getenv
from pathlib import Path
from typing import List, Literal, Optional

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

from streamlit_wavesurfer.utils import (
    DEFAULT_PLUGINS,
    AudioData,
    Colormap,
    ImageData,
    OverlayPluginOptions,
    Region,
    RegionList,
    RegionsPluginOptions,
    WaveSurferOptions,
    WaveSurferPluginConfiguration,
    WaveSurferPluginConfigurationList,
    ZoomPluginOptions,
    audio_to_base64,
    image_to_base64,
)

load_dotenv()

# When False => run: npm start
# When True => run: npm run build
# _RELEASE = True if getenv("RELEASE", "True") == "True" else False
_RELEASE = True
if not _RELEASE:
    _component_func = components.declare_component(
        "wavesurfer",
        url="http://localhost:5432",
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
    """A waveform viewer that supports wavesurfer plugins
    @param audio_src: The source of the audio file.
    @param regions: The regions to display on the waveform.
    @param key: The key of the wavesurfer component.
    @param wave_options: The options for the waveform.
    @param region_colormap: The colormap for the regions.
    @param show_controls: Whether to show the controls.
    @param plugins: The plugins to use.


    @example
    # Use a list of regions to display on the waveform
    ```python
    wavesurfer(
        audio_src="https://example.com/audio.mp3",
        regions=[Region(start=0, end=100, content="Hello, world!")],
    )
    ```

    @example
    # Use a list of plugin names to enable plugins
    ```python
    wavesurfer(
        audio_src="https://example.com/audio.mp3",
        plugins=["regions", "spectrogram", "timeline", "zoom", "hover", "minimap"],
    )
    ```
    Returns:
        The state of the wavesurfer component.
        regions: The regions currently displayed on the waveform.
        ts: The timestamp of the last region change.
    """
    if plugins is None:
        plugins = DEFAULT_PLUGINS
    # plugin config
    plugin_configurations = None
    if isinstance(plugins, list):
        if all(isinstance(plugin, str) for plugin in plugins):
            plugins = WaveSurferPluginConfigurationList.from_name_list(plugins)
        else:
            plugins = WaveSurferPluginConfigurationList(plugins=plugins)
        plugin_configurations = plugins.to_dict()
    if isinstance(wave_options, WaveSurferOptions):
        wave_options = wave_options.to_dict()
    audio_url: AudioData = audio_to_base64(audio_src)
    if not isinstance(regions, list):
        # initialize empty list
        regions = []
    if isinstance(regions, list) and all(
        isinstance(region, dict) for region in regions
    ):
        regions = regions
    elif isinstance(regions, RegionList):
        regions = regions.to_dict()
    elif all(isinstance(region, Region) for region in regions):
        regions = [region.to_dict() for region in regions]

    component_value = _component_func(
        audio_src=audio_url,
        regions=regions if regions else None,
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
    from streamlit.components.v1 import html

    @st.cache_data
    def regions() -> List[Region]:
        """Sample regions from the audio file."""
        regions_path = Path(__file__).parent.parent / "assets" / "because.json"
        with open(regions_path, "r") as f:
            regions = json.load(f)
        return regions

    @st.cache_data
    def audio_src() -> str:
        """Sample audio source from the audio file."""
        audio_path = Path(__file__).parent.parent / "assets" / "because.mp3"
        return str(audio_path.absolute())

    @st.cache_data
    def image_src() -> str:
        """Sample image source from the image file."""

        image_path = Path(__file__).parent.parent / "assets" / "because.png"
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

    overlay_selection = st.checkbox("Overlay", value=False)
    if overlay_selection:
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

    region_plugin_configuration = WaveSurferPluginConfiguration(
        name="regions",
        options=RegionsPluginOptions(),
    )
    plugins = [
        region_plugin_configuration,
        zoom_plugin_configuration,
    ]
    if overlay_selection:
        plugins.append(overlay_plugin_configuration)
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
        plugins=plugins,
        region_colormap=colormap_selection,
        show_controls=True,
    )
    if state and "syncChannelId" in state:
        # get the sync channel id

        sync_channel_id = state.get("syncChannelId", None)
        st.markdown(f"syncChannelId: {sync_channel_id}")
        if sync_channel_id:
            html(
                """
                <script>

             
                console.log("syncChannelId", "{}");
                // Create a unique channel name based on the component key
                setTimeout(() => {{
                syncChannel = new BroadcastChannel("{}");
             
                // Listen for messages from other instances
                syncChannel.onmessage = (event) => {{
                    console.log(event);
                    if (event.data.type === "timeUpdate") {{
                        console.log("timeUpdate", event.data.time);
                    }}
                }};
                console.log("syncChannel", syncChannel);
                // post a message to the sync channel
                setTimeout(() => {{
                    syncChannel.postMessage({{
                        type: "ready",
                        time: 0
                    }});
                    }}, 1000);
                    
                }}, 1000);



              
            </script>
            """.format(
                    sync_channel_id,
                    sync_channel_id,
                )
            )
            # subsctibe to window.postMessage
            html(
                """
                <script>
                console.log("subscribing to window.postMessage");
                window.addEventListener("message", (event) => {
                    console.log(event);
                });
                </script>
                """
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
