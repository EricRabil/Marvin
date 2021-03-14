declare module "discord-markdown" {
    export type MarkdownType = "codeBlock";

    export interface Node<Type> {
        type: Type;
        content: string;
    }

    export interface CodeBlockNode extends Node<"codeBlock"> {
        lang: string;
        content: string;
        inQuote: boolean;
    }

    export type AnyNode = CodeBlockNode;

    export function parser(raw: string): AnyNode[];
}