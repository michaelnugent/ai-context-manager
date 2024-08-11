/* Copyright 2024 Michael Nugent */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as preferences from '../preferences';


suite('Preferences Test Suite', () => {
    test('openSettingsEditor should execute command to open settings', async () => {
        const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

        await preferences.openSettingsEditor();

        assert.ok(executeCommandStub.calledOnce, 'executeCommand should be called once');
        assert.ok(executeCommandStub.calledWith('workbench.action.openSettings', 'ai-context-manager'), 'executeCommand should be called with correct parameters');

        executeCommandStub.restore();
    });
});