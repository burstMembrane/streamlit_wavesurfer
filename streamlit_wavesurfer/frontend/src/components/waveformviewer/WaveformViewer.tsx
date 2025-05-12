import React, { useRef, memo } from 'react';
import { WavesurferViewerProps } from "@waveformviewer/types";
import { useRegions, useWaveSurfer, useWaveSurferHotkeys } from "@waveformviewer/hooks";
import { AudioControls } from "@waveformviewer/AudioControls";

const WaveformViewerComponent: React.FC<WavesurferViewerProps> = ({
    audioSrc,
    onReady,
    waveOptions,
    showControls
}) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const {
        currentTime,
        duration,
        isPlaying,
        play,
        pause,
        skipForward,
        skipBackward } = useWaveSurfer({
            containerRef: waveformRef as React.RefObject<HTMLDivElement>,
            audioSrc,
            waveOptions,
            onReady
        });
    //  setup hotkeys
    useWaveSurferHotkeys();
    // setup regions
    useRegions();
    return (
        <div className="flex flex-col gap-4 p-4 w-full box-border">
            <div ref={waveformRef}
                id="waveform"
                className="w-full min-h-[200px] overflow-hidden" />
            {/* audio controls */}
            {showControls && <AudioControls
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                pause={pause}
                play={play}
                skipForward={skipForward}
                skipBackward={skipBackward}
            />
            }
        </div>
    );
};

export const WavesurferViewer = memo(WaveformViewerComponent);
