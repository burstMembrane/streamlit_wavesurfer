import React, { useRef, useState, memo, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Save } from 'lucide-react';
import { Region, WavesurferViewerProps } from "@waveformviewer/types";
import { useRegions, useWaveSurfer, useWaveSurferHotkeys, useTimeFormatter } from "@waveformviewer/hooks";
import { KeyboardShortcuts } from "@waveformviewer/KeyboardShortcuts";
import { waveSurferAtom } from "./atoms/wavesurfer";
// can't use tailwind for the waveform view styles as it's got all sorts of specialized nested elements
import "@waveformviewer/styles.css";
import { useAtom, useAtomValue } from 'jotai';
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
type RegionDisplayProps = {
    loopRegions: boolean;
    setLoopRegions: (loopRegions: boolean) => void;
    onRegionsChange: (regions: Region[]) => void;
    setZoom: (zoom: number) => void;
}
const RegionDisplay = ({ loopRegions, setLoopRegions, onRegionsChange, setZoom }: RegionDisplayProps) => {
    const {
        reportRegionsToParent,
        updateRegionBoundary,
    } = useRegions(loopRegions, onRegionsChange);

    useWaveSurferHotkeys(updateRegionBoundary);

    return (
        <div className="flex justify-between items-center gap-2">
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
                    defaultValue={100}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-24 flex-1"
                />
                <KeyboardShortcuts showAll />
            </div>
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

    if (isLoading) {
        return <div>Loading...</div>;
    }

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
            {waveformReady && (
                <RegionDisplay
                    loopRegions={loopRegions}
                    setLoopRegions={setLoopRegions}
                    onRegionsChange={onRegionsChange}
                    setZoom={setZoom}
                />
            )}
        </div>
    );
};

export const WavesurferViewer = memo(WaveformViewerComponent);
