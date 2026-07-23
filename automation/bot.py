import sys
import os

# ============================================================
# automation/bot.py
#
# What this does:
#   - Opens a real browser window
#   - Logs into one job site (Indeed or LinkedIn)
#   - Searches for 1 or more keywords/locations
#   - Open each job
#   - Fills pre-defined fields using CSS selectors from config
#   - Optional resume upload and cover letter paste
#   - Submits when you tell it to
#
# Default mode is SAFE:
#   - It opens the browser visibly.
#   - It pauses before any submit so a human can double-check.
# ============================================================

import argparse
import json
import time
import glob
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException


CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def css(cfg, *keys):
    """Walk nested selector dicts, return first css string found."""
    cur = cfg
    for k in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
        if cur is None:
            return None
    return cur


def wait_for(driver, selector, timeout=20, by=By.CSS_SELECTOR):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, selector))
    )


def safe_type(driver, selector, text):
    el = wait_for(driver, selector)
    el.clear()
    el.send_keys(text)


def safe_click(driver, selector, by=By.CSS_SELECTOR, timeout=20):
    el = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, selector))
    )
    el.click()


# ------------------------------------------------------------
# Site-specific flows
# ------------------------------------------------------------

class SiteBot:
    def __init__(self, driver, config, dry_run=True, delay=8):
        self.driver = driver
        self.config = config
        self.profile = config.get("profile", {})
        self.sites = config.get("sites", {})
        self.dry_run = dry_run
        self.delay = delay

    def open_url(self, url):
        self.driver.get(url)
        time.sleep(2)

    # ---- Indeed -------------------------------------------------

    def run_indeed(self, query, location=None):
        site = self.sites.get("indeed", {})
        sel = site.get("selectors", {})

        # 1) Search jobs
        q = query.replace(" ", "+")
        loc = (location or "").replace(" ", "+")
        url = site["search_url"].format(query=q, location=loc)
        print(f"[INDEDD] Searching: {url}")
        self.open_url(url)

        # 2) Grab job links from search results
        jobs = []
        try:
            links = self.driver.find_elements(By.CSS_SELECTOR, "a[data-jk]")
        except Exception:
            links = []

        for a in links:
            href = a.get_attribute("href")
            title = (a.text or "").strip()
            if href and href not in jobs:
                jobs.append((title, href))

        print(f"[INDEDD] Found {len(jobs)} jobs")
        self.apply_to_jobs("Indeed", jobs, sel)
        return jobs

    # ---- LinkedIn -----------------------------------------------

    def run_linkedin(self, query, location=None):
        site = self.sites.get("linkedin", {})
        sel = site.get("selectors", {})

        q = query.replace(" ", "%20")
        loc = (location or "").replace(" ", "%20")
        url = site["search_url"].format(query=q, location=loc)
        print(f"[LINKEDIN] Searching: {url}")
        self.open_url(url)

        jobs = []
        try:
            cards = self.driver.find_elements(By.CSS_SELECTOR, ".jobs-search-results__list-item")
        except Exception:
            cards = []

        for card in cards:
            try:
                link_el = card.find_element(By.CSS_SELECTOR, "a")
            except NoSuchElementException:
                continue
            href = link_el.get_attribute("href")
            title = (link_el.text or "").strip()
            if href and href not in jobs:
                jobs.append((title, href))

        print(f"[LINKEDIN] Found {len(jobs)} jobs")
        self.apply_to_jobs("LinkedIn", jobs, sel)
        return jobs

    # ---- Shared apply flow --------------------------------------

    def apply_to_jobs(self, site_name, jobs, sel):
        for title, url in jobs:
            print(f"\n>>> {site_name}: {title}")
            print(f"    {url}")
            try:
                self.driver.get(url)
                time.sleep(2)
            except Exception as e:
                print(f"    Could not open job page: {e}")
                continue

            if not self.dry_run:
                confirm = input("Submit this application? [y/N] ").strip().lower()
                if confirm != "y":
                    print("    Skipped")
                    time.sleep(self.delay)
                    continue

            try:
                self.try_apply(sel)
            except Exception as e:
                print(f"    Apply failed: {e}")

            time.sleep(self.delay)

    def try_apply(self, sel):
        # Click apply/start button if present
        candidates = [
            sel.get("apply_button"),
            sel.get("submit"),
        ]
        clicked = False
        for c in candidates:
            if not c:
                continue
            try:
                safe_click(self.driver, c)
                clicked = True
                print("    Opened application form")
                time.sleep(1)
                break
            except Exception:
                continue

        if not clicked:
            print("    No apply button detected; skipping")
            return

        # Fill fields (only if elements exist)
        fields = {
            "name": " ".join(filter(None, [self.profile.get("name", "")])),
            "email": self.profile.get("email", ""),
            "phone": self.profile.get("phone", ""),
        }

        mapping = {
            "name": sel.get("name"),
            "email": sel.get("email"),
            "phone": sel.get("phone"),
        }

        for field, selector in mapping.items():
            value = fields.get(field)
            if not value or not selector:
                continue
            try:
                safe_type(self.driver, selector, value)
                print(f"    Filled {field}")
            except Exception:
                pass

        # Resume upload (best-effort; only if file exists)
        resume_path = self.profile.get("resume_path", "")
        if resume_path and os.path.isfile(resume_path):
            try:
                file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
                file_input.send_keys(os.path.abspath(resume_path))
                print("    Uploaded resume")
            except Exception:
                pass

        # Cover letter: look for a textarea and paste
        cover_path = self.profile.get("cover_letter_path", "")
        if cover_path and os.path.isfile(cover_path):
            try:
                with open(cover_path, "r", encoding="utf-8") as f:
                    cover_text = f.read()
                ta = self.driver.find_element(By.CSS_SELECTOR, "textarea")
                ta.clear()
                ta.send_keys(cover_text)
                print("    Pasted cover letter")
            except Exception:
                pass

        if self.dry_run:
            print("    [dry-run] Would submit here")
        else:
            try:
                safe_click(self.driver, sel.get("submit", "button[type='submit']"))
                print("    Submitted")
            except Exception:
                print("    Submit button not found; leaving tab open")


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Simple job-apply bot (Selenium)")
    parser.add_argument("--site", choices=["indeed", "linkedin"], help="Which site to run")
    parser.add_argument("--q", help="Single keyword/query")
    parser.add_argument("--location", default="", help="Optional location override")
    parser.add_argument("--all", action="store_true", help="Run all keywords from config.json")
    parser.add_argument("--dry-run", action="store_true", help="Do not click submit")
    parser.add_argument("--delay", type=int, default=8, help="Seconds between jobs (default: 8)")
    args = parser.parse_args()

    config = load_config()
    profile = config.get("profile", {})

    if args.all:
        queries = config.get("keywords", [])
    elif args.q:
        queries = [args.q]
    else:
        queries = [input("Enter job keyword/query: ").strip()]

    if not queries:
        print("No queries. Put keywords in config.json or pass --q.")
        sys.exit(1)

    dry_run = args.dry_run or not profile.get("resume_path") or not os.path.isfile(profile.get("resume_path", ""))

    print(f"Mode: {'DRY RUN (no submit)' if dry_run else 'LIVE (will submit)'}")
    print(f"Queries: {queries}")
    input("Press Enter to launch browser...")

    options = webdriver.ChromeOptions()
    # Uncomment if you want headless (browser hidden):
    # options.add_argument("--headless=new")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.implicitly_wait(10)

    bot = SiteBot(driver, config, dry_run=dry_run, delay=args.delay)

    try:
        for q in queries:
            if args.site in ("indeed", None):
                bot.run_indeed(q, args.location or (config.get("default_location") or ""))
            if args.site in ("linkedin", None):
                bot.run_linkedin(q, args.location or (config.get("default_location") or ""))
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
