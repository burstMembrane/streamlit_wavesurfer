import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";

import { useRef, useCallback, useEffect } from "react";



export const useWaveSurferHotkeys = (
    waveform: WaveSurfer | null,
    wsRegions: RegionsPlugin | null,
    waveformReady: boolean,
    getTargetRegion: () => any,
    updateRegionBoundary: (targetRegion: any, options: any) => void,
    setActiveRegion: (region: any) => void,
    setLoopRegion: (state: boolean | ((prev: boolean) => boolean)) => void
) => {
    // Use refs to keep track of the latest values without causing re-renders
    const waveformRef = useRef(waveform);
    const regionsRef = useRef(wsRegions);
    const readyRef = useRef(waveformReady);

    // Update refs when props change
    useEffect(() => {
        waveformRef.current = waveform;
        regionsRef.current = wsRegions;
        readyRef.current = waveformReady;
    }, [waveform, wsRegions, waveformReady]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Skip if not ready or no waveform
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        const isReady = readyRef.current;
        console.log("[useWaveSurferHotkeys] Key pressed:", e.code);
        if (!wave || !isReady) return;

        // Prevent default behavior for navigation keys
        if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code) ||
            ['i', 'o', 's', 'e', 'w', 'l'].includes(e.key.toLowerCase())) {
            e.preventDefault(); // Prevent page scroll or other browser defaults
        }

        // If we're dealing with a letter key, normalize to lowercase
        const key = e.key.toLowerCase();

        switch (e.code || key) {
            case 'Space':
                if (wave.isPlaying()) {
                    wave.pause();
                } else {
                    wave.play();
                }
                break;

            case 'ArrowLeft':
                const leftCurrentTime = wave.getCurrentTime();
                wave.seekTo(Math.max(0, leftCurrentTime - 0.1) / wave.getDuration());
                break;

            case 'ArrowRight':
                const rightCurrentTime = wave.getCurrentTime();
                const duration = wave.getDuration();
                wave.seekTo(Math.min(duration, rightCurrentTime + 0.1) / duration);
                break;

            case 'ArrowUp':
                // Navigate to previous region
                if (!regions) return;

                const upRegions = regions.getRegions().sort((a, b) => a.start - b.start);
                if (upRegions.length === 0) return;

                const upCurrentTime = wave.getCurrentTime();
                let prevRegionIndex = -1;

                // Find the region just before current time
                for (let i = 0; i < upRegions.length; i++) {
                    if (upRegions[i].start > upCurrentTime) {
                        break; // We've gone past the current time
                    }
                    prevRegionIndex = i;
                }

                // If we're at or before the first region, wrap to the last
                if (prevRegionIndex === -1 || prevRegionIndex === 0) {
                    prevRegionIndex = upRegions.length - 1;
                } else {
                    // Go to previous region
                    prevRegionIndex -= 1;
                }

                const prevTargetRegion = upRegions[prevRegionIndex];
                if (prevTargetRegion) {
                    // Seek to region start
                    wave.seekTo(prevTargetRegion.start / wave.getDuration());
                    // Set as active region
                    setActiveRegion(prevTargetRegion);
                }
                break;

            case 'ArrowDown':
                // Navigate to next region
                if (!regions) return;

                const downRegions = regions.getRegions().sort((a, b) => a.start - b.start);
                if (downRegions.length === 0) return;

                const downCurrentTime = wave.getCurrentTime();
                let nextRegionIndex = -1;

                // Find first region that starts after current time
                for (let i = 0; i < downRegions.length; i++) {
                    if (downRegions[i].start >= downCurrentTime) {
                        nextRegionIndex = i;
                        break;
                    }
                }

                // If we're at or after the last region, wrap to the first
                if (nextRegionIndex === -1) {
                    nextRegionIndex = 0;
                }

                const nextTargetRegion = downRegions[nextRegionIndex];
                if (nextTargetRegion) {
                    // Seek to region start
                    wave.seekTo(nextTargetRegion.start / wave.getDuration());
                    // Set as active region
                    setActiveRegion(nextTargetRegion);
                }
                break;

            case 'KeyI':
                const iCurrentTime = wave.getCurrentTime();
                const iTargetRegion = getTargetRegion();
                if (iTargetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(iTargetRegion, {
                        start: iCurrentTime,
                        end: iTargetRegion.end
                    });
                    // Ensure this becomes the active region
                    setActiveRegion(iTargetRegion);
                }
                break;

            case 'KeyO':
                const oCurrentTime = wave.getCurrentTime();
                const oTargetRegion = getTargetRegion();
                if (oTargetRegion) {
                    // Update the region with new values
                    updateRegionBoundary(oTargetRegion, {
                        start: oTargetRegion.start,
                        end: oCurrentTime
                    });
                    // Ensure this becomes the active region
                    setActiveRegion(oTargetRegion);
                }
                break;

            case 'KeyS':
                const sTargetRegion = getTargetRegion();
                if (sTargetRegion) {
                    setActiveRegion(sTargetRegion);
                    wave.seekTo(sTargetRegion.start / wave.getDuration());
                    if (!wave.isPlaying()) {
                        wave.play();
                    }
                }
                break;

            case 'KeyE':
                const eTargetRegion = getTargetRegion();
                if (eTargetRegion) {
                    setActiveRegion(eTargetRegion);
                    wave.seekTo(eTargetRegion.end / wave.getDuration());
                    if (!wave.isPlaying()) {
                        wave.play();
                    }
                }
                break;

            case 'KeyW':
                wave.seekTo(0);
                break;

            case 'KeyL':
                // Toggle loop for the current region
                setLoopRegion(prev => !prev);
                break;
        }
    }, [getTargetRegion, updateRegionBoundary, setActiveRegion, setLoopRegion]); // Only depend on callback functions

    useEffect(() => {
        // Add global keyboard event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up the listener when component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    return handleKeyDown;
};
