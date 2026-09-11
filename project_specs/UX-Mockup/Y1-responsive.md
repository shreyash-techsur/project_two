---

## Responsive Considerations

**User Stories:** US-5.4, US-5.2
**Journeys:** JRN-03.2 (Priya multi-device)

The Expense Tracker is primarily a desktop application, but must remain functional (not pixel-perfect) on tablet and phone screen sizes. The layout adapts at two breakpoints.

### Desktop (>1024px) — Primary Target

```
┌─────────────────────────────────────────────────────────────┐
│                     EXPENSE TRACKER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Total ────────────────────────────────────────────────┐ │
│  │ Total Expenses                          $1,234.56      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Form ─────────────────────────────────────────────────┐ │
│  │ Amount($)  │  Description              │  Category     │ │
│  │ [________] │  [________________________]│  [__________] │ │
│  │                                                        │ │
│  │ [ Add Expense ]                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ List ─────────────────────────────────────────────────┐ │
│  │ $18.50  │  Pad Thai takeout         │  Food   │ [Edit] │ │
│  │ $12.00  │  Lyft home                │  Transport│[Edit]│ │
│  │  $5.80  │  Morning coffee           │  Coffee │ [Edit] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **Form fields** arranged horizontally in a single row (amount, description, category side by side)
- **List columns** spread across full width: amount | description | category | edit action
- **Total** spans full width with label left-aligned and amount right-aligned
- **Max content width:** ~800px centered, with padding on larger screens
- **Expense list** uses table-like layout with clear column alignment

### Tablet (768px — 1024px)

```
┌───────────────────────────────────────┐
│           EXPENSE TRACKER             │
├───────────────────────────────────────┤
│                                       │
│ ┌─ Total ───────────────────────────┐ │
│ │ Total Expenses       $1,234.56    │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─ Form ────────────────────────────┐ │
│ │ Amount($)     Description         │ │
│ │ [__________]  [__________________]│ │
│ │ Category                          │ │
│ │ [__________________]              │ │
│ │                                   │ │
│ │ [ Add Expense ]                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─ List ────────────────────────────┐ │
│ │ $18.50  Pad Thai takeout          │ │
│ │         Food              [Edit]  │ │
│ │─────────────────────────────────  │ │
│ │ $12.00  Lyft home                 │ │
│ │         Transport         [Edit]  │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

- **Form fields** wrap: amount and description on one row, category on the next row
- **List rows** become two-line cards: amount + description on line 1, category + edit on line 2
- **Total** remains visible at the top (same layout as desktop but narrower)
- **Touch targets** for Edit buttons are at least 44x44px for comfortable tapping (Priya's tablet use — JRN-03.2)

### Mobile (<768px)

```
┌─────────────────────────────┐
│      EXPENSE TRACKER        │
├─────────────────────────────┤
│                             │
│ ┌─ Total ─────────────────┐ │
│ │ Total        $1,234.56  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ Form ──────────────────┐ │
│ │ Amount ($)              │ │
│ │ [______________________]│ │
│ │ Description             │ │
│ │ [______________________]│ │
│ │ Category                │ │
│ │ [______________________]│ │
│ │                         │ │
│ │ [    Add Expense     ]  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ List ──────────────────┐ │
│ │ ┌─────────────────────┐ │ │
│ │ │ $18.50        [Edit]│ │ │
│ │ │ Pad Thai takeout    │ │ │
│ │ │ Food                │ │ │
│ │ └─────────────────────┘ │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ $12.00        [Edit]│ │ │
│ │ │ Lyft home           │ │ │
│ │ │ Transport           │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- **Form fields** stack vertically — each field takes full width
- **Submit button** takes full width for easy tapping
- **List entries** become card layout: amount + edit on top row, description on second row, category on third row
- **Touch targets** minimum 44x44px for all interactive elements
- **Total** remains fixed/sticky at the top when scrolling (important for long lists)
- **Font sizes** remain readable (minimum 16px for inputs to prevent iOS zoom)

### Responsive Behavior Notes

| Aspect | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Form layout | Horizontal (3 fields in a row) | Wrapped (2 + 1) | Vertical (stacked) |
| List layout | Table-like columns | Two-line rows | Card layout |
| Total position | Top of page | Top of page | Sticky top |
| Submit button | Auto width | Auto width | Full width |
| Min touch target | N/A | 44x44px | 44x44px |
| Input font size | 14-16px | 16px | 16px (prevents iOS zoom) |

