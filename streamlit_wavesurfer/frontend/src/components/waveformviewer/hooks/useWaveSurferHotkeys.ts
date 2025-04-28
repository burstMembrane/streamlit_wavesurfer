import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import type WaveSurfer from "wavesurfer.js";
import { useRef, useEffect, useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const useWaveSurferHotkeys = (
    waveform: WaveSurfer | null,
    regionsPlugin: RegionsPlugin | null,
    getTargetRegion: () => any,
    updateRegionBoundary: (targetRegion: any, options: any) => void,
    setActiveRegion: (region: any) => void,
    setLoopRegion: (state: boolean | ((prev: boolean) => boolean)) => void,
) => {
    const waveformRef = useRef<WaveSurfer | null>(waveform);
    const regionsRef = useRef<RegionsPlugin | null>(regionsPlugin);
    const [isLooping, setIsLooping] = useState(false);
    const [hotkeysEnabled, setHotkeysEnabled] = useState(false);
    const editHistory = useRef<Array<{ region: any, prevStart: number, prevEnd: number }>>([]);
    const containerRef = useRef<HTMLElement | null>(null);

    // Manage hotkeys setup
    const setupHotkeys = useCallback(() => {
        if (!waveform) return;

        // Set refs and state
        waveformRef.current = waveform;
        regionsRef.current = regionsPlugin;

        // Get container from waveform
        const container = waveform.getWrapper();
        if (!container) return;

        containerRef.current = container;

        // Make container focusable
        container.tabIndex = 0;
        container.style.outline = 'none';

        // Ensure focus and hotkeys are enabled when interacting with waveform
        const enableAndFocus = () => {
            setHotkeysEnabled(true);
            if (containerRef.current) {
                containerRef.current.focus();
            }
        };

        // Add event listeners for focus
        container.addEventListener('click', enableAndFocus);
        container.addEventListener('mousedown', enableAndFocus);
        container.addEventListener('keydown', enableAndFocus, true);
        container.addEventListener('mouseover', enableAndFocus);

        // Enable hotkeys initially
        setHotkeysEnabled(true);
        container.focus();

        // Setup global listeners to ensure hotkeys work
        const handleGlobalInteraction = (e: MouseEvent | KeyboardEvent) => {
            // Check if interaction is within the waveform container or its children
            if (container.contains(e.target as Node)) {
                setHotkeysEnabled(true);
                container.focus();
            }
        };

        // Global event listeners 
        document.addEventListener('keydown', handleGlobalInteraction, true);
        document.addEventListener('mousedown', handleGlobalInteraction, true);

        // Clean up function
        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('click', enableAndFocus);
                containerRef.current.removeEventListener('mousedown', enableAndFocus);
                containerRef.current.removeEventListener('keydown', enableAndFocus, true);
                containerRef.current.removeEventListener('mouseover', enableAndFocus);
            }
            document.removeEventListener('keydown', handleGlobalInteraction, true);
            document.removeEventListener('mousedown', handleGlobalInteraction, true);
        };
    }, [waveform, regionsPlugin]);

    // Apply hotkeys setup
    useEffect(() => {
        const cleanup = setupHotkeys();
        return cleanup;
    }, [setupHotkeys]);

    const handleRegionEdit = (region: any, start: number, end: number) => {
        // Push current state before change to history for undo
        editHistory.current.push({
            region,
            prevStart: region.start,
            prevEnd: region.end
        });
        updateRegionBoundary(region, {
            start: start,
            end: end
        });
    }

    const undoAllEdits = () => {
        // conduct all edits in reverse order
        for (let i = editHistory.current.length - 1; i >= 0; i--) {
            const { region, prevStart, prevEnd } = editHistory.current[i];
            updateRegionBoundary(region, {
                start: prevStart,
                end: prevEnd
            });
        }
    }

    const undoLastEdit = () => {
        if (editHistory.current.length === 0) {
            return false;
        }
        const lastEdit = editHistory.current.pop();
        if (!lastEdit) return false;
        const { region, prevStart, prevEnd } = lastEdit;
        updateRegionBoundary(region, {
            start: prevStart,
            end: prevEnd
        });
        setActiveRegion(region);
        return true;
    }

    const stopLoopingIfNeeded = () => {
        if (isLooping) {
            setLoopRegion(false);
            setIsLooping(false);
        }
    };

    // Hotkey definitions with the 'enabled' setting
    useHotkeys('u', (e) => {
        e.preventDefault();
        console.log("[hotkeys] Attempting to undo last region edit");
        const success = undoLastEdit();
        console.log(`[hotkeys] Undo ${success ? 'successful' : 'failed'}`);
    }, { preventDefault: true, enabled: hotkeysEnabled });

    useHotkeys('r', (e) => {
        e.preventDefault();
        undoAllEdits();
    }, { preventDefault: true, enabled: hotkeysEnabled });

    useHotkeys('space', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        if (wave.isPlaying()) {
            wave.pause();
        } else {
            wave.play();
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Navigate left (seek backward)
    useHotkeys('left', (e) => {
        e.preventDefault();
        stopLoopingIfNeeded();
        const wave = waveformRef.current;
        if (!wave) return;
        const currentTime = wave.getCurrentTime();
        wave.seekTo(Math.max(0, currentTime - 0.1) / wave.getDuration());
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Navigate right (seek forward)
    useHotkeys('right', (e) => {
        e.preventDefault();
        stopLoopingIfNeeded();
        const wave = waveformRef.current;
        if (!wave) return;
        const currentTime = wave.getCurrentTime();
        const duration = wave.getDuration();
        wave.seekTo(Math.min(duration, currentTime + 0.1) / duration);
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Navigate to previous region
    useHotkeys('up', (e) => {
        let wasLooping = isLooping;
        if (wasLooping) {
            setLoopRegion(false);
            setIsLooping(false);
        }
        e.preventDefault();
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        if (!wave || !regions) return;
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
        if (wasLooping) {
            setIsLooping(true);
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Navigate to next region
    useHotkeys('down', (e) => {
        stopLoopingIfNeeded();
        e.preventDefault();
        const wave = waveformRef.current;
        const regions = regionsRef.current;
        if (!wave || !regions) return;
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
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Set region start (i key)
    useHotkeys('i', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        const currentTime = wave.getCurrentTime();
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            handleRegionEdit(targetRegion, currentTime, targetRegion.end);
            // Ensure this becomes the active region
            setActiveRegion(targetRegion);
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Set region end (o key)
    useHotkeys('o', (e) => {
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        const currentTime = wave.getCurrentTime();
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            handleRegionEdit(targetRegion, targetRegion.start, currentTime);
            // Ensure this becomes the active region
            setActiveRegion(targetRegion);
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Jump to region start (s key)
    useHotkeys('s', (e) => {
        stopLoopingIfNeeded();
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            setActiveRegion(targetRegion);
            wave.seekTo(targetRegion.start / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Jump to region end (e key)
    useHotkeys('e', (e) => {
        stopLoopingIfNeeded();
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        const targetRegion = getTargetRegion();
        if (targetRegion) {
            setActiveRegion(targetRegion);
            wave.seekTo(targetRegion.end / wave.getDuration());
            if (!wave.isPlaying()) {
                wave.play();
            }
        }
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Jump to start of track (w key)
    useHotkeys('w', (e) => {
        stopLoopingIfNeeded();
        e.preventDefault();
        const wave = waveformRef.current;
        if (!wave) return;
        wave.seekTo(0);
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Toggle loop for current region (l key)
    useHotkeys('l', (e) => {
        e.preventDefault();
        setIsLooping(prev => !prev);
        setLoopRegion(prev => !prev);
    }, { preventDefault: true, enabled: hotkeysEnabled });

    // Method to manually enable hotkeys if needed
    const enableHotkeys = useCallback(() => {
        setHotkeysEnabled(true);
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    return enableHotkeys;
};
