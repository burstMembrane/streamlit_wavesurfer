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
            id: string;
            start: number;
            end: number;
            content: string;
            color?: string;
            drag?: boolean;
            resize?: boolean;
        }>;
        audio_src: string;
        wave_options: WaveSurferUserOptions;
        region_colormap: string;
        show_spectrogram: boolean;

    };
}

const WavesurferComponent = ({ args }: WavesurferComponentProps) => {
    const [ready, setReady] = useState(false);
    const [updatedRegions, setUpdatedRegions] = useState<Region[]>([]);

    useEffect(() => {
        Streamlit.setFrameHeight();
    });
    const waveOptions = args.wave_options;

    const regions = args.regions ?
        args.regions.map((e) => new Region(e.id, e.start, e.end, e.content, e.color, e.drag, e.resize)) :
        [];
    const audioSrc = args.audio_src;
    console.log(`audioSrc: ${audioSrc}`);

    // Report updated regions back to Streamlit when they change
    useEffect(() => {
        if (updatedRegions.length > 0) {

            const filteredRegions = updatedRegions.filter((region) => region.start > 0 && region.end > 0);
            Streamlit.setComponentValue({
                ready: ready,
                regions: filteredRegions.map((region) => ({
                    id: region.id,
                    content: region.content,
                    start: region.start,
                    end: region.end
                }))
            });
        }
    }, [updatedRegions, ready]);

    const wavesurfer = (
        <WavesurferViewer
            audioSrc={audioSrc}
            regions={regions}
            waveOptions={waveOptions}
            onReady={() => {
                console.log("Ready state:", ready);
                if (!ready) {
                    setReady(true);
                    setTimeout(() => Streamlit.setComponentValue({
                        ready: true,
                        regions: regions
                    }), 300);
                }
            }}
            onRegionsChange={(regions) => {
                console.log("Regions changed:", regions);
                setUpdatedRegions(regions);
            }}
            regionColormap={args.region_colormap}
            showSpectrogram={args.show_spectrogram}
        />
    );

    return (
        // @ts-ignore
        <center>{wavesurfer}</center>
    );
};

export default withStreamlitConnection(WavesurferComponent);
