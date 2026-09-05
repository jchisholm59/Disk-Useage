const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const extract = require('extract-zip');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(express.json());
app.use(express.static('public'));

// Load ignore patterns
let ignoreList = [];
const ignoreFilePath = path.join(__dirname, '.analyzerignore');
if (fs.existsSync(ignoreFilePath)) {
    ignoreList = fs.readFileSync(ignoreFilePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
}

function shouldIgnore(fullPath) {
    return ignoreList.some(pattern => {
        // Handle absolute paths vs simple folder names
        if (pattern.startsWith('/')) {
            return fullPath === pattern || fullPath.startsWith(pattern + '/');
        }
        return fullPath.split(path.sep).includes(pattern);
    });
}

// Helper to get directory size and type stats
async function getDirMetrics(dirPath) {
    if (shouldIgnore(dirPath)) return { size: 0, typeStats: {} };
    let size = 0;
    const typeStats = {};
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.lstat(filePath);
            if (stats.isDirectory()) {
                const metrics = await getDirMetrics(filePath);
                size += metrics.size;
                for (const [ext, s] of Object.entries(metrics.typeStats)) {
                    typeStats[ext] = (typeStats[ext] || 0) + s;
                }
            } else {
                size += stats.size;
                const ext = path.extname(file).toLowerCase() || 'no-extension';
                typeStats[ext] = (typeStats[ext] || 0) + stats.size;
            }
        }
    } catch (e) {}
    return { size, typeStats };
}

// API: Scan directory
app.get('/api/scan', async (req, res) => {
    let targetPath = req.query.path;
    if (!targetPath) targetPath = process.env.HOME || '/';
    if (targetPath.startsWith('~')) {
        targetPath = path.join(process.env.HOME || process.env.USERPROFILE, targetPath.slice(1));
    }

    console.log(`Scanning: ${targetPath}`);
    try {
        const items = await fs.readdir(targetPath);
        const totalTypeStats = {};
        const result = await Promise.all(items.map(async (item) => {
            const fullPath = path.join(targetPath, item);
            if (shouldIgnore(fullPath)) return null;
            try {
                const stats = await fs.lstat(fullPath);
                const isDirectory = stats.isDirectory();
                if (isDirectory) {
                    const metrics = await getDirMetrics(fullPath);
                    return { item: { name: item, path: fullPath, isDirectory, size: metrics.size }, typeStats: metrics.typeStats };
                } else {
                    const ext = path.extname(item).toLowerCase() || 'no-extension';
                    return { item: { name: item, path: fullPath, isDirectory, size: stats.size }, typeStats: { [ext]: stats.size } };
                }
            } catch (e) { return null; }
        }));

        const finalItems = [];
        result.forEach(r => {
            if (!r) return;
            finalItems.push(r.item);
            for (const [ext, s] of Object.entries(r.typeStats)) {
                totalTypeStats[ext] = (totalTypeStats[ext] || 0) + s;
            }
        });

        finalItems.sort((a, b) => b.size - a.size);
        res.json({ currentPath: targetPath, items: finalItems, typeStats: totalTypeStats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Large File Report
app.get('/api/large-files', async (req, res) => {
    const targetPath = req.query.path;
    const allFiles = [];

    async function walk(dir) {
        if (shouldIgnore(dir)) return;
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.lstat(filePath);
                if (stats.isDirectory()) {
                    await walk(filePath);
                } else {
                    allFiles.push({ name: file, path: filePath, size: stats.size });
                }
            }
        } catch (e) {}
    }

    await walk(targetPath);
    allFiles.sort((a, b) => b.size - a.size);
    res.json(allFiles.slice(0, 50)); // Return top 50
});

// API: Compress Directory
app.post('/api/compress', async (req, res) => {
    const { targetPath } = req.body;
    const zipPath = `${targetPath}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => res.json({ success: true, path: zipPath }));
    archive.on('error', err => res.status(500).json({ error: err.message }));

    archive.pipe(output);
    archive.directory(targetPath, false);
    archive.finalize();
});

// API: Extract Zip
app.post('/api/extract', async (req, res) => {
    const { targetPath } = req.body;
    const targetDir = targetPath.replace('.zip', '');
    try {
        await extract(targetPath, { dir: targetDir });
        res.json({ success: true, path: targetDir });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Existing Delete & Duplicates APIs
app.post('/api/delete', async (req, res) => {
    const { targetPath } = req.body;
    try {
        await fs.remove(targetPath);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/duplicates', async (req, res) => {
    const targetPath = req.query.path;
    const sizeMap = new Map();
    const duplicates = [];

    async function walk(dir) {
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.lstat(filePath);
                if (stats.isDirectory()) await walk(filePath);
                else if (stats.isFile()) {
                    const key = `${stats.size}`;
                    if (!sizeMap.has(key)) sizeMap.set(key, []);
                    sizeMap.get(key).push(filePath);
                }
            }
        } catch (e) {}
    }

    await walk(targetPath);
    for (const [size, paths] of sizeMap.entries()) {
        if (paths.length > 1) {
            const hashes = new Map();
            for (const p of paths) {
                try {
                    const hash = await new Promise(r => {
                        const h = crypto.createHash('md5');
                        const s = fs.createReadStream(p);
                        s.on('data', d => h.update(d));
                        s.on('end', () => r(h.digest('hex')));
                    });
                    if (hashes.has(hash)) duplicates.push({ original: hashes.get(hash), duplicate: p, size: parseInt(size) });
                    else hashes.set(hash, p);
                } catch (e) {}
            }
        }
    }
    res.json(duplicates);
});

const server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
