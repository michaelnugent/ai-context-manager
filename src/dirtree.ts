/* Copyright 2024 Michael Nugent */

import fs from 'fs';
import path from 'path';

function parseGitignore(gitignorePath: string): RegExp[] {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    return gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(pattern => {
            // Convert pattern to RegExp
            return new RegExp(
                '^' + pattern.replace(/[*]/g, '.*').replace(/\./g, '\\.')
            );
        });
}

function isIgnored(filePath: string, ignorePatterns: RegExp[]): boolean {
    return ignorePatterns.some(pattern => pattern.test(filePath));
}

interface DirectoryTree {
    [key: string]: DirectoryTree | null;
}

function createDirectoryTree(
    dirPath: string,
    ignorePatterns: RegExp[],
    basePath: string = dirPath
): DirectoryTree {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const tree: DirectoryTree = {};

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(basePath, fullPath);

        if (isIgnored(relativePath, ignorePatterns)) {
            continue;
        }

        if (item.isDirectory()) {
            tree[item.name] = createDirectoryTree(fullPath, ignorePatterns, basePath);
        } else {
            tree[item.name] = null;
        }
    }

    return tree;
}

function buildDirectoryTree(rootDir: string): DirectoryTree {
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        throw new Error('.gitignore file not found');
    }

    const ignorePatterns = parseGitignore(gitignorePath);
    return createDirectoryTree(rootDir, ignorePatterns);
}

// Usage example
// const directoryTree = buildDirectoryTree('/path/to/your/directory');
// console.log(JSON.stringify(directoryTree, null, 2));
