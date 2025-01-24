# Obsidian Exa Search Integration

This plugin integrates Exa Search functionality directly into Obsidian, allowing you to search and save web content without leaving your notes.

## Features

- Search web content using Exa Search API
- Save search results directly as Markdown notes
- Customize search results folder location
- Configure API key and other settings

## Usage

1. Install the plugin in Obsidian
2. Configure your Exa Search API key in the plugin settings
3. Use the "Search with Exa" command to perform searches
4. Search results will be saved in your specified folder as Markdown notes

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Exa Search Integration"
4. Install and enable the plugin

## Configuration

The plugin requires the following settings:

- Exa API key: Your Exa Search API key
- Search Results Folder: Where to save search results (default: "Exa Search Results")
- Root Folder: Base folder for organizing search results (default: "Exa")

## Development

This plugin is built using TypeScript and the Obsidian Plugin API. To build from source:

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` for development
4. Run `npm run build` for production build

## License

MIT
