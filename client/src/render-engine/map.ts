export function map<T>(array: T[], callback: (a: T, index: number) => HTMLElement) {
    return array.map(callback);
}