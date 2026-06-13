# Odoo & Square POS Behavioral Workflows & Architectural Alignment
---

## 1. System-Wide Architectural Patterns

This application rejects acting as an isolated web interface and instead replicates production-grade enterprise POS behavior similar to Odoo POS and Square KDS.

### Session-Based Integrity & Auditing

Every POS execution is bound to a secure lifecycle:

Shift Start → Active Trading → Shift Closing Summary

This ensures:
- Full financial traceability
- End-of-shift reconciliation
- Tamper-resistant reporting

---

### Structured Order Lifecycle State Machine

Order states:

Draft → Sent to Kitchen → Preparing → Completed → Paid

Rules:
- Cashiers manage creation and checkout
- Kitchen staff manage preparation states
- Paid orders become locked (no edits allowed)

---

### Asynchronous KDS Pipeline

KDS workflow:

To Cook → Preparing → Completed

Features:
- Item-level tracking
- Parallel cooking workflows
- Strikethrough completion UI behavior

---

### Persistent Table Containers

Tables behave as persistent session holders:

- Free → Occupied → Billing
- Each table holds a single active draft order
- Orders persist across cashier shifts

---

### Dual-Engine Discount System

Two isolated discount engines:

- Manual discounts (staff coupons)
- Automatic promotions (rules-based triggers)

Prevents:
- stacking conflicts
- audit inconsistencies

---

## 2. Operational Behaviors

---

### Delta Sync Engine (POS → KDS)

Rule:
Only send newly added items to kitchen — never resend existing ones.

Behavior:
- Track previously sent items
- Send only deltas to KDS
- Prevent duplicate kitchen tickets

---

### Blind Cash Count Reconciliation

Rule:
Do not show expected cash before manual counting.

Formula:

Drawer Discrepancy = Physical Cash Input - System Expected Sales Revenue

Behavior:
- System calculates only after input
- Flags discrepancies in admin dashboard

---

### Visual Gateway Fallback

Rule:
Prevent payment flow blocking due to gateway delays.

Behavior:
- 60-second QR countdown timer
- Timeout → Transaction Timeout state
- Allows retry or alternate gateway

---

### KDS Recall Mechanism

Rule:
Prevent accidental ticket clearing.

Behavior:
- “Recall Last Ticket” button
- Restores last completed ticket
- Moves it back to Preparing state

---

## 3. Future Engineering Scope

---

### Offline Resiliency

- Store cart state in localStorage / IndexedDB
- Auto-sync when connection returns

---

### Conversational Line Modifiers

Examples:
No Sugar  
Extra Hot  
Less Ice  

Behavior:
- Attach modifiers to items
- Send to KDS
- Print under item name
