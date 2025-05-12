import {
    Streamlit,
    withStreamlitConnection,
} from "streamlit-component-lib"
import { useEffect, useState } from "react"
import { WavesurferViewer } from "@/components/waveformviewer/WaveformViewer"
import { Region } from "@/components/waveformviewer/types"
import { WaveSurferUserOptions } from "@/components/waveformviewer/types"
import { Suspense } from "react"
import { useAtom, useSetAtom } from "jotai"
import { regionsAtom, setRegionsAtom } from "@waveformviewer/atoms/regions"
import { WaveSurferPluginConfigurationNested } from "@waveformviewer/atoms/plugins"
import { pluginsAtom } from "@waveformviewer/atoms/plugins"

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
        plugin_configurations: WaveSurferPluginConfigurationNested;
        region_colormap: string;

        controls: boolean;
    };
}

const WavesurferComponent = ({ args }: WavesurferComponentProps) => {
    const [ready, setReady] = useState(false);
    const [regions] = useAtom(regionsAtom);
    const setRegions = useSetAtom(setRegionsAtom);
    useEffect(() => {
        if (!args.regions || args.regions.length === 0 || !args.region_colormap) return;
        if (args.regions.length !== regions.length) {
            setRegions({ regions: args.regions as Region[], colormapName: args.region_colormap });
            return;
        }
        const isSame = args.regions.every((region, index) => {
            const current = regions[index];
            return (
                region.id === current.id &&
                region.start === current.start &&
                region.end === current.end &&
                region.content === current.content &&
                region.color === current.color
            );
        });
        if (!isSame) {
            setRegions({ regions: args.regions as Region[], colormapName: args.region_colormap });
        }
    }, [args.regions, args.region_colormap]);

    useEffect(() => {
        Streamlit.setFrameHeight();
    });
    const setPlugins = useSetAtom(pluginsAtom);
    useEffect(() => {
        if (!args.plugin_configurations || !args.plugin_configurations.plugins) return;
        console.log("args.plugin_configurations", args.plugin_configurations)
        const nested_plugs = args.plugin_configurations.plugins
        const plugins = nested_plugs.map((plugin) => {
            if (!plugin.options) return plugin;
            return { ...plugin, options: plugin.options };
        });
        setPlugins(plugins);
    }, [args.plugin_configurations]);
    const waveOptions = args.wave_options;
    const audioSrc = args.audio_src;
    const wavesurfer = (
        <Suspense fallback={<div>Loading...</div>}>
            <WavesurferViewer
                audioSrc={audioSrc}
                waveOptions={waveOptions}
                onReady={() => {
                    if (!ready) {
                        setReady(true);
                        setTimeout(() => Streamlit.setComponentValue({
                            ready: true,
                            regions: args.regions
                        }), 300);
                    }
                }}
                regionColormap={args.region_colormap}
                showControls={args.controls}
            />
        </Suspense>
    );

    return (
        // @ts-ignore
        <div>

            <center>{wavesurfer}</center>
        </div>
    );
};

export default withStreamlitConnection(WavesurferComponent);
