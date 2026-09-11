---

### Flow 3: Batch Entry Session

**Trigger:** User has multiple expenses to enter in sequence (e.g., Tom's Sunday receipt session)
**User Stories:** US-0.2, US-0.1
**Journeys:** JRN-02.1 (Tom Sunday batch)

```
[User has a stack of receipts to enter]
    │
    ▼
[Page loaded, amount field focused]
    │
    ▼
┌─── BATCH LOOP (repeats N times) ───────────────┐
│                                                  │
│  [Enter amount → Tab → description → Tab →       │
│   category → Enter/click Submit]                 │
│       │                                          │
│       ▼                                          │
│  [Expense saved → form clears → toast appears]   │
│       │                                          │
│       ▼                                          │
│  [Focus returns to amount field automatically]   │
│       │                                          │
│       ▼                                          │
│  [List updates (new entry at top)]               │
│  [Total updates (incremented)]                   │
│       │                                          │
│       ▼                                          │
│  [Ready for next receipt]                        │
│                                                  │
└──────────────────────────────────────────────────┘
    │
    ▼
[All receipts entered — user verifies list + total]
    │
    ▼
[Session complete — all data persisted server-side]
[Safe to close tab/browser — no data loss]
```

**Key UX requirements for batch flow:**

1. **Zero-friction repetition** — After each successful submission, the form clears ALL fields and focus returns to the amount field. The user never needs to click into a field or navigate — they simply start typing the next amount.

2. **Incremental trust** — Each expense appears in the list immediately after submission. The list grows visibly with each entry. The total increments with each addition. These visual confirmations build Tom's confidence that data is being saved.

3. **Server-side persistence per entry** — Each expense is individually persisted to the server before the success response. If the browser crashes after entry #10, entries 1–10 are safe. There is no client-side batch buffer.

4. **No interruptions** — Success toasts appear briefly (2 seconds) and auto-dismiss without requiring interaction. They must not steal focus from the amount field or block the next entry.

5. **Performance at scale** — After 15+ entries in a single session (on top of potentially hundreds of existing entries), the list must still render quickly and the form must respond without lag (US-3.5).

