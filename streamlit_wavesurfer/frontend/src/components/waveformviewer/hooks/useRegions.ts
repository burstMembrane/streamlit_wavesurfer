import { useEffect, useState, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { regionsAtom, activeRegionAtom, loopRegionsAtom, AugmentedRegion } from "@waveformviewer/atoms/regions";
import { waveSurferAtom } from "@waveformviewer/atoms/wavesurfer";
import { getPluginInstanceByName } from "@waveformviewer/atoms/plugins";

export const useRegions = () => {
    const [loopRegions, setLoopRegions] = useAtom(loopRegionsAtom);
    const [activeRegion, setActiveRegionState] = useAtom(activeRegionAtom);
    const { ready: waveformReady } = useAtomValue(waveSurferAtom);
    const regionsPlugin = getPluginInstanceByName('regions');
    const [regions] = useAtom(regionsAtom);
    const [regionsReady, setRegionsReady] = useState(false);

    useEffect(() => {
        if (regionsPlugin && waveformReady && regions.length) {
            setRegionsReady(true);
        }
    }, [regionsPlugin, waveformReady, regions]);

    const showLoopingIndicator = () => {
        if (!activeRegion) return;
        const pluginRegions = regionsPlugin?.getRegions();
        if (!pluginRegions) return;
        pluginRegions.forEach((region: AugmentedRegion<any>) => {
            if (!region) return;
            if (!region._originalContent) {
                region._originalContent = region.content;
                // if the content is a HTMLElement, get the text content
                if (region.content instanceof HTMLElement) {
                    region._originalContent = region.content.textContent;
                }
            }
            const contentText = region._originalContent;
            const displayContent = (loopRegions && region.id === activeRegion.id)
                ? `↻ ${contentText}`
                : contentText;
            region.setOptions({ content: displayContent });
        });
    };
    const updateActiveRegionColors = (activeReg: any) => {
        if (!activeReg || !activeReg.id || !regions) return;
        const regionId = activeReg.id;
        const regionColor = regions.find(color => color.id === regionId);
        const pluginRegions = regionsPlugin?.getRegions();
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
        if (!region || !region.id || !regions || loopRegions) return;
        setActiveRegionState(region);
    };

    useEffect(() => {
        if (!regionsPlugin || !waveformReady || !regionsReady || !regions.length) return;
        console.log("[useRegions] adding regions", regions)
        // Update plugin only if regions changed
        regionsPlugin.clearRegions();
        regions.forEach((region) => {
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

        const handleRegionIn = (region: any) => {
            setActiveRegion(region);
        };
        const handleRegionClicked = (region: any) => setActiveRegion(region);

        regionsPlugin.on('region-in', handleRegionIn);
        regionsPlugin.on('region-clicked', handleRegionClicked);
        return () => {
            regionsPlugin.clearRegions();
            regionsPlugin.unAll();
        };
    }, [regions, waveformReady, regionsReady]);



    const handleRegionOut = useCallback((region: any) => {
        if (!activeRegion || region.id !== activeRegion.id) {
            setLoopRegions(false);
            return;
        }
        const pluginRegions = regionsPlugin?.getRegions();
        if (loopRegions && pluginRegions && activeRegion) {
            const pluginRegion = pluginRegions.find((r: any) => r.id === activeRegion.id);
            if (pluginRegion && typeof pluginRegion.play === 'function') {
                try { pluginRegion.play(); } catch { }
            }
        }
    }, [loopRegions, regionsPlugin, activeRegion, setLoopRegions]);

    useEffect(() => {
        showLoopingIndicator();
        if (!regionsPlugin) return;
        regionsPlugin.on("region-out", handleRegionOut);
        return () => {
            regionsPlugin.un("region-out", handleRegionOut);
        };
    }, [loopRegions, handleRegionOut, regionsPlugin]);

    useEffect(() => {
        if (!activeRegion) return;
        setLoopRegions(false);  // Disable looping if user interacts
        updateActiveRegionColors(activeRegion);
    }, [activeRegion]);
    return {
    }
};