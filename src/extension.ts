
// PREPRELEASE:

// POSTRELEASE:
// -Add drag and drop
// -"Implement tasks from TODO list"
// -Add copilot wrapper for edit in place? Is this doable?
// -Can reference DB data
// -web search
// -add selected code to context / category
// -token count
//  -add previous conversation estimate to token count
//  -add selected code to token count
//  -Total tokens for subtotal + user input + previous conversation + dedupe
// -github integration
//  -read files
//  -read issues
//  -read unit test results
// -something snippets?
// -add file tree to context
//  -web token count / tree category
//  -follow gitingore?
//  -how to avoid library dirs?
//  -just specified dirs?
//  -max depth?
//  -defined ignore per language?
//   -pull this from github on the fly?
// -lightweight web cache
//  -how to clear manually?  settings?  I kinda dont want another button
// -copy button per markdown window?

// ROLLOUT:
// -github action to add to marketplace

/* Copyright 2024 Michael Nugent */

import * as vscode from 'vscode';
import { initializeDataManager, registerLaunchCommand } from './commands';
import { openSettingsEditor } from './preferences';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"ai-context-manager" activate');
	vscode.window.showInformationMessage('AI Context Manager: Ready to argue with your code!');

	context.subscriptions.push(vscode.commands.registerCommand('first-run', () => {
		vscode.commands.executeCommand('ai-context-manager.openSettings');
	}));

	registerLaunchCommand(context);

	const settingsEditorDisposable = vscode.commands.registerCommand('ai-context-manager.openSettings', openSettingsEditor);
	context.subscriptions.push(settingsEditorDisposable);

	// Call the async initialization function
	initializeDataManager().then(() => {
		console.log('DataManager initialized successfully.');
	}).catch((error) => {
		console.error('Failed to initialize DataManager:', error);
	});
}

// This method is called when your extension is deactivated
export function deactivate() { }
