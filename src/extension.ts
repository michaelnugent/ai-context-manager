//
// BUGS:
// -both ollama and openai conversations are unnecessarily long. Massive dedupe needed.
//
// TODO:
// -Subtotal total estimate for datatree, deduped
// -Total tokens for subtotal + user input + previous conversation
// -Prettier - better design overall
//  -dark mode
//  -better icons
//  -edit previous conversation in place
// -testing
//  -figure out test coverage
//  -add more tests
//  -add file tree to context
// -clear everything, start fresh button
// -refactor inference calls to avoid prompt/memory duplication
// -support for other openai endpointst

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
// -get specific url


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
