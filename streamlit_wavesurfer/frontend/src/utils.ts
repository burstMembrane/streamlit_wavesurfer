export const lightenColor = (color: string): string => {
    // Handle rgba format
    if (color.startsWith('rgba(')) {
        const values = color.slice(5, -1).split(',');
        if (values.length === 4) {
            const [r, g, b, a] = values.map(v => parseFloat(v.trim()));
            // Lighten by reducing the RGB values (higher values = lighter)
            return `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${a})`;
        }
    }
    // Handle rgb format
    else if (color.startsWith('rgb(')) {
        const values = color.slice(4, -1).split(',');
        if (values.length === 3) {
            const [r, g, b] = values.map(v => parseInt(v.trim()));
            return `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;
        }
    }
    // Handle hex format
    else if (color.startsWith('#')) {
        const hex = color.slice(1);
        const bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;

        // Lighten the colors
        r = Math.min(255, r + 50);
        g = Math.min(255, g + 50);
        b = Math.min(255, b + 50);

        // Convert back to hex
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    // Return original if format not recognized
    return color;
};