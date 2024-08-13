# ai-context-manager README

The "AI Context Manager" is a Visual Studio Code extension designed to give the developer control over the context in the AI. This extension assumes the developer knows what they want and tries to let them do it easily.

## Features

* Add and remove files from context
* Discover files related to where it was opened from
* Supports OpenAI-style APIs
* Supports Ollama API
* Supports fetching from web
* Support markdown and code highlighting
* Keen OG styling like geocities, but less blinky
* Tastes great

## Requirements

The discovery feature relies on intellisense.  If your language doesn't have
this and want to discover related files, you may be sad.

## Settings
![context-manager-sc-nums](https://github.com/user-attachments/assets/b52cfe95-9832-4361-a9eb-e08fff88a0b7)

1. The is the ollama model line, it defaults to llama3:8b
2. Choice to run ollama 
3. ollama temperature, default 0.2 
4. ollama url. This include the entire path for the generation endpoint. It defaults to http://localhost:11434/api/generate 
5. This is the auth key for the openai style api. It defaults empty, you will probably need this if you're using this api. 
6. The is the model. It defaults to gpt-4o-mini, the cheap one. 
7. Choice to run openai style api 
8. openai api temperature, default 0.2 
9. openai api url. It defaults to the official OpenAI one. 
10. Choice of web scraper. jina.ai delivers pretty clean data, sometimes even labeled, but only has access to the open internet. The internal one is occasionally smarter in the way it organizes data and can see anything your local system cam see including internal resources.

**You must choose one of (2) and (7) to run this. If you choose both, it will run the ollama endpoint because it checks for it first.**

## How to

Right clicking on an open file will allow you to bring up the context manager in the next panel to the right (-->).

Right clinking on an open file, file in the explorer or group of files in the explorer will allow you to add it to the context.

The context allows temp disabling of files and token counts so you have a rough idea what you're stuffing in.  This is not the entire thing.  While the prompt is small, previous conversation context can get large over time.

In the chat area enclosing a url as #https://raw.githubusercontent.com/michaelnugent/ai-context-manager/main/README.md# will attempt to fetch the content at that url and feed it into the context. The prompt instructs the AI to tell you if there was an error, but 🤷.

Settings allow you to set up openai or ollama credentials and endpoints.  The default endpoint for openai is the official openai one. Ollama defaults to localhost.  You can also choose if you want to use jina.ai or the internal algorithm for pulling in web content.  Jina is cleaner,  non-private and can only see the internet. Sometimes the internal one is smarter and can see local networks.
