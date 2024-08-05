export async function sendOllamaRequest(userMessage) {
    try {
        const response = await fetch('http://arown.illuminatus.org:3101/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3:8b', // Replace with your model
                prompt: userMessage,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response; // Adjust based on the actual response structure
    } catch (error) {
        console.error('Failed to fetch from Ollama API:', error);
        return 'Failed to fetch response from Ollama API.';
    }
}
