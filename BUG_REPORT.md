# Assignment Request Flow - Bug Report

## Executive Summary

The assignment request feature breaks due to ONE CRITICAL RACE CONDITION that prevents recipients from seeing requests. The bug causes Firestore sync to use empty default data instead of actual request data.

---

## THE CRITICAL BUG

File: src/lib/work-hub-store.tsx
Lines: 691-695
Severity: CRITICAL

### The Problem

When syncing from Firestore, the code merges data from two documents:
- Public workspace (workspaces/{wsId})
- Private workspace (private_workspaces/{wsId}_{userId})

If the private snapshot fires first, the code proceeds with EMPTY DEFAULT DATA instead of waiting for the public snapshot. This overwrites incoming assignment requests.

### Current Broken Code

Line 691-695:
  const mergeAndDispatch = () => {
    if (!lastPublicData && !lastPrivateData) return;
    
    const base = lastPublicData || normalizeWorkspaceData({});
    const priv = lastPrivateData || normalizeWorkspaceData({});

PROBLEM: If private snapshot fires BEFORE public snapshot, base falls back to empty data!

### Why This Breaks Assignment Requests

1. Recipient loads app
2. Private workspace snapshot listener fires first
3. lastPrivateData is populated with empty/default data
4. lastPublicData is still null (hasn't arrived yet)
5. mergeAndDispatch() is called immediately
6. Line 691 condition: !null && !{} = false → continues
7. Line 694: base = null || normalizeWorkspaceData({}) → uses EMPTY data
8. Default data has assignmentRequests: [] (see default-data.ts line 188)
9. Result: ALL incoming requests are lost!

### The Fix

Change line 691-694 to:

  const mergeAndDispatch = () => {
    if (!lastPublicData) return;  // MUST wait for public data
    
    const base = lastPublicData;
    const priv = lastPrivateData || normalizeWorkspaceData({});

Why this works:
- Public workspace is the source of truth for assignmentRequests
- Must wait for it to arrive before merging
- Private data is only for user-specific items

---

## SECONDARY BUG: Requests written to private doc

File: src/lib/work-hub-store.tsx
Line: 806
Severity: MEDIUM

### The Problem

Assignment requests are written to BOTH public AND private docs. This violates architecture - requests should only be in public doc.

### Current Code (lines 799-807)

const privateData: WorkspaceData = {
  ...baseData,
  members: {},
  tasks: baseData.tasks.filter(t => t.visibility === "private"),
  projects: baseData.projects.filter(p => p.visibility === "private"),
  notes: baseData.notes.filter(n => n.visibility === "private"),
  links: baseData.links.filter(l => l.visibility === "private"),
  assignmentRequests: [],  // ← SHOULD NOT BE HERE
};

### The Fix

Remove line 806 entirely:

const privateData: WorkspaceData = {
  ...baseData,
  members: {},
  tasks: baseData.tasks.filter(t => t.visibility === "private"),
  projects: baseData.projects.filter(p => p.visibility === "private"),
  notes: baseData.notes.filter(n => n.visibility === "private"),
  links: baseData.links.filter(l => l.visibility === "private"),
};

---

## CLARITY BUG: Inconsistent dedupe call

File: src/lib/work-hub-store.tsx
Line: 729
Severity: LOW

### The Problem

Dedupe call passes empty array instead of priv.assignmentRequests:

  assignmentRequests: dedupe(base.assignmentRequests || [], [], current.assignmentRequests || [], []),
                                                         ↑ Should be priv.assignmentRequests

### The Fix

  assignmentRequests: dedupe(
    base.assignmentRequests || [], 
    priv.assignmentRequests || [],
    current.assignmentRequests || [], 
    []
  ),

---

## Implementation Checklist

[ ] Change 1: Fix race condition (line 691)
    - Change: if (!lastPublicData && !lastPrivateData) return;
    - To:     if (!lastPublicData) return;
    
    - Change: const base = lastPublicData || normalizeWorkspaceData({});
    - To:     const base = lastPublicData;

[ ] Change 2: Remove assignmentRequests from private doc (line 806)
    - Delete: assignmentRequests: [],

[ ] Change 3: Update dedupe call (line 729, optional but recommended)
    - Change second parameter from [] to priv.assignmentRequests || []

---

## How the Bug Manifests

SCENARIO:
1. User A (owner) sends assignment request to User B
2. User B loads app immediately
3. EXPECTED: User B sees invitation on dashboard
4. ACTUAL: Request never appears

TIMELINE:
t=0:   User B loads app
t=1:   Firestore listeners connect
t=2:   Private workspace snapshot fires FIRST (empty)
t=3:   mergeAndDispatch() called with only private data
t=4:   Merge uses normalizeWorkspaceData({}) as base
t=5:   State set to {assignmentRequests: []}
t=6:   Public workspace snapshot arrives (too late!)
t=7:   Request is lost

---

## Verification Tests

After fixes:

1. User A sends request to User B for a task
2. User B loads dashboard - should see invitation
3. Sidebar shows pending badge
4. User B can accept/decline request
5. Task assigneeIds updated after accept

---

## Code Locations Reference

Creation:
- task-form.tsx:202 - Request button
- project-form.tsx:164 - Request button

Bug Location:
- work-hub-store.tsx:691 - Race condition

Display:
- dashboard/page.tsx:28-109 - Invitations
- sidebar.tsx:42-44 - Pending badge

Types:
- types.ts:143-153 - AssignmentRequest
- default-data.ts:188 - Default requests
