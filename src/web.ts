/* Copyright 2024 Michael Nugent */

import * as https from 'https';
import * as cheerio from 'cheerio';
import { getConfiguration } from './preferences';

// Function to download a web page and return the page data
export async function downloadWebPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';

            // Check for HTTP response status
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            // Collect data chunks
            response.on('data', (chunk) => {
                data += chunk;
            });

            // Resolve the promise when the response ends
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Function to retrieve data from Jina for a given URL
async function fetchFromJina(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`; // Encode the URL for safe transmission
        https.get(jinaUrl, (response) => {
            let data = '';

            // Check for HTTP response status
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${jinaUrl}' (${response.statusCode})`));
                return;
            }

            // Collect data chunks
            response.on('data', (chunk) => {
                data += chunk;
            });

            // Resolve the promise when the response ends
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export function findHashedUrls(input: string): string[] {
    const regex = /#(https?:\/\/[^\s]+)#/g; // Regex to match URLs between #
    const matches = [];
    let match;

    while ((match = regex.exec(input)) !== null) {
        matches.push(match[1]); // Push the URL without the #
    }

    return matches; // Return the array of URLs
}

// Function to strip HTML tags and return human-readable text with annotations
export async function stripHtmlTags(html: string, url: string): Promise<string> {
    const $ = cheerio.load(html); // Load the HTML into Cheerio

    // Extract the title from the HTML
    const title = $('title').text().trim() || 'No Title'; // Default to 'No Title' if not found
    let text = `Title: ${title}\nURL: ${url}\n\n`; // Add title and URL as context

    // Process headings
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
        text += `Heading: ${$(element).text().trim()}\n\n`; // Annotate headings
    });

    // Process paragraphs
    $('p').each((_, element) => {
        text += `Paragraph: ${$(element).text().trim()}\n\n`; // Annotate paragraphs
    });

    // Process lists
    $('ul, ol').each((_, element) => {
        text += `List:\n`; // Annotate lists
        $(element).find('li').each((_, li) => {
            const listItem = $(li).text().trim();
            text += `- ${listItem}\n`; // Format list items as bullet points
        });
        text += '\n'; // Add a newline after each list
    });

    // Process blockquotes
    $('blockquote').each((_, element) => {
        text += `Blockquote: > ${$(element).text().trim()}\n\n`; // Annotate blockquotes
    });

    // Process links
    $('a').each((_, element) => {
        const linkText = $(element).text().trim();
        const href = $(element).attr('href');
        if (href) {
            text += `Link: ${linkText} (${href})\n`; // Annotate links
        }
    });

    return text.trim(); // Trim any trailing whitespace
}

// Function to process a list of URLs in parallel
export async function processUrlsInternal(urls: string[]): Promise<{ url: string; text: string }[]> {
    const results = await Promise.all(urls.map(async (url) => {
        try {
            const htmlContent = await downloadWebPage(url);
            const readableText = await stripHtmlTags(htmlContent, url);
            return { url, text: readableText }; // Return the structured object
        } catch (error) {
            // Ensure error is of type Error
            const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
            console.error(`Error processing ${url}:`, error);
            return { url, text: `Error: ${errorMessage}` }; // Handle errors gracefully
        }
    }));

    return results; // Return the array of results
}

// Function to process a list of URLs using Jina in parallel
export async function processUrlsJina(urls: string[]): Promise<{ url: string; text: string }[]> {
    const results = await Promise.all(urls.map(async (url) => {
        try {
            const jinaResponse = await fetchFromJina(url);
            return { url, text: jinaResponse }; // Return the structured object with Jina response
        } catch (error) {
            // Ensure error is of type Error
            const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
            console.error(`Error processing ${url} with Jina:`, error);
            return { url, text: `Error: ${errorMessage}` }; // Handle errors gracefully
        }
    }));

    return results; // Return the array of results
}

// Function to process a list of URLs based on the web scraping client configuration
export async function processUrls(urls: string[]): Promise<{ url: string; text: string }[]> {
    const config = getConfiguration(); // Get the configuration settings
    const webScrapeClient = config.webScrapeClient; // Retrieve the web scraping client setting

    if (webScrapeClient === 'internal') {
        return await processUrlsInternal(urls); // Call the internal web scraping function
    } else if (webScrapeClient === 'jina') {
        return await processUrlsJina(urls); // Call the Jina web scraping function
    } else {
        throw new Error(`Unknown web scraping client: ${webScrapeClient}`); // Handle unexpected values
    }
}