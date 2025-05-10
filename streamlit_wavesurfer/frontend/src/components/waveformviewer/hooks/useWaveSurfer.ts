import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { WaveSurferUserOptions } from "@waveformviewer/types";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { pluginsAtom, registerPlugins, DEFAULT_PLUGINS } from "../atoms/plugins";
import { waveSurferAtom } from "../atoms/wavesurfer";

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
    const regionsPluginRef = (useAtomValue(waveSurferAtom) && (useAtomValue(waveSurferAtom) as any).getPlugin)
        ? (useAtomValue(waveSurferAtom) as any).getPlugin("regions")
        : null;
    const { data: audioBlob, isSuccess, isLoading } = useQuery({
        queryKey: ['audioData', audioSrc],
        queryFn: () => fetchAudioData(audioSrc),
        staleTime: Infinity,
    });
    const setWaveSurfer = useSetAtom(setWaveSurferAtom);
    const waveSurfer = useAtomValue(waveSurferAtom);

    useEffect(() => {
        if (waveOptions && waveSurfer) {
            waveSurfer.setOptions(waveOptions);
        }
    }, [waveOptions, waveSurfer]);

    const createWavesurfer = useCallback(() => {
        if (!containerRef.current || !audioBlob) return;

        waveSurfer?.destroy();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            normalize: true,
            minPxPerSec: 10,
            ...waveOptions,
        });
        console.log("created wavesurfer", ws);

        // Register all plugins from the atom (or use defaults)
        registerPlugins(plugins.length ? plugins : DEFAULT_PLUGINS, ws);

        ws.on("ready", () => {
            setDuration(ws.getDuration());
            onReady();
        });
        ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime()));
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        ws.loadBlob(audioBlob);
        setWaveSurfer(ws);
    }, [audioBlob, containerRef, waveOptions, onReady, plugins, setWaveSurfer, waveSurfer]);

    useEffect(() => {
        if (isSuccess) createWavesurfer();
        return () => {
            destroyWaveSurfer(waveSurfer, setWaveSurfer);
        };
    }, [audioBlob, isSuccess, createWavesurfer]);

    return {
        waveform: waveSurfer,
        currentTime,
        duration,
        isPlaying,
        regionsPlugin: regionsPluginRef,
        play: () => waveSurfer?.play(),
        pause: () => waveSurfer?.pause(),
        skipForward: () => waveSurfer?.skip(5),
        skipBackward: () => waveSurfer?.skip(-5),
        seekTo: (position: number) => waveSurfer?.seekTo(position),
        setZoom: (level: number) => waveSurfer?.zoom(level),
        isLoading: Boolean(isLoading),
    };
};