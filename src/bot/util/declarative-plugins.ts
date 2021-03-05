import { ClientEvents } from "discord.js";
import PluginKeyValueStore from "../../db/entities/PluginKeyValueStore";
import { mergeClass, mergeProperty } from "../../util/metadata-decorator";
import { enumerateFunctions } from "../../util/object";
import { compileCommandGroup, CompiledCommandGroup } from "./declarative-commands";
import { BaseDObject } from "./declarative-foundation";

const DPluginIdentifier = Symbol("DPluginIdentifier");

interface DPluginMetadata {
    id: string;
}

export const DPlugin = (id: string) => mergeClass(DPluginIdentifier, {}, { id });

const DEventMetadata = Symbol("DEventMetadata");

interface EventInfo {
    name: keyof ClientEvents;
}

const mergeEventMetadata = (meta: Partial<EventInfo>) => mergeProperty(DEventMetadata, {}, meta);

export const DEvent = (name: keyof ClientEvents) => mergeEventMetadata({ name });

const DCommandProcessingHook = Symbol("DCommandProcessingHook");

interface CommandProcessingHook {
    onReply?: boolean;
    onComplete?: boolean;
    onDenied?: boolean;
}

const mergeCommandProcessingHook = (meta: Partial<CommandProcessingHook>) => mergeProperty(DCommandProcessingHook, {}, meta);

export const DCommandReplied = mergeCommandProcessingHook({ onReply: true });
export const DCommandCompleted = mergeCommandProcessingHook({ onComplete: true });
export const DCommandDenied = mergeCommandProcessingHook({ onDenied: true });

const DPluginLifecycleHook = Symbol("DPluginLifecycleHook");

interface PluginLifecycleHooks {
    loaded?: boolean;
    unloaded?: boolean;
}

const mergeLifecycleHook = (meta: Partial<PluginLifecycleHooks>) => mergeProperty(DPluginLifecycleHook, {}, meta);

export const DPluginLoaded = mergeLifecycleHook({ loaded: true });
export const DPluginUnloaded = mergeLifecycleHook({ unloaded: true });

export function isDPlugin<T extends Function>(constructor: T): constructor is T & { [DPluginIdentifier]: DPluginMetadata } {
    return DPluginIdentifier in constructor;
}

function makeFunctionTypeGuard<Interface, Key extends symbol>(symbol: Key) {
    return function(clazz: unknown): clazz is Function & {
        [K in Key]: Interface
    } {
        return typeof clazz === "function"
            && symbol in clazz;
    };
}

const isDListener = makeFunctionTypeGuard<EventInfo, typeof DEventMetadata>(DEventMetadata);
const isDCommandHook = makeFunctionTypeGuard<CommandProcessingHook, typeof DCommandProcessingHook>(DCommandProcessingHook);
const isDLifecycleHook = makeFunctionTypeGuard<PluginLifecycleHooks, typeof DPluginLifecycleHook>(DPluginLifecycleHook);

type CompiledListener<T> = CompiledDecoration<EventInfo, T>;
type CompiledHook<T> = CompiledDecoration<CommandProcessingHook, T>;
type CompiledLifecycleHook<T> = CompiledDecoration<PluginLifecycleHooks, T>;

interface CompiledPlugin<T extends object = object> {
    metadata: DPluginMetadata;
    commandGroups: CompiledCommandGroup[];
    listeners: CompiledListener<T>[];
    hooks: CompiledHook<T>[];
    lifecycleHooks: CompiledLifecycleHook<T>[];
}

interface CompiledDecoration<Interface, T> {
    metadata: Interface;
    key: keyof T;
}


function findCommandGroups<T extends object>(obj: T): CompiledCommandGroup[] {
    return Object.values(obj).flatMap(e => {
        if (typeof e === "object") {
            try {
                return compileCommandGroup(e);
            } catch {
                return findCommandGroups(e);
            }
        } else return null;
    }).filter(obj => obj !== null) as CompiledCommandGroup[];
}

export class BaseDPlugin extends BaseDObject {
    get(key: string) {
        return PluginKeyValueStore.get(this.pluginID, key);
    }

    set(key: string, value: any) {
        return PluginKeyValueStore.set(this.pluginID, key, value);
    }

    unset(key: string) {
        return PluginKeyValueStore.unset(this.pluginID, key);
    }

    private get pluginID() {
        if (!isDPlugin(this.constructor)) throw new Error("No plugin metadata provided.");
        return (this.constructor[DPluginIdentifier] as unknown as DPluginMetadata).id;
    }
}

export function compilePlugin<T extends { constructor: any }>(clazz: T): CompiledPlugin<T> {
    if (!isDPlugin(clazz.constructor)) throw new Error("Class is not a plugin");

    const commandGroups = findCommandGroups({ clazz });

    const metadata = clazz.constructor[DPluginIdentifier];

    const listeners: CompiledListener<T>[] = [];
    const hooks: CompiledHook<T>[] = [];
    const lifecycleHooks: CompiledLifecycleHook<T>[] = [];

    enumerateFunctions(clazz, (key, fn) => {
        if (isDListener(fn)) listeners.push({
            metadata: fn[DEventMetadata],
            key
        });
        if (isDCommandHook(fn)) hooks.push({
            metadata: fn[DCommandProcessingHook],
            key
        });
        if (isDLifecycleHook(fn)) lifecycleHooks.push({
            metadata: fn[DPluginLifecycleHook],
            key
        });
    });

    return {
        metadata,
        commandGroups,
        hooks,
        listeners,
        lifecycleHooks
    };
}