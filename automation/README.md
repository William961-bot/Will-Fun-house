# Automation - Job Apply Bot Starter

Minimal, easy-to-read job auto-apply starter.

What it does:
- Opens a real Chrome browser window
- Logs into Indeed or LinkedIn
- Searches for jobs by keyword and location
- Opens each job posting
- Fills form fields from config.json
- Optional resume upload and cover letter paste
- Safe defaults: dry-run by default, submit only after human confirmation

## Setup

1. Install dependencies

    pip install -r requirements.txt

2. Copy the example config and edit it

    cp config.example.json config.json

   At minimum fill in:
   - profile.name, profile.email, profile.phone
   - profile.resume_path
   - keywords[ ]

3. Run

    python bot.py --site indeed --q "software engineer" --location "New York, NY"

   or

    python bot.py --all

## Flags

- --site linkedin|indeed
- --q "search query"
- --location "City, ST"
- --all
- --dry-run
- --delay 8
