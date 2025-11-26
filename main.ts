import { MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface ForceReadModePluginSettings {
    targetPaths: string[];        // Array of file or folder paths
    restoreSourceMode: boolean;   // Whether to restore source mode for non-filtered files
}

const DEFAULT_SETTINGS: ForceReadModePluginSettings = {
    targetPaths: [],         // Array of file or folder paths is empty by default
    restoreSourceMode: false  // Do not restore source mode by default for compatibility with previous versions
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
            
            // Check if the file matches any of the target paths (exact match or within folder)
            const isTargetPath = this.settings.targetPaths.some(path => 
                file.path === path || file.path.startsWith(path + '/')
            );
            
            // Apply read mode if the file matches
            if (isTargetPath) {
                // Force the view into preview (read mode)
                leaf.setViewState({
                    ...leaf.getViewState(),
                    state: { mode: 'preview' } // Force preview (read mode)
                });
            } else {
                // Restore to source mode (edit mode) if the setting is enabled
                if (this.settings.restoreSourceMode) {
                    leaf.setViewState({
                        ...leaf.getViewState(),
                        state: { mode: 'source' } // Return to edit mode
                    });
                }
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

        // Add a setting for target paths
        new Setting(containerEl)
            .setName('Target paths')
            .setDesc('Specify file or folder paths that should always open in read mode. For folders, all files within will be affected.')
            .addTextArea(text => text
                .setPlaceholder('Enter file or folder paths, one per line')
                .setValue(this.plugin.settings.targetPaths.join('\n'))
                .onChange(async (value) => {
                    // Update the settings with the new paths
                    this.plugin.settings.targetPaths = value.split('\n').map(path => path.trim()).filter(path => path.length > 0);
                    await this.plugin.saveSettings();
                }));
                
        // Add toggle for restoring source mode
        new Setting(containerEl)
            .setName('Restore Source Mode')
            .setDesc('When enabled, opening files not in your target paths will automatically switch to edit mode again.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.restoreSourceMode)
                .onChange(async (value) => {
                    this.plugin.settings.restoreSourceMode = value;
                    await this.plugin.saveSettings();
                }));
    }
}
