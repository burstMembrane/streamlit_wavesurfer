import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"
import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
export const useRegions = (
    regionsPlugin: RegionsPlugin | null,
    regions: Region[],
    colors: string[],
    loopRegions: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    const [activeRegion, setActiveRegion] = useState<any>(null);
    const activeRegionRef = useRef<any>(null);
    const loopRegionsRef = useRef<boolean>(loopRegions);
    const [regionOriginalColors, setRegionOriginalColors] = useState<Record<string, string>>({});
    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
    }, []);

    // Update loopRegionsRef when loopRegions prop changes
    useEffect(() => {
        console.log("loopRegions prop changed to:", loopRegions);
        loopRegionsRef.current = loopRegions;
    }, [loopRegions]);

    const getLoopRegions = useCallback(() => {
        return loopRegionsRef.current;
    }, [loopRegionsRef]);

    const { data: regionColors = [] } = useQuery(
        {
            queryKey: ['regionColors', JSON.stringify(regions), colors],
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
        }
    );

    useEffect(() => {
        activeRegionRef.current = activeRegion;
    }, [activeRegion]);
    useEffect(() => {
        if (activeRegion && regionsPlugin) {
            if (!regionOriginalColors[activeRegion.id]) {
                setRegionOriginalColors(prev => ({
                    ...prev,
                    [activeRegion.id]: activeRegion.color
                }));
            }
            const originalColor = regionOriginalColors[activeRegion.id] || activeRegion.color;
            activeRegion.setOptions({
                color: regionColors?.find(color => color.id === activeRegion.id)?.lightenedColor || lightenColor(originalColor)
            });
            regionsPlugin.getRegions().forEach(region => {
                if (region.id !== activeRegion.id && regionOriginalColors[region.id]) {
                    region.setOptions({
                        color: regionColors?.find(color => color.id === region.id)?.color || regionOriginalColors[region.id]
                    });
                }
            });
        }
    }, [activeRegion, regionsPlugin, regionOriginalColors, regionColors]);

    useEffect(() => {
        if (!regionsPlugin) return;
        regionsPlugin.clearRegions();
        regions.forEach((region, index) => {
            if (!region.start || !region.end) return;
            const colorIndex = index % colors.length;
            const regionId = region.id || buildRegionId(region);
            try {
                regionsPlugin.addRegion({
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
            regionsPlugin.on('region-in', (region) => {
                setActiveRegion(region);
            });

            regionsPlugin.on('region-clicked', (region) => {
                setActiveRegion(region);
            });

            regionsPlugin.on('region-out', (region) => {
                console.log("loopRegions value in region-out:", loopRegionsRef.current);
                if (loopRegionsRef.current) {
                    console.log("looping region", region);

                    // Important: Keep this region as the active region even when exiting
                    // to maintain target region tracking during looping

                    // Only play if still active/exists
                    if (region && typeof region.play === 'function') {
                        region.play();
                    }
                }
            });
        };

        setupRegionEvents();

        // Cleanup event handlers when unmounting
        return () => {
            if (regionsPlugin) {
                try {
                    // Unsubscribe from all event handlers
                    regionsPlugin.unAll();
                } catch (e) {
                    console.error("Error cleaning up region events:", e);
                }
            }
        };
    }, [regionsPlugin, regions, colors, getLoopRegions]);

    // Function to report regions back to parent
    const reportRegionsToParent = useCallback(() => {
        if (!regionsPlugin || !onRegionsChange) return;

        const currentRegions = regionsPlugin.getRegions();
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
    }, [regionsPlugin, onRegionsChange]);

    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
    }, []);

    return {
        activeRegion,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors
    };
};