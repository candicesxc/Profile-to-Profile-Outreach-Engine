# Profile-to-Profile Outreach Engine

A full-stack web tool that generates personalized LinkedIn connection requests, cold outreach emails, and follow-up messages using pasted LinkedIn profile text and optional contextual free text.

## Features

- **Anonymous User System**: UUID-based user identification (no login required)
- **Profile Extraction**: Automatically extracts structured data from LinkedIn profiles
- **Personalized Outreach**: Generates three types of messages:
  - LinkedIn Connection Requests (≤300 characters)
  - Cold Outreach Emails (≤1200 characters)
  - Follow-Up Templates (≤1200 characters)
- **Message Refinement**: Free-text instructions to refine messages
- **Overlap Analysis**: Finds shared companies, schools, industries, and skills
- **External Insights**: Uses Exa Search API for relevant company/role insights
- **History Tracking**: Stores all outreach attempts with timestamps

## Tech Stack

- **Backend**: FastAPI
- **AI Agents**: CrewAI (with OpenAI API)
- **Search**: Exa Search API
- **Frontend**: HTML, CSS, JavaScript
- **Storage**: JSON-based persistent storage

## Setup

### Prerequisites

- Python 3.8+
- OpenAI API key
- Exa API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Outreach-Engine
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
EXA_API_KEY=your_exa_api_key_here
```

**⚠️ SECURITY NOTE**: The `.env` file is automatically ignored by git (see `.gitignore`). Never commit API keys to the repository. The `.env` file should remain local and private.

4. Start the backend server:
```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

5. Open the frontend:
   - Open `frontend/index.html` in a web browser, or
   - Serve it using a local web server (e.g., `python -m http.server 8080` in the frontend directory)

## Usage

### 1. Save Your Profile

1. Navigate to the "My Profile" page
2. Paste your LinkedIn profile text
3. Click "Save Profile"

### 2. Generate Outreach

1. Go to the "Generate Outreach" page
2. Paste the target person's LinkedIn profile (required)
3. Optionally add a context note (e.g., "Met at AWS Summit", "Also in fintech")
4. Click "Generate Outreach"
5. Review the three generated messages
6. Use "Refine" buttons to customize messages with free-text instructions

### 3. View History

1. Go to the "History" page
2. View all past outreach attempts
3. Click "View Details" to see full messages
4. Mark outreach as "Accepted" to generate a follow-up message

## API Endpoints

### POST `/api/user/profile`
Save and embed user profile.

**Request:**
```json
{
  "uuid": "user-uuid",
  "profile_text": "LinkedIn profile text..."
}
```

### POST `/api/outreach/generate`
Generate outreach messages.

**Request:**
```json
{
  "uuid": "user-uuid",
  "target_profile": "Target LinkedIn profile text...",
  "context_note": "Optional context note..."
}
```

### POST `/api/outreach/refine`
Refine a message based on instructions.

**Request:**
```json
{
  "uuid": "user-uuid",
  "message": "Original message...",
  "refinement_instructions": "shorter and warmer",
  "message_type": "linkedin"
}
```

### POST `/api/outreach/followup`
Generate follow-up message when outreach is accepted.

**Request:**
```json
{
  "uuid": "user-uuid",
  "history_id": "history-entry-id"
}
```

### GET `/api/history/{uuid}`
Get user's outreach history.

### GET `/api/history/{uuid}/{history_id}`
Get a specific history entry.

## Character Limits

- **LinkedIn Connection Request**: 300 characters (strictly enforced)
- **Cold Outreach Email**: 1200 characters (strictly enforced)
- **Follow-Up Message**: 1200 characters (strictly enforced)

All messages are automatically shortened if they exceed limits while preserving clarity and personalization.

## Project Structure

```
Outreach-Engine/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── agents/              # CrewAI agents
│   │   ├── extractor_agent.py
│   │   ├── overlap_agent.py
│   │   ├── search_agent.py
│   │   ├── message_draft_agent.py
│   │   ├── refinement_agent.py
│   │   └── followup_agent.py
│   ├── logic/               # Utility functions
│   │   ├── sanitizer.py
│   │   ├── storage.py
│   │   ├── context_parser.py
│   │   └── embeddings.py
│   └── data/                # User data (gitignored)
│       └── users/
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── requirements.txt
└── README.md
```

## Notes

- All user data is stored locally in `backend/data/users/{uuid}/`
- No authentication or login system required
- UUID is stored in browser localStorage
- All inputs are sanitized before processing
- Character limits are strictly enforced
- **Model Note**: The project uses `gpt-4o` for message generation (as `gpt-5.1` is not yet available). Update the model in `backend/agents/message_draft_agent.py` when `gpt-5.1` becomes available.

## License

MIT

