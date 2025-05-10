import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useCallback, useRef, useMemo } from "react";
import { useAtomValue } from "jotai";
import { getPluginByNameAtom } from "../atoms/plugins";
import WaveSurfer from "wavesurfer.js";

export const useRegions = (
    waveform: WaveSurfer | null,
    regions: Region[] | null,
    colors: string[],
    loopRegions: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    // 1. Call all hooks unconditionally
    const activeRegionRef = useRef<any>(null);
    const loopRegionsRef = useRef<boolean>(loopRegions);
    const regionOriginalColorsRef = useRef<Record<string, string>>({});
    const getPluginByName = useAtomValue(getPluginByNameAtom);
    const regionsPlugin = getPluginByName("regions");

    loopRegionsRef.current = loopRegions;
    const regionsKey = useMemo(() => {
        if (!regions) return "";
        const regionIds = regions.map(region => region.id || buildRegionId(region)).join('-');
        return `${regions.length}-${regionIds}`;
    }, [regions]);
    const colorsKey = useMemo(() => JSON.stringify(colors), [colors]);

    const getTargetRegion = useCallback(() => {
        return activeRegionRef.current;
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
        if (!regions || regions.length === 0) return [];
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

    // 2. After all hooks, check if waveform and regionsPlugin are valid
    if (!waveform || !regionsPlugin) {
        return {
            activeRegion: null,
            setActiveRegion: () => { },
            getTargetRegion: () => null,
            reportRegionsToParent: () => { },
            updateRegionBoundary: () => { },
            regionColors: [],
        };
    }

    // Show looping indicator on the active region
    const showLoopingIndicator = useCallback(() => {
        if (!activeRegionRef.current) return;
        try {
            const activeRegion = activeRegionRef.current;
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
    }, [getCleanContent, regionsPlugin]);

    useEffect(() => {
        showLoopingIndicator();
    }, [showLoopingIndicator, loopRegions]);

    const updateActiveRegionColors = useCallback((activeReg: any) => {
        if (!activeReg || !regionColors || !regionColors.length) return;
        try {
            const regionId = activeReg.id;
            if (!regionOriginalColorsRef.current[regionId]) {
                regionOriginalColorsRef.current[regionId] = activeReg.color;
            }
            const originalColor = regionOriginalColorsRef.current[regionId] || activeReg.color;
            const regionColor = regionColors.find(color => color.id === regionId);
            // Get all regions
            const pluginRegions = regionsPlugin.getRegions();
            if (!pluginRegions || !Array.isArray(pluginRegions)) return;
            // Process all regions in a single loop
            pluginRegions.forEach(region => {
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
    }, [regionColors, regionsPlugin]);

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
        if (!regions || regions.length === 0) return;
        let hasSetupEventHandlers = false;
        console.log("setupRegionsAndHandlers", regionsPlugin);
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
        const handleRegionOut = () => {
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
        return () => {
            if (!hasSetupEventHandlers) return;
            regionsPlugin.unAll();
        };
    }, [regionsPlugin, regions, colors, setActiveRegion]);

    const syncActiveRegionOnPluginChange = useCallback(() => {
        updateActiveRegionColors(activeRegionRef.current);
        showLoopingIndicator();
    }, [updateActiveRegionColors, showLoopingIndicator]);

    useEffect(() => {
        const cleanup = setupRegionsAndHandlers();
        return cleanup;
    }, [setupRegionsAndHandlers]);

    useEffect(() => {
        syncActiveRegionOnPluginChange();
    }, [syncActiveRegionOnPluginChange]);

    const reportRegionsToParent = useCallback(() => {
        if (!onRegionsChange) return;
        try {
            const currentRegions = regionsPlugin.getRegions();
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
    }, [onRegionsChange, getCleanContent, regionsPlugin]);

    const updateRegionBoundary = useCallback((targetRegion: any, options: any) => {
        if (!targetRegion) return;
        try {
            targetRegion.setOptions(options);
            if (loopRegionsRef.current && activeRegionRef.current) {
                setTimeout(() => {
                    showLoopingIndicator();
                }, 10);
            }
        } catch (error) {
            console.log("[useRegions](updateRegionBoundary) Error:", error);
        }
    }, [showLoopingIndicator]);

    // 3. Normal logic and return
    return {
        activeRegion: activeRegionRef.current,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors
    };
};