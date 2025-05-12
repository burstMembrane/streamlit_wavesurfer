import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { WaveSurferUserOptions } from "@waveformviewer/types";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { pluginsAtom, registerPlugins, DEFAULT_PLUGINS } from "../atoms/plugins";
import { waveSurferAtom, waveSurferManagerAtom } from "../atoms/wavesurfer";

async function fetchAudioData(audioSrc: string): Promise<Blob> {
    const response = await fetch(audioSrc);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    return new Blob([await response.arrayBuffer()]);
}

export const useWaveSurfer = ({
    containerRef,
    audioSrc,
    waveOptions,
    onReady,
}: {
    containerRef: React.RefObject<HTMLDivElement>;
    audioSrc: string;
    waveOptions: WaveSurferUserOptions;
    showSpectrogram: boolean;
    showMinimap: boolean;
    onReady: () => void;
}) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [plugins] = useAtom(pluginsAtom);
    const { data: audioBlob, isSuccess, isLoading } = useQuery({
        queryKey: ['audioData', audioSrc],
        queryFn: () => fetchAudioData(audioSrc),
        staleTime: Infinity,
    });
    const setWaveSurfer = useSetAtom(waveSurferAtom);
    const { instance: waveSurfer } = useAtomValue(waveSurferAtom);
    const createWavesurfer = useCallback(() => {
        if (!containerRef.current || !audioBlob) return;
        const ws = WaveSurfer.create({
            container: containerRef.current,
            normalize: true,
            minPxPerSec: 10,
            ...waveOptions,
        });
        setWaveSurfer({ instance: ws, ready: false });
        console.log("created wavesurfer", ws);
        console.log("plugins", plugins);
        registerPlugins(plugins.length ? plugins : DEFAULT_PLUGINS, ws);
        ws.on("ready", () => {
            setWaveSurfer({ instance: ws, ready: true });
            console.log("wavesurfer ready", ws);
            setDuration(ws.getDuration());
            onReady();
        });
        ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime()));
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));
        ws.loadBlob(audioBlob);
    }, [audioBlob, containerRef, waveOptions, onReady, plugins, setWaveSurfer, waveSurfer]);

    useEffect(() => {
        waveSurfer?.destroy()
        if (isSuccess) createWavesurfer();
        return () => {
            waveSurfer?.destroy();
        };
    }, [audioBlob, isSuccess]);

    return {
        waveform: waveSurfer,
        currentTime,
        duration,
        isPlaying,
        play: () => waveSurfer?.play(),
        pause: () => waveSurfer?.pause(),
        skipForward: () => waveSurfer?.skip(5),
        skipBackward: () => waveSurfer?.skip(-5),
        seekTo: (position: number) => waveSurfer?.seekTo(position),
        setZoom: (level: number) => waveSurfer?.zoom(level),
        isLoading: Boolean(isLoading),
    };
};