import { useState, useRef, useEffect, useCallback } from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import WaveSurfer from "wavesurfer.js";
import { WaveSurferUserOptions } from "../types";


let wavesurferInstance: WaveSurfer | null = null;
let instanceCleanup: (() => void) | null = null;


if (typeof module !== 'undefined' && (module as any).hot) {
    (module as any).hot.dispose(() => {
        instanceCleanup?.();
        instanceCleanup = null;
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
    const [zoomLevel, setZoomLevel] = useState(100);


    const optionsRef = useRef(waveOptions);
    const audioSrcRef = useRef(audioSrc);
    const showSpectrogramRef = useRef(showSpectrogram);
    const onReadyCallbackRef = useRef(onReadyCallback);


    useEffect(() => {
        optionsRef.current = waveOptions;
        audioSrcRef.current = audioSrc;
        showSpectrogramRef.current = showSpectrogram;
        onReadyCallbackRef.current = onReadyCallback;
    }, [waveOptions, audioSrc, showSpectrogram, onReadyCallback]);


    const getWavesurferOptions = useCallback(() => ({
        container: containerRef.current!,
        responsive: true,
        xhr: { cache: 'default', mode: 'no-cors' },
        normalize: true,
        ...optionsRef.current
    }), [containerRef]);


    useEffect(() => {

        if (!containerRef.current) return;


        if (wavesurferInstance) {
            setWaveform(wavesurferInstance);
            wavesurferInstance.load(audioSrc);
            return;
        }


        const ws = WaveSurfer.create(getWavesurferOptions());
        wavesurferInstance = ws;



        const regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
        ws.registerPlugin(TimelinePlugin.create({
            height: 10,
            timeInterval: 0.1,
            primaryLabelInterval: 1,
            style: {
                fontSize: '10px',
                color: optionsRef.current.waveColor || '#ccc',
            },
        }));


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


        setWaveform(ws);
        setWsRegions(regionsPlugin);


        ws.on("ready", () => {
            ws.zoom(zoomLevel);
            setDuration(ws.getDuration());
            setWaveformReady(true);
            onReadyCallbackRef.current();
        });
        ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
        ws.on('play', () => {
            const startTime = performance.now();
            console.log("[Performance] 'play' event fired");
            setIsPlaying(true);
            console.log("[Performance] setIsPlaying(true) complete", performance.now() - startTime, "ms");
        });
        ws.on('pause', () => {
            const startTime = performance.now();
            console.log("[Performance] 'pause' event fired");
            setIsPlaying(false);
            console.log("[Performance] setIsPlaying(false) complete", performance.now() - startTime, "ms");
        });

        ws.load(audioSrcRef.current);


        const cleanup = () => {

            if (!ws) return;

            if (ws.isPlaying()) ws.pause();
            if (typeof ws.unAll === 'function') ws.unAll();


            setWaveform(null);
            setWsRegions(null);
            setWsSpectrogram(null);
            setWaveformReady(false);


            if (wavesurferInstance === ws) {
                wavesurferInstance = null;
            }


            setTimeout(() => {
                if (ws && typeof ws.destroy === 'function') {
                    ws.destroy();
                }
            }, 100);
        };

        instanceCleanup = cleanup;
        return cleanup;
    }, []);


    useEffect(() => {
        if (!waveform || !audioSrc) return;

        if (audioSrcRef.current !== audioSrc) {
            audioSrcRef.current = audioSrc;
            waveform.load(audioSrc);
        }
    }, [audioSrc, waveform]);


    useEffect(() => {
        console.log("[Performance] isPlaying state changed to:", isPlaying);
    }, [isPlaying]);


    useEffect(() => {
        if (!waveform) return;

        const handleAudioProcess = () => {
            const start = performance.now();
            // This updates the waveform visualization
            const end = performance.now();
            if (end - start > 5) { // Only log slow updates
                console.log(`[Performance] Waveform update took ${end - start} ms`);
            }
        };

        waveform.on('audioprocess', handleAudioProcess);
        return () => {
            waveform.un('audioprocess', handleAudioProcess);
        };
    }, [waveform]);


    useEffect(() => {
        if (isPlaying) {
            const start = performance.now();
            // Check what happens when playback starts
            const end = performance.now();
            console.log(`[Performance] Play side effects took ${end - start} ms`);
        }
    }, [isPlaying]);


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
            waveform?.zoom(level);
        }, [waveform]),
        play: useCallback(() => waveform && waveform?.play(), [waveform]),
        pause: useCallback(() => waveform && waveform?.pause(), [waveform]),
        skipForward: useCallback(() => waveform && waveform?.skip(5), [waveform]),
        skipBackward: useCallback(() => waveform && waveform?.skip(-5), [waveform]),
        seekTo: useCallback((position: number) => waveform && waveform?.seekTo(position), [waveform]),
    };
};