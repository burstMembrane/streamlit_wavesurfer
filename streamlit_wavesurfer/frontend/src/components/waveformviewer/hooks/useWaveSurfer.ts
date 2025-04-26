import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom";
import { WaveSurferUserOptions } from "@waveformviewer/types";

async function fetchAudioData(audioSrc: string): Promise<Blob> {
    const response = await fetch(audioSrc);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    return new Blob([await response.arrayBuffer()]);
}

export const useWaveSurfer = ({
    containerRef,
    audioSrc,
    waveOptions,
    showSpectrogram,
    onReady,
}: {
    containerRef: React.RefObject<HTMLDivElement>;
    audioSrc: string;
    waveOptions: WaveSurferUserOptions;
    showSpectrogram: boolean;
    onReady: () => void;
}) => {
    const waveformRef = useRef<WaveSurfer | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const regionsPluginRef = useRef<RegionsPlugin | null>(null);
    const { data: audioBlob, isSuccess } = useQuery({
        queryKey: ['audioData', audioSrc],
        queryFn: () => fetchAudioData(audioSrc),
        staleTime: Infinity,
    });

    const createWavesurfer = useCallback(() => {
        if (!containerRef.current || !audioBlob) return;

        waveformRef.current?.destroy();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            normalize: true,
            minPxPerSec: 10,
            ...waveOptions,
        });

        const regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
        regionsPluginRef.current = regionsPlugin;
        ws.registerPlugin(TimelinePlugin.create({ height: 10 }));
        ws.registerPlugin(ZoomPlugin.create({ exponentialZooming: true, iterations: 100 }));

        if (showSpectrogram) {
            ws.registerPlugin(SpectrogramPlugin.create({
                labels: true,
                height: 200,
                frequencyMax: 8000,
                frequencyMin: 0,
                labelsColor: "transparent",
                fftSamples: 512,
                scale: "mel",
            }));
        }

        ws.on("ready", () => {
            setDuration(ws.getDuration());
            onReady();
        });
        ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime()));
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        ws.loadBlob(audioBlob);
        waveformRef.current = ws;
    }, [audioBlob, containerRef, showSpectrogram, waveOptions, onReady]);

    useEffect(() => {
        if (isSuccess) createWavesurfer();
        return () => {
            waveformRef.current?.destroy();
            waveformRef.current = null;
        };
    }, [audioBlob, isSuccess]);

    return {
        waveform: waveformRef.current,
        currentTime,
        duration,
        isPlaying,
        regionsPlugin: regionsPluginRef.current,
        play: () => waveformRef.current?.play(),
        pause: () => waveformRef.current?.pause(),
        skipForward: () => waveformRef.current?.skip(5),
        skipBackward: () => waveformRef.current?.skip(-5),
        seekTo: (position: number) => waveformRef.current?.seekTo(position),
        setZoom: (level: number) => waveformRef.current?.zoom(level),
    };
};