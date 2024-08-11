/* Copyright 2024 Michael Nugent */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import {
    sleep,
    getSymbolKindName,
    getFileMetadata,
    countTokensInFile
} from '../utils';

suite('Utils Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('sleep should resolve after the specified time', async () => {
        const clock = sandbox.useFakeTimers();
        const promise = sleep(1000);
        clock.tick(1000);
        await promise;
        clock.restore();
    });

    test('getSymbolKindName should return correct names for known symbol kinds', () => {
        assert.strictEqual(getSymbolKindName(vscode.SymbolKind.Class), 'Class');
        assert.strictEqual(getSymbolKindName(vscode.SymbolKind.Function), 'Function');
    });

    test('getSymbolKindName should return "Unknown" for unknown symbol kinds', () => {
        assert.strictEqual(getSymbolKindName(999), 'Unknown');
    });

    test('getFileMetadata should return empty symbols for unsupported languages', async () => {
        const mockDocument = {
            languageId: 'plaintext',
            fileName: 'test.txt',
        } as vscode.TextDocument;

        const result = await getFileMetadata(mockDocument);
        assert.deepStrictEqual(result, { language: 'plaintext', symbols: [] });
    });

    test('countTokensInFile should return 0 for non-file paths', async () => {
        sandbox.stub(fs.promises, 'stat').resolves({ isFile: () => false } as fs.Stats);

        const result = await countTokensInFile('directory/');
        assert.strictEqual(result, 0);
    });

    test('countTokensInFile should return 0 on file read error', async () => {
        sandbox.stub(fs.promises, 'stat').rejects(new Error('Stat error'));

        const result = await countTokensInFile('test.txt');
        assert.strictEqual(result, 0);
    });
});