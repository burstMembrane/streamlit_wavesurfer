import { useCallback, useMemo } from "react";
import colormap from 'colormap'
import { Region } from "@/components/waveformviewer/types";
export * from "./useRegions";
export * from "./useWaveSurfer";
export * from "./useWaveSurferHotkeys";

export const useTimeFormatter = () => {
    return useCallback((seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);
};
