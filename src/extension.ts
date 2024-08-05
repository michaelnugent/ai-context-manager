// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as ejs from 'ejs';
import * as fs from 'fs';

import { encode } from 'gpt-tokenizer';
import { DataManager } from './datamanager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
	context.subscriptions.push(disposable);

	registerLaunchCommand(context);

	// Call the async initialization function
	initializeDataManager().then(() => {
		console.log('DataManager initialized successfully.');
	}).catch((error) => {
		console.error('Failed to initialize DataManager:', error);
	});
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
export function deactivate() { }

async function initializeDataManager() {
	try {
		const datamanager = await DataManager.getInstance();
		await datamanager.addCategory("By Request");
		await datamanager.addCategory("By Reference");
		await datamanager.addCategory("By Directory");
	} catch (error) {
		console.error('Failed to initialize DataManager:', error);
	}
}

function registerLaunchCommand(context: vscode.ExtensionContext) {
	console.log('registering launch command');
	context.subscriptions.push(
		vscode.commands.registerCommand('ai-context-manager.addToContext', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (uris && uris.length > 0) {
				const datamanager = await DataManager.getInstance();
				for (const selectedUri of uris) {
					await datamanager.addItem("By Request", selectedUri.fsPath);
					vscode.window.showInformationMessage(`Adding to context: ${selectedUri.fsPath}`);
				}
			} else {
				vscode.window.showInformationMessage(`Adding to context: ${uri.fsPath}`);
			}
		})
	);


	context.subscriptions.push(
		vscode.commands.registerCommand('ai-context-manager.launch', () => {
			const activeEditor = vscode.window.activeTextEditor;
			const viewColumn = activeEditor ? activeEditor.viewColumn : vscode.ViewColumn.One;
			console.log("launched file: " + activeEditor?.document.uri.path);

			const panel = vscode.window.createWebviewPanel(
				'aiContextManagerPanel',
				'aiContextManager',
				viewColumn ? viewColumn + 1 : vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
				}
			);

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

			panel.webview.onDidReceiveMessage(
				async message => {
					switch (message.command) {
						case 'index':
							console.log('DevBucketViewProvider index');
							console.log('workspace:', vscode.workspace);
							await handleIndexCommand(panel, context.extensionPath, activeEditor);
							break;
						default:
							console.log('Unknown command:', message.command);
					}
				},
				undefined,
				context.subscriptions
			);
		})
	);
}

// handlers

export async function handleIndexCommand(panel: vscode.WebviewPanel, extensionPath: string, activeEditor: vscode.TextEditor | undefined) {
	if (!activeEditor) {
		return;
	}

	const datamanager = await DataManager.getInstance();
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

	const refcat = "By Reference";
	for (const ref of references) {
		const tokens = await countTokensInFile(ref);
		await datamanager.addItem(refcat, ref);
		await datamanager.setTokenCount(refcat, ref, tokens);
		console.log(ref + ' tokens:', await datamanager.getTokenCount(refcat, ref));
	}

	const dirfiles = await findFilesInSameDirectory(path.dirname(document.uri.fsPath));
	console.log('dirfiles:', dirfiles);

	const dircat = "By Directory";
	for (const file of dirfiles) {
		const tokens = await countTokensInFile(file);
		await datamanager.addItem(dircat, file);
		await datamanager.setTokenCount(dircat, file, tokens);
		console.log(file + ' tokens:', await datamanager.getTokenCount(dircat, file));
	}

	const dmj = await datamanager.asJson();
	panel.webview.postMessage({ command: 'outputText', text: dmj });
	console.log('DataManager JSON:', dmj);
}
// end handlers

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

function getSymbolKindName(kind: number): string {
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
async function getSymbolsWithReties(document: vscode.TextDocument, maxRetries: number = 5) {
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

async function getReferencesFromSymbols(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument): Promise<Set<string>> {
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

async function getSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
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
async function getFileMetadata(document: vscode.TextDocument): Promise<any> {
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
async function findFilesInSameDirectory(directory: string): Promise<string[]> {
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

async function countTokensInFile(filePath: string): Promise<number> {
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