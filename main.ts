import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, request } from 'obsidian';

interface ExaSearchResult {
    id: string;
    url: string;
    title: string;
    author: string;
    publishedDate: string;
    text: string;
    image: string;
    favicon: string;
}

interface ExaSearchResponse {
    requestId: string;
    resolvedSearchType: string;
    results: ExaSearchResult[];
}

interface ExaSearchPluginSettings {
    apiKey: string;
    searchResultsFolder: string;
    rootFolder: string;
}

const DEFAULT_SETTINGS: ExaSearchPluginSettings = {
    apiKey: 'fb7db6ae-be74-4399-99db-c8d1d9228cc7',
    searchResultsFolder: 'Exa Search Results',
    rootFolder: 'Exa'
}

export default class ExaSearchPlugin extends Plugin {
    settings: ExaSearchPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'exa-search',
            name: 'Search with Exa',
            callback: () => {
                new ExaSearchModal(this.app, this).open();
            }
        });

        this.addSettingTab(new ExaSearchSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async searchExa(query: string, startDate?: string, endDate?: string, numResults: number = 10): Promise<ExaSearchResponse> {
        try {
            const response = await request({
                url: 'https://api.exa.ai/search',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-api-key': this.settings.apiKey
                },
                body: JSON.stringify({
                    query: query,
                    type: 'keyword',
                    numResults: numResults,
                    contents: {
                        text: true
                    },
                    start_published_date: startDate,
                    end_published_date: endDate
                })
            });

            return JSON.parse(response);
        } catch (error) {
            console.error('Error searching Exa:', error);
            throw new Error('Failed to fetch from Exa API: ' + error.message);
        }
    }

    async saveResultAsMarkdown(result: ExaSearchResult, keyword: string) {
        // Create the root folder if it doesn't exist
        const rootPath = this.settings.rootFolder;
        if (!(await this.app.vault.adapter.exists(rootPath))) {
            await this.app.vault.createFolder(rootPath);
        }

        // Create a subfolder for the keyword
        const keywordFolder = `${rootPath}/${keyword}`;
        if (!(await this.app.vault.adapter.exists(keywordFolder))) {
            await this.app.vault.createFolder(keywordFolder);
        }

        const sanitizedTitle = result.title.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${keywordFolder}/${sanitizedTitle}.md`;
        const content = `---
url: ${result.url}
date: ${result.publishedDate}
author: ${result.author}
image: ${result.image}
---

# ${result.title}

${result.text}`;

        await this.app.vault.create(fileName, content);
    }
}

class ExaSearchModal extends Modal {
    plugin: ExaSearchPlugin;
    query: string;

    constructor(app: App, plugin: ExaSearchPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        contentEl.createEl('h2', {text: 'Enter search keyword'});

        // Search query input
        const inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Enter your search query'
        });
        inputEl.style.width = '100%';
        inputEl.style.marginBottom = '10px';

        // Track IME composition state
        let isComposing = false;
        inputEl.addEventListener('compositionstart', () => {
            isComposing = true;
        });
        inputEl.addEventListener('compositionend', () => {
            isComposing = false;
        });

        // Date range inputs
        const dateContainer = contentEl.createEl('div');
        dateContainer.style.marginBottom = '10px';

        const startDateLabel = dateContainer.createEl('label', {text: 'Start Date: '});
        const startDateInput = dateContainer.createEl('input', {
            type: 'date',
        });
        startDateInput.style.marginRight = '10px';

        const endDateLabel = dateContainer.createEl('label', {text: 'End Date: '});
        const endDateInput = dateContainer.createEl('input', {
            type: 'date',
        });

        // Number of results input
        const resultsContainer = contentEl.createEl('div');
        resultsContainer.style.marginBottom = '10px';
        resultsContainer.style.marginTop = '10px';

        const resultsLabel = resultsContainer.createEl('label', {text: 'Number of Results: '});
        const resultsInput = resultsContainer.createEl('input', {
            type: 'number',
            value: '10'
        });
        resultsInput.style.width = '60px';
        resultsInput.setAttribute('min', '1');
        resultsInput.setAttribute('max', '100');

        const buttonEl = contentEl.createEl('button', {
            text: 'Search'
        });
        buttonEl.style.width = '100%';

        const performSearch = async (query: string) => {
            if (!query.trim()) {
                new Notice('Please enter a search query');
                return;
            }

            const startDate = startDateInput.value ? new Date(startDateInput.value).toISOString() : undefined;
            const endDate = endDateInput.value ? new Date(endDateInput.value).toISOString() : undefined;
            const numResults = parseInt(resultsInput.value) || 10;

            // Close the modal before starting the search
            this.close();
            
            new Notice('Searching...');
            try {
                const results = await this.plugin.searchExa(query, startDate, endDate, numResults);
                if (!results.results || results.results.length === 0) {
                    new Notice('No results found');
                    return;
                }

                for (const result of results.results) {
                    await this.plugin.saveResultAsMarkdown(result, query);
                }
                new Notice(`Successfully saved ${results.results.length} results`);
            } catch (error) {
                console.error('Search error:', error);
                new Notice('Error searching: ' + error.message);
            }
        };

        inputEl.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !isComposing) {
                await performSearch(inputEl.value);
            }
        });

        buttonEl.addEventListener('click', async () => {
            await performSearch(inputEl.value);
        });

        // Focus the input field when the modal opens
        inputEl.focus();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class ExaSearchSettingTab extends PluginSettingTab {
    plugin: ExaSearchPlugin;

    constructor(app: App, plugin: ExaSearchPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Enter your Exa API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Root Folder')
            .setDesc('Root folder for saving search results')
            .addText(text => text
                .setPlaceholder('Enter root folder path')
                .setValue(this.plugin.settings.rootFolder)
                .onChange(async (value) => {
                    this.plugin.settings.rootFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}
