import React, { useRef, useState, memo, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Save } from 'lucide-react';
import { WavesurferViewerProps } from "@waveformviewer/types";
import { useRegions, useWaveSurfer, useWaveSurferHotkeys, useTimeFormatter, useRegionColors } from "@waveformviewer/hooks";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { KeyboardShortcuts } from "@waveformviewer/KeyboardShortcuts";
// can't use tailwind for the waveform view styles as it's got all sorts of specialized nested elements
import "@waveformviewer/styles.css";
interface AudioControlsProps {
    skipBackward: () => void;
    isPlaying: boolean;
    pause: () => void;
    play: () => void;
    skipForward: () => void;
    currentTime: number;
    duration: number;
}

const AudioControls = ({ skipBackward, isPlaying, pause, play, skipForward, currentTime, duration }: AudioControlsProps) => {
    const formatTime = useTimeFormatter();
    return (
        <div className="flex justify-center items-center gap-2">
            <div className="flex items-center gap-2">
                <button
                    onClick={skipBackward}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    <SkipBack size={20} />
                </button>

                <button
                    onClick={isPlaying ? pause : play}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    {!isPlaying ? <Play size={24} /> : <Pause size={24} />}
                </button>

                <button
                    onClick={skipForward}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    <SkipForward size={20} />
                </button>

                <div className="flex items-center gap-4 text-white">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

        </div>
    )
}
const WaveformViewerComponent: React.FC<WavesurferViewerProps> = ({
    audioSrc,
    regions = [],
    onReady,
    waveOptions,
    onRegionsChange,
    regionColormap,
    showSpectrogram
}) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const [loopRegions, setLoopRegions] = useState(false);
    const colors = useRegionColors(regions, regionColormap);
    const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null);

    const {
        waveform,
        currentTime,
        duration,
        isPlaying,
        play,
        pause,
        skipForward,
        skipBackward,
        setZoom,
        isLoading
    } = useWaveSurfer({
        containerRef: waveformRef as React.RefObject<HTMLDivElement>,
        audioSrc,
        waveOptions,
        showSpectrogram,
        onReady
    });


    // Get and store the RegionsPlugin instance from waveform
    useEffect(() => {
        if (waveform) {
            // Wait until waveform is fully initialized
            setTimeout(() => {
                const plugins = waveform.getActivePlugins();
                const regions = plugins.find(plugin => plugin instanceof RegionsPlugin) as RegionsPlugin | undefined;
                setRegionsPlugin(regions || null);
            }, 100);
        } else {
            setRegionsPlugin(null);
        }
    }, [waveform]);

    const {
        getTargetRegion,
        setActiveRegion,
        reportRegionsToParent,
        updateRegionBoundary,
    } = useRegions(regionsPlugin, regions, colors, loopRegions, onRegionsChange);

    useWaveSurferHotkeys(
        waveform,
        regionsPlugin,
        getTargetRegion,
        updateRegionBoundary,
        setActiveRegion,
        setLoopRegions,
    );

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-4 p-4 w-full box-border">
            <div ref={waveformRef}
                id="waveform"
                className="w-full min-h-[200px] mb-4" />
            <div className="flex justify-between items-center gap-2">
                <AudioControls
                    skipBackward={skipBackward}
                    isPlaying={isPlaying}
                    pause={pause}
                    play={play}
                    skipForward={skipForward}
                    currentTime={currentTime}
                    duration={duration}
                />
                <div className="flex items-center gap-4">
                    <button
                        onClick={reportRegionsToParent}
                        className="bg-gray-800 border-none border-radius-4px cursor-pointer p-2 flex items-center justify-center text-white"
                    >
                        <Save size={16} className="mr-2" />
                        Save Regions
                    </button>
                    <div className="flex items-center gap-4 min-w-[200px]">
                        <span>Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={350}
                            value={100}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setZoom(value);
                            }}
                            className="w-24 flex-1"
                        />
                        <KeyboardShortcuts showAll={regions.length > 0} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const WavesurferViewer = memo(WaveformViewerComponent);

