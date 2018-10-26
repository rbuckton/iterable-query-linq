/** @internal */
export function visitList<T, U>(list: ReadonlyArray<T>, visitor: (element: T) => U): ReadonlyArray<U>;
/** @internal */
export function visitList<T, U>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => U): ReadonlyArray<U> | undefined;
export function visitList<T>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => T): ReadonlyArray<T> | undefined {
    if (list === undefined) return undefined;
    let result: T[] | undefined;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const visited = visitor(item);
        if (result) {
            result.push(visited);
        }
        else if (visited !== item) {
            result = list.slice(0, i);
            result.push(visited);
        }
    }
    return result || list;
}