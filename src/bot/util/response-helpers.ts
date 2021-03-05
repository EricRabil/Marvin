export function list(items: string[]): string {
    return `\`\`\`md\n${items.map(item => `- ${item}`).join("\n")}\n\`\`\``;
}