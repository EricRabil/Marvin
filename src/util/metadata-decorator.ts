export interface Newable { new (...args: any[]): {} }

export function mergeProperty<T>(key: Symbol, defaultValue: Partial<T>, mergeValue: Partial<T> | ((existing: Partial<T>) => Partial<T>)) {
    return function (_: unknown, __: unknown, descriptor: PropertyDescriptor) {
        if (typeof descriptor.value !== "function") throw new Error("Expected decorator to contain a function");
        const storage = descriptor.value[key as keyof object] || (descriptor.value[key as keyof object] = defaultValue);
        Object.assign(storage, typeof mergeValue === "function" ? mergeValue(storage) : mergeValue);
        return descriptor;
    };
}

export function mergeClass<T>(key: Symbol, defaultValue: Partial<T>, merge: Partial<T> | ((existing: Partial<T>) => Partial<T>)) {
    return function<T extends Newable>(constructor: T) {
        return class extends constructor {
            // @ts-ignore
            static [key] = Object.assign({}, defaultValue, constructor[key] || {}, typeof merge === "function" ? merge(constructor[key]) : merge)
        };
    };
}