"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.handleIndexCommand = handleIndexCommand;
exports.sleep = sleep;
exports.readFileContents = readFileContents;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ejs = __importStar(require("ejs"));
const fs = __importStar(require("fs"));
const gpt_3_encoder_1 = require("gpt-3-encoder");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ai-context-manager" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('ai-context-manager.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from AI Context Manager!');
    });
    registerLaunchCommand(context);
    context.subscriptions.push(disposable);
}
//
//
// { 
//   'symbol': {
//       definition: ["one", "two", "three"],
//       references: ["one", "two", "three"],
//   },
// }
// This method is called when your extension is deactivated
function deactivate() { }
function registerLaunchCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand('ai-context-manager.launch', () => {
        const activeEditor = vscode.window.activeTextEditor;
        const viewColumn = activeEditor ? activeEditor.viewColumn : vscode.ViewColumn.One;
        console.log("launched file: " + activeEditor?.document.uri.path);
        const panel = vscode.window.createWebviewPanel('aiContextManagerPanel', 'aiContextManager', viewColumn ? viewColumn + 1 : vscode.ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
        });
        const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'home.css'));
        const cssUri = panel.webview.asWebviewUri(cssPath);
        const templatePath = path.join(context.extensionPath, 'resources', 'home.ejs');
        // Sample tree data - replace this with your actual data
        const treeData = [
            {
                title: "Detected Files",
                enabled: true,
                tokenCount: 1000,
                children: ["Child A", "Child B", "Child C"]
            },
            {
                title: "Item 2",
                enabled: false,
                tokenCount: 500,
                children: ["Child A", "Child B"]
            }
        ];
        ejs.renderFile(templatePath, { cssUri, treeData }, (err, html) => {
            if (err) {
                console.error('Error rendering EJS template:', err);
                panel.webview.html = `<h1>Error loading content</h1>`;
                return;
            }
            panel.webview.html = html;
        });
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'index') {
                console.log('DevBucketViewProvider index');
                console.log('workspace:', vscode.workspace);
                await handleIndexCommand(panel, context.extensionPath, activeEditor);
            }
        }, undefined, context.subscriptions);
    }));
}
// handlers
async function handleIndexCommand(panel, extensionPath, activeEditor) {
    if (!activeEditor) {
        return;
    }
    const filepath = activeEditor.document.uri.fsPath;
    const uri = vscode.Uri.file(filepath);
    const document = await vscode.workspace.openTextDocument(uri);
    if (!document) {
        vscode.window.showErrorMessage(`Failed to open the document: ${filepath}`);
        // TODO valid return value
        return { "language": null, "symbols": null };
    }
    const metadata = await getFileMetadata(activeEditor.document);
    if (metadata.symbols.length === 0) {
        // TODO: Fail gracefully
        console.log('No symbols found in the file.');
        return;
    }
    const references = await getReferencesFromSymbols(metadata.symbols, activeEditor.document);
    console.log('references:', references);
    const dirfiles = await findFilesInSameDirectory(path.dirname(document.uri.fsPath));
    console.log('dirfiles:', dirfiles);
    references.forEach(async (ref) => {
        const tokens = await countTokensInFile(ref);
        console.log('tokens:', tokens);
    });
}
// end handlers
// utils
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const symbolKindMap = {
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
function getSymbolKindName(kind) {
    return symbolKindMap[kind] || "Unknown";
}
async function readFileContents(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
// end utils
// symbols to references
async function getSymbolsWithReties(document, maxRetries = 5) {
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
async function getReferencesFromSymbols(symbols, document) {
    const functionReferences = new Set();
    for (const symbol of symbols) {
        const references = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, symbol.selectionRange.start);
        if (references) {
            for (const ref of references) {
                functionReferences.add(ref.uri.path);
            }
        }
    }
    return functionReferences;
}
async function getSymbols(document) {
    const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
    if (!symbols) {
        return [];
    }
    const flattenSymbols = (symbols, result = []) => {
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
async function getFileMetadata(document) {
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
async function findFilesInSameDirectory(directory) {
    return new Promise((resolve, reject) => {
        fs.readdir(directory, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                const fullPaths = files.map(file => path.join(directory, file));
                resolve(fullPaths);
            }
        });
    });
}
// end get files in the same dir
// tokens
async function countTokensInFile(filePath) {
    const encoded = (0, gpt_3_encoder_1.encode)(await readFileContents(filePath));
    return encoded.length;
}
// end tokens
//# sourceMappingURL=extension.js.map