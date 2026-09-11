# Personas
## Expense Tracker

| Field | Value |
|-------|-------|
| **Product Name** | Expense Tracker |
| **Date** | 2026-09-11 |
| **Related PRD** | PRD-ExpenseTracker.md |

---

## Persona Summary

| ID | Name | Role | Primary Goal |
|----|------|------|-------------|
| PER-01 | Maya Rodriguez | Daily Expense Tracker | Record every expense quickly so she always knows where her money goes |
| PER-02 | Tom Langford | Periodic Batch Logger | Enter a week's worth of receipts in one sitting without losing any data |
| PER-03 | Priya Nair | Developer / Self-Hoster | Set up and maintain a reliable personal finance tool she fully controls |

---

## PER-01: Maya Rodriguez

**Role & Context:**
Maya is a 29-year-old marketing coordinator who has been trying to get a handle on her day-to-day spending. She opens the expense tracker on her laptop browser first thing in the morning to log yesterday's purchases and again during lunch to capture anything from the morning. She typically adds 3–5 expenses per day, each taking only a few seconds. Her browser stays open to the app throughout the workday, and she glances at the running total regularly to gauge whether she's staying within her informal weekly budget.

Maya has tried budgeting apps before — Mint, YNAB, various spreadsheet templates — but found them overwhelming. She doesn't want to link bank accounts, configure categories from a dropdown of 40 options, or navigate multi-screen wizards. She wants a single page where she types an amount, a short note, and a category, hits submit, and moves on.

**Goals:**
- Add a new expense in under 15 seconds with minimal friction (F0, F5)
- See her cumulative spending total at a glance to self-regulate daily (F4, F5)
- Correct a typo or wrong amount on a recent entry without re-entering the whole record (F1)
- Trust that all her entries are still there tomorrow morning when she opens the app (F2)

**Pain Points:**
- Previous tools required too many steps — account creation, category configuration, syncing — before she could log a single expense
- Spreadsheets demand manual total recalculation and are easy to corrupt with a stray keystroke
- Browser-only solutions (localStorage) have lost her data after clearing cookies, destroying weeks of entries
- Complex apps bury the entry form behind navigation menus, slowing her down

**Technical Expertise:** Intermediate — comfortable with web applications and browser tabs, does not use command-line tools or developer workflows

**Top Tasks:**
1. Enter a new expense with amount, description, and category (3–5 times daily, critical)
2. Review the expense list and running total to check spending pace (2–3 times daily, high)
3. Edit a recently entered expense to fix a mistake (2–3 times per week, medium)
4. Scan the list to recall what she spent on yesterday (daily, medium)

**Success Criteria:**
- Completes a full expense entry (all three fields + submit) in under 10 seconds
- Running total is always visible without scrolling or clicking
- Edits an existing expense and sees the corrected total within 2 seconds
- Opens the app after an overnight gap and finds all previous entries intact

---

## PER-02: Tom Langford

**Role & Context:**
Tom is a 42-year-old freelance photographer who tracks business-related expenses for tax purposes. He doesn't log expenses as they happen — instead, he collects receipts in his wallet and a phone photo folder throughout the week, then sits down on Sunday evening to enter them all at once. A typical session involves entering 10–20 expenses in rapid succession, often referencing crumpled receipts and squinting at faded ink.

Tom's priority is reliability over speed. He can tolerate a few extra seconds per entry, but he cannot tolerate data loss. If the app crashes or the page refreshes mid-session and his entries vanish, he's lost receipts he may not be able to reconstruct. He also frequently makes mistakes during batch entry — transposing digits, assigning the wrong category — and needs to go back and fix them without disrupting his flow.

**Goals:**
- Enter a batch of 10–20 expenses in a single session without any data loss (F0, F2)
- Edit multiple expenses in sequence to correct category or amount errors after batch entry (F1)
- Review the full expense list to cross-check against physical receipts (F3)
- See the session's total to reconcile against his receipt stack (F4)

**Pain Points:**
- Has lost data in browser-based tools that relied on localStorage after accidental tab closure during batch entry
- Spreadsheets require manual formulas and become unwieldy past 100 rows, with no easy edit-in-place capability
- Sticky notes and memory fail him — receipts fade, amounts get forgotten, and deductions are missed at tax time
- Apps that require internet connectivity are unreliable when he enters expenses from a rural studio with spotty Wi-Fi

**Technical Expertise:** Novice — uses web apps for email and invoicing but avoids anything that requires configuration, installation, or terminal commands

**Top Tasks:**
1. Enter 10–20 expenses in rapid succession during a weekly batch session (weekly, critical)
2. Edit 3–5 expenses immediately after batch entry to correct errors (weekly, high)
3. Review the complete expense list to verify all receipts are accounted for (weekly, high)
4. Check the total amount to reconcile against receipt stack (weekly, medium)

**Success Criteria:**
- All expenses entered during a batch session are persisted — zero entries lost if the browser tab is accidentally closed
- Can edit an expense and immediately see the updated value in the list and recalculated total
- The expense list loads completely in under 1 second even after 500+ accumulated entries
- No data is lost after a server restart between weekly sessions

---

## PER-03: Priya Nair

**Role & Context:**
Priya is a 34-year-old backend software engineer who prefers self-hosted tools over SaaS products for personal data. She chose Expense Tracker specifically because it runs locally with a single command, stores data on her own machine, and doesn't require an account or cloud sync. She set up the app on her home server and accesses it via a local network URL from her laptop and tablet.

While Priya uses the app daily for her own expense tracking (similar to PER-01), her distinct need is around setup, maintenance, and future extensibility. She evaluates the app's architecture for cleanness, expects the storage layer to be inspectable (she'll occasionally query the SQLite file or JSON store directly), and considers whether the codebase is modular enough to add features like delete, filtering, or CSV export herself. She's the persona who files issues, reads source code, and may contribute patches.

**Goals:**
- Start the application with a single terminal command and have it immediately usable (F5, F2)
- Trust that the persistent storage layer is robust and inspectable — no opaque data formats (F2)
- Use the same entry, edit, and review workflow as other personas for daily tracking (F0, F1, F3, F4)
- Assess the codebase architecture for future extensibility (delete, filtering, multi-user)

**Pain Points:**
- SaaS expense tools store her financial data on third-party servers, which she considers a privacy risk
- Many "simple" tools have hidden complexity — Docker requirements, environment variable setup, or dependency conflicts that break on updates
- localStorage-only solutions provide no way to back up, migrate, or inspect the data outside the browser
- Overly coupled codebases make it impossible to add a single feature without a full rewrite

**Technical Expertise:** Expert — comfortable with command line, server administration, reading source code, and modifying application behavior

**Top Tasks:**
1. Enter and review daily expenses through the web UI (daily, high)
2. Start/restart the application server with one command (as needed, critical)
3. Verify data persistence by inspecting the storage file/database directly (weekly, medium)
4. Evaluate code modularity for potential feature additions (occasionally, low)

**Success Criteria:**
- Application starts and serves the UI with a single command (`npm start`, `python app.py`, or equivalent)
- Data store is a standard format (SQLite, JSON) that can be backed up with a file copy
- All CRUD operations work identically whether accessed from laptop or tablet on the local network
- Expense data survives server restart with zero loss — verified by direct storage inspection

---

## Persona Relationships

| Persona | Interacts With | Nature of Interaction |
|---------|---------------|----------------------|
| PER-01 | PER-03 | Maya represents the daily usage pattern that Priya also follows; Priya's setup work enables Maya's seamless experience if deployed for others |
| PER-02 | PER-01 | Tom's batch workflow and Maya's incremental workflow are the two primary usage patterns the UI must support equally well |
| PER-03 | PER-02 | Priya's focus on data persistence and integrity directly addresses Tom's core fear of data loss during batch entry |

---

## Feature-Persona Matrix

| Feature | PER-01: Maya | PER-02: Tom | PER-03: Priya |
|---------|-------------|-------------|---------------|
| F0: Expense Entry | Primary | Primary | Secondary |
| F1: Expense Editing | Primary | Primary | Secondary |
| F2: Persistent Storage | Secondary | Primary | Primary |
| F3: Expense List Display | Primary | Primary | Secondary |
| F4: Total Amount Display | Primary | Secondary | Secondary |
| F5: Web-Based User Interface | Primary | Secondary | Primary |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-11*
