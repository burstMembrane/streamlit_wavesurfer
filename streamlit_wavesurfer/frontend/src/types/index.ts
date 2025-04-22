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