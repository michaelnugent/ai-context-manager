const vscode = acquireVsCodeApi();
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
    vscode.postMessage({ command: 'sendMessage', text: input.value });
    input.value = '';
});

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('chatInput');
        vscode.postMessage({ command: 'sendMessage', text: input.value });
        input.value = '';
    }
});

// Handle messages sent from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'outputText':
            const outputArea = document.getElementById('outputArea');
            outputArea.textContent += message.text + '\n';
            outputArea.scrollTop = outputArea.scrollHeight; // Scroll to the bottom
            break;
        case 'updateTreeView':
            updateTreeView(message.treeData);
            break;
    }
});

function updateTreeView(treeData) {
    const treeView = document.getElementById('treeView');
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
        toggleBtn.textContent = '▶';
        categoryHeader.appendChild(toggleBtn);

        const categoryLabel = document.createElement('label');
        categoryLabel.htmlFor = `enable-${category}`;
        categoryLabel.textContent = category;
        categoryHeader.appendChild(categoryLabel);

        const tokenCount = document.createElement('span');
        tokenCount.classList.add('token-count');
        tokenCount.textContent = `(~${treeData[category].metadata.tokenCount} tokens)`;
        categoryHeader.appendChild(tokenCount);

        const removeBtn = document.createElement('span');
        removeBtn.classList.add('remove-btn');
        removeBtn.dataset.id = category;
        removeBtn.textContent = '❌';
        categoryHeader.appendChild(removeBtn);

        categoryDiv.appendChild(categoryHeader);

        const categoryContent = document.createElement('div');
        categoryContent.classList.add('tree-item-content');
        categoryContent.id = `content-${category}`;
        categoryContent.style.display = 'none';

        Object.keys(treeData[category].items).forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.textContent = item;
            categoryContent.appendChild(itemDiv);
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

        removeBtn.addEventListener('click', (e) => {
            vscode.postMessage({ command: 'removeCategory', category: category });
        });
    });
}

function adjustOutputArea() {
    const treeView = document.getElementById('treeView');
    const outputArea = document.getElementById('outputArea');
    if (treeView.style.display === 'none') {
        outputArea.style.height = 'calc(100% - 50px)'; // Adjust height accordingly
    } else {
        outputArea.style.height = 'calc(100% - 250px)'; // Adjust height accordingly
    }
}

window.addEventListener('resize', adjustOutputArea);
adjustOutputArea(); // Initial call

// Request initial tree data from the extension
vscode.postMessage({ command: 'getTreeData' });
