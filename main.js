var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ChromeBookmarksPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var DEFAULT_SETTINGS = {
  bookmarksFilePath: getDefaultBookmarksPath(),
  outputFolder: "Bookmarks"
};
function getDefaultBookmarksPath() {
  const platform2 = os.platform();
  const home = os.homedir();
  if (platform2 === "win32") {
    return path.join(
      home,
      "AppData",
      "Local",
      "Google",
      "Chrome",
      "User Data",
      "Default",
      "Bookmarks"
    );
  } else if (platform2 === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
      "Default",
      "Bookmarks"
    );
  } else {
    return path.join(home, ".config", "google-chrome", "Default", "Bookmarks");
  }
}
function parseBookmarks(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function collectFolders(node, parentPath = "") {
  var _a;
  const results = [];
  const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
  if (node.type === "folder") {
    results.push({ label: currentPath, node });
    for (const child of (_a = node.children) != null ? _a : []) {
      results.push(...collectFolders(child, currentPath));
    }
  }
  return results;
}
function folderToMarkdown(folder, depth = 1) {
  var _a, _b;
  const lines = [];
  const heading = "#".repeat(depth);
  lines.push(`${heading} ${folder.name}`, "");
  for (const child of (_a = folder.children) != null ? _a : []) {
    if (child.type === "url") {
      lines.push(`- [${child.name}](${child.url})`);
    }
  }
  for (const child of (_b = folder.children) != null ? _b : []) {
    if (child.type === "folder") {
      lines.push("", ...folderToMarkdown(child, depth + 1).split("\n"));
    }
  }
  return lines.join("\n");
}
function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}
var ChromeBookmarksPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("bookmark", "Chrome Bookmarks", () => {
      this.openFolderPicker();
    });
    this.addCommand({
      id: "open-bookmark-picker",
      name: "Pick Chrome bookmark folders to import",
      callback: () => this.openFolderPicker()
    });
    this.addSettingTab(new BookmarkSettingTab(this.app, this));
  }
  openFolderPicker() {
    const data = parseBookmarks(this.settings.bookmarksFilePath);
    if (!data) {
      new import_obsidian.Notice(
        "\u274C Could not read Chrome bookmarks file. Check the path in settings."
      );
      return;
    }
    const allFolders = [];
    for (const root of [
      data.roots.bookmark_bar,
      data.roots.other,
      data.roots.synced
    ]) {
      if (root)
        allFolders.push(...collectFolders(root));
    }
    new FolderPickerModal(this.app, allFolders, async (selected) => {
      await this.importFolders(selected);
    }).open();
  }
  async importFolders(folders) {
    const outputFolder = this.settings.outputFolder;
    if (!await this.app.vault.adapter.exists(outputFolder)) {
      await this.app.vault.createFolder(outputFolder);
    }
    let created = 0;
    for (const folder of folders) {
      const filename = sanitizeFilename(folder.name) + ".md";
      const filePath = `${outputFolder}/${filename}`;
      const content = folderToMarkdown(folder);
      if (await this.app.vault.adapter.exists(filePath)) {
        await this.app.vault.adapter.write(filePath, content);
      } else {
        await this.app.vault.create(filePath, content);
      }
      created++;
    }
    new import_obsidian.Notice(`\u2705 Imported ${created} bookmark folder(s) to "${outputFolder}"`);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var FolderPickerModal = class extends import_obsidian.Modal {
  constructor(app, allFolders, onConfirm) {
    super(app);
    this.selected = /* @__PURE__ */ new Set();
    this.searchQuery = "";
    this.allFolders = allFolders;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("bookmark-picker-modal");
    contentEl.createEl("h2", { text: "\u{1F516} Import Chrome Bookmark Folders" });
    const searchWrap = contentEl.createDiv({ cls: "bookmark-search-wrap" });
    const searchInput = searchWrap.createEl("input", {
      type: "text",
      placeholder: "Search folders...",
      cls: "bookmark-search-input"
    });
    searchInput.addEventListener("input", () => {
      this.searchQuery = searchInput.value.toLowerCase();
      this.renderList();
    });
    const btnRow = contentEl.createDiv({ cls: "bookmark-btn-row" });
    const selectAllBtn = btnRow.createEl("button", { text: "Select All" });
    const deselectAllBtn = btnRow.createEl("button", { text: "Deselect All" });
    selectAllBtn.addEventListener("click", () => {
      this.getFilteredFolders().forEach((f) => this.selected.add(f.node));
      this.renderList();
    });
    deselectAllBtn.addEventListener("click", () => {
      this.selected.clear();
      this.renderList();
    });
    this.listContainer = contentEl.createDiv({ cls: "bookmark-list" });
    this.renderList();
    const footer = contentEl.createDiv({ cls: "bookmark-footer" });
    const selectedCount = footer.createEl("span", {
      cls: "bookmark-selected-count"
    });
    const importBtn = footer.createEl("button", {
      text: "Import Selected",
      cls: "mod-cta"
    });
    importBtn.addEventListener("click", () => {
      if (this.selected.size === 0) {
        new import_obsidian.Notice("Please select at least one folder.");
        return;
      }
      this.close();
      this.onConfirm(Array.from(this.selected));
    });
    const updateCount = () => {
      selectedCount.textContent = `${this.selected.size} folder(s) selected`;
    };
    updateCount();
    const origRender = this.renderList.bind(this);
    this.renderList = () => {
      origRender();
      updateCount();
    };
  }
  getFilteredFolders() {
    if (!this.searchQuery)
      return this.allFolders;
    return this.allFolders.filter(
      (f) => f.label.toLowerCase().includes(this.searchQuery)
    );
  }
  renderList() {
    var _a, _b;
    this.listContainer.empty();
    const filtered = this.getFilteredFolders();
    if (filtered.length === 0) {
      this.listContainer.createEl("p", {
        text: "No folders found.",
        cls: "bookmark-empty"
      });
      return;
    }
    for (const { label, node } of filtered) {
      const item = this.listContainer.createDiv({ cls: "bookmark-item" });
      const checkbox = item.createEl("input", { type: "checkbox" });
      checkbox.checked = this.selected.has(node);
      const urlCount = ((_a = node.children) != null ? _a : []).filter(
        (c) => c.type === "url"
      ).length;
      const subFolderCount = ((_b = node.children) != null ? _b : []).filter(
        (c) => c.type === "folder"
      ).length;
      const labelEl = item.createDiv({ cls: "bookmark-item-label" });
      labelEl.createEl("span", { text: label, cls: "bookmark-item-name" });
      labelEl.createEl("span", {
        text: `${urlCount} link${urlCount !== 1 ? "s" : ""}${subFolderCount > 0 ? `, ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}` : ""}`,
        cls: "bookmark-item-meta"
      });
      const toggle = () => {
        if (this.selected.has(node)) {
          this.selected.delete(node);
        } else {
          this.selected.add(node);
        }
        checkbox.checked = this.selected.has(node);
        item.toggleClass("bookmark-item--selected", this.selected.has(node));
        const countEl = this.contentEl.querySelector(
          ".bookmark-selected-count"
        );
        if (countEl)
          countEl.textContent = `${this.selected.size} folder(s) selected`;
      };
      checkbox.addEventListener("change", toggle);
      item.addEventListener("click", (e) => {
        if (e.target !== checkbox)
          toggle();
      });
      item.toggleClass("bookmark-item--selected", this.selected.has(node));
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BookmarkSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Chrome Bookmarks Settings" });
    new import_obsidian.Setting(containerEl).setName("Chrome Bookmarks file path").setDesc(
      "Full path to your Chrome Bookmarks file. Leave default to auto-detect."
    ).addText(
      (text) => text.setPlaceholder(getDefaultBookmarksPath()).setValue(this.plugin.settings.bookmarksFilePath).onChange(async (value) => {
        this.plugin.settings.bookmarksFilePath = value || getDefaultBookmarksPath();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Output folder").setDesc("Vault folder where bookmark .md files will be saved.").addText(
      (text) => text.setPlaceholder("Bookmarks").setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
        this.plugin.settings.outputFolder = value || "Bookmarks";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Test file path").setDesc("Check if the bookmarks file can be found at the given path.").addButton(
      (btn) => btn.setButtonText("Test").onClick(() => {
        const exists = fs.existsSync(
          this.plugin.settings.bookmarksFilePath
        );
        new import_obsidian.Notice(
          exists ? "\u2705 Bookmarks file found!" : "\u274C File not found. Check the path."
        );
      })
    );
  }
};
