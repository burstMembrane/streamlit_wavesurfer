import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { regionsAtom, activeRegionIdAtom, activeRegionAtom, loopRegionsAtom } from "../atoms/regions";
import { waveSurferAtom } from "../atoms/wavesurfer";
import { getPluginInstanceByName } from "../atoms/plugins";

export const useRegions = (
    onRegionsChange?: (regions: any[]) => void
) => {
    const loopRegions = useAtomValue(loopRegionsAtom);
    const regions = useAtomValue(regionsAtom);
    const [activeRegion, setActiveRegionState] = useAtom(activeRegionAtom);
    const { ready: waveformReady } = useAtomValue(waveSurferAtom);
    // get the regions plugin from the atom
    const regionsPlugin = getPluginInstanceByName('regions');

    if (!waveformReady || !regionsPlugin) {
        throw new Error("useRegions was called before waveform was ready or plugin was available");
    }

    const showLoopingIndicator = () => {
        if (!activeRegion) return;
        const pluginRegions = regionsPlugin.getRegions();
        if (!pluginRegions) return;
        pluginRegions.forEach((region: any) => {
            if (!region) return;
            // Store the original content if not already stored
            if (!region._originalContent) {
                // If content is an HTMLElement, store its innerText, else store as string
                region._originalContent = typeof region.content === 'string'
                    ? region.content
                    : (region.content && region.content.innerText) || '';
            }
            const contentText = region._originalContent;
            const displayContent = (loopRegions && region.id === activeRegion.id)
                ? `↻ ${contentText}`
                : contentText;
            if (region.content !== displayContent) {
                try { region.setOptions({ content: displayContent }); } catch { }
            }
        });
    };
    const updateActiveRegionColors = (activeReg: any) => {
        if (!activeReg) return;
        const regionId = activeReg.id;
        const regionColor = regions.find(color => color.id === regionId);
        const pluginRegions = regionsPlugin.getRegions();
        if (!pluginRegions) return;
        pluginRegions.forEach((region: any) => {
            if (!region) return;
            if (region.id === regionId) {
                region.setOptions({ color: regionColor?.lightenedColor });
            } else {
                const otherColorInfo = regions.find(color => color.id === region.id);
                region.setOptions({ color: otherColorInfo?.color });
            }
        });
    };

    const setActiveRegion = (region: any) => {
        if (!region || !region.id) return;
        setActiveRegionState(region);
        updateActiveRegionColors(region);
    };

    useEffect(() => {

        console.log('[useRegions] effect run', { regions, plugin: regionsPlugin });
        regionsPlugin.clearRegions();
        regions.forEach((region) => {
            console.log('[useRegions] adding region', region);
            regionsPlugin.addRegion({
                start: region.start,
                end: region.end,
                content: region.content,
                id: region.id,
                color: region.color,
                drag: region.drag,
                resize: region.resize,
            });
        });
        const handleRegionIn = (region: any) => setActiveRegion(region);
        const handleRegionClicked = (region: any) => setActiveRegion(region);
        const handleRegionOut = () => {
            if (loopRegions) {
                const pluginRegions = regionsPlugin.getRegions();
                if (pluginRegions && activeRegion) {
                    const pluginRegion = pluginRegions.find((r: any) => r.id === activeRegion.id);
                    if (pluginRegion && typeof pluginRegion.play === 'function') {
                        try { pluginRegion.play(); } catch { }
                    }
                }
            }
        };
        regionsPlugin.on('region-in', handleRegionIn);
        regionsPlugin.on('region-clicked', handleRegionClicked);
        regionsPlugin.on('region-out', handleRegionOut);
        return () => {
            regionsPlugin.clearRegions();
            regionsPlugin.unAll();
        };
    }, [regions]);

    // Effect: update loop indicator when loopRegions or regionsPlugin changes
    useEffect(() => {
        showLoopingIndicator();
    }, [loopRegions]);

    // Effect: update region colors when activeRegion changes
    useEffect(() => {
        updateActiveRegionColors(activeRegion);
    }, [activeRegion]);

    const reportRegionsToParent = () => {
        if (!onRegionsChange) return;
        const currentRegions = regionsPlugin.getRegions();
        if (!currentRegions) return;
        const regionsForParent = currentRegions.map((wsRegion: any) => ({
            id: wsRegion.id,
            start: wsRegion.start,
            end: wsRegion.end,
            content: wsRegion.content,
            color: wsRegion.color,
            drag: wsRegion.drag,
            resize: wsRegion.resize
        }));
        onRegionsChange(regionsForParent);
    };

    const updateRegionBoundary = (targetRegion: any, options: any) => {
        if (!targetRegion) return;
        targetRegion.setOptions(options);
        if (loopRegions && activeRegion) {
            setTimeout(showLoopingIndicator, 10);
        }
    };

    return {
        reportRegionsToParent,
        updateRegionBoundary,
        regionColors: regions.map(r => ({ id: r.id, color: r.color, lightenedColor: r.lightenedColor })),
    };
};