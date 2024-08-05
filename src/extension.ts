//
// TODO:
// -Load/save trees
// -Preferences
//  -Additional static context from user
//  -load/save preferences
// -Multiple model setup
//  -Add openai wrapper
//  -Add anthropic wrapper
//  -Add copilot wrapper
// -add previous conversation to prompt
// -Subtotal total estimate for datatree, deduped
// -Total tokens for subtotal + user input + previous conversation
// -Prettier - better design overall
//  -dark mode
//  -better icons
//  -break up conversation into parts
//  -display user data as well
//  -support markdown output
//  -add copy/paste for user data
//  -edit previous conversation in place
// -testing
//  -figure out test coverage
//  -add more tests
//  -add file tree to context

// STRETCH:
// -Add needle in haystack/token recommendations for each model
// -Add drag and drop
// -Implement features from TODO list
// -edit code in place
// -support tts and stt ("argue with your code")

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

// This method is called when your extension is deactivated
export function deactivate() { }
