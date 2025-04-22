export const objectHash = (obj: any) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'object' && value !== null ? undefined : value
    );
};

export const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};