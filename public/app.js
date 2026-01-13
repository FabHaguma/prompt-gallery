let state = {
    snippets: [],
    tags: [],
    categories: [],
    search: '',
    currentSort: 'newest',
    currentView: 'list', // 'list' or 'grid'
    activeTag: null,
    activeCategory: null
};

document.addEventListener('DOMContentLoaded', () => {
    fetchMeta();
    fetchSnippets();

    // Search Listener
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce((e) => {
        state.search = e.target.value;
        fetchSnippets();
    }, 300));

    // Form Listener
    document.getElementById('create-form').addEventListener('submit', handleCreate);
    document.getElementById('edit-form').addEventListener('submit', handleEdit);

    // Global Key Listener for Copy
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyC') {
            const first = state.snippets[0];
            if (first) copyToClipboard(first.content, first.id);
        }
    });
});

async function fetchSnippets() {
    const params = new URLSearchParams();
    if (state.search) params.append('search', state.search);
    if (state.activeCategory) params.append('category', state.activeCategory);
    if (state.activeTag) params.append('tag', state.activeTag);
    params.append('sort', state.currentSort);

    const res = await fetch(`/api/snippets?${params}`);
    const json = await res.json();
    state.snippets = json.data;
    renderSnippets();
}

async function fetchMeta() {
    const res = await fetch('/api/meta');
    const json = await res.json();
    state.tags = json.tags;
    state.categories = json.categories;
    renderMeta();
}

function renderMeta() {
    // Render Tags
    const tagCloud = document.getElementById('tag-cloud');
    tagCloud.innerHTML = state.tags.map(tag => `
        <button onclick="filterByTag('${tag}')" 
            class="${state.activeTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'} 
            text-xs px-2 py-1 rounded-full transition-colors">
            ${tag}
        </button>
    `).join('');

    // Render Categories
    const catList = document.getElementById('categories-list');
    catList.innerHTML = `
        <li>
            <button onclick="filterByCat(null)" class="${!state.activeCategory ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} w-full text-left px-3 py-2 rounded-md transition-colors text-sm flex justify-between group">
                All Snippets
                <span class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-xs">Browse</span>
            </button>
        </li>
    ` + state.categories.map(cat => `
        <li>
            <button onclick="filterByCat('${cat}')" class="${state.activeCategory === cat ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} w-full text-left px-3 py-2 rounded-md transition-colors text-sm flex justify-between group">
                ${cat}
                <span class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-xs">Folder</span>
            </button>
        </li>
    `).join('');
}

function renderSnippets() {
    const container = document.getElementById('snippet-list');
    
    if (state.snippets.length === 0) {
        container.innerHTML = `<div class="text-center text-slate-400 py-10">No snippets found</div>`;
        return;
    }

    container.innerHTML = state.snippets.map(snippet => {
        const timeAgo = getTimeAgo(snippet.last_copied || snippet.created_at);
        const formattedContent = formatContent(snippet.content);
        const isGrid = state.currentView === 'grid';
        
        return `
        <div class="bg-white rounded-xl p-5 shadow-sm border ${snippet.pinned ? 'border-l-4 border-l-blue-500 bg-blue-50/20' : 'border-slate-100'} hover:shadow-md transition-shadow group relative flex flex-col gap-3 ${isGrid ? 'h-full' : ''}">
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <button onclick="togglePin(${snippet.id}, ${snippet.pinned ? 0 : 1})" class="${snippet.pinned ? 'text-blue-500' : 'text-slate-200 hover:text-slate-400'} transition-colors shrink-0" title="${snippet.pinned ? 'Unpin' : 'Pin'}">
                            <i class="fa-solid fa-thumbtack ${snippet.pinned ? '' : 'fa-rotate-45'}"></i>
                        </button>
                        <h3 class="font-bold text-slate-800 text-lg truncate" title="${snippet.title}">${snippet.title}</h3>
                    </div>
                    <div class="flex gap-2 text-xs mt-1 ml-6 flex-wrap">
                        ${snippet.tags ? snippet.tags.split(/[\s,]+/).map(t => `<span class="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">${t}</span>`).join('') : ''}
                        <span class="text-slate-400 flex items-center gap-1 shrink-0">• ${snippet.category || 'Uncategorized'}</span>
                    </div>
                </div>
                
                <button onclick="copyToClipboard(decodeURIComponent('${encodeURIComponent(snippet.content).replace(/'/g, "%27")}'), ${snippet.id})" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-sm transition-colors opacity-100 shrink-0 ml-2">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>

            <div class="bg-slate-50 rounded-lg p-3 text-sm font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-40 custom-scrollbar border border-slate-100 flex-1">
                ${formattedContent}
            </div>

            <div class="text-xs text-slate-400 flex justify-between items-center mt-auto pt-2">
               <span>${snippet.last_copied ? `Used: ${timeAgo}` : `Added: ${timeAgo}`}</span>
            </div>
        </div>
        `;
    }).join('');
}

function formatContent(content) {
    // 1. Check for JSON
    try {
        const json = JSON.parse(content);
        if (typeof json === 'object' && json !== null) {
            return `<span class="text-green-600">${JSON.stringify(json, null, 2)}</span>`; // simple coloring
        }
    } catch (e) {}

    // 2. Check for Link
    if (content.startsWith('http://') || content.startsWith('https://')) {
        return `<a href="${content}" target="_blank" class="text-blue-500 underline hover:text-blue-700">${content}</a>`;
    }

    // 3. Simple Markdown Heading
    if (content.startsWith('# ')) {
        const lines = content.split('\n');
        const title = lines[0].replace('# ', '');
        const rest = lines.slice(1).join('\n');
        return `<span class="font-bold text-slate-800 block mb-1">${title}</span>${rest}`;
    }

    // Default: escape HTML to prevent XSS (basic)
    return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* --- Logic --- */

function filterByTag(tag) {
    state.activeTag = (state.activeTag === tag) ? null : tag;
    fetchSnippets();
    renderMeta(); // re-render to update active state
}

function filterByCat(cat) {
    state.activeCategory = cat;
    fetchSnippets();
    renderMeta();
}

function setSort(type) {
    state.currentSort = type;
    // update UI
    document.getElementById('sort-newest').className = `px-4 py-1.5 rounded-md font-medium transition-colors ${type === 'newest' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`;
    document.getElementById('sort-most-used').className = `px-4 py-1.5 rounded-md font-medium transition-colors ${type === 'most_used' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`;
    fetchSnippets();
}

function setView(view) {
    state.currentView = view;
    // Update UI buttons
    document.getElementById('view-list').classList.toggle('text-blue-600', view === 'list');
    document.getElementById('view-list').classList.toggle('text-slate-400', view !== 'list');
    document.getElementById('view-grid').classList.toggle('text-blue-600', view === 'grid');
    document.getElementById('view-grid').classList.toggle('text-slate-400', view !== 'grid');
    
    // Update container classes
    const container = document.getElementById('snippet-list');
    if (view === 'grid') {
        container.classList.remove('flex', 'flex-col', 'gap-4', 'max-w-4xl');
        container.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4', 'max-w-full');
    } else {
        container.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4', 'max-w-full');
        container.classList.add('flex', 'flex-col', 'gap-4', 'max-w-4xl');
    }
    
    renderSnippets();
}

async function copyToClipboard(text, id) {
    try {
        await navigator.clipboard.writeText(text);
        showToast();
        // Update DB
        fetch(`/api/snippets/${id}/copied`, { method: 'PUT' });
        // Optionally update UI for sort
        if (state.currentSort === 'most_used') {
            fetchSnippets();
        }
    } catch (err) {
        console.error('Failed to copy', err);
    }
}

async function handleCreate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch('/api/snippets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal();
            e.target.reset();
            fetchSnippets();
            fetchMeta(); // update tags/cats
        }
    } catch (err) {
        console.error(err);
    }
}

/* --- Utilities --- */

function getTimeAgo(dateString) {
    if(!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

async function togglePin(id, newValue) {
    await fetch(`/api/snippets/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newValue })
    });
    fetchSnippets();
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/* --- Modal/Toast UI --- */

function openModal() {
    const modal = document.getElementById('create-modal');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    // simple animation
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('create-modal');
    const content = document.getElementById('modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2000);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    // Toggle translate class
    if (sidebar.classList.contains('-translate-x-full')) {
        // Open
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        // Close
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

/* --- Dashboard / Settings --- */

async function openSettings() {
    // Show Modal
    const modal = document.getElementById('settings-modal');
    const content = document.getElementById('settings-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    // Fetch fresh data for dashboard (ignoring current filters to show all)
    const res = await fetch('/api/snippets?sort=newest');
    const json = await res.json();
    renderDashboardTable(json.data);
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    const content = document.getElementById('settings-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function renderDashboardTable(snippets) {
    const tbody = document.getElementById('dashboard-table-body');
    if (snippets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">No snippets found</td></tr>`;
        return;
    }

    tbody.innerHTML = snippets.map(s => `
        <tr class="bg-white border-b hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" title="${s.title}">
                ${s.title}
            </td>
            <td class="px-6 py-4">
                ${s.category || '<span class="text-slate-400 italic">None</span>'}
            </td>
            <td class="px-6 py-4">
                ${s.last_copied ? new Date(s.last_copied).toLocaleDateString() : '-'}
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="openEditModal(${s.id})" class="font-medium text-blue-600 hover:text-blue-800 mr-3 transition-colors">Edit</button>
                <button onclick="deleteSnippet(${s.id})" class="font-medium text-red-600 hover:text-red-800 transition-colors">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteSnippet(id) {
    if(!confirm('Are you sure you want to delete this snippet?')) return;

    try {
        const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
        if(res.ok) {
            // specific refresh logic
            openSettings(); // refresh dashboard
            fetchSnippets(); // refresh main view
            fetchMeta(); // refresh sidebar
        }
    } catch(err) {
        console.error(err);
        alert('Failed to delete');
    }
}

/* --- Edit Logic --- */

async function openEditModal(id) {
    // In a real app we might fetch by ID, here we find in current list
    const res = await fetch('/api/snippets?sort=newest');
    const json = await res.json();
    const snippet = json.data.find(s => s.id === id);

    if(!snippet) return;

    const modal = document.getElementById('edit-modal');
    const content = document.getElementById('edit-content');
    const form = document.getElementById('edit-form');
    
    // Populate form
    form.id.value = snippet.id;
    form.title.value = snippet.title;
    form.category.value = snippet.category || '';
    form.tags.value = snippet.tags || '';
    form.content.value = snippet.content;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    const content = document.getElementById('edit-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

async function handleEdit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;

    try {
        const res = await fetch(`/api/snippets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            closeEditModal();
            openSettings(); // refresh dashboard
            fetchSnippets(); // refresh main view
            fetchMeta(); // refresh sidebar
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update');
    }
}
