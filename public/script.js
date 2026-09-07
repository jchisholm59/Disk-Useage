let pieChart, barChart, typeChart;
let currentItems = [];
let currentTypeStats = {};
let historyStack = [];
let currentPath = '';

Chart.defaults.color = '#f1f5f9';
Chart.defaults.borderColor = '#3d6464';

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateBreadcrumbs(path) {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '';
    const parts = path.split('/').filter(p => p !== '');
    const rootSpan = document.createElement('span');
    rootSpan.innerText = 'Root';
    rootSpan.style.cursor = 'pointer';
    rootSpan.style.textDecoration = 'underline';
    rootSpan.onclick = () => scanPath('/');
    container.appendChild(rootSpan);

    let currentAccPath = '';
    parts.forEach((part) => {
        container.appendChild(document.createTextNode(' / '));
        currentAccPath += '/' + part;
        const span = document.createElement('span');
        span.innerText = part;
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        const target = currentAccPath;
        span.onclick = () => scanPath(target);
        container.appendChild(span);
    });
}

function updateBackButton() {
    const btn = document.getElementById('backBtn');
    if (btn) btn.disabled = historyStack.length === 0;
}

async function scanPath(targetPath, isBack = false) {
    const path = targetPath || document.getElementById('pathInput').value;
    if (!isBack && currentPath && currentPath !== path) historyStack.push(currentPath);
    currentPath = path;
    updateBackButton();

    document.getElementById('pathInput').value = path;
    document.getElementById('searchInput').value = '';
    updateBreadcrumbs(path);

    const btn = document.querySelector('button[onclick="scanPath()"]');
    btn.innerText = 'Scanning...';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/scan?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        if (data.error) { alert("Error: " + data.error); return; }

        currentItems = data.items;
        currentTypeStats = data.typeStats;

        // Calculate total size
        const totalBytes = currentItems.reduce((acc, item) => acc + item.size, 0);
        document.getElementById('totalSizeValue').innerText = formatSize(totalBytes);

        renderTable(currentItems);
        renderCharts(currentItems, currentTypeStats);
    } catch (err) { alert("Failed to scan directory."); } finally {
        btn.innerText = 'Scan';
        btn.disabled = false;
    }
}

function goBack() {
    if (historyStack.length > 0) scanPath(historyStack.pop(), true);
}

function renderTable(items) {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        const isZip = item.name.toLowerCase().endsWith('.zip');
        tr.innerHTML = `
            <td class="${item.isDirectory ? 'folder' : ''}">${item.name}</td>
            <td>${item.isDirectory ? 'Folder' : 'File'}</td>
            <td>${formatSize(item.size)}</td>
            <td>
                <button class="btn-delete" onclick="deleteItem(event, '${item.path}')">Del</button>
                ${item.isDirectory ? `<button style="background:#f59e0b; padding:6px 10px; margin-left:5px;" onclick="compressItem(event, '${item.path}')">Zip</button>` : ''}
                ${isZip ? `<button style="background:#3b82f6; padding:6px 10px; margin-left:5px;" onclick="extractItem(event, '${item.path}')">Unzip</button>` : ''}
            </td>
        `;
        tr.onclick = () => { if (item.isDirectory) scanPath(item.path); };
        tbody.appendChild(tr);
    });
}

async function compressItem(event, path) {
    event.stopPropagation();
    alert("Compression started. Please wait...");
    const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: path })
    });
    if (res.ok) { alert("Compressed successfully!"); scanPath(currentPath, true); }
}

async function extractItem(event, path) {
    event.stopPropagation();
    alert("Extraction started. Please wait...");
    const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: path })
    });
    if (res.ok) { alert("Extracted successfully!"); scanPath(currentPath, true); }
}

async function showLargeFiles() {
    document.getElementById('largeFileModal').style.display = 'block';
    document.getElementById('modalOverlay').style.display = 'block';
    const tbody = document.querySelector('#largeFileTable tbody');
    tbody.innerHTML = '<tr><td colspan="3">Searching for largest files...</td></tr>';

    const res = await fetch(`/api/large-files?path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    tbody.innerHTML = '';
    data.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${f.name}</td><td style="font-size:0.8em; color:#94a3b8;">${f.path}</td><td>${formatSize(f.size)}</td>`;
        tbody.appendChild(tr);
    });
}

function closeModal() {
    document.getElementById('largeFileModal').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
}

function renderCharts(items, typeStats) {
    const labels = items.slice(0, 10).map(i => i.name);
    const data = items.slice(0, 10).map(i => i.size);

    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();
    if (typeChart) typeChart.destroy();

    pieChart = new Chart(document.getElementById('pieChart').getContext('2d'), {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7BC225', '#FF3D67', '#059BFF'] }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'Top 10 Items' }, tooltip: { callbacks: { label: (ctx) => formatSize(ctx.raw) } } } }
    });

    const typeLabels = Object.keys(typeStats).sort((a,b) => typeStats[b] - typeStats[a]).slice(0, 8);
    typeChart = new Chart(document.getElementById('typeChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: typeLabels, datasets: [{ data: typeLabels.map(l => typeStats[l]), backgroundColor: ['#4BC0C0', '#FFCD56', '#FF9F40', '#36A2EB', '#9966FF', '#C9CBCF', '#FF6384', '#FF3D67'] }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'File Types' }, tooltip: { callbacks: { label: (ctx) => formatSize(ctx.raw) } } } }
    });

    barChart = new Chart(document.getElementById('barChart').getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Size', data, backgroundColor: '#36A2EB' }] },
        options: { indexAxis: 'y', responsive: true, plugins: { title: { display: true, text: 'Size Comparison' }, tooltip: { callbacks: { label: (ctx) => formatSize(ctx.raw) } } }, scales: { x: { ticks: { callback: (val) => formatSize(val) } } } }
    });
}

async function deleteItem(event, path) {
    event.stopPropagation();
    if (!confirm(`WARNING: You are about to PERMANENTLY delete:\n${path}\n\nThis action cannot be undone. Are you sure?`)) return;
    if (!confirm(`FINAL CONFIRMATION:\nAre you REALLY sure you want to delete this? There is no recovery.`)) return;

    const res = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetPath: path }) });
    if (res.ok) {
        alert("Deleted successfully.");
        scanPath(currentPath, true);
    } else {
        alert("Failed to delete. Access denied or file in use.");
    }
}

async function findDuplicates() {
    alert("Duplicate scanning started...");
    const res = await fetch(`/api/duplicates?path=${encodeURIComponent(currentPath)}`);
    const data = await res.json();
    if (data.length === 0) alert("No duplicates.");
    else alert(`Found ${data.length} duplicates. See console for details.`);
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    renderTable(currentItems.filter(item => item.name.toLowerCase().includes(query)));
}

document.addEventListener('DOMContentLoaded', () => document.getElementById('searchInput')?.addEventListener('input', handleSearch));
scanPath();
