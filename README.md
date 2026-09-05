# Disk Usage Analyzer

A graphical, Node.js-based web application for analyzing Linux and macOS file systems. This tool helps you identify lost or excessive disk space usage through interactive charts and hierarchical navigation.

## 🚀 Features

*   **Interactive Graphics**: Uses Chart.js to provide Pie, Doughnut (File Types), and Horizontal Bar charts.
*   **Hierarchical Navigation**: Clickable table rows and breadcrumbs to "drill down" into subdirectories.
*   **Large File Report**: Recursive scan to find the top 50 largest files in any folder.
*   **Zip & Unzip**: Compress folders and extract ZIP archives directly from the browser.
*   **Smart Duplicate Detection**: Identifies identical files using size filtering and streaming MD5 hashing.
*   **Dark Theme**: Optimized for low-light environments (Black & Slate Grey palette).
*   **Search**: Real-time filtering of results in the current directory.
*   **Human-Readable Sizes**: Automatically converts bytes to KB, MB, GB, or TB.

## 🛠️ Requirements

*   **Node.js** (v14 or higher recommended)
*   **NPM**
*   **PM2** (Optional, for background management)

## 📦 Installation

1.  Navigate to the project directory:
    ```bash
    cd /Users/jim/Disk-Useage
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## 🏃 Running the Application

### Option 1: Direct Terminal Run
Use this for quick, one-off sessions.
```bash
npm start
```
*Stop it with `CTRL + C`. If it gets stuck, use:*
`kill -9 $(lsof -t -i:8888)`

### Option 2: PM2 Manual Management (Recommended for macOS)
Since macOS startup items can be complex, manual control via PM2 is a great balance.

**Install PM2 globally (if not already):**
```bash
npm install -g pm2
```

**Manual Start/Stop Workflow:**
```bash
# To Start the analyzer:
pm2 start ecosystem.config.js

# To Stop the analyzer when done:
pm2 stop disk-analyzer

# To check if it's currently running:
pm2 status

# To see real-time errors or scan logs:
pm2 logs disk-analyzer
```

## ⚙️ Advanced Deployment

### System-Wide Auto-Start
If you decide you want it to start automatically on boot:

*   **Linux**: Follow the instructions for `disk-analyzer.service`.
*   **macOS**: Follow the instructions for `com.user.diskanalyzer.plist` or use `pm2 startup`.

## ⚠️ Important Notes

*   **Permissions**: To scan the entire root (`/`), you may need `sudo`. For most uses, starting the scan at `~` (Home) is recommended to avoid permission errors.
*   **Initial Scan**: For very large folders, the first scan may take a moment while it calculates recursive sizes. The "Scan" button will show "Scanning..." until finished.

## 🌐 Remote Access & Security

To run this on a remote Linux server securely without exposing the "Delete" capability to the public internet, use an **SSH Tunnel**:

1.  **On the Server**: Start the app normally (`pm2 start ecosystem.config.js`).
2.  **On your Local Machine**: Run this command to tunnel the port:
    ```bash
    ssh -L 8888:localhost:8888 user@your-server-ip
    ```
3.  **In your Browser**: Navigate to `http://localhost:8888`.

---

## 📂 Project Structure

*   `server.js`: Express backend with parallel file scanning.
*   `public/`: Dark-themed frontend assets.
*   `ecosystem.config.js`: PM2 process configuration.
*   `logs/`: Application execution logs.
