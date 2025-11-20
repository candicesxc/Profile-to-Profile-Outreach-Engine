// API base URL - auto-detect environment
const API_BASE = (() => {
    // If running locally (localhost or 127.0.0.1)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }
    // If running on GitHub Pages, use deployed backend
    // Replace this URL with your actual deployed backend URL (e.g., Render, Railway, Fly.io)
    return 'https://profile-to-profile-outreach-engine.onrender.com';  // TODO: Replace with your deployed backend URL
})();

// Get or create UUID
function getUUID() {
    let uuid = localStorage.getItem('outreach_uuid');
    if (!uuid) {
        uuid = generateUUID();
        localStorage.setItem('outreach_uuid', uuid);
    }
    return uuid;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Page navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // Update nav button active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[data-page="${pageName}"]`).classList.add('active');
    
    if (pageName === 'history') {
        loadHistory();
    } else if (pageName === 'profile') {
        checkProfileExists();
    }
}

// Check if profile exists
let userProfileData = null;
let userFirstName = null;
let userProfileText = null;

async function checkProfileExists() {
    try {
        const response = await fetch(`${API_BASE}/api/user/profile?uuid=${getUUID()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.exists) {
                userProfileData = data.profile;
                // Try to get profile text from stored data or fetch it
                // For now, we'll just mark it as existing
                userFirstName = extractFirstName(userProfileText || '');
                updateProfileUI(true);
                return true;
            }
        }
    } catch (error) {
        // Profile doesn't exist or error - that's okay
    }
    updateProfileUI(false);
    return false;
}

function updateProfileUI(profileExists) {
    const statusDiv = document.getElementById('profile-status');
    const label = document.getElementById('profile-label');
    const helper = document.getElementById('profile-helper');
    const saveBtn = document.getElementById('profile-save-btn');
    
    if (profileExists) {
        statusDiv.style.display = 'block';
        label.textContent = 'Update your profile';
        helper.textContent = 'Paste a new LinkedIn profile here if you want to replace your current one.';
        saveBtn.textContent = 'Update Profile';
    } else {
        statusDiv.style.display = 'none';
        label.textContent = 'Paste your LinkedIn profile text below:';
        helper.textContent = 'This will be used to personalize your outreach messages.';
        saveBtn.textContent = 'Save Profile';
    }
}

// Extract first name from profile text
function extractFirstName(profileText) {
    if (!profileText) return null;
    
    // Try to find name in common patterns
    const lines = profileText.split('\n').filter(line => line.trim());
    
    // Pattern 1: First line that looks like a name (2-3 words, capitalized)
    for (const line of lines.slice(0, 5)) {
        const trimmed = line.trim();
        const words = trimmed.split(/\s+/);
        if (words.length >= 1 && words.length <= 3) {
            const firstWord = words[0];
            // Check if it looks like a name (starts with capital, reasonable length)
            if (firstWord.length >= 2 && firstWord.length <= 20 && 
                /^[A-Z][a-z]+$/.test(firstWord)) {
                return firstWord;
            }
        }
    }
    
    // Pattern 2: Look for "Name:" or similar patterns
    for (const line of lines) {
        const match = line.match(/(?:name|Name|NAME)[:\s]+([A-Z][a-z]+)/i);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Save profile
async function saveProfile() {
    const profileText = document.getElementById('profile-text').value.trim();
    const messageDiv = document.getElementById('profile-message');
    
    if (!profileText) {
        showMessage(messageDiv, 'Please enter your profile text', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/user/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uuid: getUUID(),
                profile_text: profileText
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            userProfileData = { profile_text: profileText };
            userProfileText = profileText;
            userFirstName = extractFirstName(profileText);
            updateProfileUI(true);
            showMessage(messageDiv, 'Profile saved successfully!', 'success');
            // Don't clear the textarea - let user see what they saved
        } else {
            showMessage(messageDiv, data.message || 'Failed to save profile', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
}

// Generate outreach
let currentHistoryId = null;
let currentMessages = {};
let targetFirstName = null;

// Progress bar management
let progressInterval = null;

function startProgress() {
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    progressContainer.classList.add('active');
    progressBar.style.width = '10%';
    
    let progress = 10;
    progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 500);
}

function completeProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        const progressContainer = document.getElementById('progress-container');
        progressContainer.classList.remove('active');
        progressBar.style.width = '0%';
    }, 500);
}

// Replace placeholders with actual names
function replaceNamePlaceholders(text, targetName, userName) {
    if (!text) return text;
    
    // Replace common placeholders
    text = text.replace(/\[Name\]/gi, targetName || '[Name]');
    text = text.replace(/\[Your Name\]/gi, userName || '[Your Name]');
    text = text.replace(/\[FIRST_NAME\]/gi, targetName || '[FIRST_NAME]');
    text = text.replace(/\[MY_NAME\]/gi, userName || '[MY_NAME]');
    
    return text;
}

async function generateOutreach() {
    const targetProfile = document.getElementById('target-profile').value.trim();
    const contextNote = document.getElementById('context-note').value.trim();
    const messageDiv = document.getElementById('outreach-message');
    
    if (!targetProfile) {
        showMessage(messageDiv, 'Please enter the target profile', 'error');
        return;
    }
    
    // Extract target first name
    targetFirstName = extractFirstName(targetProfile);
    
    // Start progress bar
    startProgress();
    showMessage(messageDiv, 'Generating outreach messages...', 'success');
    
    try {
        const response = await fetch(`${API_BASE}/api/outreach/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uuid: getUUID(),
                target_profile: targetProfile,
                context_note: contextNote
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentHistoryId = data.history_id;
            
            // Replace name placeholders
            const linkedinMsg = replaceNamePlaceholders(
                data.linkedin_connection_request, 
                targetFirstName, 
                userFirstName
            );
            const emailMsg = replaceNamePlaceholders(
                data.cold_outreach_email, 
                targetFirstName, 
                userFirstName
            );
            const followupMsg = replaceNamePlaceholders(
                data.followup_template, 
                targetFirstName, 
                userFirstName
            );
            
            currentMessages = {
                linkedin: linkedinMsg,
                email: emailMsg,
                followup: followupMsg
            };
            
            // Display results
            document.getElementById('linkedin-result').value = linkedinMsg;
            document.getElementById('email-result').value = emailMsg;
            document.getElementById('followup-result').value = followupMsg;
            
            updateCharCounts();
            document.getElementById('outreach-results').style.display = 'block';
            showMessage(messageDiv, 'Outreach messages generated successfully!', 'success');
        } else {
            showMessage(messageDiv, 'Failed to generate outreach', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    } finally {
        completeProgress();
    }
}

// Copy message to clipboard
async function copyMessage(textareaId, button) {
    const textarea = document.getElementById(textareaId);
    const text = textarea.value;
    await copyTextToClipboard(text, button);
}

// Copy text directly (for history entries)
async function copyMessageFromText(text, button) {
    await copyTextToClipboard(text, button);
}

async function copyTextToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }
}

// Clear outreach fields for new person
function clearOutreachFields() {
    document.getElementById('target-profile').value = '';
    document.getElementById('context-note').value = '';
    document.getElementById('outreach-results').style.display = 'none';
    document.getElementById('outreach-message').style.display = 'none';
    targetFirstName = null;
    currentHistoryId = null;
    currentMessages = {};
}

// Update character counts
function updateCharCounts() {
    const linkedin = document.getElementById('linkedin-result').value;
    const email = document.getElementById('email-result').value;
    const followup = document.getElementById('followup-result').value;
    
    updateCharCount('linkedin-count', linkedin.length, 300);
    updateCharCount('email-count', email.length, 1200);
    updateCharCount('followup-count', followup.length, 1200);
}

function updateCharCount(elementId, count, limit) {
    const element = document.getElementById(elementId);
    element.textContent = `${count} / ${limit} characters`;
    element.className = 'char-count';
    if (count > limit) {
        element.classList.add('error');
    } else if (count > limit * 0.9) {
        element.classList.add('warning');
    }
}

// Refinement
let currentRefinementType = null;
let currentRefinementMessage = null;

function refineMessage(type) {
    currentRefinementType = type;
    const messageMap = {
        'linkedin': 'linkedin-result',
        'email': 'email-result',
        'followup': 'followup-result'
    };
    
    currentRefinementMessage = document.getElementById(messageMap[type]).value;
    document.getElementById('refinement-instructions').value = '';
    document.getElementById('refinement-message').style.display = 'none';
    document.getElementById('refinement-modal').style.display = 'flex';
}

function closeRefinementModal() {
    document.getElementById('refinement-modal').style.display = 'none';
}

async function applyRefinement() {
    const instructions = document.getElementById('refinement-instructions').value.trim();
    const messageDiv = document.getElementById('refinement-message');
    
    if (!instructions) {
        showMessage(messageDiv, 'Please enter refinement instructions', 'error');
        return;
    }
    
    try {
        showMessage(messageDiv, 'Refining message...', 'success');
        
        const response = await fetch(`${API_BASE}/api/outreach/refine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uuid: getUUID(),
                message: currentRefinementMessage,
                refinement_instructions: instructions,
                message_type: currentRefinementType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update the appropriate textarea
            const resultMap = {
                'linkedin': 'linkedin-result',
                'email': 'email-result',
                'followup': 'followup-result'
            };
            
            // Replace name placeholders in refined message
            const refinedWithNames = replaceNamePlaceholders(
                data.refined_message,
                targetFirstName,
                userFirstName
            );
            
            document.getElementById(resultMap[currentRefinementType]).value = refinedWithNames;
            updateCharCounts();
            showMessage(messageDiv, 'Message refined successfully!', 'success');
            
            // Update current messages
            currentMessages[currentRefinementType] = refinedWithNames;
        } else {
            showMessage(messageDiv, 'Failed to refine message', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
}

// History
async function loadHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<p>Loading...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/api/history/${getUUID()}`);
        const data = await response.json();
        
        if (data.success && data.history.length > 0) {
            historyList.innerHTML = '';
            data.history.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'card history-item';
                itemDiv.innerHTML = `
                    <h4>Outreach ${new Date(item.timestamp).toLocaleString()}</h4>
                    <div class="meta">
                        <span class="status ${item.status}">${item.status}</span>
                        <span>${item.target_preview}...</span>
                    </div>
                    <button class="btn-secondary" onclick="viewHistoryEntry('${item.id}')">View Details</button>
                    ${item.status === 'draft' ? `<button class="btn-primary" onclick="markAccepted('${item.id}')">Mark Accepted</button>` : ''}
                `;
                historyList.appendChild(itemDiv);
            });
        } else {
            historyList.innerHTML = '<p>No outreach history yet.</p>';
        }
    } catch (error) {
        historyList.innerHTML = `<p class="error">Error loading history: ${error.message}</p>`;
    }
}

async function viewHistoryEntry(historyId) {
    try {
        const response = await fetch(`${API_BASE}/api/history/${getUUID()}/${historyId}`);
        const data = await response.json();
        
        if (data.success) {
            const entry = data.entry;
            const detailDiv = document.createElement('div');
            detailDiv.className = 'history-detail card';
            detailDiv.innerHTML = `
                <h4>LinkedIn Connection Request</h4>
                <div class="message-card">
                    <button class="copy-btn" onclick="copyMessageFromText('${(entry.linkedin_connection_request || '').replace(/'/g, "\\'")}', this)">Copy</button>
                    <textarea readonly>${entry.linkedin_connection_request || ''}</textarea>
                </div>
                <h4>Cold Outreach Email</h4>
                <div class="message-card">
                    <button class="copy-btn" onclick="copyMessageFromText('${(entry.cold_outreach_email || '').replace(/'/g, "\\'")}', this)">Copy</button>
                    <textarea readonly>${entry.cold_outreach_email || ''}</textarea>
                </div>
                <h4>Follow-Up Template</h4>
                <div class="message-card">
                    <button class="copy-btn" onclick="copyMessageFromText('${(entry.followup_template || '').replace(/'/g, "\\'")}', this)">Copy</button>
                    <textarea readonly>${entry.followup_template || ''}</textarea>
                </div>
                ${entry.followup_message ? `
                <h4>Follow-Up Message</h4>
                <div class="message-card">
                    <button class="copy-btn" onclick="copyMessageFromText('${entry.followup_message.replace(/'/g, "\\'")}', this)">Copy</button>
                    <textarea readonly>${entry.followup_message}</textarea>
                </div>
                ` : ''}
            `;
            
            // Find the history item and append detail
            const historyItems = document.querySelectorAll('.history-item');
            historyItems.forEach(item => {
                if (item.querySelector(`button[onclick="viewHistoryEntry('${historyId}')"]`)) {
                    // Remove existing detail if any
                    const existingDetail = item.querySelector('.history-detail');
                    if (existingDetail) {
                        existingDetail.remove();
                    }
                    item.appendChild(detailDiv);
                }
            });
        }
    } catch (error) {
        alert(`Error loading entry: ${error.message}`);
    }
}

async function markAccepted(historyId) {
    if (!confirm('Mark this outreach as accepted? This will generate a follow-up message.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/outreach/followup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uuid: getUUID(),
                history_id: historyId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Follow-up message generated! Refresh to see it.');
            loadHistory();
        } else {
            alert('Failed to generate follow-up');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Utility
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure UUID is created
    getUUID();
    
    // Check if profile exists on load
    checkProfileExists();
    
    // Add character count listeners
    ['linkedin-result', 'email-result', 'followup-result'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCharCounts);
        }
    });
    
    // Set initial active nav button
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        const pageId = currentPage.id.replace('-page', '');
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
    }
});

