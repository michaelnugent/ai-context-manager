/* Copyright 2024 Michael Nugent */

import * as vscode from 'vscode';
import * as path from 'path';
import { DataManager } from './datamanager';
import { getFileMetadata, findFilesInSameDirectory, countTokensInFile } from './utils';
import { getReferencesFromSymbols } from './symbols';

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
        return { "language": "none", "symbols": [] };
    }

    const metadata = await getFileMetadata(activeEditor.document);
    if (metadata.symbols.length === 0) {
        // TODO: Fail gracefully
        console.log('No symbols found in the file.');
        return;
    }
    const references = await getReferencesFromSymbols(metadata.symbols, activeEditor.document);
    console.log('references:', references);

    const refdis = "Discovered";
    for (const ref of references) {
        const tokens = await countTokensInFile(ref);
        await datamanager.addItem(refdis, ref);
        await datamanager.setTokenCount(refdis, ref, tokens);
    }

    const dirfiles = await findFilesInSameDirectory(path.dirname(document.uri.fsPath));
    console.log('dirfiles:', dirfiles);

    for (const file of dirfiles) {
        const tokens = await countTokensInFile(file);
        await datamanager.addItem(refdis, file);
        await datamanager.setTokenCount(refdis, file, tokens);
    }

    const dmj = await datamanager.asJson();
    panel.webview.postMessage({ command: 'outputText', text: dmj });
}
// end handlers
