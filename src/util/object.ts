export function enumerateFunctions<T extends object>(object: T, cb: (prop: keyof T, fn: Function) => void) {
    let props: (keyof T)[] = [];
    let obj = object;
    do {
        props = props.concat(Object.getOwnPropertyNames(obj) as (keyof T)[]);
    } while (obj = Object.getPrototypeOf(obj));

    props.sort().filter(function(e, i, arr) { 
        if (e!=arr[i+1] && typeof object[e] == "function") return true;
    }).forEach(key => cb(key, object[key] as unknown as Function));
}