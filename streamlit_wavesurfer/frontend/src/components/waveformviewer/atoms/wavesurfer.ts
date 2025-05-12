import { atom } from 'jotai';
import WaveSurfer from 'wavesurfer.js';
import { registerPlugins, DEFAULT_PLUGINS } from "./plugins";
import type { WaveSurferUserOptions } from "@waveformviewer/types";

// Atom to store a single WaveSurfer instance and its ready state
export const waveSurferAtom = atom<{ instance: WaveSurfer | null, ready: boolean }>({ instance: null, ready: false });

// Action types for managing the WaveSurfer instance
export type WaveSurferAction =
    | { type: 'create'; container: HTMLDivElement; audioBlob: Blob; options: WaveSurferUserOptions; plugins?: any[]; onReady: () => void }
    | { type: 'destroy' }
    | { type: 'loadBlob'; audioBlob: Blob }
    | { type: 'setOptions'; options: WaveSurferUserOptions }
    | { type: 'setReady'; ready: boolean };

export const waveSurferManagerAtom = atom(
    (get) => get(waveSurferAtom),
    (get, set, action: WaveSurferAction) => {
        switch (action.type) {
            case 'create': {
                const { container, audioBlob, options, plugins, onReady } = action;
                // Destroy any previous instance
                const prev = get(waveSurferAtom).instance;
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
                    set(waveSurferAtom, { instance: ws, ready: true });
                    onReady();
                });
                set(waveSurferAtom, { instance: ws, ready: false });
                ws.loadBlob(audioBlob);
                return;
            }
            case 'loadBlob': {
                const { audioBlob } = action;
                const ws = get(waveSurferAtom).instance;
                if (ws) ws.loadBlob(audioBlob);
                set(waveSurferAtom, { instance: ws, ready: false });
                return;
            }
            case 'destroy': {
                const ws = get(waveSurferAtom).instance;
                if (ws) ws.destroy();
                set(waveSurferAtom, { instance: null, ready: false });
                return;
            }
            case 'setOptions': {
                const ws = get(waveSurferAtom).instance;
                if (ws) ws.setOptions(action.options);
                return;
            }
            case 'setReady': {
                const ws = get(waveSurferAtom).instance;
                set(waveSurferAtom, { instance: ws, ready: action.ready });
                return;
            }
            default:
                return;
        }
    }
);

