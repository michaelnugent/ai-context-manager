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
    console.log('Send button clicked');
    const input = document.getElementById('chatInput');
    const userMessage = input.value;
    if (userMessage.trim() === '') {
        console.log('Empty message, not sending');
        return;
    }

    // Send the message to the extension
    vscode.postMessage({ command: 'sendMessage', text: userMessage });
    input.value = '';
});

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendButton').click();
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

        categoryDiv.appendChild(categoryHeader);

        const categoryContent = document.createElement('div');
        categoryContent.classList.add('tree-item-content');
        categoryContent.id = `content-${category}`;
        categoryContent.style.display = state[`content-${category}`] || 'none';

        Object.keys(treeData[category].items).forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('tree-item');

            const itemCheckbox = document.createElement('input');
            itemCheckbox.type = 'checkbox';
            itemCheckbox.id = `enable-item-${item}`;
            itemCheckbox.checked = treeData[category].items[item].metadata.enabled;
            itemDiv.appendChild(itemCheckbox);

            const itemLabel = document.createElement('label');
            itemLabel.htmlFor = `enable-item-${item}`;
            itemLabel.textContent = item;
            itemDiv.appendChild(itemLabel);

            const itemTokenCount = document.createElement('span');
            itemTokenCount.classList.add('token-count');
            itemTokenCount.id = `item-token-count-${category}-${item}`;
            itemTokenCount.textContent = `(~${treeData[category].items[item].metadata.tokenCount} tokens)`;
            itemDiv.appendChild(itemTokenCount);

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