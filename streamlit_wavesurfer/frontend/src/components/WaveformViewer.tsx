import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js"
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

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

export interface WavesurferViewerProps {
    audioSrc: string;
    regions?: Region[];
    onReady: () => void;
}

export const WavesurferViewer: React.FC<WavesurferViewerProps> = ({ audioSrc, regions = [], onReady }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const [waveform, setWaveform] = useState<WaveSurfer | null>(null);
    const [wsRegions, setWsRegions] = useState<RegionsPlugin | null>(null);
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const [zoomMinPxPerS, setZoomMinPxPerS] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loopRegion, setLoopRegion] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const getWsOptions = () => ({
        container: waveformRef.current!,
        waveColor: 'violet',
        progressColor: 'purple',
        responsive: true,
        xhr: { cache: 'default', mode: 'no-cors' },
        autoScroll: true,
        normalize: true,
    });

    const updateRegions = (regions: Region[]) => {
        if (!wsRegions) return;

        wsRegions.clearRegions();
        regions.forEach(region => {
            wsRegions.addRegion({
                start: region.start,
                end: region.end,
                content: region.content,
                color: region.color || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
                drag: region.drag,
                resize: region.resize,
            });
        });
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!waveformRef.current) return;

        const ws = WaveSurfer.create(getWsOptions());
        const regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
        const timelinePlugin = ws.registerPlugin(TimelinePlugin.create({
            height: 10,
            timeInterval: 0.1,
            primaryLabelInterval: 1,
            style: {
                fontSize: '10px',
                color: '#6A3274',
            },
        }));

        setWaveform(ws);
        setWsRegions(regionsPlugin);

        ws.load(audioSrc);
        onReady();

        ws.on("ready", () => {
            ws.zoom(zoomMinPxPerS);
            setDuration(ws.getDuration());
            if (regions.length > 0) {
                setTimeout(() => {
                    updateRegions(regions);
                }, 500);
            }
        });

        ws.on('audioprocess', () => {
            setCurrentTime(ws.getCurrentTime());
        });

        regionsPlugin.on('region-out', (region) => {
            if (activeRegion === region) {
                if (loopRegion) {
                    region.play();
                } else {
                    setActiveRegion(null);
                }
            }
        });

        regionsPlugin.on('region-clicked', (region, e) => {
            setIsPlaying(true);
            setLoopRegion(true);
            setActiveRegion(region);
            region.play();
        });

        ws.on('interaction', () => {
            setActiveRegion(null);
        });

        return () => {
            ws.destroy();
        };
    }, [audioSrc]);

    useEffect(() => {
        if (regions.length > 0) {
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
            <div ref={waveformRef} style={{
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

