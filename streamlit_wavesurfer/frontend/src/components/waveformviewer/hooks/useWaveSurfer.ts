import { useState, useRef, useEffect, useCallback } from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import WaveSurfer from "wavesurfer.js";
import { WaveSurferUserOptions } from "../types";

export const useWaveSurfer = ({
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
