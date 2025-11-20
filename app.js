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

const HISTORY_OVERRIDE_KEY = 'pto_historyOverrides';

function createGlobalInstructions() {
    const template = document.getElementById('global-instructions-template');
    if (!template || !template.content) return null;
    const node = template.content.firstElementChild;
    return node ? node.cloneNode(true) : null;
}

function renderGlobalInstructions() {
    const instructions = createGlobalInstructions();
    if (!instructions) return;

    document.querySelectorAll('.global-instructions-container').forEach(container => {
        if (!container.dataset.rendered) {
            container.appendChild(instructions.cloneNode(true));
            container.dataset.rendered = 'true';
        }
    });
}

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
    const navBtn = document.querySelector(`.nav-btn[data-page="${pageName}"]`);
    if (navBtn) navBtn.classList.add('active');
    
    if (pageName === 'history') {
        loadHistory();
    } else if (pageName === 'profile') {
        checkProfileExists();
    } else if (pageName === 'outreach') {
        setTimeout(checkProfileWarning, 100);
    }
}

// Check if profile exists (from localStorage and backend)
let userProfileData = null;
let userFirstName = null;
let userProfileText = null;

function loadProfileFromStorage() {
    // Load from localStorage first (fast, works offline)
    const storedText = localStorage.getItem('pto_myProfileText');
    const storedName = localStorage.getItem('pto_myProfileName');
    
    if (storedText && storedText.trim().length > 0) {
        userProfileText = storedText;
        // Use stored name if available, otherwise extract it
        userFirstName = storedName || extractFirstName(storedText);
        // If we extracted a name, save it for future use
        if (!storedName && userFirstName) {
            localStorage.setItem('pto_myProfileName', userFirstName);
        }
        userProfileData = { profile_text: storedText };
        
        // Update UI to show saved state
        updateProfileUI(true);
        if (document.getElementById('profile-text')) {
            document.getElementById('profile-text').value = storedText;
        }
        return true;
    }
    return false;
}

async function checkProfileExists() {
    // First check localStorage (fast)
    if (loadProfileFromStorage()) {
        return true;
    }
    
    // Then check backend (for sync)
    try {
        const response = await fetch(`${API_BASE}/api/user/profile?uuid=${getUUID()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.exists) {
                userProfileData = data.profile;
                // Try to get profile text from backend if available
                // For now, rely on localStorage
                return false; // Will be handled by localStorage check
            }
        }
    } catch (error) {
        // Backend check failed, but localStorage might have it
    }
    
    updateProfileUI(false);
    return false;
}

function updateProfileUI(profileExists) {
    const statusDiv = document.getElementById('profile-status');
    const label = document.getElementById('profile-label');
    const helper = document.getElementById('profile-helper');
    const saveBtn = document.getElementById('profile-save-btn');
    const goToOutreachBtn = document.getElementById('go-to-outreach-btn');

    if (profileExists) {
        statusDiv.style.display = 'block';
        label.textContent = 'Update your LinkedIn profile text:';
        helper.textContent = 'Replace your saved LinkedIn profile to refresh personalization anytime.';
        saveBtn.textContent = 'Update Profile';
        if (goToOutreachBtn) {
            goToOutreachBtn.style.display = 'inline-block';
        }
    } else {
        statusDiv.style.display = 'none';
        label.textContent = 'Paste your full LinkedIn profile text below:';
        helper.textContent = 'Include your name, headline, About, Experience, Education, and Skills so we can personalize every message.';
        saveBtn.textContent = 'Save Profile';
        if (goToOutreachBtn) {
            goToOutreachBtn.style.display = 'none';
        }
    }
}

// Centralized name extraction helper - used for both my profile and target profile
function extractFirstName(profileText) {
    if (!profileText || typeof profileText !== 'string') return null;
    
    // Try to find name in common patterns
    const lines = profileText.split('\n').filter(line => line.trim());
    
    // Pattern 1: First line that looks like a name (1-3 words, capitalized)
    for (const line of lines.slice(0, 5)) {
        const trimmed = line.trim();
        // Skip lines that are clearly not names
        if (trimmed.length > 50 || trimmed.includes('@') || trimmed.includes('http') || 
            trimmed.toLowerCase().includes('linkedin') || trimmed.includes('|')) {
            continue;
        }
        const words = trimmed.split(/\s+/);
        if (words.length >= 1 && words.length <= 3) {
            const firstWord = words[0];
            // Check if it looks like a name (starts with capital, reasonable length, no special chars)
            if (firstWord.length >= 2 && firstWord.length <= 20 && 
                /^[A-Z][a-z]+$/.test(firstWord) && !firstWord.includes('.') && 
                !firstWord.toLowerCase().includes('view') && !firstWord.toLowerCase().includes('profile')) {
                return firstWord;
            }
        }
    }
    
    // Pattern 2: Look for "Name:" or similar patterns
    for (const line of lines) {
        const match = line.match(/(?:name|Name|NAME|Full Name|Full name)[:\s]+([A-Z][a-z]+)/i);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Pattern 3: Look for LinkedIn-style header (first capitalized word after common prefixes)
    for (const line of lines.slice(0, 3)) {
        const match = line.match(/^(?:Mr\.|Ms\.|Mrs\.|Dr\.)?\s*([A-Z][a-z]+)/);
        if (match && match[1]) {
            const name = match[1];
            // Additional validation
            if (name.length >= 2 && name.length <= 20 && 
                !name.toLowerCase().includes('view') && !name.toLowerCase().includes('profile')) {
                return name;
            }
        }
    }
    
    return null;
}

function extractCompanyFromText(text) {
    if (!text || typeof text !== 'string') return null;

    // Look for patterns like " at Company" or "@ Company"
    const companyMatch = text.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9&.,'\- ]{2,})/);
    if (companyMatch && companyMatch[1]) {
        return companyMatch[1].trim();
    }

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length > 1) {
        // Check headline or second line for company names separated by " at " or commas
        const headline = lines[1];
        const headlineMatch = headline.match(/(?: at |@)([A-Z][A-Za-z0-9&.,'\- ]{2,})/);
        if (headlineMatch && headlineMatch[1]) {
            return headlineMatch[1].trim();
        }
    }

    return null;
}

function extractCompanyFromProfile(profileData, profileText) {
    if (!profileData) profileData = {};

    if (profileData.current_company) {
        return profileData.current_company;
    }

    if (Array.isArray(profileData.work_history) && profileData.work_history.length > 0) {
        const company = profileData.work_history[0].company || profileData.work_history[0].organization;
        if (company) return company;
    }

    return extractCompanyFromText(profileText);
}

function formatContactTitle(name, company, fallbackDate) {
    if (name && company) return `${name} - ${company}`;
    if (name) return name;
    if (company) return company;
    if (fallbackDate) return `Saved outreach (${fallbackDate})`;
    return 'Saved outreach';
}

function deriveTitleFromEntry(entry, fallbackDate) {
    const targetProfile = entry?.target_profile || {};
    const profileText = entry?.target_profile_text || '';

    const name = entry.contact_name || targetProfile.full_name || targetProfile.name || targetProfile.first_name || targetProfile.firstName || extractFirstName(profileText);
    const company = entry.contact_company || extractCompanyFromProfile(targetProfile, profileText);
    return formatContactTitle(name, company, fallbackDate);
}

function deriveTitleFromPreview(preview, fallbackDate, contactName, contactCompany) {
    const name = contactName || extractFirstName(preview);
    const company = contactCompany || extractCompanyFromText(preview);
    return formatContactTitle(name, company, fallbackDate);
}

// Progress bar for profile save
function startProfileProgress() {
    const progressContainer = document.getElementById('profile-progress-container');
    const progressBar = document.getElementById('profile-progress-bar');
    progressContainer.classList.add('active');
    progressBar.style.width = '10%';
    
    let progress = 10;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 300);
    
    return interval;
}

function completeProfileProgress(interval) {
    if (interval) {
        clearInterval(interval);
    }
    const progressBar = document.getElementById('profile-progress-bar');
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        const progressContainer = document.getElementById('profile-progress-container');
        progressContainer.classList.remove('active');
        progressBar.style.width = '0%';
    }, 500);
}

function checkProfileWarning() {
    const warning = document.getElementById('profile-missing-warning');
    if (!warning) return;

    const storedProfile = (localStorage.getItem('pto_myProfileText') || '').trim();
    const hasProfile = !!(userProfileText || storedProfile);
    warning.style.display = hasProfile ? 'none' : 'block';
}

// Save profile
async function saveProfile() {
    const profileText = document.getElementById('profile-text').value.trim();
    const messageDiv = document.getElementById('profile-message');
    const saveBtn = document.getElementById('profile-save-btn');
    
    if (!profileText) {
        showMessage(messageDiv, 'Please enter your profile text', 'error');
        return;
    }
    
    // Disable button and show progress
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
        saveBtn.style.cursor = 'not-allowed';
    }
    const progressInterval = startProfileProgress();
    
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
            // Save to localStorage for persistence
            localStorage.setItem('pto_myProfileText', profileText);
            const extractedName = extractFirstName(profileText);
            if (extractedName) {
                localStorage.setItem('pto_myProfileName', extractedName);
            }
            
            userProfileData = { profile_text: profileText };
            userProfileText = profileText;
            userFirstName = extractedName;

            updateProfileUI(true);
            checkProfileWarning();
            showMessage(messageDiv, 'Profile saved successfully!', 'success');
            
            // Mark first visit as complete
            localStorage.setItem('pto_firstVisit', 'true');
            
            // Auto-route to Create Messages after successful save
            setTimeout(() => {
                showPage('outreach');
            }, 1000);
        } else {
            showMessage(messageDiv, data.message || 'Failed to save profile', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    } finally {
        completeProfileProgress(progressInterval);
        // Re-enable button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        }
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

// Centralized placeholder replacement helper
// This is the ONLY function that replaces placeholders - called once before saving/displaying
function replaceNamePlaceholders(text, targetName, userName) {
    if (!text || typeof text !== 'string') return text;
    
    // Get user name from localStorage if not provided
    if (!userName) {
        userName = localStorage.getItem('pto_myProfileName') || extractFirstName(localStorage.getItem('pto_myProfileText') || '');
    }
    
    // Replace target contact name placeholders
    if (targetName) {
        text = text.replace(/\[Name\]/gi, targetName);
        text = text.replace(/\[FIRST_NAME\]/gi, targetName);
        text = text.replace(/\[CONTACT_NAME\]/gi, targetName);
    } else {
        // Fallback to friendly greeting instead of placeholder
        text = text.replace(/\[Name\]/gi, 'Hi');
        text = text.replace(/\[FIRST_NAME\]/gi, 'Hi');
        text = text.replace(/\[CONTACT_NAME\]/gi, 'Hi');
        // Also handle "Hi [Name]" patterns
        text = text.replace(/Hi\s+\[Name\]/gi, 'Hi there');
        text = text.replace(/Hi\s+\[FIRST_NAME\]/gi, 'Hi there');
        text = text.replace(/Hi\s+\[CONTACT_NAME\]/gi, 'Hi there');
    }
    
    // Replace user's own name placeholders
    if (userName) {
        text = text.replace(/\[Your Name\]/gi, userName);
        text = text.replace(/\[MY_NAME\]/gi, userName);
        text = text.replace(/\[YOUR_NAME\]/gi, userName);
    } else {
        // Remove placeholder but keep the sentence structure
        text = text.replace(/\[Your Name\]/gi, '');
        text = text.replace(/\[MY_NAME\]/gi, '');
        text = text.replace(/\[YOUR_NAME\]/gi, '');
        // Clean up any double spaces
        text = text.replace(/\s+/g, ' ').trim();
    }
    
    // Final check: never show raw placeholders (catch any we missed)
    text = text.replace(/\[Name\]/gi, 'Hi');
    text = text.replace(/\[Your Name\]/gi, '');
    text = text.replace(/\[FIRST_NAME\]/gi, 'Hi');
    text = text.replace(/\[MY_NAME\]/gi, '');
    text = text.replace(/\[YOUR_NAME\]/gi, '');
    text = text.replace(/\[CONTACT_NAME\]/gi, 'Hi');
    
    return text;
}

function cacheHistoryMessages(historyId, messages) {
    if (!historyId || !messages) return;
    const existing = JSON.parse(localStorage.getItem(HISTORY_OVERRIDE_KEY) || '{}');
    existing[historyId] = messages;
    localStorage.setItem(HISTORY_OVERRIDE_KEY, JSON.stringify(existing));
}

function getHistoryOverride(historyId) {
    const existing = JSON.parse(localStorage.getItem(HISTORY_OVERRIDE_KEY) || '{}');
    return existing[historyId] || null;
}

function sanitizeHistoryMessage(message, entry) {
    if (!message) return '';

    let targetName = null;
    const targetProfile = entry?.target_profile || {};
    const targetProfileText = entry?.target_profile_text || '';

    targetName = targetProfile.full_name || targetProfile.name || targetProfile.first_name || targetProfile.firstName || null;
    if (!targetName) {
        targetName = extractFirstName(targetProfileText) || null;
    }

    const userName = localStorage.getItem('pto_myProfileName') || extractFirstName(localStorage.getItem('pto_myProfileText') || '');
    return replaceNamePlaceholders(message, targetName, userName);
}

async function generateOutreach() {
    const targetProfile = document.getElementById('target-profile').value.trim();
    const contextNote = document.getElementById('context-note').value.trim();
    const messageDiv = document.getElementById('outreach-message');
    const generateBtn = document.getElementById('generate-outreach-btn') || 
                       document.querySelector('#outreach-page .card button.btn-primary');
    
    if (!targetProfile) {
        showMessage(messageDiv, 'Please enter the target profile', 'error');
        return;
    }
    
    // Check if user profile exists
    if (!userProfileText) {
        showMessage(messageDiv, 'Please save your profile first in "Your Profile"', 'error');
        return;
    }
    
    // Extract target first name
    targetFirstName = extractFirstName(targetProfile);
    
    // Disable button and show progress
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.6';
        generateBtn.style.cursor = 'not-allowed';
    }
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

            // Replace name placeholders BEFORE saving or displaying
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
            const postConnectionFromResponse = replaceNamePlaceholders(
                data.followup_message || data.postConnectionFollowUp || data.post_connection_followup || data.post_connection_message,
                targetFirstName,
                userFirstName
            );

            currentMessages = {
                linkedin: linkedinMsg,
                postConnection: postConnectionFromResponse || '',
                email: emailMsg,
                followup: followupMsg
            };

            cacheHistoryMessages(currentHistoryId, currentMessages);

            // Display results (already processed, no placeholders)
            document.getElementById('linkedin-result').value = linkedinMsg;
            document.getElementById('post-connection-result').value = postConnectionFromResponse || 'Generating Post-Connection Follow-Up Message...';
            document.getElementById('email-result').value = emailMsg;
            document.getElementById('followup-result').value = followupMsg;

            // Note: History will store these processed messages, so no placeholders will appear there

            updateCharCounts();
            document.getElementById('outreach-results').style.display = 'block';

            if (postConnectionFromResponse) {
                showMessage(messageDiv, 'Outreach messages generated successfully!', 'success');
            } else {
                showMessage(messageDiv, 'Generating post-connection follow-up...', 'success');
                try {
                    const postConnectionMessage = await generatePostConnectionFollowup(currentHistoryId);
                    const processedPostConnection = replaceNamePlaceholders(
                        postConnectionMessage,
                        targetFirstName,
                        userFirstName
                    );
                    currentMessages.postConnection = processedPostConnection;
                    document.getElementById('post-connection-result').value = processedPostConnection;
                    cacheHistoryMessages(currentHistoryId, currentMessages);
                    updateCharCounts();
                    showMessage(messageDiv, 'Outreach messages generated successfully!', 'success');
                } catch (error) {
                    document.getElementById('post-connection-result').value = 'Could not generate the post-connection follow-up message. Please refresh and try again.';
                    updateCharCounts();
                    showMessage(messageDiv, `Follow-up generation error: ${error.message}`, 'error');
                }
            }
        } else {
            showMessage(messageDiv, 'Failed to generate outreach', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    } finally {
        completeProgress();
        // Re-enable button
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
            generateBtn.style.cursor = 'pointer';
        }
    }
}

async function generatePostConnectionFollowup(historyId) {
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
    if (!data.success) {
        throw new Error('Failed to generate post-connection follow-up');
    }

    return data.followup_message;
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
    document.getElementById('post-connection-result').value = '';
    targetFirstName = null;
    currentHistoryId = null;
    currentMessages = {};
}

// Update character counts
function updateCharCounts() {
    const linkedin = document.getElementById('linkedin-result').value;
    const postConnection = document.getElementById('post-connection-result').value;
    const email = document.getElementById('email-result').value;
    const followup = document.getElementById('followup-result').value;

    updateCharCount('linkedin-count', linkedin.length, 300);
    updateCharCount('post-connection-count', postConnection.length, 1200);
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
        'postConnection': 'post-connection-result',
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
                message_type: currentRefinementType === 'postConnection' ? 'followup' : currentRefinementType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update the appropriate textarea
            const resultMap = {
                'linkedin': 'linkedin-result',
                'postConnection': 'post-connection-result',
                'email': 'email-result',
                'followup': 'followup-result'
            };
            
            // Replace name placeholders in refined message BEFORE displaying
            const refinedWithNames = replaceNamePlaceholders(
                data.refined_message,
                targetFirstName,
                userFirstName
            );
            
            document.getElementById(resultMap[currentRefinementType]).value = refinedWithNames;
            updateCharCounts();
            showMessage(messageDiv, 'Message refined successfully!', 'success');

            // Update current messages (already processed, no placeholders)
            currentMessages[currentRefinementType] = refinedWithNames;
            if (currentHistoryId) {
                cacheHistoryMessages(currentHistoryId, currentMessages);
            }
        } else {
            showMessage(messageDiv, 'Failed to refine message', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, `Error: ${error.message}`, 'error');
    }
}

// History - sort newest first and use local timezone
async function loadHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<p>Loading...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/api/history/${getUUID()}`);
        const data = await response.json();
        
        if (data.success && data.history.length > 0) {
            historyList.innerHTML = '';
            
            // Sort by timestamp descending (newest first)
            const sortedHistory = [...data.history].sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeB - timeA; // Descending order
            });
            
            sortedHistory.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'card history-item';
                itemDiv.dataset.historyId = item.id;

                // Use local timezone for display
                const localDate = new Date(item.timestamp);
                const formattedDate = localDate.toLocaleString();

                const contactTitle = deriveTitleFromPreview(
                    item.target_preview || '',
                    formattedDate,
                    item.contact_name,
                    item.contact_company
                );

                itemDiv.innerHTML = `
                    <h4 class="history-title">${contactTitle}</h4>
                    <p class="history-subtext">Saved on ${formattedDate}</p>
                    <div class="meta">
                        <span class="status ${item.status}">${item.status}</span>
                        <span class="preview-text">${item.target_preview || ''}...</span>
                    </div>
                    <button class="btn-secondary" onclick="viewHistoryEntry('${item.id}')">View Messages</button>
                `;
                historyList.appendChild(itemDiv);
            });
        } else {
            historyList.innerHTML = '<p>No saved messages yet.</p>';
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
            const override = getHistoryOverride(historyId);
            const detailDiv = document.createElement('div');
            detailDiv.className = 'history-detail card';

            const itemCard = document.querySelector(`.history-item[data-history-id="${historyId}"]`);
            if (itemCard) {
                const localDate = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
                const refinedTitle = deriveTitleFromEntry(entry, localDate);
                const titleEl = itemCard.querySelector('.history-title');
                if (titleEl) titleEl.textContent = refinedTitle;
                const subtextEl = itemCard.querySelector('.history-subtext');
                if (subtextEl && localDate) subtextEl.textContent = `Saved on ${localDate}`;
            }

            // Escape text for HTML but preserve newlines
            const escapeHtml = (text) => {
                if (!text) return '';
                return text.replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/"/g, '&quot;')
                          .replace(/'/g, '&#039;');
            };

            const processedLinkedIn = override?.linkedin || sanitizeHistoryMessage(entry.linkedin_connection_request, entry);
            const processedPostConnection = override?.postConnection || sanitizeHistoryMessage(entry.followup_message, entry);
            const processedEmail = override?.email || sanitizeHistoryMessage(entry.cold_outreach_email, entry);
            const processedFollowup = override?.followup || sanitizeHistoryMessage(entry.followup_template, entry);

            const linkedinText = escapeHtml(processedLinkedIn || '');
            const postConnectionText = escapeHtml(processedPostConnection || '');
            const emailText = escapeHtml(processedEmail || '');
            const followupText = escapeHtml(processedFollowup || '');

            detailDiv.innerHTML = `
                <h4>LinkedIn Connection Request</h4>
                <p class="helper-text">A short note (up to 300 characters) to include with your LinkedIn invitation.</p>
                <div class="message-card">
                    <textarea readonly>${linkedinText}</textarea>
                    <button class="copy-btn" onclick="copyMessageFromText('${(processedLinkedIn || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}', this)">Copy</button>
                </div>
                <h4>Post-Connection Follow-Up Message</h4>
                <p class="helper-text">This is the message to send after they accept your LinkedIn connection request.</p>
                <div class="message-card">
                    <textarea readonly>${postConnectionText}</textarea>
                    <button class="copy-btn" onclick="copyMessageFromText('${(processedPostConnection || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}', this)">Copy</button>
                </div>
                <h4>Cold Outreach Email</h4>
                <p class="helper-text">A longer email you can send if you prefer email outreach.</p>
                <div class="message-card">
                    <textarea readonly>${emailText}</textarea>
                    <button class="copy-btn" onclick="copyMessageFromText('${(processedEmail || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}', this)">Copy</button>
                </div>
                <h4>Email Follow-Up Message</h4>
                <p class="helper-text">This is the message to send if they do not respond to your initial email.</p>
                <div class="message-card">
                    <textarea readonly>${followupText}</textarea>
                    <button class="copy-btn" onclick="copyMessageFromText('${(processedFollowup || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}', this)">Copy</button>
                </div>
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

// Utility
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
}

function determineInitialPage() {
    const firstVisitFlag = localStorage.getItem('pto_firstVisit');
    const storedProfile = (localStorage.getItem('pto_myProfileText') || '').trim();

    if (!firstVisitFlag) {
        localStorage.setItem('pto_firstVisit', 'true');
        return 'profile';
    }

    return storedProfile ? 'outreach' : 'profile';
}

function initializeApp() {
    renderGlobalInstructions();
    getUUID();

    const goToOutreachBtn = document.getElementById('go-to-outreach-btn');
    if (goToOutreachBtn) {
        goToOutreachBtn.addEventListener('click', () => showPage('outreach'));
    }

    // Hydrate profile from storage on every load
    const hasProfile = loadProfileFromStorage();
    if (!hasProfile) {
        updateProfileUI(false);
    }

    checkProfileWarning();

    const defaultPage = determineInitialPage();
    showPage(defaultPage);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add character count listeners
    ['linkedin-result', 'post-connection-result', 'email-result', 'followup-result'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCharCounts);
        }
    });
    
    // Initialize app flow (handles first visit, profile check, etc.)
    initializeApp();
});

