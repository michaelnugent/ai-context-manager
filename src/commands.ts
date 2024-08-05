import * as vscode from 'vscode';
import * as path from 'path';
import * as ejs from 'ejs';
import { DataManager } from './datamanager';
import { handleIndexCommand } from './handlers';
import { countTokensInFile } from './utils';

export async function initializeDataManager() {
    try {
        const datamanager = await DataManager.getInstance();
        await datamanager.addCategory("By Request");
        await datamanager.addCategory("By Reference");
        await datamanager.addCategory("By Directory");
    } catch (error) {
        console.error('Failed to initialize DataManager:', error);
    }
}

export function registerLaunchCommand(context: vscode.ExtensionContext) {
    console.log('registering launch command');
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-context-manager.addToContext', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
            const datamanager = await DataManager.getInstance();
            if (uris && uris.length > 0) {
                for (const selectedUri of uris) {
                    await datamanager.addItem("By Request", selectedUri.fsPath);
                    await datamanager.setTokenCount("By Request", selectedUri.fsPath, await countTokensInFile(selectedUri.fsPath));
                    vscode.window.showInformationMessage(`Adding to context: ${selectedUri.fsPath}`);
                }
            } else {
                await datamanager.addItem("By Request", uri.fsPath);
                await datamanager.setTokenCount("By Request", uri.fsPath, await countTokensInFile(uri.fsPath));
                vscode.window.showInformationMessage(`Adding to context: ${uri.fsPath}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ai-context-manager.launch', () => {
            const activeEditor = vscode.window.activeTextEditor;
            const viewColumn = activeEditor ? activeEditor.viewColumn : vscode.ViewColumn.One;
            console.log("launched file: " + activeEditor?.document.uri.path);

            const panel = vscode.window.createWebviewPanel(
                'aiContextManagerPanel',
                'aiContextManager',
                viewColumn ? viewColumn + 1 : vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
                }
            );

            const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'home.css'));
            const cssUri = panel.webview.asWebviewUri(cssPath);
            const scriptPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'main.js'));
            const scriptUri = panel.webview.asWebviewUri(scriptPath);
            const templatePath = path.join(context.extensionPath, 'resources', 'home.ejs');

            (async () => {
                const dataManager = await DataManager.getInstance();
                dataManager.on('dataChanged', async () => {
                    const treeData = await dataManager.asJson();
                    panel.webview.postMessage({ command: 'updateTreeView', treeData: JSON.parse(treeData) });
                });

                const treeData = JSON.parse(await dataManager.asJson());

                ejs.renderFile(templatePath, { cssUri, scriptUri, treeData }, (err, html) => {
                    if (err) {
                        console.error('Error rendering EJS template:', err);
                        panel.webview.html = `<h1>Error loading content</h1>`;
                        return;
                    }
                    panel.webview.html = html;
                });
            })();

            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'index':
                            console.log('DevBucketViewProvider index');
                            console.log('workspace:', vscode.workspace);
                            await handleIndexCommand(panel, context.extensionPath, activeEditor);
                            break;
                        case 'getTreeData':
                            // Get tree data from DataManager and send it to the webview
                            console.log("want treeview!");
                            (async () => {
                                const dataManager = await DataManager.getInstance();
                                const treeData = await dataManager.asJson();
                                panel.webview.postMessage({ command: 'updateTreeView', treeData: JSON.parse(treeData) });
                            })();
                            break;
                        case 'toggleItem':
                            const dataManager = await DataManager.getInstance();
                            await dataManager.setItemEnabled(message.category, message.item, message.enabled);
                            const updatedTreeData = await dataManager.asJson();
                            panel.webview.postMessage({ command: 'updateTreeView', treeData: JSON.parse(updatedTreeData) });
                            break;
                        case 'removeItem':
                            const dataManagerRemove = await DataManager.getInstance();
                            await dataManagerRemove.rmItem(message.category, message.item);
                            const updatedTreeDataRemove = await dataManagerRemove.asJson();
                            panel.webview.postMessage({ command: 'updateTreeView', treeData: JSON.parse(updatedTreeDataRemove) });
                            break;
                        default:
                            console.log('Unknown command:', message.command);
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );
}
