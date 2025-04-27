// Define the interface for Region type
export interface IRegion {
    id: string | undefined;
    start: number;
    end: number;
    content: string;
    color?: string;
    drag?: boolean;
    resize?: boolean;
}

// Implement the Region class that follows the IRegion interface
export class Region implements IRegion {
    constructor(
        public id: string | undefined,
        public start: number,
        public end: number,
        public content: string,
        public color?: string,
        public drag?: boolean,
        public resize?: boolean
    ) { }
}

export interface WavesurferViewerProps {
    audioSrc: string;
    regions?: Region[];
    waveOptions: WaveSurferUserOptions;
    onReady: () => void;
    onRegionsChange?: (regions: Region[]) => void;
    regionColormap: string;
    showSpectrogram: boolean;
    showMinimap: boolean;
}



export interface WaveSurferUserOptions {
    waveColor?: string;
    progressColor?: string;
    cursorWidth?: number;
    minPxPerSec?: number;
    fillParent?: boolean;
    height?: number | "auto" | undefined;
    width?: number | "auto" | undefined;
    barWidth?: number;
    barGap?: number;
    barRadius?: number;
    normalize?: boolean;
    hideScrollbar?: boolean;
}

