//
// TODO:
// -Subtotal total estimate for datatree, deduped
// -Total tokens for subtotal + user input + previous conversation
// -Prettier - better design overall
//  -dark mode
//  -better icons
// -testing
//  -figure out test coverage
//  -add more tests
// -add file tree to context
// -improve prompt
// -get specific url
//  -lightweight web caching
//  -web token count / tree category

// STRETCH:
// -Add needle in haystack/token recommendations for each model
// -Add drag and drop
// -"Implement features from TODO list"
// -edit code in place
// -support tts and stt ("argue with your code")
// -Add copilot wrapper
// -Can reference web pages
// -Can reference DB data
// -web search

// ROLLOUT:
// -figure out how to package extensions
// -test install on another machine
// -test installs across different platforms
// -Write docs
// -Apply best practices
// -Set up github
// -Set up CI/CD in github repo, push load repo


import * as vscode from 'vscode';
import { initializeDataManager, registerLaunchCommand } from './commands';
import { openSettingsEditor } from './preferences';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"ai-context-manager" activate');
	vscode.window.showInformationMessage('Ready to argue with your code!');

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
