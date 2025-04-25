import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useCallback, useRef, useState } from "react";



export const useRegions = (
    wsRegions: RegionsPlugin | null,
    regions: Region[],
    colors: string[],
    loopRegion: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    console.log(loopRegion)
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const activeRegionRef = useRef<any>(null);
    const [regionOriginalColors, setRegionOriginalColors] = useState<Record<string, string>>({});

    // Function to get the target region for editing
    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
    }, []);

    // Update active region reference
    useEffect(() => {
        activeRegionRef.current = activeRegion;
    }, [activeRegion]);

    // Highlight active region
    useEffect(() => {
        if (activeRegion && wsRegions) {
            // Store original color if not already stored
            if (!regionOriginalColors[activeRegion.id]) {
                setRegionOriginalColors(prev => ({
                    ...prev,
                    [activeRegion.id]: activeRegion.color
                }));
            }

            // Get original color or current color
            const originalColor = regionOriginalColors[activeRegion.id] || activeRegion.color;

            // Set the active region to a lighter color
            activeRegion.setOptions({
                color: lightenColor(originalColor)
            });

            // Reset colors of all other regions
            wsRegions.getRegions().forEach(region => {
                if (region.id !== activeRegion.id && regionOriginalColors[region.id]) {
                    region.setOptions({
                        color: regionOriginalColors[region.id]
                    });
                }
            });
        }
    }, [activeRegion, wsRegions, regionOriginalColors]);

    // Update regions in wavesurfer when props change
    useEffect(() => {
        if (!wsRegions) return;

        // Clear existing regions
        wsRegions.clearRegions();

        // Add regions
        regions.forEach((region, index) => {
            if (!region.start || !region.end) return;

            // Make sure color index is within bounds
            const colorIndex = index % colors.length;
            const regionId = region.id || buildRegionId(region);

            try {
                wsRegions.addRegion({
                    start: region.start,
                    end: region.end,
                    content: region.content,
                    id: regionId,
                    color: colors[colorIndex] || `rgba(100, 100, 100, 0.5)`,
                    drag: region.drag,
                    resize: region.resize,
                });
            } catch (error) {
                console.error("Error adding region:", error);
            }
        });

        // Set up region event handlers
        const setupRegionEvents = () => {
            wsRegions.on('region-in', (region) => {
                setActiveRegion(region);
            });

            wsRegions.on('region-clicked', (region) => {
                setActiveRegion(region);
            });
        };

        setupRegionEvents();
    }, [wsRegions, regions, colors]);

    // Function to report regions back to parent
    const reportRegionsToParent = useCallback(() => {
        if (!wsRegions || !onRegionsChange) return;

        const currentRegions = wsRegions.getRegions();
        const regionsForParent = currentRegions.map(wsRegion => {
            let content = '';
            if (typeof wsRegion.content === 'string') {
                content = wsRegion.content;
            } else if (wsRegion.content instanceof HTMLElement) {
                content = wsRegion.content.textContent || '';
            }

            return {
                id: wsRegion.id,
                start: wsRegion.start,
                end: wsRegion.end,
                content: content,
                color: wsRegion.color,
                drag: wsRegion.drag,
                resize: wsRegion.resize
            };
        });

        onRegionsChange(regionsForParent);
    }, [wsRegions, onRegionsChange]);

    // Function to update region boundaries
    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
    }, []);

    return {
        activeRegion,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary
    };
};