import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type WaveSurfer from "wavesurfer.js";
import { useRef, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const useWaveSurferHotkeys = (
    waveform: WaveSurfer | null,
    regionsPlugin: RegionsPlugin | null,
    getTargetRegion: () => any,
    updateRegionBoundary: (targetRegion: any, options: any) => void,
    setActiveRegion: (region: any) => void,
    setLoopRegion: (state: boolean | ((prev: boolean) => boolean)) => void
) => {
    const waveformRef = useRef(waveform);
    const regionsRef = useRef(regionsPlugin);
    const targetRegionRef = useRef(getTargetRegion);
    const updateRegionBoundaryRef = useRef(updateRegionBoundary);
    const setActiveRegionRef = useRef(setActiveRegion);
    const setLoopRegionRef = useRef(setLoopRegion);
    const waveformReady = useCallback(() => waveformRef.current !== null, [waveform]);
    const regionsReady = useCallback(() => regionsRef.current !== null, [regionsPlugin]);
    useEffect(() => {
        waveformRef.current = waveform;
        regionsRef.current = regionsPlugin;
    }, [waveform, regionsPlugin]);

    useHotkeys('space', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        if (wave.isPlaying()) {
            wave.pause();
        } else {
            wave.play();
        }
    }, { preventDefault: true, enabled: waveformReady }, []);

    // Navigate left (seek backward)
    useHotkeys('left', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const currentTime = wave.getCurrentTime();
        wave.seekTo(Math.max(0, currentTime - 0.1) / wave.getDuration());
    }, { preventDefault: true, enabled: waveformReady }, []);

    // Navigate right (seek forward)
    useHotkeys('right', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const currentTime = wave.getCurrentTime();
        const duration = wave.getDuration();
        wave.seekTo(Math.min(duration, currentTime + 0.1) / duration);
    }, { preventDefault: true, enabled: waveformReady }, []);

    // Navigate to previous region
    useHotkeys('up', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const regions = regionsRef.current!;
        const allRegions = regions.getRegions().sort((a, b) => a.start - b.start);
        if (allRegions.length === 0) return;

        const currentTime = wave.getCurrentTime();
        let prevRegionIndex = -1;

        // Find the region just before current time
        for (let i = 0; i < allRegions.length; i++) {
            if (allRegions[i].start > currentTime) {
                break; // We've gone past the current time
            }
            prevRegionIndex = i;
        }

        // If we're at or before the first region, wrap to the last
        if (prevRegionIndex === -1 || prevRegionIndex === 0) {
            prevRegionIndex = allRegions.length - 1;
        } else {
            // Go to previous region
            prevRegionIndex -= 1;
        }

        const prevTargetRegion = allRegions[prevRegionIndex];
        if (!prevTargetRegion) return;
        // Seek to region start
        wave.seekTo(prevTargetRegion.start / wave.getDuration());
        // Set as active region
        setActiveRegion(prevTargetRegion);
    }, { preventDefault: true, enabled: regionsReady }, [setActiveRegion]);

    // Navigate to next region
    useHotkeys('down', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const regions = regionsRef.current!;
        const allRegions = regions.getRegions().sort((a, b) => a.start - b.start);
        if (allRegions.length === 0) return;

        const currentTime = wave.getCurrentTime();
        let nextRegionIndex = -1;

        // Find first region that starts after current time
        for (let i = 0; i < allRegions.length; i++) {
            if (allRegions[i].start >= currentTime) {
                nextRegionIndex = i;
                break;
            }
        }

        // If we're at or after the last region, wrap to the first
        if (nextRegionIndex === -1) {
            nextRegionIndex = 0;
        }

        const nextTargetRegion = allRegions[nextRegionIndex];
        if (!nextTargetRegion) return;
        // Seek to region start
        wave.seekTo(nextTargetRegion.start / wave.getDuration());
        // Set as active region
        setActiveRegion(nextTargetRegion);
    }, { preventDefault: true, enabled: regionsReady }, [setActiveRegion]);

    // Set region start (i key)
    useHotkeys('i', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const currentTime = wave.getCurrentTime();
        const targetRegion = targetRegionRef.current();
        if (targetRegion) {
            // Update the region with new values
            updateRegionBoundaryRef.current(targetRegion, {
                start: currentTime,
                end: targetRegion.end
            });
            // Ensure this becomes the active region
            setActiveRegionRef.current(targetRegion);
        }
    }, { preventDefault: true, enabled: waveformReady }, [getTargetRegion, updateRegionBoundary, setActiveRegion]);

    // Set region end (o key)
    useHotkeys('o', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const currentTime = wave.getCurrentTime();
        const targetRegion = targetRegionRef.current();
        if (targetRegion) {
            // Update the region with new values
            updateRegionBoundaryRef.current(targetRegion, {
                start: targetRegion.start,
                end: currentTime
            });
            // Ensure this becomes the active region
            setActiveRegionRef.current(targetRegion);
        }
    }, { preventDefault: true, enabled: waveformReady }, [getTargetRegion, updateRegionBoundary, setActiveRegion]);

    // Jump to region start (s key)
    useHotkeys('s', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const targetRegion = targetRegionRef.current();
        if (targetRegion) {
            setActiveRegionRef.current(targetRegion);
            wave.seekTo(targetRegion.start / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true, enabled: waveformReady }, [getTargetRegion, setActiveRegion]);

    // Jump to region end (e key)
    useHotkeys('e', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            setActiveRegion(targetRegion);
            wave.seekTo(targetRegion.end / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true, enabled: waveformReady }, [getTargetRegion, setActiveRegion]);

    // Jump to start of track (w key)
    useHotkeys('w', (e) => {
        e.preventDefault();
        const wave = waveformRef.current!;
        wave.seekTo(0);
    }, { preventDefault: true, enabled: waveformReady }, []);

    // Toggle loop for current region (l key)
    useHotkeys('l', (e) => {
        e.preventDefault();
        // Toggle loop for the current region
        setLoopRegion(prev => !prev);
    }, { preventDefault: true, enabled: waveformReady }, [setLoopRegion]);

    // Return a noop function as we no longer need to manually register/unregister listeners
    return () => { };
};
