import { useState, useRef, useEffect, useCallback } from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import WaveSurfer from "wavesurfer.js";
import { WaveSurferUserOptions } from "../types";

// Use a module-level variable to track instance creation and prevent duplicates during hot reload
let wavesurferInstance: WaveSurfer | null = null;
let instanceCleanup: (() => void) | null = null;

// Handle cleanup for hot reloading if supported
// @ts-ignore - Ignoring TypeScript errors for HMR which may not be typed in all environments
if (typeof module !== 'undefined' && module.hot) {
    // @ts-ignore
    module.hot.dispose(() => {
        if (instanceCleanup) {
            instanceCleanup();
            instanceCleanup = null;
        }
    });
}

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
        // Skip if component ref isn't ready yet 
        if (!containerRef.current) {
            return;
        }

        // Check if we already have a global instance
        if (wavesurferInstance) {
            setWaveform(wavesurferInstance);

            // Connect to existing instance
            try {
                // Load audio into existing instance
                wavesurferInstance.load(audioSrc);
                return;
            } catch (error) {
                console.error("[useWaveSurfer] Error using existing instance:", error);
                // Continue with new instance creation
            }
        }

        let ws: WaveSurfer;
        let regionsPlugin: RegionsPlugin;
        let cleanup: () => void = () => { };

        try {
            // Create WaveSurfer instance
            const options = getWavesurferOptions();

            // Create wavesurfer with standard options
            ws = WaveSurfer.create(options);

            // Store in global variable
            wavesurferInstance = ws;

            // Add handlers to resume AudioContext on user interaction
            let audioContextResumed = false;
            const resumeAudioContext = () => {
                if (!audioContextResumed && ws) {
                    try {
                        const audioContext = (ws as any).backend?.ac || null;
                        if (audioContext && audioContext.state !== 'running') {
                            audioContext.resume();
                            audioContextResumed = true;
                        }
                    } catch (error) {
                        console.error("[useWaveSurfer] Error resuming AudioContext:", error);
                    }
                }
            };

            // Listen for user interaction events
            if (containerRef.current) {
                containerRef.current.addEventListener('click', resumeAudioContext);
            }
            document.addEventListener('click', resumeAudioContext);

            // Clean up listener function
            cleanup = () => {
                if (containerRef.current) {
                    containerRef.current.removeEventListener('click', resumeAudioContext);
                }
                document.removeEventListener('click', resumeAudioContext);
            };

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
            ws.load(audioSrcRef.current);

            // Create the cleanup function
            const finalCleanup = () => {
                if (cleanup) {
                    cleanup();
                }

                if (ws) {
                    try {
                        // Remove all event listeners
                        if (typeof ws.unAll === 'function') {
                            ws.unAll();
                        }

                        // Pause playback
                        if (ws.isPlaying()) {
                            ws.pause();
                        }

                        // Don't immediately destroy - can cause "operation aborted" errors during hot reloading
                        // Instead, wrap in a timeout to ensure any pending operations complete
                        const wsToDestroy = ws; // Create a reference for the timeout closure

                        // Clear state immediately to prevent React errors
                        setWaveform(null);
                        setWsRegions(null);
                        setWsSpectrogram(null);
                        setWaveformReady(false);

                        // Clear global instance reference
                        if (wavesurferInstance === ws) {
                            wavesurferInstance = null;
                        }

                        // Delay destroy to avoid race conditions with audio loading
                        setTimeout(() => {
                            try {
                                // Check if destroy method exists before calling it
                                if (wsToDestroy && typeof wsToDestroy.destroy === 'function') {
                                    wsToDestroy.destroy();
                                }
                            } catch (error) {
                                console.error("[useWaveSurfer] Error during delayed destroy:", error);
                            }
                        }, 100); // Small delay to give in-progress operations time to complete

                    } catch (error) {
                        console.error("[useWaveSurfer] Error during cleanup:", error);
                    }
                }
            };

            // Store cleanup in global variable for HMR
            instanceCleanup = finalCleanup;

            // Return the cleanup function to React
            return finalCleanup;

        } catch (error) {
            console.error("[useWaveSurfer] Error setting up wavesurfer:", error);
            return () => { };
        }
    }, []); // Empty dependency array - only run on mount

    // Handle audio source changes separately
    useEffect(() => {
        if (!waveform || !audioSrc) return;

        if (audioSrcRef.current !== audioSrc) {
            console.log("[useWaveSurfer] Audio source changed, loading:", audioSrc);
            audioSrcRef.current = audioSrc;
            try {
                waveform.load(audioSrc);
            } catch (error) {
                console.error("[useWaveSurfer] Error loading audio:", error);
            }
        }
    }, [audioSrc, waveform]);

    return {
        waveform,
        wsRegions,
        wsSpectrogram,
        waveformReady,
        currentTime,
        duration,
        isPlaying,
        zoomLevel,
        setZoom: useCallback((level: number) => {
            setZoomLevel(level);
            waveform && waveform?.zoom(level);
        }, [waveform]),
        play: useCallback(() => waveform && waveform?.play(), [waveform]),
        pause: useCallback(() => waveform && waveform?.pause(), [waveform]),
        skipForward: useCallback(() => waveform && waveform?.skip(5), [waveform]),
        skipBackward: useCallback(() => waveform && waveform?.skip(-5), [waveform]),
        seekTo: useCallback((position: number) => waveform && waveform?.seekTo(position), [waveform]),
    };
};
