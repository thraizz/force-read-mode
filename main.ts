import { MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface ForceReadModePluginSettings {
    targetFolderPaths: string[];  // Array of folder paths
    targetFilePaths: string[];    // Array of exact file paths
}

const DEFAULT_SETTINGS: ForceReadModePluginSettings = {
    targetFolderPaths: [],	// Array of folder paths is empty by default
    targetFilePaths: []     // Array of exact file paths is empty by default
};


export default class ForceReadModePlugin extends Plugin {
    settings: ForceReadModePluginSettings;
    isEnabled = true;

    // Plugin initialization
    async onload() {
        // Load settings
        await this.loadSettings();

        // Register the settings tab
        this.addSettingTab(new ForceReadModeSettingTab(this.app, this));

        // Register an event for when the layout changes
        this.registerEvent(
            this.app.workspace.on('layout-change', this.onLayoutChange.bind(this))
        );

        // Add command to toggle the plugin
        this.toggleCommand();
    }

    // set command according to boolean isEnabled
    toggleCommand(){
        this.addCommand({
            id: 'toggle-force-read-mode',
            name: this.isEnabled ? 'Disable' : 'Enable',
            callback: () => {
                this.isEnabled = !this.isEnabled;    
                new Notice(`Force Read Mode ${this.isEnabled ? 'Enabled' : 'Disabled'}`);
                this.toggleCommand();
            }
        });
    }

    // Handle layout changes
    private async onLayoutChange() {
        // Get all open leaves in the workspace
        const leaves = this.app.workspace.getLeavesOfType('markdown');

        // Check if plugin is temporarly disabled
        if (!this.isEnabled) {
            return;
        }

        // Iterate over each leaf
        leaves.forEach((leaf) => {
            // Ensure the leaf has a MarkdownView
            if (!(leaf.view instanceof MarkdownView)) {
                return;
            }
        
            // Get the file currently opened in the leaf
            const file = leaf.view.file;
        
            // If no file is present, skip
            if (!file) {
                return;
            }
            
            // Check if the file path exactly matches any of the target file paths
            const isExactMatch = this.settings.targetFilePaths.includes(file.path);
            
            // Check if the file is within any of the target folders or their subfolders
            const isInTargetFolder = this.settings.targetFolderPaths.some(path => file.path.startsWith(path));
            
            // Apply read mode if the file matches either condition
            if (isExactMatch || isInTargetFolder) {
                // Force the view into preview (read mode)
                leaf.setViewState({
                    ...leaf.getViewState(),
                    state: { mode: 'preview' } // Force preview (read mode)
                });
            }
        });        
    }

    // Load settings
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    // Save settings
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class ForceReadModeSettingTab extends PluginSettingTab {
    plugin: ForceReadModePlugin;

    constructor(app: any, plugin: ForceReadModePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Add a setting for folder paths
        new Setting(containerEl)
            .setName('Target folder paths')
            .setDesc('Specify the folder paths where markdown files should always open in read mode.')
            .addTextArea(text => text
                .setPlaceholder('Enter folder paths, one per line')
                .setValue(this.plugin.settings.targetFolderPaths.join('\n'))
                .onChange(async (value) => {
                    // Update the settings with the new folder paths
                    this.plugin.settings.targetFolderPaths = value.split('\n').map(path => path.trim()).filter(path => path.length > 0);
                    await this.plugin.saveSettings();
                }));
                
        // Add a setting for exact file paths
        new Setting(containerEl)
            .setName('Target file paths')
            .setDesc('Specify exact file paths that should always open in read mode.')
            .addTextArea(text => text
                .setPlaceholder('Enter exact file paths, one per line')
                .setValue(this.plugin.settings.targetFilePaths.join('\n'))
                .onChange(async (value) => {
                    // Update the settings with the new exact file paths
                    this.plugin.settings.targetFilePaths = value.split('\n').map(path => path.trim()).filter(path => path.length > 0);
                    await this.plugin.saveSettings();
                }));
    }
}
