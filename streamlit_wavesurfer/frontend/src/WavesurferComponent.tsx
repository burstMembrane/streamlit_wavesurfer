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


    useEffect(() => {
        if (updatedRegions.length > 0) {
            const filteredRegions = updatedRegions.filter((region) => region.start > 0 && region.end > 0);

            const uniqueRegions = filteredRegions.filter((region, index, self) =>
                index === self.findIndex((t) => t.id === region.id)
            );


            Streamlit.setComponentValue({
                ready: ready,
                regions: uniqueRegions.map((region) => ({
                    id: region.id,
                    content: region.content,
                    start: region.start,
                    end: region.end
                }))
            });
        }
    }, [updatedRegions]);

    // This handles the save button click
    const onRegionsChange = (regions: Region[]) => {
        console.log("Regions saved:", regions);
        setUpdatedRegions(regions);
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
