import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import WaveSurfer from "wavesurfer.js";
import { WaveSurferUserOptions } from "@waveformviewer/types";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { pluginsAtom, unregisterPlugin, WaveSurferPluginConfiguration, registerPlugin } from "../atoms/plugins";
import { waveSurferAtom } from "../atoms/wavesurfer";

import { keyAtom } from "../atoms/key";
async function fetchAudioData(audioSrc: string): Promise<Blob> {
    const response = await fetch(audioSrc);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    return new Blob([await response.arrayBuffer()]);
}
console.log("Hello from useWaveSurfer")
export const useWaveSurfer = ({
    containerRef,
    audioSrc,
    waveOptions,
    onReady,
}: {
    containerRef: React.RefObject<HTMLDivElement>;
    audioSrc: string;
    waveOptions: WaveSurferUserOptions;

    onReady: () => void;
}) => {

    const key = useAtomValue(keyAtom);
    const syncChannel = useMemo(() => new BroadcastChannel(`streamlit-wavesurfer-sync-${key}`), [key]);

    const [currentTime] = useState(0);
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
    const prevPluginsRef = useRef<WaveSurferPluginConfiguration[]>([]);

    const createWavesurfer = useCallback(() => {
        if (!containerRef.current || !audioBlob) return;
        const ws = WaveSurfer.create({
            container: containerRef.current,
            normalize: true,
            minPxPerSec: 10,
            ...waveOptions,
        });

        // Unregister plugins that are no longer present or whose options changed
        prevPluginsRef.current.forEach(prevPlugin => {
            const current = plugins.find(p => p.name === prevPlugin.name);
            if (
                !current ||
                JSON.stringify(current.options) !== JSON.stringify(prevPlugin.options)
            ) {
                unregisterPlugin(prevPlugin, ws);
            }
        });
        setWaveSurfer({ instance: ws, ready: false });

        // Register new or updated plugins
        plugins.forEach(plugin => {
            const prev = prevPluginsRef.current.find(p => p.name === plugin.name);
            if (
                !prev ||
                JSON.stringify(prev.options) !== JSON.stringify(plugin.options)
            ) {
                registerPlugin(plugin, ws);
            }
        });
        // Update the ref
        prevPluginsRef.current = plugins;


        ws.on("ready", () => {
            setWaveSurfer({ instance: ws, ready: true });
            setDuration(ws.getDuration());
            onReady();

            syncChannel.postMessage({
                type: "ready",
                time: ws.getCurrentTime()
            });

        });
        ws.on("audioprocess", () => {

            syncChannel.postMessage({
                type: "timeUpdate",
                time: ws.getCurrentTime()
            });

        });
        ws.on("play", () => {
            setIsPlaying(true);
            const msg = {
                type: "play",
                time: ws.getCurrentTime()
            };
            syncChannel.postMessage(msg);
        });
        ws.on("pause", () => {
            setIsPlaying(false);
            syncChannel.postMessage({
                type: "pause",
                time: ws.getCurrentTime()
            });
        });
        ws.on("timeupdate", () => {
            syncChannel.postMessage({
                type: "timeUpdate",
                time: ws.getCurrentTime()
            });
        });
        ws.on("finish", () => {
            setIsPlaying(false);
            syncChannel.postMessage({
                type: "finish",
                time: ws.getCurrentTime()
            });
        });
        ws.loadBlob(audioBlob);

        if (import.meta.env.DEV) {
            syncChannel.onmessage = (event) => {
                console.log("syncChannel message", event);
            };
        }
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