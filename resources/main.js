/* Copyright 2024 Michael Nugent */

const vscode = acquireVsCodeApi();

if (typeof marked === 'undefined') {
    console.error('Marked is not defined. Please check the script loading order.');
}

document.getElementById('indexButton').addEventListener('click', () => {
    vscode.postMessage({ command: 'index' });
});

document.getElementById('toggleTreeViewButton').addEventListener('click', () => {
    const treeView = document.getElementById('treeView');
    if (treeView.style.display === 'none') {
        treeView.style.display = 'block';
    } else {
        treeView.style.display = 'none';
    }
    adjustOutputArea();
});

document.getElementById('sendButton').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const userMessage = input.value;
    if (userMessage.trim() === '') {
        return;
    }

    // Create a new message section for the user input
    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('message', 'user-message');
    userMessageDiv.textContent = userMessage;
    const outputArea = document.getElementById('outputArea');
    outputArea.appendChild(userMessageDiv);

    // Create a new div for the AI response with a unique ID
    const aiMessageId = `aiMessage-${Date.now()}`;
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('message', 'ai-message');
    aiMessageDiv.id = aiMessageId;
    outputArea.appendChild(aiMessageDiv);

    // Send the message to the extension
    vscode.postMessage({ command: 'sendMessage', text: userMessage, aiMessageId: aiMessageId });
    input.value = '';

    // Store the output data after sending the message
    storeOutputData(outputArea.innerHTML);
});

document.getElementById('chatInput').addEventListener('input', (e) => {
    // Reset height to allow for shrinkage
    chatInput.style.height = 'auto';

    // Calculate the new height
    const newHeight = Math.min(chatInput.scrollHeight, 120); // Limit to max height
    chatInput.style.height = `${newHeight}px`;

    // Store the current input value in the VS Code state
    vscode.setState({ chatInputValue: e.target.value });

    // Adjust output area based on the height of the input
    adjustOutputArea();
});

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            // If Shift + Enter is pressed, insert a newline
            e.preventDefault(); // Prevent form submission
            chatInput.value += '\n'; // Add a newline
            chatInput.dispatchEvent(new Event('input')); // Trigger input event to resize
        } else {
            // If only Enter is pressed, send the message
            document.getElementById('sendButton').click();
            e.preventDefault(); // Prevent form submission
        }
    }
});

document.getElementById('clear-conversation-btn').addEventListener('click', () => {
    // Send a message to the extension to clear the conversation
    vscode.postMessage({ command: 'clearConversation' });

    // Clear the output area
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = ''; // Clear the output content

    // Clear the output data in the VS Code state
    storeOutputData(''); // Store empty data to clear the state
});

// Handle messages sent from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'outputText':
            const aiMessageDiv = document.getElementById(message.aiMessageId);
            if (aiMessageDiv) {
                // Parse the Markdown content and set it as HTML, then sanitize it
                const rawHtml = marked.parse(message.text);
                const cleanHtml = DOMPurify.sanitize(rawHtml);
                const markdownId = `${message.aiMessageId}-markdown`;
                aiMessageDiv.innerHTML = `
                    <div id="${markdownId}" class="markdown-body">${cleanHtml}</div>
                    <button class="copy-button" data-target="${markdownId}">Copy</button>
                `;
                const outputArea = document.getElementById('outputArea');
                outputArea.scrollTop = outputArea.scrollHeight; // Scroll to the bottom
                storeOutputData(outputArea.innerHTML); // Store the output data

                // Add event listener for the copy button
                aiMessageDiv.querySelector('.copy-button').addEventListener('click', function () {
                    const targetId = this.getAttribute('data-target');
                    const targetDiv = document.getElementById(targetId);
                    if (targetDiv) {
                        navigator.clipboard.writeText(targetDiv.innerText).then(() => {
                            alert('Copied to clipboard');
                            console.log('Text copied to clipboard:', targetDiv.innerText);
                        }).catch(err => {
                            console.error('Failed to copy text: ', err);
                        });
                    } else {
                        console.error('Target div not found for id:', targetId);
                    }
                });
                hljs.highlightAll();
            }
            break;
        case 'updateTreeView':
            updateTreeView(message.treeData);
            break;
    }
});

function updateTreeView(treeData) {
    const treeView = document.getElementById('treeView');

    // Preserve the current state of the tree
    const state = {};
    document.querySelectorAll('.tree-item-content').forEach(content => {
        state[content.id] = content.style.display;
    });

    treeView.innerHTML = ''; // Clear current tree view

    Object.keys(treeData).forEach((category) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('tree-item');

        const categoryHeader = document.createElement('div');
        categoryHeader.classList.add('tree-item-header');

        const categoryCheckbox = document.createElement('input');
        categoryCheckbox.type = 'checkbox';
        categoryCheckbox.id = `enable-${category}`;
        categoryCheckbox.checked = treeData[category].metadata.enabled;
        categoryHeader.appendChild(categoryCheckbox);

        const toggleBtn = document.createElement('span');
        toggleBtn.classList.add('toggle-btn');
        toggleBtn.dataset.id = category;
        toggleBtn.textContent = state[`content-${category}`] === 'block' ? '▼' : '▶';
        categoryHeader.appendChild(toggleBtn);

        const categoryLabel = document.createElement('label');
        categoryLabel.htmlFor = `enable-${category}`;
        categoryLabel.textContent = category;
        categoryHeader.appendChild(categoryLabel);

        const tokenCount = document.createElement('span');
        tokenCount.classList.add('token-count');
        tokenCount.id = `category-token-count-${category}`;
        tokenCount.textContent = `(~${calculateCategoryTokenCount(treeData[category])} tokens)`;
        categoryHeader.appendChild(tokenCount);

        const removeAllBtn = document.createElement('button');
        removeAllBtn.textContent = '💣';
        removeAllBtn.style.marginLeft = '10px';
        removeAllBtn.style.backgroundColor = 'transparent';
        removeAllBtn.style.border = 'none';
        removeAllBtn.classList.add('remove-all-btn');
        removeAllBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'removeAllItems', category: category });
        });
        categoryHeader.appendChild(removeAllBtn);

        categoryDiv.appendChild(categoryHeader);

        const categoryContent = document.createElement('div');
        categoryContent.classList.add('tree-item-content');
        categoryContent.id = `content-${category}`;
        categoryContent.style.display = state[`content-${category}`] || 'none';

        Object.keys(treeData[category].items).forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('tree-item');

            // enable checkbox
            const itemCheckbox = document.createElement('input');
            itemCheckbox.type = 'checkbox';
            itemCheckbox.id = `enable-item-${item}`;
            itemCheckbox.checked = treeData[category].items[item].metadata.enabled;
            itemDiv.appendChild(itemCheckbox);

            // token count
            const itemTokenCount = document.createElement('span');
            itemTokenCount.classList.add('token-count');
            itemTokenCount.id = `item-token-count-${category}-${item}`;
            itemTokenCount.textContent = `(~${treeData[category].items[item].metadata.tokenCount} tokens)`;
            itemDiv.appendChild(itemTokenCount);

            // label
            const itemLabel = document.createElement('label');
            itemLabel.htmlFor = `enable-item-${item}`;
            itemLabel.textContent = item;
            itemDiv.appendChild(itemLabel);

            // remove button
            const itemRemoveBtn = document.createElement('span');
            itemRemoveBtn.classList.add('remove-btn');
            itemRemoveBtn.dataset.id = item;
            itemRemoveBtn.textContent = '❌';
            itemDiv.appendChild(itemRemoveBtn);

            categoryContent.appendChild(itemDiv);

            // Add event listeners
            itemCheckbox.addEventListener('change', (e) => {
                vscode.postMessage({ command: 'toggleItem', category: category, item: item, enabled: e.target.checked });
            });

            itemRemoveBtn.addEventListener('click', (e) => {
                vscode.postMessage({ command: 'removeItem', category: category, item: item });
            });
        });

        categoryDiv.appendChild(categoryContent);
        treeView.appendChild(categoryDiv);

        // Add event listeners
        toggleBtn.addEventListener('click', (e) => {
            const content = document.getElementById(`content-${category}`);
            if (content.style.display === 'none') {
                content.style.display = 'block';
                e.target.textContent = '▼';
            } else {
                content.style.display = 'none';
                e.target.textContent = '▶';
            }
        });

        categoryCheckbox.addEventListener('change', (e) => {
            vscode.postMessage({ command: 'toggleCategory', category: category, enabled: e.target.checked });
        });
    });
}

function calculateCategoryTokenCount(category) {
    return Object.values(category.items).reduce((sum, item) => sum + (item.metadata.enabled ? item.metadata.tokenCount : 0), 0);
}

function adjustOutputArea() {
    const treeView = document.getElementById('treeView');
    const outputArea = document.getElementById('outputArea');

    // Use flexbox to control the layout
    if (treeView.style.display === 'none') {
        outputArea.style.flex = '1'; // Take full height when tree view is hidden
    } else {
        outputArea.style.flex = '3'; // Adjust the flex value when tree view is visible
    }
}

function storeOutputData(data) {
    vscode.setState({ outputData: data });
}

// Retrieve output data from VS Code state
function retrieveOutputData() {
    const state = vscode.getState();
    return state ? state.outputData || '' : '';
}

// Restore output data on load
window.addEventListener('load', () => {
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = retrieveOutputData();
    outputArea.scrollTop = outputArea.scrollHeight; // Scroll to the bottom

    // Retrieve and set the chat input value
    const state = vscode.getState();
    const chatInput = document.getElementById('chatInput');
    chatInput.value = state ? state.chatInputValue || '' : '';  // Restore input value
});

window.addEventListener('resize', adjustOutputArea);
adjustOutputArea(); // Initial call

// Request initial tree data from the extension
vscode.postMessage({ command: 'getTreeData' });
