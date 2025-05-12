import RegionsPlugin, { RegionsPluginOptions } from "wavesurfer.js/dist/plugins/regions.js";
import SpectrogramPlugin, { SpectrogramPluginOptions } from "wavesurfer.js/dist/plugins/spectrogram.js";
import TimelinePlugin, { TimelinePluginOptions } from "wavesurfer.js/dist/plugins/timeline.js";
import ZoomPlugin, { ZoomPluginOptions } from "wavesurfer.js/dist/plugins/zoom.js";
import HoverPlugin, { HoverPluginOptions } from "wavesurfer.js/dist/plugins/hover.js";
import MinimapPlugin, { MinimapPluginOptions } from "wavesurfer.js/dist/plugins/minimap.js";
import { atom, useAtomValue } from "jotai";
// import the wavesurfer atom
import { waveSurferAtom } from "./wavesurfer";

type PluginOptionsMap = {
    regions: RegionsPluginOptions;
    spectrogram: SpectrogramPluginOptions;
    timeline: TimelinePluginOptions;
    zoom: ZoomPluginOptions;
    hover: HoverPluginOptions;
    minimap: MinimapPluginOptions;
};
export type WaveSurferPluginConfigurationNested = {
    plugins: WaveSurferPluginConfiguration[];
}
export type WaveSurferPluginConfigurationList = WaveSurferPluginConfiguration[]

export interface WaveSurferPluginConfiguration<K extends keyof PluginOptionsMap = keyof PluginOptionsMap> {
    name: K;
    options?: Partial<PluginOptionsMap[K]>;
    instance?: InstantiatedPlugin;
}

export interface RuntimePluginInstance {
    listeners: Record<string, any>;
    subscriptions: any[];
    options?: any;
}

export type InstantiatedPlugin = Partial<RuntimePluginInstance> & {
    options: PluginOptionsMap[keyof PluginOptionsMap];
};

export const DEFAULT_PLUGINS: WaveSurferPluginConfiguration[] = [
    {
        name: "regions",
        options: {}
    },
    {
        name: "timeline",
        options: {
            height: 10
        }
    },
    {
        name: "zoom",
        options: {
            exponentialZooming: true,
            iterations: 100
        }
    },
];

export const PLUGINS_MAP: {
    [K in keyof PluginOptionsMap]: (options?: Partial<PluginOptionsMap[K]>) => any
} = {
    regions: (options) => RegionsPlugin.create(options && Object.keys(options).length > 0 ? options : undefined),
    spectrogram: (options) => SpectrogramPlugin.create(options && Object.keys(options).length > 0 ? options : undefined),
    timeline: (options) => TimelinePlugin.create(options && Object.keys(options).length > 0 ? options : undefined),
    zoom: (options) => ZoomPlugin.create(options && Object.keys(options).length > 0 ? options : undefined),
    hover: (options) => HoverPlugin.create(options && Object.keys(options).length > 0 ? options : undefined),
    minimap: (options) => MinimapPlugin.create(options || {}),
};


export const pluginsAtom = atom<WaveSurferPluginConfiguration[]>(DEFAULT_PLUGINS);
// get the plugin instance from the atom
export const pluginInstanceAtom = atom<InstantiatedPlugin | null>(null);

type PluginInstanceMap = {
    regions: RegionsPlugin;
    spectrogram: SpectrogramPlugin;
    timeline: TimelinePlugin;
    zoom: ZoomPlugin;
    hover: HoverPlugin;
    minimap: MinimapPlugin;
    // Add others as needed
};

export const getPluginByNameAtom = atom(
    (get) => <K extends keyof PluginInstanceMap>(name: K): PluginInstanceMap[K] | undefined => {
        const plugins = get(pluginsAtom);

        const config = plugins.find((plugin) => plugin.name === name);
        if (!config) return undefined;
        // Always pass undefined if options is empty
        const options =
            config.options && Object.keys(config.options).length > 0
                ? config.options
                : undefined;
        // Call the correct factory and return the instance
        return PLUGINS_MAP[name](options as Partial<PluginOptionsMap[K]>) as PluginInstanceMap[K];
    }
);

export function registerPlugin(plugin: WaveSurferPluginConfiguration, wavesurfer: any) {
    const factory = PLUGINS_MAP[plugin.name as keyof PluginOptionsMap];
    if (!factory) {
        throw new Error(`Plugin ${plugin.name} not found`);
    }
    const options = plugin.options && Object.keys(plugin.options).length > 0 ? plugin.options : undefined;
    const pluginInstance = factory(options as any);
    // add the name to the plugin instance
    pluginInstance.name = plugin.name;
    console.log("registering plugin", pluginInstance);
    wavesurfer.registerPlugin(pluginInstance);
    // set the plugin atom

    return pluginInstance;
}

export function unregisterPlugin(plugin: WaveSurferPluginConfiguration, wavesurfer: any) {
    console.log("unregistering plugin", plugin.name);
    wavesurfer.destroyPlugin(plugin.name);
}
export function updatePluginOptions(plugin: WaveSurferPluginConfiguration, wavesurfer: any) {
    // destroy the plugin
    unregisterPlugin(plugin, wavesurfer);
    // register the plugin with the new options
    registerPlugin(plugin, wavesurfer);
}

export function registerPlugins(plugins: WaveSurferPluginConfiguration[], wavesurfer: any) {
    plugins.forEach(plugin => registerPlugin(plugin, wavesurfer));
}
export function getPluginInstanceByName<K extends keyof PluginInstanceMap>(name: K): PluginInstanceMap[K] | null {
    const { instance: waveSurfer } = useAtomValue(waveSurferAtom);
    if (!waveSurfer) return null;
    const plugins = waveSurfer.getActivePlugins();
    const pluginInstance = plugins.find((plugin: any) => plugin.name === name);
    if (!pluginInstance) return null;
    return pluginInstance as PluginInstanceMap[K];
}
export function unregisterPlugins(plugins: WaveSurferPluginConfiguration[], wavesurfer: any) {
    plugins.forEach(plugin => unregisterPlugin(plugin, wavesurfer));
}
// Atom setter for updating global plugin options array
export const setPluginOptionsAtom = atom(
    null,
    (_unused: any, set: any, update: WaveSurferPluginConfiguration[]) => {
        set(pluginsAtom, update);
    }
);
export const isPluginActiveAtom = atom((get) => (pluginName: string) => {
    const plugins = get(pluginsAtom);
    return plugins.some(plugin => plugin.name === pluginName);
});

