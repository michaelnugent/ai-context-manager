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

## How to

Right clicking on an open file will allow you to bring up the context manager in the next panel to the right ( --> ).

Right clinking on an open file, file in the explorer or group of files in the explorer will allow you to add it to the context.

The context allows temp disabling of files and token counts so you have a rough idea what you're stuffing in.  This is not the entire thing.  While the prompt is small, previous conversation context can get large over time.

In the chat area enclosing a url as #https://raw.githubusercontent.com/michaelnugent/ai-context-manager/main/README.md# will attempt to fetch the content at that url and feed it into the context. The prompt instructs the AI to tell you if there was an error, but 🤷.

Settings allow you to set up openai or ollama credentials and endpoints.  The default endpoint for openai is the official openai one. Ollama default to localhost.  You can also choose if you want to use jina.ai or the internal algorithm for pulling in web content.  Jina is cleaner,  non-private and can only see the internet. Sometimes the internal one can is sometimes smarter and can see local networks.
