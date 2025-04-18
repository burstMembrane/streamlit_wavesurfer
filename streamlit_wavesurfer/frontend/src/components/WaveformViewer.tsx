import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js"
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { WaveSurferUserOptions } from '../WavesurferComponent';
import { lightenColor } from '../utils';
// import './styles.css';
export interface Region {
    start: number;
    end: number;
    content: string;
    color?: string;
    drag?: boolean;
    resize?: boolean;
}

export class Region {
    constructor(public start: number, public end: number, public content: string, public color?: string, public drag?: boolean, public resize?: boolean) {
    }
}

// Custom history management types
interface RegionState {
    [regionId: string]: { start: number; end: number };
}

interface RegionEditHistory {
    past: RegionState[];
    present: RegionState;
    future: RegionState[];
}

export interface WavesurferViewerProps {
    audioSrc: string;
    regions?: Region[];
    waveOptions: WaveSurferUserOptions;
    onReady: () => void;
}

const buildRegionId = (region: Region) => {
    return `region-${btoa(JSON.stringify({ content: region.content, start: region.start, end: region.end }))}`;
}

export const WavesurferViewer: React.FC<WavesurferViewerProps> = ({ audioSrc, regions = [], onReady, waveOptions }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const [waveform, setWaveform] = useState<WaveSurfer | null>(null);
    const [wsRegions, setWsRegions] = useState<RegionsPlugin | null>(null);
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const [regionUnderCursor, setRegionUnderCursor] = useState<any>(null);

    // Custom region edit history management
    const [editHistory, setEditHistory] = useState<RegionEditHistory>({
        past: [],
        present: {},
        future: []
    });

    const [zoomMinPxPerS, setZoomMinPxPerS] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loopRegion, setLoopRegion] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [regionsUpdated, setRegionsUpdated] = useState(false);
    // Get the target region for editing (prefer active region, fall back to region under cursor)
    const getTargetRegion = () => {
        return activeRegionRef.current || regionUnderCursor;
    };

    // Reference to store active region between renders
    const activeRegionRef = useRef<any>(null);

    // Keep track of region original colors to restore them when a region is no longer active
    const [regionOriginalColors, setRegionOriginalColors] = useState<Record<string, string>>({});

    // Custom undo/redo functions
    const saveRegionState = (targetRegion: any) => {
        // Create a new present state with the current region state
        const newPresent = { ...editHistory.present };

        // Store the region's current state
        newPresent[targetRegion.id] = {
            start: targetRegion.start,
            end: targetRegion.end
        };

        // Update history, moving current state to past
        setEditHistory({
            past: [...editHistory.past, editHistory.present],
            present: newPresent,
            future: [] // Clear future when a new action is performed
        });

        console.log('Saved region state:', targetRegion.id, newPresent[targetRegion.id]);
    };

    const undoEdit = () => {
        // Get the target region from activeRegion or regionUnderCursor
        const targetRegion = activeRegionRef.current || regionUnderCursor;
        if (!targetRegion || editHistory.past.length === 0) return;

        // Get the last past state
        const previous = editHistory.past[editHistory.past.length - 1];
        const newPast = editHistory.past.slice(0, editHistory.past.length - 1);

        // Check if we have a state for this region
        if (previous[targetRegion.id]) {
            console.log('Undoing to previous state:', previous[targetRegion.id]);

            // Apply the previous state to the region
            targetRegion.setOptions({
                start: previous[targetRegion.id].start,
                end: previous[targetRegion.id].end
            });

            // Update history
            setEditHistory({
                past: newPast,
                present: previous,
                future: [editHistory.present, ...editHistory.future]
            });
        }
    };

    const redoEdit = () => {
        // Get the target region from activeRegion or regionUnderCursor
        const targetRegion = activeRegionRef.current || regionUnderCursor;
        if (!targetRegion || editHistory.future.length === 0) return;

        // Get the first future state
        const next = editHistory.future[0];
        const newFuture = editHistory.future.slice(1);

        // Check if we have a state for this region
        if (next[targetRegion.id]) {
            console.log('Redoing to next state:', next[targetRegion.id]);

            // Apply the future state to the region
            targetRegion.setOptions({
                start: next[targetRegion.id].start,
                end: next[targetRegion.id].end
            });

            // Update history
            setEditHistory({
                past: [...editHistory.past, editHistory.present],
                present: next,
                future: newFuture
            });
        }
    };

    const canUndo = editHistory.past.length > 0;
    const canRedo = editHistory.future.length > 0;

    useEffect(() => {
        // Keep ref in sync with state
        activeRegionRef.current = activeRegion;
    }, [activeRegion]);

    const getWsOptions = () => ({
        container: waveformRef.current!,

        responsive: true,
        xhr: { cache: 'default', mode: 'no-cors' },
        normalize: true,
        ...waveOptions
    });



    useEffect(() => {
        // Keep ref in sync with state
        activeRegionRef.current = activeRegion;

        // Update the active region's color when it changes
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
                start: activeRegion.start,
                end: activeRegion.end,
                content: activeRegion.content,
                color: lightenColor(originalColor),
                drag: activeRegion.drag,
                resize: activeRegion.resize
            });

            // Reset colors of all other regions
            wsRegions.getRegions().forEach(region => {
                if (region.id !== activeRegion.id && regionOriginalColors[region.id]) {
                    region.setOptions({
                        start: region.start,
                        end: region.end,
                        content: region.content,
                        color: regionOriginalColors[region.id],
                        drag: region.drag,
                        resize: region.resize
                    });
                }
            });
        }
    }, [activeRegion, wsRegions, regionOriginalColors]);

    const updateRegions = (regions: Region[]) => {
        if (!wsRegions || regionsUpdated) return;
        // console.log('updateRegions', regions);
        wsRegions.clearRegions();
        regions.forEach(region => {
            wsRegions.addRegion({
                ...region,
                id: buildRegionId(region),
                color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
                drag: region.drag,
                resize: region.resize,
            });
        });
        setRegionsUpdated(true);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!waveformRef.current) return;

        // Destroy existing waveform if it exists
        if (waveform) {
            waveform.destroy();
            setWaveform(null);
        }

        const ws = WaveSurfer.create({
            ...getWsOptions(),
        });
        const regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
        const timelinePlugin = ws.registerPlugin(TimelinePlugin.create({
            height: 10,
            timeInterval: 0.1,
            primaryLabelInterval: 1,
            style: {
                fontSize: '10px',
                color: waveOptions.waveColor || '#ccc',
            },
        }));

        setWaveform(ws);
        setWsRegions(regionsPlugin);

        // Track mouse movement over the waveform
        const handleMouseMove = (e: MouseEvent) => {
            if (!wsRegions) return;

            // Get the mouse position relative to the waveform
            const rect = ws.getWrapper().getBoundingClientRect();
            const x = e.clientX - rect.left;

            // Find the region under the cursor - only check x coordinate (horizontal position)
            const regions = wsRegions.getRegions();
            const regionUnderCursor = regions.find(region => {
                const regionStartPx = region.start / ws.getDuration() * rect.width;
                const regionEndPx = region.end / ws.getDuration() * rect.width;
                return x >= regionStartPx && x <= regionEndPx;
            });

            setRegionUnderCursor(regionUnderCursor || null);
        };

        ws.getWrapper().addEventListener('mousemove', handleMouseMove);


        // Add keyboard event listener for space bar, arrow keys, and region markers
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (ws.isPlaying()) {
                    ws.pause();
                    setIsPlaying(false);
                } else {
                    ws.play();
                    setIsPlaying(true);
                }
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault(); // Prevent page scroll
                const currentTime = ws.getCurrentTime();
                ws.seekTo(Math.max(0, currentTime - 0.1) / ws.getDuration());
            } else if (e.code === 'ArrowRight') {
                e.preventDefault(); // Prevent page scroll
                const currentTime = ws.getCurrentTime();
                const duration = ws.getDuration();
                ws.seekTo(Math.min(duration, currentTime + 0.1) / duration);
            } else if (e.key.toLowerCase() === 'i') {
                e.preventDefault();
                const currentTime = ws.getCurrentTime();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    // First save the current state
                    saveRegionState(targetRegion);

                    // Now update the region with new values
                    console.log(`Setting start from ${targetRegion.start} to ${currentTime}`);
                    targetRegion.setOptions({
                        start: currentTime,
                        end: targetRegion.end
                    });
                    console.log('Updated region', targetRegion);

                    // Ensure this becomes the active region
                    setActiveRegion(targetRegion);
                }
            } else if (e.key.toLowerCase() === 'o') {
                e.preventDefault();
                const currentTime = ws.getCurrentTime();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    // First save the current state
                    saveRegionState(targetRegion);

                    // Now update the region with new values
                    console.log(`Setting end from ${targetRegion.end} to ${currentTime}`);
                    targetRegion.setOptions({
                        start: targetRegion.start,
                        end: currentTime
                    });

                    // Ensure this becomes the active region
                    setActiveRegion(targetRegion);
                }
            } else if (e.key.toLowerCase() === 'u') {
                e.preventDefault();
                if (canUndo) {
                    console.log('Undoing change, history:', editHistory);
                    undoEdit();
                }
            } else if (e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (canRedo) {
                    console.log('Redoing change, history:', editHistory);
                    redoEdit();
                }
            } else if (e.key.toLowerCase() === 'l') {
                e.preventDefault();
                const targetRegion = getTargetRegion();

                if (targetRegion) {

                    // console.log('targetRegion', targetRegion);
                    // Toggle loop region
                    setLoopRegion(prev => !prev);

                    // Ensure this is the active region
                    setActiveRegion(targetRegion);

                    // If we're enabling looping and the region isn't active, 
                    // seek to it and start playing it
                    if (!loopRegion) {
                        ws.seekTo(targetRegion.start / ws.getDuration());

                        // If not already playing, start playback
                        if (!ws.isPlaying()) {
                            ws.play();
                            setIsPlaying(true);
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        regionsPlugin.on('region-in', (region) => {
            console.log('region-in', region);
            setActiveRegion(region);
        });

        regionsPlugin.on('region-out', (region) => {
            console.log('region-out', region);
            if (region === activeRegionRef.current && loopRegion) {
                region.play();
            }
        });

        regionsPlugin.on('region-clicked', (region) => {
            console.log('region-clicked', region);
            setActiveRegion(region);
            region.play();
            ws.seekTo(region.start / ws.getDuration());
        });

        ws.load(audioSrc);
        onReady();

        ws.on("ready", () => {
            ws.zoom(zoomMinPxPerS);
            setDuration(ws.getDuration());

            // Load regions once when waveform is ready
            regions.forEach(region => {
                regionsPlugin.addRegion({
                    ...region,
                    id: buildRegionId(region),
                    color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
                    drag: region.drag,
                    resize: region.resize,
                });
            });
        });

        ws.on('audioprocess', () => {
            setCurrentTime(ws.getCurrentTime());
        });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            ws.getWrapper().removeEventListener('mousemove', handleMouseMove);
            ws.destroy();
        };
    }, [audioSrc]);

    useEffect(() => {
        if (regions.length > 0 && wsRegions) {
            updateRegions(regions);
        }
    }, [regions]);

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
                        onClick={() => {
                            if (waveform) {
                                waveform.skip(-5);
                            }
                        }}
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
                        onClick={() => {
                            if (isPlaying) {
                                waveform?.pause();
                                setIsPlaying(false);
                                setLoopRegion(false);
                            } else {
                                waveform?.play();
                                setIsPlaying(true);
                            }
                        }}
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
                        onClick={() => {
                            if (waveform) {
                                waveform.skip(5);
                            }
                        }}
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
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontFamily: 'monospace',
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
                        value={zoomMinPxPerS}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            setZoomMinPxPerS(value);
                            waveform?.zoom(value);
                        }}
                        style={{
                            width: '100px',
                            flex: '1'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

