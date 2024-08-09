import * as vscode from 'vscode';
import * as path from 'path';
import ejs from 'ejs';

import { getConfiguration } from './preferences';
import { readFileContents } from './utils';
import { findHashedUrls, processUrls } from './web';
import { OpenAI } from 'openai';


// AI calls
export async function sendOpenAIRequest(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, treeDataForPrompt: any, message: any): Promise<void> {
    try {
        const config = getConfiguration();
        let conversationContext = context.globalState.get<any[]>('openaiConversationContext') || [];

        const prompt = await renderPromptTemplate(context, treeDataForPrompt, message.text);
        console.log(`Prompt: ${prompt}`);

        const client = new OpenAI({
            apiKey: config.openaiApiKey,
            baseURL: config.openaiUrl,
        });

        // The prompt contains the entire huge multi-file context.  Don't add that to every message
        // and explode token count.  Instead add only the message and append the prompt to the
        // current message.  Since the AI results are also included, it may have memories of
        // previous files if they've been removed from the context.
        conversationContext = conversationContext.filter(message => message.role && message.content);
        let apicontext: any[] = conversationContext.concat([{ role: 'user', content: prompt }]);
        conversationContext.push({ role: 'user', content: message.text });

        // model: "gpt-4o-mini-2024-07-18",
        const response = await client.chat.completions.create({
            model: config.openaiModel,
            messages: apicontext,
            temperature: 0.2,
            stream: true,
        });

        let result = '';
        for await (const chunk of response) {
            if (chunk.choices && chunk.choices.length > 0) {
                const aiMessage = chunk.choices[0].delta;
                if (aiMessage.content) {
                    result += aiMessage.content;
                    panel.webview.postMessage({ command: 'outputText', text: result, aiMessageId: message.aiMessageId });
                }
            }
        }

        conversationContext.push({ role: 'assistant', content: result });
        context.globalState.update('openaiConversationContext', conversationContext);
    } catch (error) {
        console.error('Failed to fetch from OpenAI API:', error);
    }
}

export async function sendOllamaRequest(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, treeDataForPrompt: any, message: any): Promise<void> {
    try {
        const config = getConfiguration();

        const prompt = await renderPromptTemplate(context, treeDataForPrompt, message.text);

        // http://arown.illuminatus.org:3101/api/generate
        const requestBody: any = {
            model: config.ollamaModel,
            prompt: prompt,
            stream: true,
        };
        const conversationContext = context.globalState.get<string>('ollamaConversationContext');
        if (conversationContext) {
            requestBody.context = conversationContext;
        }

        const response = await fetch(config.ollamaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                try {
                    const json = JSON.parse(chunk);
                    if (json.response) {
                        result += json.response;
                        panel.webview.postMessage({ command: 'outputText', text: result, aiMessageId: message.aiMessageId });
                    }
                } catch (e) {
                    console.error('Failed to parse chunk:', e);
                }
            }
        } else {
            throw new Error('Response body is null');
        }
    } catch (error) {
        console.error('Failed to fetch from Ollama API:', error);
    }
}

export async function gatherDataForPrompt(treeData: any): Promise<any> {
    console.log(`treeData (gatherDataForPrompt): ${treeData}`);
    console.log(`Type of treeData (gatherDataForPrompt): ${typeof treeData}`);

    if (Array.isArray(treeData)) {
        console.error("treeData is an array, expected an object.");
        return {};
    }

    const readFiles = new Set<string>();

    for (const category of Object.keys(treeData)) {
        if (treeData[category].items) {
            for (const item of Object.keys(treeData[category].items)) {
                console.log(`Item: ${item}`);
                // Check if the file has already been read
                if (treeData[category].items[item].metadata.enabled && !readFiles.has(item)) {
                    // Read the file and add it to the set
                    treeData[category].items[item].content = await readFileContents(item);
                    readFiles.add(item); // Mark this file as read
                }
            }
        }
    }
    return treeData;
}

export async function renderPromptTemplate(context: vscode.ExtensionContext, treeData: any, userInput: string): Promise<string> {
    console.log('Rendering prompt template');
    console.log(`Type of treeData (renderPromptTemplate): ${typeof treeData}`);

    interface WebData {
        url: string;
        text: string;
    }


    // Check for hashed URLs in the user input
    const hashedUrls = findHashedUrls(userInput);
    let webdata: WebData[] = [];
    if (hashedUrls.length > 0) {
        console.log(`Found URLs: ${hashedUrls.join(', ')}`);
        // webdata structure should be [{url: 'https://example.com', text: '...'}, ...]
        webdata = await processUrls(hashedUrls);
    }

    const templatePath = path.join(context.extensionPath, 'resources', 'prompt.ejs');
    const templateData = { treeData, userInput, webdata };

    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, templateData, (err, str) => {
            if (err) {
                reject(err);
            } else {
                resolve(str);
            }
        });
    });
}

// end AI calls