import {
    Streamlit,
    withStreamlitConnection,
} from "streamlit-component-lib"
import React, { useEffect, useState } from "react"
import { WavesurferViewer, Region } from "./components/WaveformViewer"


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



interface WavesurferComponentProps {
    args: {
        regions: Array<{
            start: number;
            end: number;
            content: string;
            color?: string;
            drag?: boolean;
            resize?: boolean;
        }>;
        audio_src: string;
        wave_options: WaveSurferUserOptions;

    };
}

const WavesurferComponent = ({ args }: WavesurferComponentProps) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        Streamlit.setFrameHeight();
    });
    const waveOptions = args.wave_options;

    const regions = args.regions ?
        args.regions.map((e) => new Region(e.start, e.end, e.content, e.color, e.drag, e.resize)) :
        [];
    const audioSrc = args.audio_src;
    console.log(`audioSrc: ${audioSrc}`);

    const wavesurfer = (
        <WavesurferViewer
            audioSrc={audioSrc}
            regions={regions}
            waveOptions={waveOptions}
            onReady={() => {
                console.log("Ready state:", ready);
                if (!ready) {
                    setReady(true);
                    setTimeout(() => Streamlit.setComponentValue(1), 300);
                }
            }}
        />
    );

    return (
        // @ts-ignore
        <center>{wavesurfer}</center>
    );
};

export default withStreamlitConnection(WavesurferComponent);
