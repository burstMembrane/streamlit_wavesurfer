import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tryCatch } from "@/utils";
export const useRegions = (
    regionsPlugin: RegionsPlugin | null,
    regions: Region[],
    colors: string[],
    loopRegions: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    const activeRegionRef = useRef<any>(null);
    const loopRegionsRef = useRef<boolean>(loopRegions);
    const regionsPluginRef = useRef<RegionsPlugin | null>(null);
    const regionOriginalColorsRef = useRef<Record<string, string>>({});

    const [activeRegion, setActiveRegion] = useState<any>(null);

    const regionsKey = useMemo(() => JSON.stringify(regions), [regions]);
    const colorsKey = useMemo(() => JSON.stringify(colors), [colors]);

    useEffect(() => {
        regionsPluginRef.current = regionsPlugin;
    }, [regionsPlugin]);

    useEffect(() => {
        loopRegionsRef.current = loopRegions;
    }, [loopRegions]);

    useEffect(() => {
        activeRegionRef.current = activeRegion;
    }, [activeRegion]);

    // Memoized callbacks to avoid recreation on rerenders
    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
    }, []);

    const getLoopRegions = useCallback(() => {
        return loopRegionsRef.current;
    }, []);

    // Use React Query for region colors calculation
    const { data: regionColors = [] } = useQuery({
        queryKey: ['regionColors', regionsKey, colorsKey],
        queryFn: () => {
            return regions.map((region, index) => {
                const colorIndex = index % colors.length;
                const color = region.color || colors[colorIndex] || `rgba(100, 100, 100, 0.5)`;
                return {
                    id: region.id || buildRegionId(region),
                    color,
                    lightenedColor: lightenColor(color)
                };
            });
        },
        initialData: []
    });

    const updateActiveRegionColors = useCallback((activeReg: any) => {
        if (!activeReg || !regionsPluginRef.current) return;

        const regionId = activeReg.id;
        if (!regionOriginalColorsRef.current[regionId]) {
            regionOriginalColorsRef.current[regionId] = activeReg.color;
        }

        const originalColor = regionOriginalColorsRef.current[regionId] || activeReg.color;
        const colorInfo = regionColors.find(color => color.id === regionId);

        activeReg.setOptions({
            color: colorInfo?.lightenedColor || lightenColor(originalColor)
        });

        // Reset other regions to their original colors
        regionsPluginRef.current.getRegions().forEach(region => {
            if (region.id !== regionId && regionOriginalColorsRef.current[region.id]) {
                const otherColorInfo = regionColors.find(color => color.id === region.id);
                region.setOptions({
                    color: otherColorInfo?.color || regionOriginalColorsRef.current[region.id]
                });
            }
        });
    }, [regionColors]);

    useEffect(() => {
        if (activeRegion) {
            updateActiveRegionColors(activeRegion);
        }
    }, [activeRegion, updateActiveRegionColors]);

    useEffect(() => {
        if (!regionsPlugin) return;

        // Clear existing regions
        regionsPlugin.clearRegions();

        // Add regions
        regions.forEach((region, index) => {
            if (!region.start || !region.end || !region.content) return;

            const colorIndex = index % colors.length;
            const regionId = region.id || buildRegionId(region);
            regionsPlugin.addRegion({
                start: region.start,
                end: region.end,
                content: region.content,
                id: regionId,
                color: colors[colorIndex] || `rgba(100, 100, 100, 0.5)`,
                drag: region.drag,
                resize: region.resize,
            });
        });

        // Set up event handlers without closures that would capture stale values

        // Set up event handlers without closures that would capture stale values
        const handleRegionIn = (region: any) => {
            setActiveRegion(region);
        };

        const handleRegionClicked = (region: any) => {
            setActiveRegion(region);
        };

        const handleRegionOut = (region: any) => {
            if (loopRegionsRef.current && region && typeof region.play === 'function') {
                region.play();
            }
        };

        // Add event listeners
        regionsPlugin.on('region-in', handleRegionIn);
        regionsPlugin.on('region-clicked', handleRegionClicked);
        regionsPlugin.on('region-out', handleRegionOut);

        // Cleanup event handlers
        return () => {
            if (regionsPlugin) {
                try {
                    regionsPlugin.unAll();
                } catch (e) {
                    console.log("[useRegions](cleanup) Error cleaning up region events:", e);
                }
            }
        };
    }, [regionsPlugin, regions, colors]);

    // Report regions to parent without causing rerenders
    const reportRegionsToParent = useCallback(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !onRegionsChange) return;

        const currentRegions = plugin.getRegions();
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
    }, [onRegionsChange]);

    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
    }, []);

    // Return stable interface with minimal state
    return {
        activeRegion,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors
    };
};