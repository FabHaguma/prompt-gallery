// --- Configuration ---
// Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://idcktjonedzxaseklueu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2t0am9uZWR6eGFzZWtsdWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjcyMDMsImV4cCI6MjA2MTE0MzIwM30.3WdTaipjYf__UfSdVN2LFQwoeFs-w9fwhnl6dJTQOoQ';

// --- Supabase Client Initialization ---
let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error("Error initializing supabaseClient:", error);
    alert("Failed to initialize supabaseClient. Please check the console and your credentials.");
    // Optionally disable functionality if supabaseClient fails to init
}


// --- DOM Elements ---
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const dateFilter = document.getElementById('dateFilter');
const sortControl = document.getElementById('sortControl');
const promptList = document.getElementById('promptList');
const loadingMessage = document.getElementById('loadingMessage');

// Add Form Elements
const addPromptForm = document.getElementById('addPromptForm');
const promptText = document.getElementById('promptText');
const promptCategory = document.getElementById('promptCategory');
const promptTags = document.getElementById('promptTags');
const promptRating = document.getElementById('promptRating');
const promptNsfwScore = document.getElementById('promptNsfwScore');
const promptNotes = document.getElementById('promptNotes');
const formStatus = document.getElementById('formStatus');

// New elements for toggling the form
const toggleAddPromptBtn = document.getElementById('toggleAddPromptBtn');
const addPromptFormContainer = document.getElementById('addPromptFormContainer');
const cancelAddPromptBtn = document.getElementById('cancelAddPromptBtn'); // Optional cancel button


// --- State ---
let allCategories = new Set(); // To populate category filter

// --- Functions ---

/**
 * Fetches prompts from Supabase based on current filters and sorting,
 * then renders them to the page.
 */
async function fetchAndRenderPrompts() {
    if (!supabaseClient) {
        promptList.innerHTML = '<p class="error">Supabase client not initialized.</p>';
        return;
    }

    loadingMessage.style.display = 'block';
    promptList.innerHTML = ''; // Clear previous prompts

    try {
        let query = supabaseClient.from('prompt_gallery').select('*');

        // Apply Search
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            // Search in prompt, category, tags, and notes. Case-insensitive.
             query = query.or(`prompt.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
             // Note: Searching array 'tags' directly with ilike might not work as expected.
             // A more robust solution would involve a database function or filtering client-side after fetch.
             // For simplicity, we search text fields here.
        }

        // Apply Category Filter
        const categoryValue = categoryFilter.value;
        if (categoryValue) {
            query = query.eq('category', categoryValue);
        }

        // Apply Date Filter
        const dateValue = dateFilter.value;
        if (dateValue) {
            const { startDate, endDate } = getDateRange(dateValue);
            if (startDate) query = query.gte('created_at', startDate.toISOString());
            if (endDate) query = query.lte('created_at', endDate.toISOString());
        }

        // Apply Sorting
        const sortValue = sortControl.value;
        if (sortValue) {
            // *** Change the split delimiter to '-' ***
            const [field, direction] = sortValue.split('-');
            const isAscending = direction === 'asc';
             // No changes needed here, 'field' will now correctly be "created_at", "rating", or "nsfw_score"
             query = query.order(field, { ascending: isAscending, nullsFirst: !isAscending });
        } else {
             // Default sort remains the same
             query = query.order('created_at', { ascending: false });
        }

        // Execute Query
        const { data, error } = await query;

        loadingMessage.style.display = 'none';

        if (error) {
            console.error("Error fetching prompts:", error);
            promptList.innerHTML = `<p id="noResultsMessage" class="error">Error fetching prompts: ${error.message}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            promptList.innerHTML = '<p id="noResultsMessage">No prompts found matching your criteria.</p>';
            return; // Exit early if no data
        }

        // Render Prompts
        data.forEach(prompt => {
            renderPrompt(prompt);
            // Collect categories for filter dropdown (only if not already added)
            if (prompt.category && !allCategories.has(prompt.category)) {
                allCategories.add(prompt.category);
            }
        });

        // Update category filter options *after* fetching
        populateCategoryFilter();

    } catch (err) {
        loadingMessage.style.display = 'none';
        console.error("An unexpected error occurred:", err);
        promptList.innerHTML = `<p id="noResultsMessage" class="error">An unexpected error occurred while fetching prompts.</p>`;
    }
}

/**
 * Calculates start and end dates for filtering.
 * @param {string} rangeKey - Value from the date filter dropdown.
 * @returns {object} - Object with startDate and endDate (Date objects or null).
 */
function getDateRange(rangeKey) {
    const now = new Date();
    let startDate = null;
    let endDate = new Date(now); // Default end date is now

    // Set time to the very end of the current day for inclusive filtering today
    endDate.setHours(23, 59, 59, 999);

    switch (rangeKey) {
        case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now); // End date is end of yesterday
            endDate.setDate(now.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'last_7_days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last_30_days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            break;
        default: // 'all_time' or invalid
             startDate = null; // No start date filter
             endDate = null;   // No end date filter
             break;
    }
    return { startDate, endDate };
}


/**
 * Creates HTML for a single prompt and appends it to the list.
 * @param {object} prompt - The prompt data object from Supabase.
 */
function renderPrompt(prompt) {
    const item = document.createElement('div');
    item.classList.add('prompt-item');
    item.dataset.id = prompt.id;

    // --- Create Prompt Text Element ---
    const textElement = document.createElement('p');
    textElement.classList.add('prompt-text');
    textElement.textContent = prompt.prompt; // Use textContent for security

    // --- Create Copy Button ---
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.classList.add('copy-button');
    copyBtn.title = 'Copy prompt text to clipboard'; // Tooltip for usability
    // Add listener to *this specific button* to copy *this specific prompt's* text
    copyBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering potential future click listeners on the item
        handleCopyClick(prompt.prompt, copyBtn);
    });

    // --- Create Meta Info Container ---
    const metaContainer = document.createElement('div');
    metaContainer.classList.add('prompt-meta');
    metaContainer.innerHTML = `
        ${prompt.category ? `<span>Category: ${escapeHtml(prompt.category)}</span>` : ''}
        <span>Rating: ${prompt.rating !== null ? prompt.rating.toFixed(1) : 'N/A'}</span>
        <span>NSFW: ${prompt.nsfw_score !== null ? prompt.nsfw_score.toFixed(2) : 'N/A'}</span>
        <span>Added: ${new Date(prompt.created_at).toLocaleDateString()}</span>
    `;

    // --- Create Tags Element (if tags exist) ---
    let tagsElement = null;
    if (Array.isArray(prompt.tags) && prompt.tags.length > 0) {
        tagsElement = document.createElement('div');
        tagsElement.classList.add('prompt-tags');
        tagsElement.innerHTML = `Tags: ${prompt.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join(' ')}`;
    }

    // --- Create Notes Element (if notes exist) ---
    let notesElement = null;
    if (prompt.notes) {
        notesElement = document.createElement('div');
        notesElement.classList.add('prompt-notes');
        // Use textContent for the main part of notes to prevent potential XSS if notes contained HTML
        const notesStrong = document.createElement('strong');
        notesStrong.textContent = 'Notes:';
        notesElement.appendChild(notesStrong);
        notesElement.appendChild(document.createElement('br'));
        notesElement.appendChild(document.createTextNode(prompt.notes)); // Append notes as text node
    }

    // --- Assemble the prompt item ---
    // Append elements in desired order
    item.appendChild(copyBtn);    // Put copy button near the top
    item.appendChild(textElement);
    item.appendChild(metaContainer);
    if (tagsElement) {
        item.appendChild(tagsElement);
    }
    if (notesElement) {
        item.appendChild(notesElement);
    }

    // Add the fully constructed item to the list
    promptList.appendChild(item);
}

// *** NEW handleCopyClick function ***
async function handleCopyClick(textToCopy, buttonElement) {
    if (!navigator.clipboard) {
        // Clipboard API not available (e.g., insecure context, older browser)
        console.error('Clipboard API not available.');
        // Optionally: Provide fallback or alert user
        buttonElement.textContent = 'Error'; // Simple feedback
        setTimeout(() => { buttonElement.textContent = 'Copy'; }, 2000);
        return;
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        // Success feedback
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Copied!';
        buttonElement.disabled = true; // Briefly disable

        // Revert button state after a delay
        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
        }, 1500); // Revert after 1.5 seconds

    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Error feedback
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Failed!';
        setTimeout(() => { buttonElement.textContent = originalText; }, 2000);
    }
}

/**
 * Populates the category filter dropdown using unique categories found.
 */
function populateCategoryFilter() {
    // Store existing value
    const currentValue = categoryFilter.value;

    // Clear existing options except the default "All Categories"
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(allCategories).sort((a, b) => a.localeCompare(b));

    // Add sorted categories as new options
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Restore previous value if it still exists
     if (Array.from(categoryFilter.options).some(opt => opt.value === currentValue)) {
        categoryFilter.value = currentValue;
     }
}


/**
 * Handles the submission of the 'Add New Prompt' form.
 * @param {Event} event - The form submission event.
 */
async function handleAddPrompt(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showFormStatus("Supabase client not initialized.", true);
        return;
    }

    // ... (get form values and perform validation as before) ...
    const promptValue = promptText.value.trim();
    const categoryValue = promptCategory.value.trim() || null;
    const tagsValue = promptTags.value.trim();
    const ratingValue = promptRating.value ? parseFloat(promptRating.value) : null;
    const nsfwScoreValue = promptNsfwScore.value ? parseFloat(promptNsfwScore.value) : 0;
    const notesValue = promptNotes.value.trim() || null;

    if (!promptValue) {
        showFormStatus("Prompt text is required.", true);
        promptText.focus();
        return;
    }
    // ... (other validations: rating, nsfw score) ...
     if (ratingValue !== null && (ratingValue < 0 || ratingValue > 5)) {
        showFormStatus("Rating must be between 0 and 5.", true);
        promptRating.focus();
        return;
    }
     if (nsfwScoreValue < 0 || nsfwScoreValue > 1) {
        showFormStatus("NSFW Score must be between 0 and 1.", true);
        promptNsfwScore.focus();
        return;
    }

    const tagsArray = tagsValue ? tagsValue.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];

    const newPrompt = {
        prompt: promptValue,
        category: categoryValue,
        tags: tagsArray,
        rating: ratingValue,
        nsfw_score: nsfwScoreValue,
        notes: notesValue,
    };

    showFormStatus("Adding prompt...", false);

    try {
        const { data, error } = await supabaseClient
            .from('prompt_gallery') // Correct table name
            .insert([newPrompt])
            .select();

        if (error) {
            console.error("Error adding prompt:", error);
            showFormStatus(`Error: ${error.message}`, true);
        } else {
            showFormStatus("Prompt added successfully!", false);
            addPromptForm.reset();
            // *** Hide the form container after successful submission ***
            addPromptFormContainer.classList.add('hidden');
            toggleAddPromptBtn.textContent = 'Add New Prompt'; // Reset button text

            await fetchAndRenderPrompts(); // Refresh list
        }
    } catch (err) {
        console.error("Unexpected error adding prompt:", err);
        showFormStatus("An unexpected error occurred.", true);
    }
}

/**
 * Displays status messages below the add form.
 * @param {string} message - The message text.
 * @param {boolean} isError - If true, style as an error message.
 */
function showFormStatus(message, isError = false) {
    formStatus.textContent = message;
    formStatus.className = `status-message ${isError ? 'error' : 'success'}`;
}

/**
 * Simple HTML escaping function
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
 function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str
         .replace(/&/g, "&")
         .replace(/</g, "<")
         .replace(/>/g, ">")
         .replace(/"/g, "\"")
         .replace(/'/g, "'");
 }

// --- NEW Function to toggle Add Prompt form visibility ---
function toggleAddForm() {
    const isHidden = addPromptFormContainer.classList.toggle('hidden');
    if (isHidden) {
        toggleAddPromptBtn.textContent = 'Add New Prompt'; // Text when form is hidden
        showFormStatus(''); // Clear any previous status messages when hiding
    } else {
        toggleAddPromptBtn.textContent = 'Hide Form'; // Text when form is visible
        promptText.focus(); // Focus first field when showing
    }
}


// --- Event Listeners ---

// Add debouncing to search input to avoid excessive API calls
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchAndRenderPrompts();
    }, 300);
});
categoryFilter.addEventListener('change', fetchAndRenderPrompts);
dateFilter.addEventListener('change', fetchAndRenderPrompts);
sortControl.addEventListener('change', fetchAndRenderPrompts);

// Form Submission Listener (NO CHANGES NEEDED - still targets the form)
addPromptForm.addEventListener('submit', handleAddPrompt);

// *** NEW Listener for the toggle button ***
toggleAddPromptBtn.addEventListener('click', toggleAddForm);

// *** NEW Listener for the optional Cancel button ***
if (cancelAddPromptBtn) { // Check if the button exists
    cancelAddPromptBtn.addEventListener('click', () => {
        addPromptFormContainer.classList.add('hidden'); // Hide the form
        toggleAddPromptBtn.textContent = 'Add New Prompt'; // Reset main button text
        showFormStatus(''); // Clear status
        addPromptForm.reset(); // Optional: clear form fields on cancel
    });
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (supabaseClient) {
        fetchAndRenderPrompts(); // Fetch and render prompts on page load
    } else {
        // Display a persistent error if supabaseClient isn't working
        promptList.innerHTML = '<p class="error">Failed to connect to Supabase. Please check configuration and network.</p>';
        loadingMessage.style.display = 'none';
    }
});