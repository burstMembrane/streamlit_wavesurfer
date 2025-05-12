import base64
import io
from dataclasses import dataclass
from mimetypes import guess_type
from pathlib import Path
from typing import Any, Callable, Dict, List, Literal, Optional, Union

import numpy as np
import requests
import soundfile as sf
import streamlit as st
from dataclasses_json import dataclass_json
from streamlit import url_util

AudioData = str | bytes | io.BytesIO | np.ndarray | io.FileIO
ImageData = str | Path | bytes | io.BytesIO
PLUGIN_NAMES = [
    "regions",
    "spectrogram",
    "timeline",
    "zoom",
    "hover",
    "minimap",
    "overlay",
]


@dataclass_json
@dataclass
class BasePluginOptions:
    pass

    def __default_options__(self):
        return {}

    @classmethod
    def from_name(cls, name: str):
        if name == "regions":
            return RegionsPluginOptions()
        elif name == "spectrogram":
            return SpectrogramPluginOptions()
        elif name == "timeline":
            return TimelinePluginOptions()
        elif name == "zoom":
            return ZoomPluginOptions()
        elif name == "hover":
            return HoverPluginOptions()
        elif name == "minimap":
            return MinimapPluginOptions()
        elif name == "overlay":
            return OverlayPluginOptions()
        else:
            raise ValueError(f"Unknown plugin: {name}")


@dataclass_json
@dataclass
class RuntimePluginInstance:
    listeners: Dict[str, Any]
    subscriptions: List[Any]
    options: Optional[Any] = None


@dataclass_json
@dataclass
class RegionsPluginOptions(BasePluginOptions):
    pass


@dataclass_json
@dataclass
class SpectrogramPluginOptions(BasePluginOptions):
    # Selector of element or element in which to render
    container: Optional[str] = None
    # Number of samples to fetch to FFT. Must be a power of 2.
    fftSamples: Optional[int] = None
    # Height of the spectrogram view in CSS pixels
    height: Optional[int] = None
    # Set to true to display frequency labels.
    labels: Optional[bool] = None
    labelsBackground: Optional[str] = None
    labelsColor: Optional[str] = None
    labelsHzColor: Optional[str] = None
    # Size of the overlapping window. Must be < fftSamples. Auto deduced from canvas size by default.
    noverlap: Optional[int] = None
    # The window function to be used.
    windowFunc: Optional[
        Literal[
            "bartlett",
            "bartlettHann",
            "blackman",
            "cosine",
            "gauss",
            "hamming",
            "hann",
            "lanczoz",
            "rectangular",
            "triangular",
        ]
    ] = None
    # Some window functions have this extra value. (Between 0 and 1)
    alpha: Optional[float] = None
    # Min frequency to scale spectrogram.
    frequencyMin: Optional[int] = None
    # Max frequency to scale spectrogram. Set this to samplerate/2 to draw whole range of spectrogram.
    frequencyMax: Optional[int] = None
    # Based on: https://manual.audacityteam.org/man/spectrogram_settings.html
    # - Linear: Linear The linear vertical scale goes linearly from 0 kHz to 20 kHz frequency by default.
    # - Logarithmic: This view is the same as the linear view except that the vertical scale is logarithmic.
    # - Mel: The name Mel comes from the word melody to indicate that the scale is based on pitch comparisons. This is the default scale.
    # - Bark: This is a psychoacoustical scale based on subjective measurements of loudness. It is related to, but somewhat less popular than, the Mel scale.
    # - ERB: The Equivalent Rectangular Bandwidth scale or ERB is a measure used in psychoacoustics, which gives an approximation to the bandwidths of the filters in human hearing
    scale: Optional[Literal["linear", "logarithmic", "mel", "bark", "erb"]] = None
    # Increases / decreases the brightness of the display.
    # For small signals where the display is mostly "blue" (dark) you can increase this value to see brighter colors and give more detail.
    # If the display has too much "white", decrease this value.
    # The default is 20dB and corresponds to a -20 dB signal at a particular frequency being displayed as "white".
    gainDB: Optional[int] = None
    # Affects the range of signal sizes that will be displayed as colors.
    # The default is 80 dB and means that you will not see anything for signals 80 dB below the value set for "Gain".
    rangeDB: Optional[int] = None
    # A 256 long array of 4-element arrays. Each entry should contain a float between 0 and 1 and specify r, g, b, and alpha.
    # Each entry should contain a float between 0 and 1 and specify r, g, b, and alpha.
    # - gray: Gray scale.
    # - igray: Inverted gray scale.
    # - roseus: From https://github.com/dofuuz/roseus/blob/main/roseus/cmap/roseus.py
    colorMap: Optional[Literal["gray", "igray", "roseus"] | List[List[float]]] = None
    # Render a spectrogram for each channel independently when true.
    splitChannels: Optional[bool] = None
    # URL with pre-computed spectrogram JSON data, the data must be a Uint8Array[][]
    frequenciesDataUrl: Optional[str] = None


@dataclass_json
@dataclass
class TimelinePluginOptions(BasePluginOptions):
    # The height of the timeline in pixels, defaults to 20
    height: Optional[int] = None
    # HTML element or selector for a timeline container, defaults to wavesufer's container
    container: Optional[Union[str, Any]] = None
    # Pass 'beforebegin' to insert the timeline on top of the waveform
    insertPosition: Optional[str] = None
    # The duration of the timeline in seconds, defaults to wavesurfer's duration
    duration: Optional[float] = None
    # Interval between ticks in seconds
    timeInterval: Optional[float] = None
    # Interval between numeric labels in seconds
    primaryLabelInterval: Optional[float] = None
    # Interval between secondary numeric labels in seconds
    secondaryLabelInterval: Optional[float] = None
    # Interval between numeric labels in timeIntervals (i.e notch count)
    primaryLabelSpacing: Optional[float] = None
    # Interval between secondary numeric labels in timeIntervals (i.e notch count)
    secondaryLabelSpacing: Optional[float] = None
    # offset in seconds for the numeric labels
    timeOffset: Optional[float] = None
    # Custom inline style to apply to the container
    style: Optional[Union[Dict[str, Any], str]] = None
    # Turn the time into a suitable label for the time.
    formatTimeCallback: Optional[Callable[[float], str]] = None
    # Opacity of the secondary labels, defaults to 0.25
    secondaryLabelOpacity: Optional[float] = None

    def __default_options__(self):
        return {
            "height": 10,
        }


@dataclass_json
@dataclass
class ZoomPluginOptions:
    # The amount of zoom per wheel step, e.g. 0.5 means a 50% magnification per scroll
    scale: Optional[float] = None
    # Maximum zoom level
    maxZoom: Optional[float] = None
    # The amount the wheel or trackpad needs to be moved before zooming the waveform
    deltaThreshold: Optional[float] = None
    # Whether to zoom into the waveform using a consistent exponential factor instead of a linear scale
    exponentialZooming: Optional[bool] = None
    # Number of steps required to zoom from the initial zoom level to maxZoom
    iterations: Optional[int] = None

    def __default_options__(self):
        return {
            "exponentialZooming": True,
            "iterations": 100,
        }


@dataclass_json
@dataclass
class HoverPluginOptions(BasePluginOptions):
    # Color of the hover line
    lineColor: Optional[str] = None
    # Width of the hover line
    lineWidth: Optional[Union[str, float]] = None
    # Color of the hover label text
    labelColor: Optional[str] = None
    # Size of the hover label text
    labelSize: Optional[Union[str, float]] = None
    # Background color of the hover label
    labelBackground: Optional[str] = None


@dataclass_json
@dataclass
class MinimapPluginOptions(BasePluginOptions):
    # Color of the minimap overlay
    overlayColor: Optional[str] = None
    # Position of the minimap
    # beforebegin: Before the targetElement itself.
    # afterbegin: Just inside the targetElement, before its first child.
    # beforeend: Just inside the targetElement, after its last child.
    # afterend: After the targetElement itself.
    insertPosition: Optional[
        Literal["beforebegin", "afterbegin", "beforeend", "afterend"]
    ] = None


@dataclass_json
@dataclass
class PluginOptionsMap:
    regions: Optional[RegionsPluginOptions] = None
    spectrogram: Optional[SpectrogramPluginOptions] = None
    timeline: Optional[TimelinePluginOptions] = None
    zoom: Optional[ZoomPluginOptions] = None
    hover: Optional[HoverPluginOptions] = None
    minimap: Optional[MinimapPluginOptions] = None


@dataclass_json
@dataclass
class OverlayPluginOptions(BasePluginOptions):
    # URL or array of URLs for the overlay image(s)
    imageUrl: str | List[str]
    # Container element or selector string for the overlay
    container: Optional[str] = None
    # Background color of the overlay container
    backgroundColor: Optional[str] = None
    # Duration of the audio in seconds (if not provided, will use WaveSurfer's duration)
    duration: Optional[float] = None
    # Opacity value(s) for the overlay image(s) (0-1)
    opacity: Optional[float] = None
    # Position of the overlay relative to the waveform ('overlay' or 'underlay')
    position: Optional[Literal["overlay", "underlay"]] = None
    # Whether to hide the waveform
    hideWaveform: Optional[bool] = None
    # Rendering mode for the overlay image(s)
    imageRendering: Optional[Literal["auto", "pixelated", "smooth"]] = None


@dataclass_json
@dataclass
class InstantiatedPlugin:
    listeners: Dict[str, Any]
    subscriptions: List[Any]
    options: Optional[Any] = None


@dataclass_json
@dataclass
class WaveSurferPluginConfiguration:
    name: Literal[
        "regions",
        "spectrogram",
        "timeline",
        "zoom",
        "hover",
        "minimap",
        "overlay",
    ]
    options: (
        MinimapPluginOptions
        | RegionsPluginOptions
        | TimelinePluginOptions
        | ZoomPluginOptions
        | HoverPluginOptions
        | OverlayPluginOptions
    )

    instance: Optional[InstantiatedPlugin] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "options": self.options,
            # Skip instance since it contains non-serializable objects
        }

    def __json__(self) -> Dict[str, Any]:
        return self.to_dict()

    @classmethod
    def from_name(cls, name: str):
        if name == "regions":
            return cls(
                name="regions", options=RegionsPluginOptions().__default_options__()
            )
        elif name == "spectrogram":
            return cls(
                name="spectrogram",
                options=SpectrogramPluginOptions().__default_options__(),
            )
        elif name == "timeline":
            return cls(
                name="timeline", options=TimelinePluginOptions().__default_options__()
            )
        elif name == "zoom":
            return cls(name="zoom", options=ZoomPluginOptions().__default_options__())
        elif name == "hover":
            return cls(name="hover", options=HoverPluginOptions().__default_options__())
        elif name == "minimap":
            return cls(
                name="minimap", options=MinimapPluginOptions().__default_options__()
            )
        else:
            raise ValueError(
                f"Unknown plugin: {name}. Valid plugins are: {', '.join(PLUGIN_NAMES)}"
            )


@dataclass_json
@dataclass
class WaveSurferPluginConfigurationList:
    plugins: List[WaveSurferPluginConfiguration]

    def __next__(self):
        return next(self.plugins)

    def __iter__(self):
        return iter(self.plugins)

    def __len__(self):
        return len(self.plugins)

    def __getitem__(self, index):
        return self.plugins[index]

    def to_dict(self) -> Dict[str, Any]:
        return [plugin.to_dict() for plugin in self.plugins]

    @classmethod
    def from_name_list(cls, name_list: List[str]):
        return cls(
            plugins=[
                WaveSurferPluginConfiguration.from_name(name) for name in name_list
            ]
        )


DEFAULT_PLUGINS = [
    WaveSurferPluginConfiguration(
        name="regions",
        options=RegionsPluginOptions().__default_options__(),
    ),
    WaveSurferPluginConfiguration(
        name="timeline",
        options=TimelinePluginOptions().__default_options__(),
    ),
    WaveSurferPluginConfiguration(
        name="zoom",
        options=ZoomPluginOptions().__default_options__(),
    ),
]

DEFAULT_PLUGINS = WaveSurferPluginConfigurationList(plugins=DEFAULT_PLUGINS)

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


def get_image_mime_type(image_data: ImageData) -> str:
    mime_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "webp": "image/webp",
    }
    if isinstance(image_data, (str, Path)):
        ext = Path(image_data).suffix.lower()
        return guess_type(image_data)[0] or mime_types.get(ext, "image/png")
    elif isinstance(image_data, np.ndarray):
        return "image/png"
    elif isinstance(image_data, (bytes, bytearray)):
        return "image/png"
    elif isinstance(image_data, io.BytesIO):
        return "image/png"
    else:
        st.error(f"Unsupported image data type: {type(image_data)}")


def get_mime_type(audio_data: AudioData) -> str:
    mime_types = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "flac": "audio/flac",
        "webm": "audio/webm",
    }
    if isinstance(audio_data, (str, Path)):
        ext = Path(audio_data).suffix.lower()
        return guess_type(audio_data)[0] or mime_types.get(ext, "audio/wav")
    elif isinstance(audio_data, np.ndarray):
        return "audio/wav"
    elif isinstance(audio_data, (bytes, bytearray)):
        return "audio/wav"
    elif isinstance(audio_data, io.BytesIO):
        return "audio/wav"


@st.cache_data
def audio_to_base64(audio_data: Optional[AudioData]) -> Optional[str]:
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
            mime_type = get_mime_type(audio_data)
            return f"data:{mime_type};base64,{audio_base64}"
        elif url_util.is_url(audio_data, allowed_schemas=("http", "https", "data")):
            # Try to download the audio from the URL.
            audio_url = audio_data
            response = requests.get(audio_url)

            # Check if the response is a valid audio file.
            if response.status_code != 200:
                raise requests.HTTPError(
                    f"Failed to download audio from URL: {audio_data}"
                )
            mime_type = get_mime_type(audio_data)
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode()
            return f"data:{mime_type};base64,{audio_base64}"
        # If the audio already is a base64 string, return it as is.
        return audio_data
    elif isinstance(audio_data, np.ndarray):
        # If it's a numpy array, convert it to WAV format.
        buffer = io.BytesIO()
        sf.write(buffer, audio_data, samplerate=16000, format="WAV")
        buffer.seek(0)
        audio_base64 = base64.b64encode(buffer.read()).decode()
        mime_type = get_mime_type(audio_data)
        return f"data:{mime_type};base64,{audio_base64}"
    elif isinstance(audio_data, (bytes, bytearray)):
        # If it's a bytes or bytearray object.
        audio_base64 = base64.b64encode(audio_data).decode()
        mime_type = get_mime_type(audio_data)
        return f"data:{mime_type};base64,{audio_base64}"
    elif isinstance(audio_data, io.BytesIO):
        # If it's a BytesIO object.
        audio_data.seek(0)
        audio_base64 = base64.b64encode(audio_data.read()).decode()
        mime_type = get_mime_type(audio_data)
        return f"data:{mime_type};base64,{audio_base64}"
    elif isinstance(audio_data, (io.RawIOBase, io.BufferedReader)):
        # If it's a file object.
        audio_base64 = base64.b64encode(audio_data.read()).decode()
        mime_type = get_mime_type(audio_data)
        return f"data:{mime_type};base64,{audio_base64}"
    else:
        st.error(f"Unsupported audio data type: {type(audio_data)}")
        return None


@st.cache_data
def image_to_base64(image_data: Optional[ImageData]) -> Optional[str]:
    if image_data is None:
        return None
    if isinstance(image_data, (str, Path)):
        with open(image_data, "rb") as f:
            image_bytes = f.read()
            image_base64 = base64.b64encode(image_bytes).decode()
            mime_type = get_image_mime_type(image_data)
            return f"data:{mime_type};base64,{image_base64}"
    elif isinstance(image_data, (bytes, bytearray)):
        image_base64 = base64.b64encode(image_data).decode()
        mime_type = get_mime_type(image_data)
        return f"data:{mime_type};base64,{image_base64}"
    elif isinstance(image_data, io.BytesIO):
        image_data.seek(0)
        image_base64 = base64.b64encode(image_data.read()).decode()
        mime_type = get_image_mime_type(image_data)
        return f"data:{mime_type};base64,{image_base64}"
    else:
        st.error(f"Unsupported image data type: {type(image_data)}")
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
