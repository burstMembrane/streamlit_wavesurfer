import { atom } from 'jotai';
import { Region } from '../types';
import { buildRegionId, lightenColor } from '../utils';
import colormap from 'colormap';
import type { Region as RegionsPluginRegion } from 'wavesurfer.js/dist/plugins/regions';

// ----------------------
// Region Types
// ----------------------

export interface ProcessedRegion extends Region {
    id: string;
    color: string;
    lightenedColor: string;
}

// Generic augmented region type
export type AugmentedRegion<T extends RegionsPluginRegion> = T & {
    id: string;
    color: string;
    lightenedColor: string;
};

// ----------------------
// Core Region State
// ----------------------

// Stores the full array of enriched (ID+color) region objects
export const regionsAtom = atom<ProcessedRegion[]>([]);

// Stores the ID of the currently active region
export const activeRegionIdAtom = atom<string | null>(null);

// ----------------------
// Processing Helpers
// ----------------------

/**
 * Returns an array of colours to assign to regions.
 * The number of shades is proportional to the number of regions.
 */
export const getRegionColors = (regions: Region[], colormapName: string) => {
    if (!regions || regions.length === 0) return [];
    return colormap({
        colormap: colormapName || 'magma',
        nshades: Math.max(regions.length, 10),
        format: 'rgbaString',
        alpha: 0.2
    });
};

/**
 * Augments a region with additional typed fields.
 */
function augmentWithFields<T, A extends Record<string, unknown>>(region: T, additions: A): T & A {
    return { ...region, ...additions };
}

function addId<T extends Region>(region: T): T & { id: string } {
    const id = region.id || buildRegionId(region);
    return augmentWithFields(region, { id });
}

function addColor<T extends Region>(region: T, color: string): T & { color: string; lightenedColor: string } {
    return augmentWithFields(region, {
        color,
        lightenedColor: lightenColor(color),
    });
}

// ----------------------
// State Derivation
// ----------------------

/**
 * Returns the full active region object based on activeRegionId.
 */
export const activeRegionAtom = atom<Region | null>(null);

// ----------------------
// Actions and Mutations
// ----------------------

/**
 * Sets regions with processing applied (IDs, colours).
 */
export const setRegionsAtom = atom(
    null,
    (_get, set, { regions, colormapName }: { regions: Region[]; colormapName: string }) => {
        const colors = getRegionColors(regions, colormapName);
        const processed = regions.map((region, index) => {
            return addColor(addId(region), colors[index % colors.length]);
        });
        console.log("[setRegionsAtom] processed", processed)
        // make it unique
        const uniqueProcessed = processed.filter((region, index, self) =>
            index === self.findIndex((t) => t.id === region.id)
        );
        set(regionsAtom, uniqueProcessed);
    }
);

export const clearRegionsAtom = atom(
    null,
    (_get, set) => {
        set(regionsAtom, []);
    }
);


/**
 * Sets whether the regions are looped.
 */
export const loopRegionsAtom = atom<boolean>(false);

export const setLoopRegionAtom = atom(
    null,
    (_get, set, loopRegions: boolean) => {
        set(loopRegionsAtom, loopRegions);
    }
);

// ----------------------
// Region Store Hook
// ----------------------

/**
 * Hook for consuming region state and dispatching mutations.
 */
export const useRegionsAtom = () => atom(
    (get) => ({
        regions: get(regionsAtom),
        activeRegion: get(activeRegionAtom),
    }),
    (_get, set, action: { type: 'setActiveRegion' | 'setRegions'; payload: any }) => {
        switch (action.type) {
            case 'setActiveRegion':
                set(activeRegionAtom, action.payload);
                break;
            case 'setRegions': {
                // For demonstration, process regions using addId and addColor
                const { regions, colormapName } = action.payload;
                const colors = getRegionColors(regions, colormapName);
                const processed = regions.map((region: Region, index: number) =>
                    addColor(addId(region), colors[index % colors.length])
                );
                set(regionsAtom, processed);
                break;
            }
        }
    }
);
