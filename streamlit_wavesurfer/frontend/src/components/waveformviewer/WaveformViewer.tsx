import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Save } from 'lucide-react';
import { WavesurferViewerProps } from "./types"
import { useRegions, useWaveSurfer, useWaveSurferHotkeys, useTimeFormatter, useRegionColors } from './hooks';
import './styles.css';


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
        waveform as WaveSurfer | null,
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

