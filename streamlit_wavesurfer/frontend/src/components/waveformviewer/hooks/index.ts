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

export const useRegionColors = (regions: Region[], colormapName: string) => {
    return useMemo(() => {
        if (regions.length === 0) return [];

        const colorName = colormapName || 'magma';

        return colormap({
            colormap: colorName,
            nshades: Math.max(regions.length, 10),
            format: 'rgbaString',
            alpha: 0.2
        });
    }, [regions.length, colormapName]);
};
