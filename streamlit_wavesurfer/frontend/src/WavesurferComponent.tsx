import {
    Streamlit,
    withStreamlitConnection,
} from "streamlit-component-lib"
import React, { useEffect, useState } from "react"
import { WavesurferViewer } from "./components/waveformviewer/WaveformViewer"
import { Region } from "./components/waveformviewer/types"
import { WaveSurferUserOptions } from "./components/waveformviewer/types"


export interface WavesurferComponentProps {
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



    useEffect(() => {
        Streamlit.setFrameHeight();
    });

    const waveOptions = args.wave_options;

    const regions = args.regions;
    const audioSrc = args.audio_src;


    // This handles the save button click
    const onRegionsChange = (regions: Region[]) => {
        const ts = Date.now();
        Streamlit.setComponentValue({
            ready,
            regions,
            ts,
        });
    };

    const wavesurfer = (
        <WavesurferViewer
            audioSrc={audioSrc}
            regions={regions}
            waveOptions={waveOptions}
            onReady={() => {

                if (!ready) {
                    setReady(true);
                    setTimeout(() => Streamlit.setComponentValue({
                        ready: true,
                        regions: regions
                    }), 300);
                }
            }}
            onRegionsChange={onRegionsChange}
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
