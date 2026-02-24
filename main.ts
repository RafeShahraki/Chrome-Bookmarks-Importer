import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
} from "obsidian";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkNode {
  type: "url" | "folder";
  name: string;
  url?: string;
  children?: BookmarkNode[];
}

interface BookmarkRoot {
  roots: {
    bookmark_bar: BookmarkNode;
    other: BookmarkNode;
    synced: BookmarkNode;
  };
}

interface PluginSettings {
  bookmarksFilePath: string;
  outputFolder: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: PluginSettings = {
  bookmarksFilePath: getDefaultBookmarksPath(),
  outputFolder: "Bookmarks",
};

function getDefaultBookmarksPath(): string {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
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
  } else if (platform === "darwin") {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBookmarks(filePath: string): BookmarkRoot | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as BookmarkRoot;
  } catch {
    return null;
  }
}

/** Recursively collect all folder nodes with their full path label */
function collectFolders(
  node: BookmarkNode,
  parentPath = ""
): { label: string; node: BookmarkNode }[] {
  const results: { label: string; node: BookmarkNode }[] = [];
  const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;

  if (node.type === "folder") {
    results.push({ label: currentPath, node });
    for (const child of node.children ?? []) {
      results.push(...collectFolders(child, currentPath));
    }
  }
  return results;
}

/** Turn a folder node into markdown content */
function folderToMarkdown(folder: BookmarkNode, depth = 1): string {
  const lines: string[] = [];
  const heading = "#".repeat(depth);

  lines.push(`${heading} ${folder.name}`, "");

  // First render all direct URLs
  for (const child of folder.children ?? []) {
    if (child.type === "url") {
      lines.push(`- [${child.name}](${child.url})`);
    }
  }

  // Then recurse into subfolders
  for (const child of folder.children ?? []) {
    if (child.type === "folder") {
      lines.push("", ...folderToMarkdown(child, depth + 1).split("\n"));
    }
  }

  return lines.join("\n");
}

/** Sanitize a string for use as a filename */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class ChromeBookmarksPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("bookmark", "Chrome Bookmarks", () => {
      this.openFolderPicker();
    });

    this.addCommand({
      id: "open-bookmark-picker",
      name: "Pick Chrome bookmark folders to import",
      callback: () => this.openFolderPicker(),
    });

    this.addSettingTab(new BookmarkSettingTab(this.app, this));
  }

  openFolderPicker() {
    const data = parseBookmarks(this.settings.bookmarksFilePath);
    if (!data) {
      new Notice(
        "❌ Could not read Chrome bookmarks file. Check the path in settings."
      );
      return;
    }

    const allFolders: { label: string; node: BookmarkNode }[] = [];
    for (const root of [
      data.roots.bookmark_bar,
      data.roots.other,
      data.roots.synced,
    ]) {
      if (root) allFolders.push(...collectFolders(root));
    }

    new FolderPickerModal(this.app, allFolders, async (selected) => {
      await this.importFolders(selected);
    }).open();
  }

  async importFolders(folders: BookmarkNode[]) {
    const outputFolder = this.settings.outputFolder;

    // Ensure the output folder exists in the vault
    if (!(await this.app.vault.adapter.exists(outputFolder))) {
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

    new Notice(`✅ Imported ${created} bookmark folder(s) to "${outputFolder}"`);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// ─── Folder Picker Modal ──────────────────────────────────────────────────────

class FolderPickerModal extends Modal {
  private allFolders: { label: string; node: BookmarkNode }[];
  private selected: Set<BookmarkNode> = new Set();
  private onConfirm: (folders: BookmarkNode[]) => void;
  private searchQuery = "";
  private listContainer: HTMLElement;

  constructor(
    app: App,
    allFolders: { label: string; node: BookmarkNode }[],
    onConfirm: (folders: BookmarkNode[]) => void
  ) {
    super(app);
    this.allFolders = allFolders;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("bookmark-picker-modal");

    // Title
    contentEl.createEl("h2", { text: "🔖 Import Chrome Bookmark Folders" });

    // Search bar
    const searchWrap = contentEl.createDiv({ cls: "bookmark-search-wrap" });
    const searchInput = searchWrap.createEl("input", {
      type: "text",
      placeholder: "Search folders...",
      cls: "bookmark-search-input",
    });
    searchInput.addEventListener("input", () => {
      this.searchQuery = searchInput.value.toLowerCase();
      this.renderList();
    });

    // Select all / Deselect all buttons
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

    // Folder list
    this.listContainer = contentEl.createDiv({ cls: "bookmark-list" });
    this.renderList();

    // Footer
    const footer = contentEl.createDiv({ cls: "bookmark-footer" });
    const selectedCount = footer.createEl("span", {
      cls: "bookmark-selected-count",
    });

    const importBtn = footer.createEl("button", {
      text: "Import Selected",
      cls: "mod-cta",
    });

    importBtn.addEventListener("click", () => {
      if (this.selected.size === 0) {
        new Notice("Please select at least one folder.");
        return;
      }
      this.close();
      this.onConfirm(Array.from(this.selected));
    });

    // Keep count updated
    const updateCount = () => {
      selectedCount.textContent = `${this.selected.size} folder(s) selected`;
    };
    updateCount();

    // Patch renderList to also update count
    const origRender = this.renderList.bind(this);
    this.renderList = () => {
      origRender();
      updateCount();
    };
  }

  getFilteredFolders() {
    if (!this.searchQuery) return this.allFolders;
    return this.allFolders.filter((f) =>
      f.label.toLowerCase().includes(this.searchQuery)
    );
  }

  renderList() {
    this.listContainer.empty();
    const filtered = this.getFilteredFolders();

    if (filtered.length === 0) {
      this.listContainer.createEl("p", {
        text: "No folders found.",
        cls: "bookmark-empty",
      });
      return;
    }

    for (const { label, node } of filtered) {
      const item = this.listContainer.createDiv({ cls: "bookmark-item" });

      const checkbox = item.createEl("input", { type: "checkbox" });
      checkbox.checked = this.selected.has(node);

      const urlCount = (node.children ?? []).filter(
        (c) => c.type === "url"
      ).length;
      const subFolderCount = (node.children ?? []).filter(
        (c) => c.type === "folder"
      ).length;

      const labelEl = item.createDiv({ cls: "bookmark-item-label" });
      labelEl.createEl("span", { text: label, cls: "bookmark-item-name" });
      labelEl.createEl("span", {
        text: `${urlCount} link${urlCount !== 1 ? "s" : ""}${subFolderCount > 0
            ? `, ${subFolderCount} subfolder${subFolderCount !== 1 ? "s" : ""}`
            : ""
          }`,
        cls: "bookmark-item-meta",
      });

      const toggle = () => {
        if (this.selected.has(node)) {
          this.selected.delete(node);
        } else {
          this.selected.add(node);
        }
        checkbox.checked = this.selected.has(node);
        item.toggleClass("bookmark-item--selected", this.selected.has(node));
        // Update count
        const countEl = this.contentEl.querySelector(
          ".bookmark-selected-count"
        );
        if (countEl)
          countEl.textContent = `${this.selected.size} folder(s) selected`;
      };

      checkbox.addEventListener("change", toggle);
      item.addEventListener("click", (e) => {
        if (e.target !== checkbox) toggle();
      });

      item.toggleClass("bookmark-item--selected", this.selected.has(node));
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class BookmarkSettingTab extends PluginSettingTab {
  plugin: ChromeBookmarksPlugin;

  constructor(app: App, plugin: ChromeBookmarksPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Chrome Bookmarks Settings" });

    new Setting(containerEl)
      .setName("Chrome Bookmarks file path")
      .setDesc(
        "Full path to your Chrome Bookmarks file. Leave default to auto-detect."
      )
      .addText((text) =>
        text
          .setPlaceholder(getDefaultBookmarksPath())
          .setValue(this.plugin.settings.bookmarksFilePath)
          .onChange(async (value) => {
            this.plugin.settings.bookmarksFilePath =
              value || getDefaultBookmarksPath();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Vault folder where bookmark .md files will be saved.")
      .addText((text) =>
        text
          .setPlaceholder("Bookmarks")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value || "Bookmarks";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Test file path")
      .setDesc("Check if the bookmarks file can be found at the given path.")
      .addButton((btn) =>
        btn.setButtonText("Test").onClick(() => {
          const exists = fs.existsSync(
            this.plugin.settings.bookmarksFilePath
          );
          new Notice(
            exists
              ? "✅ Bookmarks file found!"
              : "❌ File not found. Check the path."
          );
        })
      );
  }
}
