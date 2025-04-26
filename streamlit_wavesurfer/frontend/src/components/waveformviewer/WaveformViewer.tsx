import React, { useEffect, useRef, useState, memo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Save, Keyboard } from 'lucide-react';
import { WavesurferViewerProps } from "./types"
import { useRegions, useWaveSurfer, useWaveSurferHotkeys, useTimeFormatter, useRegionColors } from './hooks';
import './styles.css';

// KeyboardShortcuts component to display available shortcuts
const KeyboardShortcuts = ({ showAll = false }) => {
    const [showShortcuts, setShowShortcuts] = useState(false);

    const allShortcuts = [
        { key: 'i', description: 'set region start' },
        { key: 'o', description: 'set region end' },
        { key: 's', description: 'play region start' },
        { key: 'e', description: 'play region end' },
        { key: 'space', description: 'play/pause' },
        { key: '↑', description: 'prev region' },
        { key: '↓', description: 'next region' },
        { key: '←', description: 'seek -0.1s' },
        { key: '→', description: 'seek +0.1s' },
        { key: 'l', description: 'loop region' },
        { key: 'w', description: 'skip to start' }
    ];

    const basicShortcuts = allShortcuts.filter(s =>
        ['space', '←', '→'].includes(s.key)
    );

    const shortcuts = showAll ? allShortcuts : basicShortcuts;

    return (
        <div className="relative">
            <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
            >
                <Keyboard size={20} />
            </button>

            {showShortcuts && (
                <div className="absolute top-0 right-0 bg-gray-800 p-2 rounded-md shadow-md z-1000 w-64">
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                        {shortcuts.map((shortcut) => (
                            <React.Fragment key={shortcut.key}>
                                <div className="font-bold px-2 py-1 bg-gray-700 rounded-md text-center">
                                    {shortcut.key}
                                </div>
                                <div>{shortcut.description}</div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
};

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
    const [loopRegion, setLoopRegion] = useState(false);
    const colors = useRegionColors(regions, regionColormap);


    const {
        waveform,
        wsRegions: wavesurferRegions,
        waveformReady,
        currentTime,
        duration,
        isPlaying,
        zoomLevel,
        setZoom,
        play,
        pause,
        skipForward,
        skipBackward
    } = useWaveSurfer({
        containerRef: waveformRef,
        audioSrc,
        waveOptions,
        showSpectrogram,
        onReadyCallback: onReady
    });

    // Region management with loopRegion support
    const {
        getTargetRegion,
        setActiveRegion,
        reportRegionsToParent,
        updateRegionBoundary
    } = useRegions(wavesurferRegions, regions, colors, loopRegion, onRegionsChange);

    // Keyboard shortcuts
    useWaveSurferHotkeys(
        waveform,
        wavesurferRegions,
        waveformReady,
        getTargetRegion,
        updateRegionBoundary,
        setActiveRegion,
        setLoopRegion
    );

    // Handle zoom changes independently
    useEffect(() => {
        if (waveform && waveformReady) {
            try {
                waveform.zoom(zoomLevel);
            } catch (error) {
                console.error("Error applying zoom:", error);
            }
        }
    }, [zoomLevel, waveform, waveformReady]);

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
                <div className="flex  items-center gap-4">
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
                            value={zoomLevel}
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

