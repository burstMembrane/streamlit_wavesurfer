import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram.js';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js"
import { Play, Pause, SkipBack, SkipForward, Save } from 'lucide-react';
import { WaveSurferUserOptions } from '../WavesurferComponent';
import { lightenColor } from '../utils';
import colormap from 'colormap'
import './styles.css';
import { debounce } from 'wavesurfer.js/src/util';
export interface Region {
    id: string | undefined;
    start: number;
    end: number;
    content: string;
    color?: string;
    drag?: boolean;
    resize?: boolean;
}

export class Region {
    constructor(public id: string | undefined, public start: number, public end: number, public content: string, public color?: string, public drag?: boolean, public resize?: boolean) {
    }
}


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
}

export const WavesurferViewer: React.FC<WavesurferViewerProps> = ({ audioSrc, regions = [], onReady, waveOptions, onRegionsChange, regionColormap, showSpectrogram }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const [waveform, setWaveform] = useState<WaveSurfer | null>(null);
    const [wsRegions, setWsRegions] = useState<RegionsPlugin | null>(null);
    const [wsSpectrogram, setWsSpectrogram] = useState<SpectrogramPlugin | null>(null);
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const [regionUnderCursor, setRegionUnderCursor] = useState<any>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [waveformReady, setWaveformReady] = useState(false);
    // Custom region edit history management removed

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
    const activeRegionRef = useRef<any>(null);
    const [regionOriginalColors, setRegionOriginalColors] = useState<Record<string, string>>({});
    useEffect(() => {
        if (regions.length === 0) return;

        // Default to 'jet' colormap if none provided
        const colorName = regionColormap || 'magma';

        // Generate colors using colormap with lower alpha for more muted colors
        const generatedColors = colormap({
            colormap: colorName,
            nshades: Math.max(regions.length, 10),
            format: 'rgbaString',
            alpha: 0.2 // Reduced alpha for more muted colors
        });
        setColors(generatedColors);
    }, [regionColormap, regions.length]);



    // Function to send updated regions to parent - simplified version
    const reportRegionsToParent = () => {
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
            };
        });

        console.log(`Reporting ${regionsForParent.length} regions to parent`);
        onRegionsChange(regionsForParent);
    };

    // Update region boundaries after edit operations
    const updateRegionBoundary = (targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
    };





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
        // This function is now just a placeholder to prevent errors
        // We will handle region updates in our main useEffect
        console.log("updateRegions called, but using main region management instead");
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Initialize the waveform
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
        // Only create spectrogram plugin once when showSpectrogram is true
        // This prevents memory leaks from creating multiple instances
        if (showSpectrogram) {
            // Check if we already have a spectrogram plugin instance
            if (!wsSpectrogram) {
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
        }
        setWaveform(ws);
        setWsRegions(regionsPlugin);

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
            } else if (e.code === 'ArrowUp') {
                e.preventDefault(); // Prevent page scroll
                // Navigate to previous region
                if (!wsRegions) return;
                console.log("Navigating to previous region");
                const regions = wsRegions.getRegions().sort((a, b) => a.start - b.start);
                if (regions.length === 0) return;

                const currentTime = ws.getCurrentTime();

                // Find the previous region based on current playhead position
                let prevRegionIndex = -1;

                // Find the region just before current time
                for (let i = 0; i < regions.length; i++) {
                    if (regions[i].start > currentTime) {
                        break; // We've gone past the current time
                    }
                    prevRegionIndex = i;
                }

                // If we're at or before the first region, wrap to the last
                if (prevRegionIndex === -1 || prevRegionIndex === 0) {
                    prevRegionIndex = regions.length - 1;
                } else {
                    // Go to previous region
                    prevRegionIndex -= 1;
                }

                const targetRegion = regions[prevRegionIndex];

                if (targetRegion) {
                    // Seek to region start
                    ws.seekTo(targetRegion.start / ws.getDuration());
                    // Set as active region
                    setActiveRegion(targetRegion);
                    console.log("Navigated to previous region:", targetRegion.id);
                }
            } else if (e.code === 'ArrowDown') {
                e.preventDefault(); // Prevent page scroll
                // Navigate to next region
                if (!wsRegions) return;

                console.log("Navigating to next region");

                const regions = wsRegions.getRegions().sort((a, b) => a.start - b.start);
                if (regions.length === 0) return;

                const currentTime = ws.getCurrentTime();

                // Find the current or next region
                let nextRegionIndex = -1;

                // Find first region that starts after current time
                for (let i = 0; i < regions.length; i++) {
                    if (regions[i].start >= currentTime) {
                        nextRegionIndex = i;
                        break;
                    }
                }

                // If we're at or after the last region, wrap to the first
                if (nextRegionIndex === -1) {
                    nextRegionIndex = 0;
                }

                const targetRegion = regions[nextRegionIndex];
                console.log("Navigated to next region:", targetRegion.id);

                if (targetRegion) {
                    // Seek to region start
                    ws.seekTo(targetRegion.start / ws.getDuration());
                    // Set as active region
                    setActiveRegion(targetRegion);
                    console.log("Navigated to next region:", targetRegion.id);
                }
            } else if (e.key.toLowerCase() === 'i') {
                e.preventDefault();
                const currentTime = ws.getCurrentTime();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(targetRegion, {
                        start: currentTime,
                        end: targetRegion.end
                    });

                    // Ensure this becomes the active region
                    setActiveRegion(targetRegion);
                }
            } else if (e.key.toLowerCase() === 'o') {
                e.preventDefault();
                const currentTime = ws.getCurrentTime();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(targetRegion, {
                        start: targetRegion.start,
                        end: currentTime
                    });

                    // Ensure this becomes the active region
                    setActiveRegion(targetRegion);
                }
            } else if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    setActiveRegion(targetRegion);

                    ws.seekTo(targetRegion.start / ws.getDuration());
                    if (!ws.isPlaying()) {
                        ws.play();
                        setIsPlaying(true);
                    }

                }
            }
            else if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                const targetRegion = getTargetRegion();

                if (targetRegion) {
                    setActiveRegion(targetRegion);

                    ws.seekTo(targetRegion.end / ws.getDuration());
                    if (!ws.isPlaying()) {
                        ws.play();
                        setIsPlaying(true);
                    }

                }
            }
            else if (e.key.toLowerCase() === 'w') {
                e.preventDefault();
                ws.seekTo(0 / ws.getDuration());
            }


        };

        window.addEventListener('keydown', handleKeyDown);

        regionsPlugin.on('region-in', (region) => {
            // console.log('region-in', region);
            setActiveRegion(region);
        });

        regionsPlugin.on('region-out', (region) => {
            // console.log('region-out', region);
            if (region === activeRegionRef.current && loopRegion) {
                region.play();
            }
        });

        regionsPlugin.on('region-clicked', (region) => {
            // console.log('region-clicked', region);
            setActiveRegion(region);
            region.play();
            ws.seekTo(region.start / ws.getDuration());
        });

        ws.load(audioSrc);

        // on mouse wheel, zoom in or out
        ws.getWrapper().addEventListener('wheel', (e) => {
            e.preventDefault();
            ws.zoom(e.deltaY > 0 ? zoomMinPxPerS * 1.1 : zoomMinPxPerS * 0.9);
        });

        ws.on("ready", () => {
            ws.zoom(zoomMinPxPerS);
            setDuration(ws.getDuration());
            setWaveformReady(true); // Mark the waveform as ready
            onReady();
        });

        ws.on('audioprocess', () => {
            setCurrentTime(ws.getCurrentTime());
        });



        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            ws.destroy();


            // Ensure all regions are cleared when component unmounts
            if (wsRegions) {
                try {
                    wsRegions.clearRegions();
                } catch (e) {
                    console.error('Error clearing regions on unmount:', e);
                }
            }
        };
    }, [audioSrc]);

    useEffect(() => {
        if (!waveformReady || !wsRegions || colors.length === 0) {
            return;
        }

        if (regions.length === 0) {
            wsRegions.clearRegions();
            return;
        }
        wsRegions.clearRegions();
        regions.forEach((region, index) => {
            if (!region.start || !region.end) return;
            const colorIndex = index % colors.length;
            const regionId = region.id || buildRegionId(region);
            wsRegions.addRegion({
                start: region.start,
                end: region.end,
                content: region.content,
                id: regionId,
                color: colors[colorIndex] || `rgba(100, 100, 100, 0.5)`,
                drag: region.drag,
                resize: region.resize,
            });
        });

    }, [regions, wsRegions]);

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
                            if (!waveform) return;

                            if (waveform.isPlaying()) {
                                waveform.pause();
                                setIsPlaying(false);
                                setLoopRegion(false);
                            } else {
                                waveform.play();
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
                        {!waveform?.isPlaying() ? <Play size={24} /> : <Pause size={24} />}
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

                    <button
                        onClick={() => {
                            reportRegionsToParent();
                        }}
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

