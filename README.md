# Chrome Bookmarks Importer

Bring your Chrome bookmarks into your Obsidian vault — organized, searchable, and linked the way you think.

Instead of letting bookmarks pile up forgotten in your browser, Chrome Bookmarks Importer lets you selectively pull any Chrome bookmark folder into your vault as a clean Markdown file. Each file contains all the links from that folder, ready to be tagged, connected, and woven into your knowledge graph.

---

## Features

- Browse all your Chrome bookmark folders in a searchable picker — including nested paths so you always know exactly what you're importing
- Select one folder or many at once with checkboxes, Select All, and Deselect All
- Each folder becomes a `.md` file with your links formatted as clean Markdown — `[Title](url)`
- Subfolders within a selected folder are rendered as sections inside the same file
- Re-importing a folder updates the existing file rather than creating duplicates
- Auto-detects your Chrome Bookmarks file on Windows, macOS, and Linux
- Fully configurable: set a custom Bookmarks file path and choose which vault folder your files land in
- 100% local — no internet connection, no API, no account required

---

## Use Cases

- Archive research sessions and reading lists from Chrome into your vault
- Turn bookmark folders into MOCs (Maps of Content) you can link and annotate
- Keep a living reference of your most-used tools, docs, and resources inside Obsidian
- Migrate away from browser bookmarks entirely and manage links where your thinking already lives

---

## Installation

### From the Community Plugin Registry

1. Open Obsidian and go to **Settings → Community Plugins**
2. Make sure **Restricted Mode** is turned off
3. Click **Browse** and search for `Chrome Bookmarks Importer`
4. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from the [Releases](../../releases) page
2. Extract the zip and copy the folder into your vault at:
   ```
   YourVault/.obsidian/plugins/chrome-bookmarks-importer/
   ```
3. The folder should contain `main.js`, `manifest.json`, and `styles.css`
4. Restart Obsidian, then go to **Settings → Community Plugins** and enable **Chrome Bookmarks Importer**

### Build From Source

If you want to build it yourself:

```bash
git clone https://github.com/RafeShahraki/chrome-bookmarks-importer
cd chrome-bookmarks-importer
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into your plugin folder as above.

> **Requirements:** Node.js 16 or higher

---

## Tutorial

### Step 1 — Open the Bookmark Picker

There are two ways to open the importer:

**Option A:** Click the **bookmark icon** in the left ribbon (the sidebar with icons on the far left of Obsidian).

**Option B:** Open the **Command Palette** with `Ctrl+P` (or `Cmd+P` on Mac), then search for `Pick Chrome bookmark folders to import` and press Enter.

---

### Step 2 — Browse Your Folders

A modal window will appear showing all the bookmark folders from your Chrome profile.

![Modal showing folder list]()

Each row displays:
- The **full folder path** (e.g. `Bookmark Bar / Dev / Frontend`) so you always know where a folder lives in Chrome
- The **number of links** inside it
- The **number of subfolders** inside it

If you have a lot of folders, use the **search bar** at the top to filter by name.

---

### Step 3 — Select the Folders You Want

Click any row (or its checkbox) to select it. Selected rows are highlighted.

- Use **Select All** to grab every visible folder (respects your current search filter)
- Use **Deselect All** to start over
- The counter at the bottom shows how many folders are currently selected

You can select as many or as few folders as you like.

---

### Step 4 — Import

Click **Import Selected**. The plugin will:

1. Create a `Bookmarks/` folder in your vault (if it doesn't already exist)
2. Generate one `.md` file per selected folder
3. Show a confirmation notice when done

That's it. Your files are ready.

---

### What the Output Looks Like

If you import a folder called **Dev** that contains some links and a subfolder called **Tools**, the resulting `Dev.md` will look like this:

```markdown
# Dev

- [GitHub](https://github.com)
- [MDN Web Docs](https://developer.mozilla.org)
- [Stack Overflow](https://stackoverflow.com)

## Tools

- [Vite](https://vitejs.dev)
- [ESBuild](https://esbuild.github.io)
```

Top-level links appear as a flat list under the folder heading. Subfolders become `##` sections within the same file.

---

### Re-importing a Folder

If you import the same folder again after adding new bookmarks in Chrome, the plugin will **overwrite** the existing `.md` file with the latest version. Your old file will be replaced, so if you've added notes or tags to it manually, make a copy first or move your annotations to a separate file.

---

## Settings

Go to **Settings → Chrome Bookmarks Importer** to configure:

| Setting | Description | Default |
|---|---|---|
| Bookmarks file path | Full path to your Chrome `Bookmarks` file | Auto-detected per OS |
| Output folder | Vault folder where `.md` files are saved | `Bookmarks` |

### Default Bookmarks File Locations

| OS | Path |
|---|---|
| Windows | `C:\Users\<name>\AppData\Local\Google\Chrome\User Data\Default\Bookmarks` |
| macOS | `~/Library/Application Support/Google/Chrome/Default/Bookmarks` |
| Linux | `~/.config/google-chrome/Default/Bookmarks` |

If you use a different Chrome profile, replace `Default` in the path with your profile folder name (e.g. `Profile 1`).

Use the **Test** button in settings to verify the plugin can find your Bookmarks file before importing.

---

## FAQ

**Does this work with Brave, Edge, or other Chromium browsers?**
Yes. They all use the same Bookmarks file format. Just point the file path in settings to the correct browser's data folder.

**Will it delete my Chrome bookmarks?**
No. The plugin only reads your Bookmarks file, it never writes to it or touches Chrome in any way.

**Can I choose a different output folder?**
Yes, change the Output folder setting to any path relative to your vault root (e.g. `Resources/Bookmarks`).

**What happens to bookmarks that aren't in any folder?**
Chrome's "Other Bookmarks" and "Mobile Bookmarks" roots are included in the folder list alongside Bookmark Bar folders, so you can import those too.

---

## License

MIT — do whatever you want with it.

---

## Contributing

Issues and pull requests are welcome. If something's broken or you have a feature idea, open an issue and let's talk about it.
