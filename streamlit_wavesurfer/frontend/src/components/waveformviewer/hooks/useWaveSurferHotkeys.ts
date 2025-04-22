import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import { useRef, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const useWaveSurferHotkeys = (
    waveform: WaveSurfer | null,
    wsRegions: RegionsPlugin | null,
    waveformReady: boolean,
    getTargetRegion: () => any,
    updateRegionBoundary: (targetRegion: any, options: any) => void,
    setActiveRegion: (region: any) => void,
    setLoopRegion: (state: boolean | ((prev: boolean) => boolean)) => void
) => {



    const waveformRef = useRef(waveform);
    const regionsRef = useRef(wsRegions);
    const readyRef = useRef(waveformReady);

    useEffect(() => {
        waveformRef.current = waveform;
        regionsRef.current = wsRegions;
        readyRef.current = waveformReady;
    }, [waveform, wsRegions, waveformReady]);

    useHotkeys('space', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        if (wave.isPlaying()) {
            wave.pause();
        } else {
            wave.play();
        }
    }, { preventDefault: true }, []);

    // Navigate left (seek backward)
    useHotkeys('left', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const currentTime = wave.getCurrentTime();
        wave.seekTo(Math.max(0, currentTime - 0.1) / wave.getDuration());
    }, { preventDefault: true }, []);

    // Navigate right (seek forward)
    useHotkeys('right', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const currentTime = wave.getCurrentTime();
        const duration = wave.getDuration();
        wave.seekTo(Math.min(duration, currentTime + 0.1) / duration);
    }, { preventDefault: true }, []);

    // Navigate to previous region
    useHotkeys('up', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        if (!wave || !readyRef.current || !regions) return;

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
        if (prevTargetRegion) {
            // Seek to region start
            wave.seekTo(prevTargetRegion.start / wave.getDuration());
            // Set as active region
            setActiveRegion(prevTargetRegion);
        }
    }, { preventDefault: true }, [setActiveRegion]);

    // Navigate to next region
    useHotkeys('down', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        if (!wave || !readyRef.current || !regions) return;

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
        if (nextTargetRegion) {
            // Seek to region start
            wave.seekTo(nextTargetRegion.start / wave.getDuration());
            // Set as active region
            setActiveRegion(nextTargetRegion);
        }
    }, { preventDefault: true }, [setActiveRegion]);

    // Set region start (i key)
    useHotkeys('i', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const currentTime = wave.getCurrentTime();
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            // Update the region with new values
            updateRegionBoundary(targetRegion, {
                start: currentTime,
                end: targetRegion.end
            });
            // Ensure this becomes the active region
            setActiveRegion(targetRegion);
        }
    }, { preventDefault: true }, [getTargetRegion, updateRegionBoundary, setActiveRegion]);

    // Set region end (o key)
    useHotkeys('o', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const currentTime = wave.getCurrentTime();
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            // Update the region with new values
            updateRegionBoundary(targetRegion, {
                start: targetRegion.start,
                end: currentTime
            });
            // Ensure this becomes the active region
            setActiveRegion(targetRegion);
        }
    }, { preventDefault: true }, [getTargetRegion, updateRegionBoundary, setActiveRegion]);

    // Jump to region start (s key)
    useHotkeys('s', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const targetRegion = getTargetRegion();
        if (targetRegion) {
            setActiveRegion(targetRegion);
            wave.seekTo(targetRegion.start / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true }, [getTargetRegion, setActiveRegion]);

    // Jump to region end (e key)
    useHotkeys('e', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        const targetRegion = getTargetRegion();
        if (targetRegion) {
            setActiveRegion(targetRegion);
            wave.seekTo(targetRegion.end / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true }, [getTargetRegion, setActiveRegion]);

    // Jump to start of track (w key)
    useHotkeys('w', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave || !readyRef.current) return;

        wave.seekTo(0);
    }, { preventDefault: true }, []);

    // Toggle loop for current region (l key)
    useHotkeys('l', (e) => {
        e.preventDefault();
        if (!readyRef.current) return;

        // Toggle loop for the current region
        setLoopRegion(prev => !prev);
    }, { preventDefault: true }, [setLoopRegion]);

    // Return a noop function as we no longer need to manually register/unregister listeners
    return () => { };
};
