import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram.js';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js"
import { Play, Pause, SkipBack, SkipForward, Save } from 'lucide-react';
import { WaveSurferUserOptions } from '../../WavesurferComponent';
import { lightenColor } from '../../utils';
import './styles.css';
import { useTimeFormatter, useRegionColors } from './hooks';
import { Region } from '../../types';


export interface WavesurferViewerProps {
    audioSrc: string;
    regions?: Region[];
    waveOptions: WaveSurferUserOptions;
    onReady: () => void;
    onRegionsChange?: (regions: Region[]) => void;
    regionColormap: string;
    showSpectrogram: boolean;
}

const buildRegionId = (region: Region) => {
    return `region-${btoa(JSON.stringify({ content: region.content, start: region.start, end: region.end }))}`;
};


// Main WaveSurfer initialization hook
const useWaveSurfer = ({
    containerRef,
    audioSrc,
    waveOptions,
    showSpectrogram,
    onReadyCallback
}: {
    containerRef: React.RefObject<HTMLDivElement>;
    audioSrc: string;
    waveOptions: WaveSurferUserOptions;
    showSpectrogram: boolean;
    onReadyCallback: () => void;
}) => {
    const [waveform, setWaveform] = useState<WaveSurfer | null>(null);
    const [wsRegions, setWsRegions] = useState<RegionsPlugin | null>(null);
    const [wsSpectrogram, setWsSpectrogram] = useState<SpectrogramPlugin | null>(null);
    const [waveformReady, setWaveformReady] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100); // Default zoom level

    // Store the latest options in refs to avoid recreating wavesurfer
    const optionsRef = useRef(waveOptions);
    const audioSrcRef = useRef(audioSrc);
    const showSpectrogramRef = useRef(showSpectrogram);
    const onReadyCallbackRef = useRef(onReadyCallback);

    // Update refs when props change
    useEffect(() => {
        optionsRef.current = waveOptions;
        audioSrcRef.current = audioSrc;
        showSpectrogramRef.current = showSpectrogram;
        onReadyCallbackRef.current = onReadyCallback;
    }, [waveOptions, audioSrc, showSpectrogram, onReadyCallback]);

    // Memoize wavesurfer options to prevent unnecessary re-renders
    const getWavesurferOptions = useCallback(() => ({
        container: containerRef.current!,
        responsive: true,
        xhr: { cache: 'default', mode: 'no-cors' },
        normalize: true,
        ...optionsRef.current
    }), [containerRef]);

    // Initialize WaveSurfer instance - with MINIMAL dependencies
    useEffect(() => {
        console.log("[useWaveSurfer] Initializing WaveSurfer");
        if (!containerRef.current) {
            console.log("[useWaveSurfer] No container ref, skipping initialization");
            return;
        }

        // Skip if we already have a waveform instance
        if (waveform) {
            console.log("[useWaveSurfer] Waveform already exists, loading new audio source:", audioSrcRef.current);
            try {
                // Just load the new audio source rather than recreating everything
                waveform.load(audioSrcRef.current);
                return;
            } catch (error) {
                console.error("[useWaveSurfer] Error loading new audio:", error);
                // If loading fails, we'll create a new instance below
            }
        }

        console.log("[useWaveSurfer] Creating new WaveSurfer instance");
        let ws: WaveSurfer;
        let regionsPlugin: RegionsPlugin;

        try {
            // Create WaveSurfer instance
            const options = getWavesurferOptions();
            // Avoid stringifying the entire options object which may contain cyclic references
            console.log("[useWaveSurfer] Creating with options - container:", options.container ? "defined" : "undefined", "responsive:", options.responsive);
            ws = WaveSurfer.create(options);

            // Register plugins
            regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
            ws.registerPlugin(TimelinePlugin.create({
                height: 10,
                timeInterval: 0.1,
                primaryLabelInterval: 1,
                style: {
                    fontSize: '10px',
                    color: optionsRef.current.waveColor || '#ccc',
                },
            }));

            // Set up spectrogram if needed
            if (showSpectrogramRef.current) {
                const spectrogramPlugin = ws.registerPlugin(SpectrogramPlugin.create({
                    labels: true,
                    height: 200,
                    splitChannels: false,
                    frequencyMax: 8000,
                    frequencyMin: 0,
                    labelsColor: "transparent",
                    fftSamples: 512,
                    scale: "mel"
                }));
                setWsSpectrogram(spectrogramPlugin);
            }

            // Set state
            setWaveform(ws);
            setWsRegions(regionsPlugin);

            // Set up event handlers
            ws.on("ready", () => {
                console.log("[useWaveSurfer] Waveform ready");
                try {
                    ws.zoom(zoomLevel);
                    setDuration(ws.getDuration());
                    setWaveformReady(true);
                    onReadyCallbackRef.current();
                } catch (error) {
                    console.error("Error in ready callback:", error);
                }
            });

            ws.on('audioprocess', () => {
                try {
                    setCurrentTime(ws.getCurrentTime());
                } catch (error) {
                    console.error("Error in audioprocess callback:", error);
                }
            });

            // Setup play/pause status tracking
            ws.on('play', () => setIsPlaying(true));
            ws.on('pause', () => setIsPlaying(false));

            // Load the audio
            console.log("[useWaveSurfer] Loading audio source:", audioSrcRef.current);
            ws.load(audioSrcRef.current);

            // Clean up function
            return () => {
                console.log("[useWaveSurfer] Cleaning up WaveSurfer instance");
                try {

                    // Remove all event listeners - check if unAll exists first
                    if (typeof ws.unAll === 'function') {
                        ws.unAll();
                    } else {
                        console.log("[useWaveSurfer] unAll method not available, skipping event listener cleanup");
                    }

                    // Try to pause playback
                    if (ws.isPlaying()) {
                        ws.pause();
                    }

                    // Don't destroy the waveform on cleanup as it can cause "operation aborted" errors
                    // ws.destroy();
                } catch (error) {
                    console.error("[useWaveSurfer] Error during cleanup:", error);
                }
            };
        } catch (error) {
            console.error("[useWaveSurfer] Error setting up wavesurfer:", error);
            return () => { };
        }
        // Use containerRef as the only dependency to avoid recreating WaveSurfer unnecessarily
    }, [containerRef, getWavesurferOptions]);

    // Handle audio source changes separately
    useEffect(() => {
        if (!waveform) return;

        console.log("[useWaveSurfer] Audio source changed, loading:", audioSrc);
        try {
            waveform.load(audioSrc);
        } catch (error) {
            console.error("[useWaveSurfer] Error loading audio:", error);
        }
    }, [audioSrc, waveform]);

    // Function to manually set zoom level
    const setZoom = useCallback((level: number) => {
        setZoomLevel(level);
        if (waveform) {
            try {
                waveform.zoom(level);
            } catch (error) {
                console.error("[useWaveSurfer] Error setting zoom:", error);
            }
        }
    }, [waveform]);

    // Add a cleanup function for the waveform when component unmounts
    useEffect(() => {
        // This effect runs once on mount and once on unmount
        return () => {
            console.log("[useWaveSurfer] Component unmounting, cleaning up WaveSurfer instance");
            if (waveform) {
                try {
                    // Remove all event listeners - check if unAll exists first
                    if (typeof waveform.unAll === 'function') {
                        waveform.unAll();
                    } else {
                        console.log("[useWaveSurfer] unAll method not available, skipping event listener cleanup");
                    }

                    // Try to pause playback
                    if (waveform.isPlaying()) {
                        waveform.pause();
                    }

                    // Don't destroy to avoid "operation aborted" errors
                    // waveform.destroy();

                    // Set state to null
                    setWaveform(null);
                    setWsRegions(null);
                    setWsSpectrogram(null);
                    setWaveformReady(false);
                } catch (error) {
                    console.error("[useWaveSurfer] Error during cleanup:", error);
                }
            }
        };
    }, []);

    return {
        waveform,
        wsRegions,
        wsSpectrogram,
        waveformReady,
        currentTime,
        duration,
        isPlaying,
        zoomLevel,
        setZoom,
        play: useCallback(() => {
            if (waveform) {
                try {
                    waveform.play();
                } catch (error) {
                    console.error("[useWaveSurfer] Error playing:", error);
                }
            }
        }, [waveform]),
        pause: useCallback(() => {
            if (waveform) {
                try {
                    waveform.pause();
                } catch (error) {
                    console.error("[useWaveSurfer] Error pausing:", error);
                }
            }
        }, [waveform]),
        skipForward: useCallback(() => {
            if (waveform) {
                try {
                    waveform.skip(5);
                } catch (error) {
                    console.error("[useWaveSurfer] Error skipping forward:", error);
                }
            }
        }, [waveform]),
        skipBackward: useCallback(() => {
            if (waveform) {
                try {
                    waveform.skip(-5);
                } catch (error) {
                    console.error("[useWaveSurfer] Error skipping backward:", error);
                }
            }
        }, [waveform]),
        seekTo: useCallback((position: number) => {
            if (waveform) {
                try {
                    waveform.seekTo(position);
                } catch (error) {
                    console.error("[useWaveSurfer] Error seeking:", error);
                }
            }
        }, [waveform]),
    };
};

// Hook for managing region state
const useRegionManagement = (
    wsRegions: RegionsPlugin | null,
    regions: Region[],
    colors: string[],
    loopRegion: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const activeRegionRef = useRef<any>(null);
    const [regionOriginalColors, setRegionOriginalColors] = useState<Record<string, string>>({});

    // Function to get the target region for editing
    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
    }, []);

    // Update active region reference
    useEffect(() => {
        activeRegionRef.current = activeRegion;
    }, [activeRegion]);

    // Highlight active region
    useEffect(() => {
        if (activeRegion && wsRegions) {
            // Store original color if not already stored
            if (!regionOriginalColors[activeRegion.id]) {
                setRegionOriginalColors(prev => ({
                    ...prev,
                    [activeRegion.id]: activeRegion.color
                }));
            }

            // Get original color or current color
            const originalColor = regionOriginalColors[activeRegion.id] || activeRegion.color;

            // Set the active region to a lighter color
            activeRegion.setOptions({
                color: lightenColor(originalColor)
            });

            // Reset colors of all other regions
            wsRegions.getRegions().forEach(region => {
                if (region.id !== activeRegion.id && regionOriginalColors[region.id]) {
                    region.setOptions({
                        color: regionOriginalColors[region.id]
                    });
                }
            });
        }
    }, [activeRegion, wsRegions, regionOriginalColors]);

    // Update regions in wavesurfer when props change
    useEffect(() => {
        if (!wsRegions) return;

        // Clear existing regions
        wsRegions.clearRegions();

        // Add regions
        regions.forEach((region, index) => {
            if (!region.start || !region.end) return;

            // Make sure color index is within bounds
            const colorIndex = index % colors.length;
            const regionId = region.id || buildRegionId(region);

            try {
                wsRegions.addRegion({
                    start: region.start,
                    end: region.end,
                    content: region.content,
                    id: regionId,
                    color: colors[colorIndex] || `rgba(100, 100, 100, 0.5)`,
                    drag: region.drag,
                    resize: region.resize,
                });
            } catch (error) {
                console.error("Error adding region:", error);
            }
        });

        // Set up region event handlers
        const setupRegionEvents = () => {
            wsRegions.on('region-in', (region) => {
                setActiveRegion(region);
            });

            wsRegions.on('region-clicked', (region) => {
                setActiveRegion(region);
            });
        };

        setupRegionEvents();
    }, [wsRegions, regions, colors]);

    // Function to report regions back to parent
    const reportRegionsToParent = useCallback(() => {
        if (!wsRegions || !onRegionsChange) return;

        const currentRegions = wsRegions.getRegions();
        const regionsForParent = currentRegions.map(wsRegion => {
            let content = '';
            if (typeof wsRegion.content === 'string') {
                content = wsRegion.content;
            } else if (wsRegion.content instanceof HTMLElement) {
                content = wsRegion.content.textContent || '';
            }

            return {
                id: wsRegion.id,
                start: wsRegion.start,
                end: wsRegion.end,
                content: content,
                color: wsRegion.color,
                drag: wsRegion.drag,
                resize: wsRegion.resize
            };
        });

        onRegionsChange(regionsForParent);
    }, [wsRegions, onRegionsChange]);

    // Function to update region boundaries
    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
    }, []);

    return {
        activeRegion,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary
    };
};

// Keyboard shortcuts hook
const useWaveSurferHotkeys = (
    waveform: WaveSurfer | null,
    wsRegions: RegionsPlugin | null,
    waveformReady: boolean,
    getTargetRegion: () => any,
    updateRegionBoundary: (targetRegion: any, options: any) => void,
    setActiveRegion: (region: any) => void,
    setLoopRegion: (state: boolean | ((prev: boolean) => boolean)) => void
) => {
    // Use refs to keep track of the latest values without causing re-renders
    const waveformRef = useRef(waveform);
    const regionsRef = useRef(wsRegions);
    const readyRef = useRef(waveformReady);

    // Update refs when props change
    useEffect(() => {
        waveformRef.current = waveform;
        regionsRef.current = wsRegions;
        readyRef.current = waveformReady;
    }, [waveform, wsRegions, waveformReady]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Skip if not ready or no waveform
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        const isReady = readyRef.current;
        console.log("[useWaveSurferHotkeys] Key pressed:", e.code);
        if (!wave || !isReady) return;

        // Prevent default behavior for navigation keys
        if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) ||
            ['i', 'o', 's', 'e', 'w', 'l'].includes(e.key.toLowerCase())) {
            e.preventDefault(); // Prevent page scroll or other browser defaults
        }

        // If we're dealing with a letter key, normalize to lowercase
        const key = e.key.toLowerCase();

        switch (e.code || key) {
            case 'Space':
                if (wave.isPlaying()) {
                    wave.pause();
                } else {
                    wave.play();
                }
                break;

            case 'ArrowLeft':
                const leftCurrentTime = wave.getCurrentTime();
                wave.seekTo(Math.max(0, leftCurrentTime - 0.1) / wave.getDuration());
                break;

            case 'ArrowRight':
                const rightCurrentTime = wave.getCurrentTime();
                const duration = wave.getDuration();
                wave.seekTo(Math.min(duration, rightCurrentTime + 0.1) / duration);
                break;

            case 'ArrowUp':
                // Navigate to previous region
                if (!regions) return;

                const upRegions = regions.getRegions().sort((a, b) => a.start - b.start);
                if (upRegions.length === 0) return;

                const upCurrentTime = wave.getCurrentTime();
                let prevRegionIndex = -1;

                // Find the region just before current time
                for (let i = 0; i < upRegions.length; i++) {
                    if (upRegions[i].start > upCurrentTime) {
                        break; // We've gone past the current time
                    }
                    prevRegionIndex = i;
                }

                // If we're at or before the first region, wrap to the last
                if (prevRegionIndex === -1 || prevRegionIndex === 0) {
                    prevRegionIndex = upRegions.length - 1;
                } else {
                    // Go to previous region
                    prevRegionIndex -= 1;
                }

                const prevTargetRegion = upRegions[prevRegionIndex];
                if (prevTargetRegion) {
                    // Seek to region start
                    wave.seekTo(prevTargetRegion.start / wave.getDuration());
                    // Set as active region
                    setActiveRegion(prevTargetRegion);
                }
                break;

            case 'ArrowDown':
                // Navigate to next region
                if (!regions) return;

                const downRegions = regions.getRegions().sort((a, b) => a.start - b.start);
                if (downRegions.length === 0) return;

                const downCurrentTime = wave.getCurrentTime();
                let nextRegionIndex = -1;

                // Find first region that starts after current time
                for (let i = 0; i < downRegions.length; i++) {
                    if (downRegions[i].start >= downCurrentTime) {
                        nextRegionIndex = i;
                        break;
                    }
                }

                // If we're at or after the last region, wrap to the first
                if (nextRegionIndex === -1) {
                    nextRegionIndex = 0;
                }

                const nextTargetRegion = downRegions[nextRegionIndex];
                if (nextTargetRegion) {
                    // Seek to region start
                    wave.seekTo(nextTargetRegion.start / wave.getDuration());
                    // Set as active region
                    setActiveRegion(nextTargetRegion);
                }
                break;

            case 'KeyI':
                const iCurrentTime = wave.getCurrentTime();
                const iTargetRegion = getTargetRegion();
                if (iTargetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(iTargetRegion, {
                        start: iCurrentTime,
                        end: iTargetRegion.end
                    });
                    // Ensure this becomes the active region
                    setActiveRegion(iTargetRegion);
                }
                break;

            case 'KeyO':
                const oCurrentTime = wave.getCurrentTime();
                const oTargetRegion = getTargetRegion();
                if (oTargetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(oTargetRegion, {
                        start: oTargetRegion.start,
                        end: oCurrentTime
                    });
                    // Ensure this becomes the active region
                    setActiveRegion(oTargetRegion);
                }
                break;

            case 'KeyS':
                const sTargetRegion = getTargetRegion();
                if (sTargetRegion) {
                    setActiveRegion(sTargetRegion);
                    wave.seekTo(sTargetRegion.start / wave.getDuration());
                    if (!wave.isPlaying()) {
                        wave.play();
                    }
                }
                break;

            case 'KeyE':
                const eTargetRegion = getTargetRegion();
                if (eTargetRegion) {
                    setActiveRegion(eTargetRegion);
                    wave.seekTo(eTargetRegion.end / wave.getDuration());
                    if (!wave.isPlaying()) {
                        wave.play();
                    }
                }
                break;

            case 'KeyW':
                wave.seekTo(0);
                break;

            case 'KeyL':
                // Toggle loop for the current region
                setLoopRegion(prev => !prev);
                break;
        }
    }, [getTargetRegion, updateRegionBoundary, setActiveRegion, setLoopRegion]); // Only depend on callback functions

    useEffect(() => {
        // Add global keyboard event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up the listener when component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    return handleKeyDown;
};

// Main component - update to pass loopRegion to hooks
export const WavesurferViewer: React.FC<WavesurferViewerProps> = ({
    audioSrc,
    regions = [],
    onReady,
    waveOptions,
    onRegionsChange,
    regionColormap,
    showSpectrogram
}) => {
    // Use useRef with null initialization to ensure stable reference
    const waveformRef = useRef<HTMLDivElement>(null);
    const [loopRegion, setLoopRegion] = useState(false);

    // Track first render for debug purposes
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            console.log("[WavesurferViewer] First render with audioSrc:", audioSrc);
            isFirstRender.current = false;
        } else {
            console.log("[WavesurferViewer] Re-rendered with audioSrc:", audioSrc);
        }
    });

    // Get color scheme for regions
    const colors = useRegionColors(regions, regionColormap);

    // Format time display
    const formatTime = useTimeFormatter();

    // Initialize wavesurfer and get controls
    const {
        waveform,
        wsRegions,
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
    } = useRegionManagement(wsRegions, regions, colors, loopRegion, onRegionsChange);

    // Keyboard shortcuts
    useWaveSurferHotkeys(
        waveform,
        wsRegions,
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '20px',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <div ref={waveformRef}
                id="waveform"
                style={{
                    width: "100%",
                    minHeight: '200px',
                    marginBottom: '20px'
                }} />

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={skipBackward}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}
                    >
                        <SkipBack size={20} />
                    </button>

                    <button
                        onClick={isPlaying ? pause : play}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}
                    >
                        {!isPlaying ? <Play size={24} /> : <Pause size={24} />}
                    </button>

                    <button
                        onClick={skipForward}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}
                    >
                        <SkipForward size={20} />
                    </button>

                    <button
                        onClick={reportRegionsToParent}
                        style={{
                            background: '#1f1f1f',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '5px 10px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            marginLeft: '10px',
                            // Hide save button when no regions
                            display: regions.length > 0 ? 'flex' : 'none'
                        }}
                    >
                        <Save size={16} style={{ marginRight: '5px' }} />
                        Save Regions
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'white'
                }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minWidth: '200px'
                }}>
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
                        style={{
                            width: '100px',
                            flex: '1'
                        }}
                    />
                </div>

                {/* keyboard hints - only show if regions exist */}
                {regions.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: '10px',
                        color: 'white',
                        maxWidth: '600px'
                    }}>
                        <span><b>i</b>: set region start</span>
                        <span><b>o</b>: set region end</span>
                        <span><b>s</b>: play region start</span>
                        <span><b>e</b>: play region end</span>
                        <span><b>space</b>: play/pause</span>
                        <span><b>↑</b>: prev region</span>
                        <span><b>↓</b>: next region</span>
                        <span><b>←</b>: seek -0.1s</span>
                        <span><b>→</b>: seek +0.1s</span>
                        <span><b>l</b>: loop region</span>
                        <span><b>w</b>: skip to start</span>
                    </div>
                )}

                {/* Only show basic keyboard shortcuts if no regions */}
                {regions.length === 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: '10px',
                        color: 'white',
                        maxWidth: '300px'
                    }}>
                        <span><b>space</b>: play/pause</span>
                        <span><b>←</b>: seek -0.1s</span>
                        <span><b>→</b>: seek +0.1s</span>
                    </div>
                )}
            </div>
        </div>
    );
};

