import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useCallback, useRef, useMemo } from "react";
export const useRegions = (
    regionsPlugin: RegionsPlugin | null,
    regions: Region[],
    colors: string[],
    loopRegions: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    // Refs setup
    const activeRegionRef = useRef<any>(null);
    const loopRegionsRef = useRef<boolean>(loopRegions);
    const regionsPluginRef = useRef<RegionsPlugin | null>(null);
    const regionOriginalColorsRef = useRef<Record<string, string>>({});

    regionsPluginRef.current = regionsPlugin;
    loopRegionsRef.current = loopRegions;

    const regionsKey = useMemo(() => {
        const regionIds = regions.map(region => region.id || buildRegionId(region)).join('-');
        return `${regions.length}-${regionIds}`;
    }, [regions]);
    const colorsKey = useMemo(() => JSON.stringify(colors), [colors]);

    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
    }, []);

    const getLoopRegions = useCallback(() => {
        return loopRegionsRef.current;
    }, []);

    const getCleanContent = useCallback((content: any): string => {
        let result = '';
        if (typeof content === 'string') {
            result = content;
        } else if (content && typeof content.textContent === 'string') {
            result = content.textContent;
        } else if (content && content.toString) {
            result = content.toString();
        }
        return result.replace(/↻\s*/g, '');
    }, []);

    const regionColors = useMemo(() => {
        return regions.map((region, index) => {
            const colorIndex = index % colors.length;
            const color = region.color || colors[colorIndex] || "rgba(100, 100, 100, 0.5)";
            return {
                id: region.id || buildRegionId(region),
                color,
                lightenedColor: lightenColor(color),
            };
        });
    }, [regionsKey, colorsKey]);

    // Show looping indicator on the active region
    const showLoopingIndicator = useCallback(() => {
        if (!regionsPluginRef.current || !activeRegionRef.current) return;

        try {
            const activeRegion = activeRegionRef.current;
            const regionsPlugin = regionsPluginRef.current;
            const isLooping = loopRegionsRef.current;

            // Get all plugin regions
            const pluginRegions = regionsPlugin.getRegions();
            if (!pluginRegions || !Array.isArray(pluginRegions)) return;

            pluginRegions.forEach(region => {
                if (!region) return;

                const contentText = getCleanContent(region.content);
                const displayContent = (isLooping && region.id === activeRegion.id)
                    ? `↻ ${contentText}`
                    : contentText;

                try {
                    region.setOptions({
                        content: displayContent
                    });
                } catch (error) {
                    console.log("[useRegions](showLoopingIndicator) Error setting region options:", error);
                }
            });
        } catch (error) {
            console.log("[useRegions](showLoopingIndicator) Error:", error);
        }
    }, [getCleanContent]);

    useEffect(() => {
        showLoopingIndicator();
    }, [showLoopingIndicator, loopRegions]);

    const updateActiveRegionColors = useCallback((activeReg: any) => {
        if (!activeReg || !regionsPluginRef.current || !regionColors || !regionColors.length) return;
        try {
            const regionId = activeReg.id;
            if (!regionOriginalColorsRef.current[regionId]) {
                regionOriginalColorsRef.current[regionId] = activeReg.color;
            }

            const originalColor = regionOriginalColorsRef.current[regionId] || activeReg.color;
            const regionColor = regionColors.find(color => color.id === regionId);

            // Get all regions
            const regions = regionsPluginRef.current.getRegions();
            if (!regions || !Array.isArray(regions)) return;

            // Process all regions in a single loop
            regions.forEach(region => {
                if (!region) return;

                if (region.id === regionId) {
                    region.setOptions({
                        color: regionColor?.lightenedColor || lightenColor(originalColor)
                    });
                } else if (regionOriginalColorsRef.current[region.id]) {
                    const otherColorInfo = regionColors.find(color => color.id === region.id);
                    region.setOptions({
                        color: otherColorInfo?.color || regionOriginalColorsRef.current[region.id]
                    });
                }
            });
        } catch (error) {
            console.log("[useRegions](updateActiveRegionColors) Error:", error);
        }
    }, [regionColors]);

    const setActiveRegion = useCallback((region: any) => {
        if (!region) return;
        activeRegionRef.current = region;
        updateActiveRegionColors(region);
        setTimeout(() => {
            showLoopingIndicator();
        }, 10);
    }, [updateActiveRegionColors, showLoopingIndicator]);

    // Setup regions and event handlers
    const setupRegionsAndHandlers = useCallback(() => {
        if (!regionsPlugin) return;

        let hasSetupEventHandlers = false;
        console.log("setupRegionsAndHandlers", regionsPlugin, true);
        try {
            regionsPlugin.clearRegions();

            regions.forEach((region, index) => {
                if (region.start == null || region.end == null || region.content == null) return;

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

            const handleRegionIn = (region: any) => {
                setActiveRegion(region);
            };

            const handleRegionClicked = (region: any) => {
                setActiveRegion(region);
            };

            const handleRegionOut = (region: any) => {
                if (loopRegionsRef.current && activeRegionRef.current && typeof activeRegionRef.current.play === 'function') {
                    try {
                        activeRegionRef.current.play();
                    } catch (error) {
                        console.log("[useRegions](handleRegionOut) Error playing region:", error);
                    }
                }
            };

            // Add event listeners
            regionsPlugin.on('region-in', handleRegionIn);
            regionsPlugin.on('region-clicked', handleRegionClicked);
            regionsPlugin.on('region-out', handleRegionOut);

            hasSetupEventHandlers = true;
        } catch (error) {
            console.log("[useRegions](setupRegions) Error:", error);
        }

        return () => {
            if (regionsPlugin && hasSetupEventHandlers) {
                try {
                    regionsPlugin.unAll();
                } catch (e) {
                    console.log("[useRegions](cleanup) Error cleaning up region events:", e);
                }
            }
        };
    }, [regionsPlugin, regions, colors, setActiveRegion]);

    // Update active region colors when regionsPlugin changes
    const syncActiveRegionOnPluginChange = useCallback(() => {
        if (!regionsPlugin) return;
        updateActiveRegionColors(activeRegionRef.current);
        showLoopingIndicator();
    }, [regionsPlugin, updateActiveRegionColors, showLoopingIndicator]);

    // Apply the setup regions and handlers useEffect
    useEffect(() => {
        const cleanup = setupRegionsAndHandlers();
        return cleanup;
    }, [setupRegionsAndHandlers]);

    useEffect(() => {
        syncActiveRegionOnPluginChange();
    }, [syncActiveRegionOnPluginChange]);

    // Report regions to parent
    const reportRegionsToParent = useCallback(() => {
        const plugin = regionsPluginRef.current;
        if (!plugin || !onRegionsChange) return;

        try {
            const currentRegions = plugin.getRegions();
            if (!currentRegions || !Array.isArray(currentRegions)) return;

            const regionsForParent = currentRegions.map(wsRegion => {
                // Use the safe content extractor
                const content = getCleanContent(wsRegion.content);

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
        } catch (error) {
            console.log("[useRegions](reportRegionsToParent) Error:", error);
        }
    }, [onRegionsChange, getCleanContent]);

    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;

        try {
            targetRegion.setOptions(options);

            // If boundary changes, make sure looping indicator is updated
            if (loopRegionsRef.current && activeRegionRef.current) {
                setTimeout(() => {
                    showLoopingIndicator();
                }, 10);
            }
        } catch (error) {
            console.log("[useRegions](updateRegionBoundary) Error:", error);
        }
    }, [showLoopingIndicator]);

    // Return stable interface with minimal state
    return {
        activeRegion: activeRegionRef.current,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors
    };
};