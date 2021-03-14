import { parser } from "discord-markdown";
export interface CodeAnalysis {
    language: string;
    code: string;
    additional: CodeAnalysis[];
}

export function parseCode(code: string): CodeAnalysis {
    if (code.startsWith("```")) {
        const rawParsed = parser(code);

        const [ topBlock, ...additional ] = rawParsed.filter(b => b.type === "codeBlock").map(({ lang, content }) => ({ language: lang, code: content, additional: [] }));

        return {
            ...topBlock,
            additional
        };
    } else {
        const parts = code.split(" ");
        if (parts.length === 1) return { language: code, code, additional: [] };

        code = parts.slice(1).join(" ");

        return {
            language: parts[0].toLowerCase(),
            code,
            additional: []
        };
    }
}