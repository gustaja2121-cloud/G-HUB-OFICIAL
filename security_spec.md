# Security Specification - G-HUB Estratégico

## Data Invariants
1. **User Ownership**: Every document in user-specific collections (`notes`, `scripts`, `dailyChecklist`, `finance`, `schedule`, `clips`, `videoPerformance`) MUST have a `userId` field that matches the `request.auth.uid`.
2. **Profile Integrity**: Users can only create and update their own profile in the `users` collection.
3. **Immutable Identity**: The `userId` field in any document cannot be changed after creation.
4. **Schema Enforcement**: All writes must conform to the defined schema (types, string lengths, and required fields).
5. **Temporal Integrity**: `updatedAt` fields must always be set to the server time (`request.time`).
6. **Unique IDs**: Document IDs must be valid strings (ALPHANUMERIC + hyphens/underscores) and not exceed 128 characters.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

| ID | Target Collection | Attack Vector | Expected Result |
|----|-------------------|---------------|-----------------|
| 1 | `users/{userId}` | **Identity Spoofing**: User A tries to update User B's profile. | `PERMISSION_DENIED` |
| 2 | `users/{userId}` | **Privilege Escalation**: User tries to set `isAdmin: true` (if it existed) or skip level logic. | `PERMISSION_DENIED` |
| 3 | `notes/{noteId}` | **Orphaned Write**: User tries to create a note without a `userId`. | `PERMISSION_DENIED` |
| 4 | `scripts/{scriptId}` | **Shadow Field Injection**: User tries to add `internalFlag: true` to a script. | `PERMISSION_DENIED` |
| 5 | `finance/{financeId}` | **Identity Theft**: User tries to set `userId` to a different user's UID on creation. | `PERMISSION_DENIED` |
| 6 | `schedule/{postId}` | **ID Poisoning**: User tries to use a 2MB string as a document ID. | `PERMISSION_DENIED` |
| 7 | `clips/{clipId}` | **Resource Exhaustion**: User tries to send a 1MB string for the `data` field. | `PERMISSION_DENIED` |
| 8 | `dailyChecklist/{taskId}` | **Bypassing Verification**: User with unverified email tries to write. | `PERMISSION_DENIED` |
| 9 | `notes/{noteId}` | **Global Scraping**: Authenticated user tries to list all notes without a filter. | `PERMISSION_DENIED` |
| 10 | `scripts/{scriptId}` | **Temporal Forgery**: User tries to set `updatedAt` to a future date manually. | `PERMISSION_DENIED` |
| 11 | `finance/{financeId}` | **Type Confusion**: User tries to send `amount: "100"` (string instead of number). | `PERMISSION_DENIED` |
| 12 | `users/{userId}` | **Identity Mutation**: User tries to change their `userId` in their profile document. | `PERMISSION_DENIED` |

## Test Runner logic (Firestore Rules Tests)
A full test suite will be implemented in `firestore.rules.test.ts` (conceptual or actual if environment allows) to verify these payloads.
