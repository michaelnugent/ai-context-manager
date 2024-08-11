/* Copyright 2024 Michael Nugent */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { getSymbolsWithReties, getReferencesFromSymbols, getSymbols } from '../symbols';

suite('Symbols Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getReferencesFromSymbols should return unique references', async () => {
        const document = { uri: { fsPath: 'test/path' } } as unknown as vscode.TextDocument;
        const symbols = [{ selectionRange: { start: new vscode.Position(0, 0) } }] as vscode.DocumentSymbol[];

        // Stub the vscode command to return mock references
        const referencesStub = sandbox.stub(vscode.commands, 'executeCommand').resolves([
            { uri: { path: 'ref1' } },
            { uri: { path: 'ref2' } },
            { uri: { path: 'ref1' } } // Duplicate reference
        ]);

        const references = await getReferencesFromSymbols(symbols, document);
        assert.strictEqual(references.size, 2, 'Should return unique references');
        assert.ok(references.has('ref1'), 'Should include ref1');
        assert.ok(references.has('ref2'), 'Should include ref2');
    });

    test('getSymbols should return flattened symbols', async () => {
        const document = { uri: { fsPath: 'test/path' } } as unknown as vscode.TextDocument;

        // Stub the vscode command to return mock symbols
        const mockSymbols = [
            {
                kind: vscode.SymbolKind.Function,
                children: [],
                selectionRange: new vscode.Range(0, 0, 0, 0)
            },
            {
                kind: vscode.SymbolKind.Class,
                children: [
                    {
                        kind: vscode.SymbolKind.Method,
                        children: [],
                        selectionRange: new vscode.Range(1, 0, 1, 0)
                    }
                ],
                selectionRange: new vscode.Range(0, 0, 0, 0)
            }
        ];
        sandbox.stub(vscode.commands, 'executeCommand').resolves(mockSymbols);

        const symbols = await getSymbols(document);
        assert.strictEqual(symbols.length, 3, 'Should return all symbols including children');
    });
});