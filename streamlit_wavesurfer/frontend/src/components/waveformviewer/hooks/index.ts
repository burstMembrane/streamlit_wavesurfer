import { useCallback, useMemo } from "react";
import colormap from 'colormap'
import { Region } from "../../../types";

// Hook for formatting time
export const useTimeFormatter = () => {
    return useCallback((seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);
};

// Hook to get colors from a colormap
export const useRegionColors = (regions: Region[], colormapName: string) => {
    return useMemo(() => {
        if (regions.length === 0) return [];

        // Default to 'magma' colormap if none provided
        const colorName = colormapName || 'magma';

        // Generate colors using colormap with lower alpha for more muted colors
        return colormap({
            colormap: colorName,
            nshades: Math.max(regions.length, 10),
            format: 'rgbaString',
            alpha: 0.2 // Reduced alpha for more muted colors
        });
    }, [regions.length, colormapName]);
};
