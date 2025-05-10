import { atom } from 'jotai';
import WaveSurfer from 'wavesurfer.js';
import { pluginsAtom, registerPlugins, DEFAULT_PLUGINS } from "./plugins";
import type { WaveSurferUserOptions } from "@waveformviewer/types";

// Atom to store a single WaveSurfer instance
export const waveSurferAtom = atom<WaveSurfer | null>(null);

// Action types for managing the WaveSurfer instance
export type WaveSurferAction =
    | { type: 'create'; container: HTMLDivElement; audioBlob: Blob; options: WaveSurferUserOptions; plugins?: any[]; onReady: () => void }
    | { type: 'destroy' }
    | { type: 'setOptions'; options: WaveSurferUserOptions };

export const waveSurferManagerAtom = atom(
    (get) => get(waveSurferAtom),
    (get, set, action: WaveSurferAction) => {
        switch (action.type) {
            case 'create': {
                const { container, audioBlob, options, plugins, onReady } = action;
                // Destroy any previous instance
                const prev = get(waveSurferAtom);
                if (prev) prev.destroy();
                const ws = WaveSurfer.create({
                    container,
                    normalize: true,
                    minPxPerSec: 10,
                    ...options,
                });
                // Register plugins
                registerPlugins(plugins && plugins.length ? plugins : DEFAULT_PLUGINS, ws);
                ws.on("ready", () => {
                    onReady();
                });
                set(waveSurferAtom, ws);
                ws.loadBlob(audioBlob);
                return;
            }
            case 'destroy': {
                const ws = get(waveSurferAtom);
                if (ws) ws.destroy();
                set(waveSurferAtom, null);
                return;
            }
            case 'setOptions': {
                const ws = get(waveSurferAtom);
                if (ws) ws.setOptions(action.options);
                return;
            }
            default:
                return;
        }
    }
);

