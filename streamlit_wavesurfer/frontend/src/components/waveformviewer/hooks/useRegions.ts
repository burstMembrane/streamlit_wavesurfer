import { Region } from "../types";
import { buildRegionId, lightenColor } from '../utils';
import { useEffect, useRef, useMemo } from "react";
import { useAtomValue } from "jotai";
import { getPluginByNameAtom } from "../atoms/plugins";
import { waveSurferAtom } from "../atoms/wavesurfer";

export const useRegions = (
    regions: Region[] | null,
    colors: string[],
    loopRegions: boolean,
    onRegionsChange?: (regions: Region[]) => void
) => {
    const activeRegionRef = useRef<any>(null);
    const loopRegionsRef = useRef(loopRegions);
    const regionOriginalColorsRef = useRef<Record<string, string>>({});
    const { instance: waveSurfer, ready: waveformReady } = useAtomValue(waveSurferAtom);
    const regionsPlugin = useMemo(() => waveformReady && waveSurfer ? (waveSurfer as any).plugins.find((plugin: any) => plugin.regions) : null, [waveformReady, waveSurfer]);
    loopRegionsRef.current = loopRegions;
    const regionColors = (regions || []).map((region, index) => {
        const colorIndex = index % colors.length;
        const color = region.color || colors[colorIndex] || "rgba(100, 100, 100, 0.5)";
        return {
            id: region.id || buildRegionId(region),
            color,
            lightenedColor: lightenColor(color),
        };
    });

    const getTargetRegion = () => activeRegionRef.current;
    const getCleanContent = (content: any): string => {
        if (typeof content === 'string') return content.replace(/↻\s*/g, '');
        if (content && typeof content.textContent === 'string') return content.textContent.replace(/↻\s*/g, '');
        if (content && content.toString) return content.toString().replace(/↻\s*/g, '');
        return '';
    };

    const showLoopingIndicator = () => {
        if (!activeRegionRef.current || !waveformReady || !regionsPlugin) return;
        try {
            const activeRegion = activeRegionRef.current;
            const isLooping = loopRegionsRef.current;
            const pluginRegions = regionsPlugin.getRegions();
            if (!pluginRegions) return;
            pluginRegions.forEach(region => {
                if (!region) return;
                const contentText = getCleanContent(region.content);
                const displayContent = (isLooping && region.id === activeRegion.id)
                    ? `↻ ${contentText}`
                    : contentText;
                try { region.setOptions({ content: displayContent }); } catch { }
            });
        } catch { }
    };

    const updateActiveRegionColors = (activeReg: any) => {
        if (!activeReg || !regionColors.length || !waveformReady || !regionsPlugin || !waveSurfer) return;
        try {
            const regionId = activeReg.id;
            if (!regionOriginalColorsRef.current[regionId]) {
                regionOriginalColorsRef.current[regionId] = activeReg.color;
            }
            const originalColor = regionOriginalColorsRef.current[regionId] || activeReg.color;
            const regionColor = regionColors.find(color => color.id === regionId);
            const pluginRegions = regionsPlugin.getRegions();
            if (!pluginRegions) return;
            pluginRegions.forEach(region => {
                if (!region) return;
                if (region.id === regionId) {
                    region.setOptions({ color: regionColor?.lightenedColor || lightenColor(originalColor) });
                } else if (regionOriginalColorsRef.current[region.id]) {
                    const otherColorInfo = regionColors.find(color => color.id === region.id);
                    region.setOptions({ color: otherColorInfo?.color || regionOriginalColorsRef.current[region.id] });
                }
            });
        } catch { }
    };

    const setActiveRegion = (region: any) => {
        if (!region || !waveformReady || !regionsPlugin) return;
        activeRegionRef.current = region;
        updateActiveRegionColors(region);
        setTimeout(showLoopingIndicator, 10);
    };

    useEffect(() => {
        if (!waveformReady || !regionsPlugin || !regions || regions.length === 0) return;
        // check if the regionsPLugin is attached to the waveSurfer
        if (!waveSurfer?.getActivePlugins().includes(regionsPlugin)) {
            console.log("regionsPlugin", regionsPlugin);
            console.log("regionsPlugin is not attached to the waveSurfer");
        }

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
        const handleRegionIn = (region: any) => setActiveRegion(region);
        const handleRegionClicked = (region: any) => setActiveRegion(region);
        const handleRegionOut = () => {
            if (loopRegionsRef.current && activeRegionRef.current && typeof activeRegionRef.current.play === 'function') {
                try { activeRegionRef.current.play(); } catch { }
            }
        };
        regionsPlugin.on('region-in', handleRegionIn);
        regionsPlugin.on('region-clicked', handleRegionClicked);
        regionsPlugin.on('region-out', handleRegionOut);
        return () => { regionsPlugin.unAll(); };
    }, [regionsPlugin, regions, colors, waveformReady]);

    useEffect(() => { if (waveformReady) showLoopingIndicator(); }, [loopRegions, waveformReady]);
    useEffect(() => { if (waveformReady) { updateActiveRegionColors(activeRegionRef.current); showLoopingIndicator(); } }, [regionsPlugin, updateActiveRegionColors, showLoopingIndicator, waveformReady]);
    const reportRegionsToParent = () => {
        if (!onRegionsChange || !regionsPlugin) return;
        try {
            const currentRegions = regionsPlugin.getRegions();
            if (!currentRegions) return;
            const regionsForParent = currentRegions.map(wsRegion => {
                const content = getCleanContent(wsRegion.content);
                return {
                    id: wsRegion.id,
                    start: wsRegion.start,
                    end: wsRegion.end,
                    content,
                    color: wsRegion.color,
                    drag: wsRegion.drag,
                    resize: wsRegion.resize
                };
            });
            onRegionsChange(regionsForParent);
        } catch { }
    };
    const updateRegionBoundary = (targetRegion: any, options: any) => {
        if (!targetRegion || !waveformReady || !regionsPlugin) return;
        try {
            targetRegion.setOptions(options);
            if (loopRegionsRef.current && activeRegionRef.current) {
                setTimeout(showLoopingIndicator, 10);
            }
        } catch { }
    };
    return {
        activeRegion: activeRegionRef.current,
        setActiveRegion,
        getTargetRegion,
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors
    };
};