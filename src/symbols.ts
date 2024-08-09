/* Copyright 2024 Michael Nugent */

import * as vscode from 'vscode';
import { sleep } from './utils';

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