// API base URL
const API_BASE = 'http://localhost:8000';

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
    
    if (pageName === 'history') {
        loadHistory();
    }
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
            showMessage(messageDiv, 'Profile saved successfully!', 'success');
            document.getElementById('profile-text').value = '';
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

async function generateOutreach() {
    const targetProfile = document.getElementById('target-profile').value.trim();
    const contextNote = document.getElementById('context-note').value.trim();
    const messageDiv = document.getElementById('outreach-message');
    
    if (!targetProfile) {
        showMessage(messageDiv, 'Please enter the target profile', 'error');
        return;
    }
    
    try {
        showMessage(messageDiv, 'Generating outreach messages...', 'success');
        
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
            currentMessages = {
                linkedin: data.linkedin_connection_request,
                email: data.cold_outreach_email,
                followup: data.followup_template
            };
            
            // Display results
            document.getElementById('linkedin-result').value = data.linkedin_connection_request;
            document.getElementById('email-result').value = data.cold_outreach_email;
            document.getElementById('followup-result').value = data.followup_template;
            
            updateCharCounts();
            document.getElementById('outreach-results').style.display = 'block';
            showMessage(messageDiv, 'Outreach messages generated successfully!', 'success');
        } else {
            showMessage(messageDiv, 'Failed to generate outreach', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
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
            
            document.getElementById(resultMap[currentRefinementType]).value = data.refined_message;
            updateCharCounts();
            showMessage(messageDiv, 'Message refined successfully!', 'success');
            
            // Update current messages
            currentMessages[currentRefinementType] = data.refined_message;
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
                itemDiv.className = 'history-item';
                itemDiv.innerHTML = `
                    <h4>Outreach ${new Date(item.timestamp).toLocaleString()}</h4>
                    <div class="meta">
                        <span class="status ${item.status}">${item.status}</span>
                        <span>${item.target_preview}...</span>
                    </div>
                    <button onclick="viewHistoryEntry('${item.id}')">View Details</button>
                    ${item.status === 'draft' ? `<button onclick="markAccepted('${item.id}')">Mark Accepted</button>` : ''}
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
            detailDiv.className = 'history-detail';
            detailDiv.innerHTML = `
                <h4>LinkedIn Connection Request</h4>
                <textarea readonly>${entry.linkedin_connection_request || ''}</textarea>
                <h4>Cold Outreach Email</h4>
                <textarea readonly>${entry.cold_outreach_email || ''}</textarea>
                <h4>Follow-Up Template</h4>
                <textarea readonly>${entry.followup_template || ''}</textarea>
                ${entry.followup_message ? `<h4>Follow-Up Message</h4><textarea readonly>${entry.followup_message}</textarea>` : ''}
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
    
    // Add character count listeners
    ['linkedin-result', 'email-result', 'followup-result'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCharCounts);
        }
    });
});

