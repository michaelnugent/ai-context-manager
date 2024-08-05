import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { encode } from 'gpt-tokenizer';
import ejs from 'ejs';

// utils
export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const symbolKindMap: { [key: number]: string } = {
    [vscode.SymbolKind.File]: "File",
    [vscode.SymbolKind.Module]: "Module",
    [vscode.SymbolKind.Namespace]: "Namespace",
    [vscode.SymbolKind.Package]: "Package",
    [vscode.SymbolKind.Class]: "Class",
    [vscode.SymbolKind.Method]: "Method",
    [vscode.SymbolKind.Property]: "Property",
    [vscode.SymbolKind.Field]: "Field",
    [vscode.SymbolKind.Constructor]: "Constructor",
    [vscode.SymbolKind.Enum]: "Enum",
    [vscode.SymbolKind.Interface]: "Interface",
    [vscode.SymbolKind.Function]: "Function",
    [vscode.SymbolKind.Variable]: "Variable",
    [vscode.SymbolKind.Constant]: "Constant",
    [vscode.SymbolKind.String]: "String",
    [vscode.SymbolKind.Number]: "Number",
    [vscode.SymbolKind.Boolean]: "Boolean",
    [vscode.SymbolKind.Array]: "Array",
    [vscode.SymbolKind.Object]: "Object",
    [vscode.SymbolKind.Key]: "Key",
    [vscode.SymbolKind.Null]: "Null",
    [vscode.SymbolKind.EnumMember]: "EnumMember",
    [vscode.SymbolKind.Struct]: "Struct",
    [vscode.SymbolKind.Event]: "Event",
    [vscode.SymbolKind.Operator]: "Operator",
    [vscode.SymbolKind.TypeParameter]: "TypeParameter"
};

export function getSymbolKindName(kind: number): string {
    return symbolKindMap[kind] || "Unknown";
}

export async function readFileContents(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}
// end utils

// symbols to references
export async function getSymbolsWithReties(document: vscode.TextDocument, maxRetries: number = 5) {
    // get symbols from file
    let symbols = null;
    let attempts = 0;

    // This is a stupid hack to make sure the language server is loaded. 
    // This must exist because there's no difference between "loading" and "non existant" or
    // "failure". They all return null.
    while (!symbols && attempts < maxRetries) {
        symbols = await getSymbols(document);

        if (!symbols || symbols.length === 0) {
            attempts++;
            await sleep(1000);
        }
    }
    symbols?.filter(symbol => symbol.kind === vscode.SymbolKind.Function);
    return symbols;
}

export async function getReferencesFromSymbols(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument): Promise<Set<string>> {
    const functionReferences: Set<string> = new Set();

    for (const symbol of symbols) {
        const references = await vscode.commands.executeCommand<vscode.Location[]>(
            'vscode.executeReferenceProvider',
            document.uri,
            symbol.selectionRange.start
        );

        if (references) {
            for (const ref of references) {
                functionReferences.add(ref.uri.path);
            }
        }
    }

    return functionReferences;
}

export async function getSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
    );

    if (!symbols) {
        return [];
    }

    const flattenSymbols = (symbols: vscode.DocumentSymbol[], result: vscode.DocumentSymbol[] = []) => {
        for (const symbol of symbols) {
            if ([vscode.SymbolKind.Function, vscode.SymbolKind.Method, vscode.SymbolKind.Class].includes(symbol.kind)) {
                result.push(symbol);
            }
            if (symbol.children.length > 0) {
                flattenSymbols(symbol.children, result);
            }
        }
        return result;
    };

    const allSymbols = flattenSymbols(symbols);

    return allSymbols;
}
// end symbols to references

// get file metadata
export async function getFileMetadata(document: vscode.TextDocument): Promise<any> {
    const languageId = document.languageId;

    const unsupportedLanguages = ['plaintext'];

    if (unsupportedLanguages.includes(languageId)) {
        console.log(`Language ${languageId} is unsupported for ${document.fileName}.`);
        return { "language": languageId, "symbols": [] };
    }

    const symbols = await getSymbolsWithReties(document);

    return { "language": languageId, "symbols": symbols };
}
// end get file metadata

// get files in the same dir
export async function findFilesInSameDirectory(directory: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) {
                reject(err);
            } else {
                const fullPaths = files.map(file => path.join(directory, file));
                resolve(fullPaths);
            }
        });
    });
}
// end get files in the same dir

// tokens
export async function countTokensInFile(filePath: string): Promise<number> {
    try {
        const stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) {
            return 0;
        }

        const fileContents = await readFileContents(filePath);
        const encoded = encode(fileContents);
        return encoded.length;
    } catch (error) {
        console.error(`Error reading file '${filePath}':`, error);
        return 0;
    }
}
// end tokens

// AI calls
export async function sendOllamaRequest(userMessage: string): Promise<string> {
    try {
        const response = await fetch('http://arown.illuminatus.org:3101/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3:8b', // Replace with your model
                prompt: userMessage,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response; // Adjust based on the actual response structure
    } catch (error) {
        console.error('Failed to fetch from Ollama API:', error);
        return 'Failed to fetch response from Ollama API.';
    }
}

export async function gatherDataForPrompt(treeData: any): Promise<any> {
    console.log(`treeData (gatherDataForPrompt): ${treeData}`);
    console.log(`Type of treeData (gatherDataForPrompt): ${typeof treeData}`);

    if (Array.isArray(treeData)) {
        console.error("treeData is an array, expected an object.");
        return {};
    }

    for (const category of Object.keys(treeData)) {
        // console.log(`Category: ${category}`);
        if (treeData[category].items) {
            for (const item of Object.keys(treeData[category].items)) {
                console.log(`Item: ${item}`);
                if (treeData[category].items[item].metadata.enabled) {
                    treeData[category].items[item].content = await readFileContents(item);
                }
            }
        }
    }
    return treeData;
}


export async function renderPromptTemplate(context: vscode.ExtensionContext, treeData: any, userInput: string): Promise<string> {
    console.log('Rendering prompt template');
    console.log(`Type of treeData (renderPromptTemplate): ${typeof treeData}`);
    const templatePath = path.join(context.extensionPath, 'resources', 'prompt.ejs');
    const templateData = { treeData, userInput };

    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, templateData, (err, str) => {
            if (err) {
                reject(err);
            } else {
                resolve(str);
            }
        });
    });
}

// end AI calls