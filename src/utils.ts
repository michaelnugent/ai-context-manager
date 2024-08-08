import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { encode } from 'gpt-tokenizer';
import ejs from 'ejs';
import { OpenAI } from 'openai';
import { getConfiguration } from './preferences';


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

export async function sendOpenAIRequest(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, treeDataForPrompt: any, message: any): Promise<void> {
    try {
        const config = getConfiguration();
        let conversationContext = context.globalState.get<any[]>('openaiConversationContext') || [];

        const prompt = await renderPromptTemplate(context, treeDataForPrompt, message.text);

        const client = new OpenAI({
            apiKey: config.openaiApiKey,
            baseURL: config.openaiUrl,
        });

        // The prompt contains the entire huge multi-file context.  Don't add that to every message
        // and explode token count.  Instead add only the message and append the prompt to the
        // current message.  Since the AI results are also included, it may have memories of
        // previous files if they've been removed from the context.
        conversationContext = conversationContext.filter(message => message.role && message.content);
        let apicontext: any[] = conversationContext.concat([{ role: 'user', content: prompt }]);
        conversationContext.push({ role: 'user', content: message.text });

        // model: "gpt-4o-mini-2024-07-18",
        const response = await client.chat.completions.create({
            model: config.openaiModel,
            messages: apicontext,
            temperature: 0.2,
            stream: true,
        });

        let result = '';
        for await (const chunk of response) {
            if (chunk.choices && chunk.choices.length > 0) {
                const aiMessage = chunk.choices[0].delta;
                if (aiMessage.content) {
                    result += aiMessage.content;
                    panel.webview.postMessage({ command: 'outputText', text: result, aiMessageId: message.aiMessageId });
                }
            }
        }

        conversationContext.push({ role: 'assistant', content: result });
        context.globalState.update('openaiConversationContext', conversationContext);
    } catch (error) {
        console.error('Failed to fetch from OpenAI API:', error);
    }
}

export async function sendOllamaRequest(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, treeDataForPrompt: any, message: any): Promise<void> {
    try {
        const config = getConfiguration();

        const prompt = await renderPromptTemplate(context, treeDataForPrompt, message.text);

        // http://arown.illuminatus.org:3101/api/generate
        const requestBody: any = {
            model: config.ollamaModel,
            prompt: prompt,
            stream: true,
        };
        const conversationContext = context.globalState.get<string>('ollamaConversationContext');
        if (conversationContext) {
            requestBody.context = conversationContext;
        }

        const response = await fetch(config.ollamaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                try {
                    const json = JSON.parse(chunk);
                    if (json.response) {
                        result += json.response;
                        panel.webview.postMessage({ command: 'outputText', text: result, aiMessageId: message.aiMessageId });
                    }
                } catch (e) {
                    console.error('Failed to parse chunk:', e);
                }
            }
        } else {
            throw new Error('Response body is null');
        }
    } catch (error) {
        console.error('Failed to fetch from Ollama API:', error);
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