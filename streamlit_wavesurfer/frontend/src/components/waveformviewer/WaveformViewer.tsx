import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
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
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setShowShortcuts(!showShortcuts)}
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
                <Keyboard size={20} />
            </button>

            {showShortcuts && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: '#333',
                    padding: '10px',
                    borderRadius: '5px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
                    width: '300px',
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '8px 12px',
                        color: 'white',
                    }}>
                        {shortcuts.map((shortcut) => (
                            <React.Fragment key={shortcut.key}>
                                <div style={{
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    backgroundColor: '#555',
                                    borderRadius: '3px',
                                    textAlign: 'center'
                                }}>
                                    {shortcut.key}
                                </div>
                                <div>{shortcut.description}</div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Main component - update to pass loopRegion to hooks
const WaveformViewerComponent: React.FC<WavesurferViewerProps> = ({
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

    // Track first render for debug purposes - only log in development
    const isFirstRender = useRef(true);
    const audioSrcRef = useRef(audioSrc);

    useEffect(() => {
        if (isFirstRender.current) {
            console.log("[WavesurferViewer] First render with audioSrc:", audioSrc);
            isFirstRender.current = false;
        } else if (audioSrcRef.current !== audioSrc) {
            console.log("[WavesurferViewer] Audio source changed to:", audioSrc);
            audioSrcRef.current = audioSrc;
        }
    }, [audioSrc]);

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

                {/* Keyboard shortcuts icon */}
                <KeyboardShortcuts showAll={regions.length > 0} />
            </div>
        </div>
    );
};

// Export memoized version to prevent unnecessary re-renders
export const WavesurferViewer = memo(WaveformViewerComponent);

