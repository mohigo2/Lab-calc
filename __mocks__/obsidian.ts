// Mock Obsidian API for testing

export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(command: any) {}
  registerMarkdownCodeBlockProcessor(type: string, handler: any) {}
  addSettingTab(tab: any) {}
  loadData() { return Promise.resolve({}); }
  saveData(data: any) { return Promise.resolve(); }
}

export class Modal {
  app: any;
  contentEl: HTMLElement;
  
  constructor(app: any) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }

  open() {}
  close() {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display() {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(callback: any) { return this; }
  addDropdown(callback: any) { return this; }
  addToggle(callback: any) { return this; }
  addSlider(callback: any) { return this; }
  addButton(callback: any) { return this; }
}

export class Notice {
  constructor(message: string) {}
}

export class MarkdownPostProcessorContext {
  sourcePath: string = '';
}

export class MarkdownRenderChild {
  constructor(el: HTMLElement) {}
}