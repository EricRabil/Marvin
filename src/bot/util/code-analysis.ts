export interface CodeAnalysis {
    language: string;
    code: string;
}

export function parseCode(code: string): CodeAnalysis {
    let rawLanguage: string, bits: string[];

    if (code.startsWith("```")) {
        rawLanguage = code.split("\n")[0].slice(3).trim();
        bits = code.split("\n");

        bits.splice(0, 1);
        bits.splice(bits.length - 1);

        code = bits.join("\n");
    } else {
        const parts = code.split(" ");
        if (parts.length === 1) return { language: code, code };
        rawLanguage = parts[0];
        code = parts.slice(1).join(" ");
    }

    return {
        language: rawLanguage.toLowerCase(),
        code
    };
}