/* Copyright 2024 Michael Nugent */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { handleIndexCommand } from '../handlers';
import { DataManager } from '../datamanager';
import * as utils from '../utils';
import * as symbols from '../symbols';

suite('Handlers Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('handleIndexCommand should handle no active editor', async () => {
        const panel = { webview: { postMessage: sandbox.stub() } } as unknown as vscode.WebviewPanel;
        const result = await handleIndexCommand(panel, '', undefined);
        assert.strictEqual(result, undefined, 'Result should be undefined when there is no active editor');
    });

    test('handleIndexCommand should handle document opening failure', async () => {
        const panel = { webview: { postMessage: sandbox.stub() } } as unknown as vscode.WebviewPanel;
        const activeEditor = { document: { uri: { fsPath: 'test/path' } } } as unknown as vscode.TextEditor;

        sandbox.stub(vscode.workspace, 'openTextDocument').resolves(undefined);
        const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

        await handleIndexCommand(panel, '', activeEditor);
        assert.ok(showErrorMessageStub.calledOnce, 'showErrorMessage should be called once');
    });

    test('handleIndexCommand should handle no symbols found', async () => {
        const panel = { webview: { postMessage: sandbox.stub() } } as unknown as vscode.WebviewPanel;
        const activeEditor = { document: { uri: { fsPath: 'test/path' } } } as unknown as vscode.TextEditor;

        sandbox.stub(vscode.workspace, 'openTextDocument').resolves(activeEditor.document);
        sandbox.stub(utils, 'getFileMetadata').resolves({ symbols: [] });

        const result = await handleIndexCommand(panel, '', activeEditor);
        assert.strictEqual(result, undefined, 'Result should be undefined when no symbols are found');
    });


    test('handleIndexCommand should process references and directory files', async () => {
        const postMessageStub = sandbox.stub().resolves(true);
        const panel = {
            webview: {
                postMessage: postMessageStub
            }
        } as unknown as vscode.WebviewPanel;

        const activeEditor = { document: { uri: { fsPath: 'test/path' } } } as unknown as vscode.TextEditor;
        const document = { uri: { fsPath: 'test/path' } } as unknown as vscode.TextDocument;

        sandbox.stub(vscode.workspace, 'openTextDocument').resolves(document);
        sandbox.stub(utils, 'getFileMetadata').resolves({ symbols: ['symbol1'] });
        sandbox.stub(symbols, 'getReferencesFromSymbols').resolves(new Set(['ref1', 'ref2']));
        sandbox.stub(utils, 'countTokensInFile').resolves(10);
        sandbox.stub(utils, 'findFilesInSameDirectory').resolves(['file1', 'file2']);

        const dataManagerStub = sandbox.stub(DataManager, 'getInstance').resolves({
            addItem: sandbox.stub(),
            setTokenCount: sandbox.stub(),
            asJson: sandbox.stub().resolves('{}')
        } as unknown as DataManager);

        await handleIndexCommand(panel, '', activeEditor);

        assert.ok(dataManagerStub.calledOnce, 'DataManager.getInstance should be called once');
        sinon.assert.calledOnce(postMessageStub); // Use Sinon's assertion
    });
});