import * as vscode from 'vscode';

// Function to get the configuration settings
export function getConfiguration() {
    const config = vscode.workspace.getConfiguration('ai-context-manager');
    const openaiOn = config.get<boolean>('openai.on', false);
    const openaiUrl = config.get<string>('openai.url', 'https://api.openai.com/v1');
    const openaiApiKey = config.get<string>('openai.apiKey', '');
    const openaiModel = config.get<string>('openai.model', '');
    const openaiTemperature = config.get<number>('openai.temperature', 0.2);
    const ollamaOn = config.get<boolean>('ollama.on', false);
    const ollamaUrl = config.get<string>('ollama.url', 'http://localhost:11434/api/generate');
    const ollamaModel = config.get<string>('ollama.model', '');
    const ollamaTemperature = config.get<number>('ollama.temperature', 0.2);

    return {
        openaiOn,
        openaiUrl,
        openaiApiKey,
        openaiModel,
        openaiTemperature,
        ollamaOn,
        ollamaUrl,
        ollamaModel,
        ollamaTemperature
    };
}

// Function to open the settings editor
export function openSettingsEditor() {
    vscode.commands.executeCommand('workbench.action.openSettings', 'ai-context-manager');
}
