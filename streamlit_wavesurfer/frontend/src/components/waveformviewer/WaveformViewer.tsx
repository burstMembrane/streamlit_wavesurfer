import React, { useRef, useState, memo } from 'react';
import { Save } from 'lucide-react';
import { WavesurferViewerProps } from "@waveformviewer/types";
import { useRegions, useWaveSurfer, useWaveSurferHotkeys, useTimeFormatter } from "@waveformviewer/hooks";
import { KeyboardShortcuts } from "@waveformviewer/KeyboardShortcuts";
import { waveSurferAtom } from "@waveformviewer/atoms/wavesurfer";
// can't use tailwind for the waveform view styles as it's got all sorts of specialized nested elements
import "@waveformviewer/styles.css";
import { useAtomValue } from 'jotai';
import { isPluginActiveAtom } from "@waveformviewer/atoms/plugins";
import { AudioControls } from "@waveformviewer/AudioControls";


const RegionDisplay = () => {
    const {
    } = useRegions();


    return (
        <div className="flex justify-between items-center gap-2">
            <button
                onClick={() => { }}
                className="bg-gray-800 border-none border-radius-4px cursor-pointer p-2 flex items-center justify-center text-white"
            >
                <Save size={16} className="mr-2" />
                Save Regions
            </button>

        </div>
    );
};

const WaveformViewerComponent: React.FC<WavesurferViewerProps> = ({
    audioSrc,
    onReady,
    waveOptions,
    onRegionsChange,
    showSpectrogram,
    showMinimap,
    showControls
}) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const [loopRegions, setLoopRegions] = useState(false);
    const isPluginActive = useAtomValue(isPluginActiveAtom);
    const isRegionPluginActive = isPluginActive("regions");


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
        showMinimap,
        onReady
    });

    const { ready: waveformReady } = useAtomValue(waveSurferAtom);

    //  setup hotkeys
    useWaveSurferHotkeys();

    return (
        <div className="flex flex-col gap-4 p-4 w-full box-border">
            <div ref={waveformRef}
                id="waveform"
                className="w-full min-h-[200px] mb-4" />
            {/* audio controls */}
            <AudioControls
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                pause={pause}
                play={play}
                skipForward={skipForward}
                skipBackward={skipBackward}
            />
            <div className="flex items-center gap-4 min-w-[200px]">
                <KeyboardShortcuts showAll />
            </div>
            {waveformReady && isRegionPluginActive && (
                <RegionDisplay
                />
            )}
        </div>
    );
};

export const WavesurferViewer = memo(WaveformViewerComponent);
