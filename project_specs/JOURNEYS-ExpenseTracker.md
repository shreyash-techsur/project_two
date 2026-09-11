# User Journeys
## Expense Tracker

| Field | Value |
|-------|-------|
| **Product Name** | Expense Tracker |
| **Date** | 2026-09-11 |
| **Related Personas** | PERSONAS-ExpenseTracker.md |
| **Related JTBD** | JTBD-ExpenseTracker.md |
| **Related PRD** | PRD-ExpenseTracker.md |

---

## Journey Index

| ID | Persona | Scenario | Key JTBD | Stages |
|----|---------|----------|----------|--------|
| JRN-01.1 | PER-01 (Maya Rodriguez) | Daily expense capture during workday | JTBD-01.1, JTBD-01.2 | 5 |
| JRN-01.2 | PER-01 (Maya Rodriguez) | Correcting a mistaken entry | JTBD-01.3 | 4 |
| JRN-02.1 | PER-02 (Tom Langford) | Sunday evening batch receipt entry | JTBD-02.1 | 5 |
| JRN-02.2 | PER-02 (Tom Langford) | Post-batch error correction and reconciliation | JTBD-02.2, JTBD-02.3 | 5 |
| JRN-03.1 | PER-03 (Priya Nair) | First-time self-hosted setup and verification | JTBD-03.1, JTBD-03.2 | 5 |
| JRN-03.2 | PER-03 (Priya Nair) | Multi-device daily expense tracking | JTBD-03.3 | 5 |

---

## PER-01: Maya Rodriguez

### JRN-01.1: Daily Expense Capture

**Persona:** PER-01 (Maya Rodriguez)
**Scenario:** Maya arrives at work, opens the Expense Tracker in her browser, and logs two purchases from yesterday evening — takeout dinner and a rideshare home. At lunch she returns to the app to capture a morning coffee and a co-working snack. Throughout the day she glances at the running total to judge whether she's on pace for her informal weekly budget. The journey covers the full cycle of arriving at the app, entering expenses quickly, and monitoring her cumulative spend.
**Related Jobs:** JTBD-01.1, JTBD-01.2

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Arrive | Opens laptop, navigates to bookmarked Expense Tracker URL | Web UI (F5) | "Let me log last night's spending before I forget" | Neutral, mildly determined | Has to remember to open the app — no reminder or prompt | Saved bookmark + fast page load keep barrier low |
| Orient | Scans the page — sees expense form, expense list, and running total | Dashboard layout (F5), Total display (F4) | "Good, I can see my total right away — $142.50 so far this week" | Reassured | If the page is slow to load or the total isn't visible, she might postpone | Ensure total is above the fold and loads instantly |
| Enter First Expense | Types amount ($18.50), description ("Pad Thai takeout"), category ("Food"), clicks Submit | Expense form (F0), Persistent storage (F2) | "This is quick — amount, note, category, done" | Confident, satisfied | If the form requires scrolling to reach fields, flow breaks | Auto-focus on amount field after page load |
| Enter Second Expense | Form has cleared; types $12.00, "Lyft home", "Transport", submits | Expense form (F0), Expense list (F3), Total display (F4) | "Two down, total updated — I can see both entries in the list" | Efficient, in control | If the form doesn't clear or list doesn't update, trust drops | Instant list append + total recalculation on submit |
| Monitor | Glances at running total during lunch and late afternoon | Total display (F4), Expense list (F3) | "I'm at $187 — I should skip the afternoon latte" | Self-aware, slightly anxious | Total not updating after an edit made earlier would mislead her | Always-visible, always-current total with currency formatting |

#### Key Moments
- **Decision Point:** Orient stage — Maya decides in the first 2 seconds whether the app is worth her time; if the page loads slowly or feels cluttered, she falls back to a sticky note
- **Risk of Abandonment:** Enter First Expense stage — if the form requires more than three fields or demands dropdown navigation, she'll revert to her old spreadsheet
- **Delight Opportunity:** Monitor stage — seeing her spending total update in real time gives her a sense of financial control she never had with manual tools

#### Success Outcome
Maya completes each expense entry (all three fields + submit) in under 10 seconds, and the running total is always visible and correct within 1 second of any change (JTBD-01.1, JTBD-01.2 success measures).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Arrive | F5 (Web UI) |
| Orient | F4 (Total Display), F5 (Web UI) |
| Enter First Expense | F0 (Expense Entry), F2 (Persistent Storage) |
| Enter Second Expense | F0 (Expense Entry), F2 (Persistent Storage), F3 (Expense List), F4 (Total Display) |
| Monitor | F3 (Expense List), F4 (Total Display) |

---

### JRN-01.2: Correcting a Mistaken Entry

**Persona:** PER-01 (Maya Rodriguez)
**Scenario:** Maya notices that an expense she entered this morning has the wrong amount — she typed $8.50 for her coffee but it was actually $5.80. She also mis-categorized it as "Snacks" instead of "Coffee." She needs to fix both errors in place without re-entering the whole record, and she wants to see the corrected total immediately so her daily spending estimate stays accurate.
**Related Jobs:** JTBD-01.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Spot Error | Scans expense list, notices the coffee entry says $8.50 / "Snacks" | Expense list (F3) | "Wait, that's wrong — my coffee was $5.80 and I put the wrong category" | Mildly annoyed | If the list is cluttered or entries are hard to read, she might miss the mistake | Clear, readable rows with all fields visible |
| Initiate Edit | Clicks the Edit button next to the incorrect expense | Expense list (F3), Expense form (F1) | "Let me fix this quickly" | Hopeful | If there's no obvious edit action per row, she's stuck | Visible edit button/link on every expense row |
| Correct Values | Changes amount from $8.50 to $5.80, changes category from "Snacks" to "Coffee", clicks Save | Expense form (F1), Persistent storage (F2) | "Same form, just with the old values pre-filled — easy to change" | Focused, relieved | If the form doesn't pre-populate existing values, she has to re-type everything | Pre-populate form with current values on edit; allow partial changes |
| Verify Correction | Sees updated entry in the list and the total decreased by $2.70 | Expense list (F3), Total display (F4) | "Total went from $187.00 to $184.30 — that's right" | Satisfied, trusting | If the total doesn't recalculate instantly, she has to do mental math to confirm | Instant total recalculation + visual confirmation the row changed |

#### Key Moments
- **Decision Point:** Initiate Edit stage — if Maya can't find the edit action within 2 seconds, she'll leave the error in place and her records become unreliable over time
- **Risk of Abandonment:** Correct Values stage — if the edit form opens blank instead of pre-populated, the friction of re-typing makes her consider just deleting and re-entering (which isn't even possible in v1)
- **Delight Opportunity:** Verify Correction stage — seeing the total adjust instantly after the fix confirms data integrity and builds trust

#### Success Outcome
Maya edits the expense and sees both the corrected entry and recalculated total within 2 seconds of saving (JTBD-01.3 success measure).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Spot Error | F3 (Expense List) |
| Initiate Edit | F1 (Expense Editing), F3 (Expense List) |
| Correct Values | F1 (Expense Editing), F2 (Persistent Storage) |
| Verify Correction | F3 (Expense List), F4 (Total Display) |

---

## PER-02: Tom Langford

### JRN-02.1: Sunday Batch Receipt Entry

**Persona:** PER-02 (Tom Langford)
**Scenario:** It's Sunday evening. Tom sits at his kitchen table with a stack of 15 receipts from the week — client lunch, camera supplies, mileage parking, and miscellaneous business purchases. He opens the Expense Tracker and begins entering receipts one by one, working through the stack. Some receipts have faded ink, so he squints and estimates. His primary concern is that every entry survives — if the browser crashes or the tab closes mid-session, he cannot reconstruct several of these receipts.
**Related Jobs:** JTBD-02.1

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Prepare | Opens browser, navigates to Expense Tracker, sees last week's entries still intact | Web UI (F5), Expense list (F3) | "Good — everything from last week is still here. Let me start this week's batch." | Relieved, reassured | If previous entries were missing, trust is destroyed before he even starts | Immediate display of all persisted data on page load |
| Begin Batch | Picks up first receipt, enters amount ($34.75), description ("Camera lens cleaning kit"), category ("Supplies"), submits | Expense form (F0), Persistent storage (F2) | "One down. Did it save? I see it in the list — okay, it's safe." | Cautiously optimistic | Uncertainty about whether the entry actually persisted to the server | Clear success confirmation + entry appearing in list |
| Continue Batch | Enters receipts 2 through 10 in rapid succession, each taking about 15–20 seconds | Expense form (F0), Expense list (F3), Persistent storage (F2) | "Form clears, I type, submit, it appears — this is a good rhythm" | Focused, building confidence | If the form doesn't clear or focus doesn't return to amount field, the rhythm breaks | Auto-clear form + auto-focus on amount field after each submission |
| Handle Faded Receipt | Squints at receipt #11 with faded ink, estimates $22 for "Parking — downtown shoot", enters it knowing he might need to correct later | Expense form (F0) | "I think it was $22... I'll fix it if I find the duplicate charge on my card statement" | Uncertain, slightly anxious | No way to flag an entry as "estimated" or "needs review" | Opportunity for a future "needs review" flag; for now, edit capability is the safety net |
| Finish Session | Enters last receipt (#15), scans the full list, sees all 15 new entries plus last week's | Expense list (F3), Total display (F4) | "15 new entries, all showing. Total looks about right. If this tab crashes now, I won't lose anything." | Accomplished, relieved | If the list is slow to render with many entries, the final verification step feels unreliable | Fast list rendering even with hundreds of accumulated entries |

#### Key Moments
- **Decision Point:** Begin Batch stage — Tom enters one expense and then checks if it actually saved; if the first entry is lost, he abandons the app immediately and goes back to his spreadsheet
- **Risk of Abandonment:** Continue Batch stage — if the entry flow has any friction (form not clearing, focus not returning, slow saves), Tom loses patience by entry #5 and switches tools
- **Delight Opportunity:** Finish Session stage — seeing all 15 entries safe in the list, surviving a page refresh, gives Tom a sense of security he's never had with browser-based tools

#### Success Outcome
All 15 expenses entered during the batch session are retrievable after closing and reopening the browser — zero entries lost (JTBD-02.1 success measure).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Prepare | F3 (Expense List), F5 (Web UI) |
| Begin Batch | F0 (Expense Entry), F2 (Persistent Storage) |
| Continue Batch | F0 (Expense Entry), F2 (Persistent Storage), F3 (Expense List) |
| Handle Faded Receipt | F0 (Expense Entry) |
| Finish Session | F3 (Expense List), F4 (Total Display) |

---

### JRN-02.2: Post-Batch Error Correction and Reconciliation

**Persona:** PER-02 (Tom Langford)
**Scenario:** Tom has just finished entering 15 receipts (JRN-02.1). Now he lays out the physical receipts side-by-side and scrolls through the expense list to verify each one. He discovers three errors: one transposed amount ($43.50 should be $34.50), one wrong category ("Food" should be "Client Meals"), and one missing description. He needs to fix all three in sequence, then confirm the total matches his manual receipt sum of $487.25.
**Related Jobs:** JTBD-02.2, JTBD-02.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Begin Reconciliation | Lays out receipts in a row, scrolls through the full expense list on screen | Expense list (F3) | "Let me go through these one by one against the paper" | Methodical, focused | If the list is paginated or truncated, he can't see all entries at once | Full unpaginated list so all entries are scannable |
| Spot First Error | Notices $43.50 for parking should be $34.50 — transposed digits | Expense list (F3) | "That's wrong — I swapped the 3 and the 4" | Annoyed at himself | If the amount is hard to read in the list (small font, no formatting), errors are easy to miss | Clear currency formatting with proper decimal alignment |
| Fix Errors in Sequence | Clicks Edit on the first error, corrects $43.50 to $34.50, saves; immediately clicks Edit on next error, changes "Food" to "Client Meals", saves; edits third entry to add missing description | Expense form (F1), Expense list (F3), Persistent storage (F2) | "Edit, fix, save, next — this is manageable" | Increasingly confident | If saving one edit kicks him out of the list flow or reloads the page, he loses his place in the reconciliation | After saving an edit, return to the list with the corrected entry visible — no page reload |
| Verify Total | Compares the on-screen total against his manual receipt sum of $487.25 | Total display (F4) | "Screen says $487.25, my receipts add up to $487.25 — we match" | Satisfied, relieved | If the total isn't visible without scrolling to the top, he has to leave the list area to check it | Always-visible total, even when scrolled down in a long list |
| Close Session | Closes the laptop, files the receipts, confident data is persisted | Persistent storage (F2) | "Everything matches. It'll all be here next Sunday." | Accomplished, trusting | Lingering worry that data might vanish over the week (based on past localStorage experiences) | Data survives server restarts — proven reliability over time builds trust |

#### Key Moments
- **Decision Point:** Verify Total stage — the moment the total matches his manual sum is the moment Tom trusts the app; if the numbers don't match and he can't figure out why, trust is broken
- **Risk of Abandonment:** Fix Errors in Sequence stage — if editing one expense disrupts his reconciliation flow (page reload, scroll position lost, list re-ordering), he gives up on corrections and lives with bad data
- **Delight Opportunity:** Close Session stage — the knowledge that his data is server-persisted and will survive the week gives Tom peace of mind he never had with browser tools

#### Success Outcome
Tom edits 3 expenses and sees updated values and recalculated total immediately after each save, completing all corrections within 2 minutes. The full expense list with total loads in under 1 second (JTBD-02.2, JTBD-02.3 success measures).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Begin Reconciliation | F3 (Expense List) |
| Spot First Error | F3 (Expense List) |
| Fix Errors in Sequence | F1 (Expense Editing), F2 (Persistent Storage), F3 (Expense List) |
| Verify Total | F4 (Total Display) |
| Close Session | F2 (Persistent Storage) |

---

## PER-03: Priya Nair

### JRN-03.1: First-Time Self-Hosted Setup and Verification

**Persona:** PER-03 (Priya Nair)
**Scenario:** Priya has cloned the Expense Tracker repository to her home server. She wants to get it running with a single command, enter a few test expenses through the web UI, and then verify the data is actually persisted by inspecting the storage file directly from the terminal. She also wants to confirm that the data survives a full server restart cycle. This is her "trust but verify" setup ritual before committing to the tool for daily use.
**Related Jobs:** JTBD-03.1, JTBD-03.2

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Install | Opens terminal on home server, runs a single start command (e.g., `npm start`) | Terminal, Server process (F5) | "If this needs Docker or env vars, I'm out. Let's see... one command, and it's running." | Cautiously optimistic | If dependencies fail to install or the app requires multi-step configuration, she abandons it immediately | Zero-config startup: single command installs deps and starts server |
| Access UI | Opens browser on laptop, navigates to `http://server-ip:port` | Web UI (F5) | "It's up. Clean page — form, empty list, $0.00 total. Looks right." | Pleased, evaluating | If the UI doesn't load or looks broken, she questions code quality | Clean, functional UI that signals reliability |
| Test Entry | Enters a test expense: $9.99, "Test coffee", "Testing" and submits | Expense form (F0), Expense list (F3), Total display (F4), Persistent storage (F2) | "Entry appears in the list, total says $9.99. Now the real question — is it on disk?" | Curious, skeptical | The UI showing the entry doesn't prove persistence — she needs to verify server-side | Transparent storage that encourages verification |
| Inspect Storage | Switches to terminal, inspects the storage file (e.g., `sqlite3 data.db "SELECT * FROM expenses"` or `cat expenses.json`) | Storage file (F2) | "There it is — amount: 9.99, description: Test coffee, category: Testing. Data matches the UI exactly." | Satisfied, building trust | If the storage format is opaque or the file doesn't exist where expected, trust drops | Standard format (SQLite/JSON) in a predictable location |
| Restart Verification | Stops the server (Ctrl+C), restarts it, reloads the browser — test expense is still displayed | Server process (F5), Persistent storage (F2), Expense list (F3) | "Server went down and came back. Data survived. This tool is solid." | Confident, committed | If even one entry is missing after restart, the app fails its core promise for her | Data integrity across restart is the definitive trust-building moment |

#### Key Moments
- **Decision Point:** Install stage — if the app requires more than one command to start, Priya writes it off as "yet another over-engineered tool" and moves on
- **Risk of Abandonment:** Inspect Storage stage — if the data file is in a non-standard format, isn't where she expects it, or doesn't match the UI, she'll stop using the app because she can't trust what she can't verify
- **Delight Opportunity:** Restart Verification stage — seeing data survive a full stop/start cycle is the moment Priya commits to the tool; this is the "hired" moment

#### Success Outcome
Priya starts the application with one terminal command and has a usable web UI within 10 seconds with zero configuration. She queries the storage file directly and confirms all entries match the UI display with 100% consistency. Data survives a server restart with zero loss (JTBD-03.1, JTBD-03.2 success measures).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Install | F5 (Web UI) |
| Access UI | F5 (Web UI) |
| Test Entry | F0 (Expense Entry), F2 (Persistent Storage), F3 (Expense List), F4 (Total Display) |
| Inspect Storage | F2 (Persistent Storage) |
| Restart Verification | F2 (Persistent Storage), F3 (Expense List), F5 (Web UI) |

---

### JRN-03.2: Multi-Device Daily Expense Tracking

**Persona:** PER-03 (Priya Nair)
**Scenario:** Priya has been using the Expense Tracker for a week. She enters expenses from her laptop during the day (while working at her desk) and from her tablet in the evening (while on the couch). She expects the same data, the same UI behavior, and the same total to appear on both devices, since all data lives on her home server. Today she enters a grocery expense from her laptop, then switches to her tablet to add a dinner expense and verify both entries are visible.
**Related Jobs:** JTBD-03.3

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Laptop Entry | At her desk, opens Expense Tracker on laptop browser, enters $45.20, "Weekly groceries", "Groceries" | Expense form (F0), Web UI (F5), Persistent storage (F2) | "Quick entry before my next meeting" | Efficient, routine | None — this is the familiar daily workflow | Consistent entry speed regardless of device |
| Switch Device | Later in the evening, picks up tablet on the couch, opens Expense Tracker via the same local network URL | Web UI (F5) | "Let me add dinner and check my day's spending" | Relaxed, expecting consistency | If the tablet browser renders the UI differently or the data from the laptop isn't there, consistency breaks | Responsive layout that works across screen sizes |
| Verify Cross-Device Data | Sees the grocery expense from the laptop in the expense list on the tablet | Expense list (F3), Total display (F4) | "Groceries entry is here — $45.20, same total as on my laptop. Server-side storage works." | Confirmed, satisfied | If the grocery entry were missing, she'd suspect client-side caching and lose trust | All data from server — no client-side state dependency |
| Tablet Entry | Enters $28.00, "Dinner out with friends", "Dining" from the tablet | Expense form (F0), Persistent storage (F2), Expense list (F3) | "New entry submitted. Total updated to include both today's expenses." | In control | If the form is hard to use on a smaller screen (fields too small, submit button hard to tap), entry is frustrating | Responsive form that adapts to different screen sizes |
| Cross-Check | Back at laptop later, refreshes the page — sees the dinner expense entered from the tablet | Expense list (F3), Total display (F4) | "Dinner entry from the tablet is on the laptop. One source of truth. This is exactly what I wanted." | Delighted, vindicated | If there's any data discrepancy between devices, the multi-device promise is broken | Server-side persistence means every device sees the same truth |

#### Key Moments
- **Decision Point:** Verify Cross-Device Data stage — this is the moment Priya confirms the architecture is right; data entered on one device appears on another because storage is server-side
- **Risk of Abandonment:** Switch Device stage — if the UI looks broken on the tablet or takes too long to load, she'll revert to laptop-only use, undermining the convenience
- **Delight Opportunity:** Cross-Check stage — the round-trip confirmation (laptop → tablet → laptop) proves the system works as a true multi-device tool with zero sync complexity

#### Success Outcome
An expense entered from Priya's laptop is visible and editable from her tablet within 5 seconds of a page load, with identical data and totals on both devices (JTBD-03.3 success measure).

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Laptop Entry | F0 (Expense Entry), F2 (Persistent Storage), F5 (Web UI) |
| Switch Device | F5 (Web UI) |
| Verify Cross-Device Data | F3 (Expense List), F4 (Total Display) |
| Tablet Entry | F0 (Expense Entry), F2 (Persistent Storage), F3 (Expense List) |
| Cross-Check | F3 (Expense List), F4 (Total Display) |

---

## Cross-Journey Patterns

### Common Pain Points

- **Data trust anxiety:** All three personas share a fundamental concern about data loss — Maya after overnight gaps (JRN-01.1), Tom during batch sessions (JRN-02.1), and Priya across server restarts (JRN-03.1). Server-side persistent storage (F2) is the single most critical feature for building trust across all journeys.
- **Edit flow friction:** Both Maya (JRN-01.2) and Tom (JRN-02.2) need to edit expenses, and both are at risk of abandoning corrections if the edit flow is disruptive. Pre-populated forms, no page reloads, and instant total recalculation are essential across all edit journeys.
- **Form entry rhythm:** Maya's quick daily entries (JRN-01.1) and Tom's rapid batch entries (JRN-02.1) both depend on the form clearing and refocusing after submission. Any break in this rhythm multiplies across entries and erodes the experience.

### Shared Opportunities

- **Auto-focus on amount field:** After form submission, automatically focus the cursor on the amount field. This benefits Maya's quick entries, Tom's batch flow, and Priya's test entries equally — a single UI improvement that enhances all journeys.
- **Always-visible total:** The running total must be visible without scrolling in every journey — Maya checks it throughout the day, Tom uses it for receipt reconciliation, and Priya uses it for cross-device verification. Sticky/fixed total display benefits everyone.
- **Instant persistence confirmation:** All personas need to trust that data was saved. Showing the entry in the list immediately after submission is the primary trust signal. This pattern must be reliable across all journeys.

### Convergence Points

- **Expense entry form (F0):** All six journeys touch the expense entry form. It is the single most-used touchpoint in the product — its speed, clarity, and reliability define the core experience for every persona.
- **Expense list (F3) + Total display (F4):** These appear together in every journey as the verification layer. Users enter data through F0, but they trust the app through F3 and F4.
- **Persistent storage (F2):** While invisible to the UI, F2 is the silent participant in every journey. Its reliability (or failure) determines the outcome of every scenario.

---

## Journey-to-JTBD Traceability

| Journey Stage | JTBD ID | Expected Outcome |
|--------------|---------|-----------------|
| JRN-01.1:Enter First Expense | JTBD-01.1 | Expense recorded in under 10 seconds via minimal single-screen form |
| JRN-01.1:Enter Second Expense | JTBD-01.1 | Form clears and is ready for next entry within 1 second of submission |
| JRN-01.1:Monitor | JTBD-01.2 | Cumulative total visible without scrolling, updates within 1 second of any change |
| JRN-01.2:Correct Values | JTBD-01.3 | Entry edited in place with pre-populated form; list and total update within 2 seconds |
| JRN-01.2:Verify Correction | JTBD-01.3 | Corrected entry and recalculated total visible immediately after save |
| JRN-02.1:Begin Batch | JTBD-02.1 | First expense persisted to server-side storage before UI confirms success |
| JRN-02.1:Continue Batch | JTBD-02.1 | Each expense persists immediately; all entries survive tab closure or page refresh |
| JRN-02.1:Finish Session | JTBD-02.1 | All 15 entries retrievable after closing and reopening browser — zero loss |
| JRN-02.2:Fix Errors in Sequence | JTBD-02.2 | Sequential edits persist correctly; list and total reflect each change immediately |
| JRN-02.2:Begin Reconciliation | JTBD-02.3 | Full expense list loads in under 1 second with all entries visible for cross-checking |
| JRN-02.2:Verify Total | JTBD-02.3 | Total matches manual receipt sum, confirming all entries are accounted for |
| JRN-03.1:Install | JTBD-03.1 | Application starts with one command, UI accessible within 10 seconds, zero config |
| JRN-03.1:Inspect Storage | JTBD-03.2 | Storage file queryable with standard tools; data matches UI display 100% |
| JRN-03.1:Restart Verification | JTBD-03.2 | All data survives full server stop/start cycle with zero loss |
| JRN-03.2:Verify Cross-Device Data | JTBD-03.3 | Expense entered on laptop visible on tablet within 5 seconds of page load |
| JRN-03.2:Cross-Check | JTBD-03.3 | Identical data and totals on both devices — one server-side source of truth |

---

*Document generated by Pivota Spec Framework*
*Last updated: 2026-09-11*
