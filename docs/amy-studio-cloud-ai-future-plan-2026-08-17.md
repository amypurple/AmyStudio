# Amy Studio Cloud and AI Future Plan

Status: future work, not implemented.

These integrations must remain optional. Amy Studio must continue to work locally without an account, cloud storage, or an AI service.

## Google Drive projects

### Goal

Allow a user to open, create, update, and save Amy Studio project files in their own Google Drive space while preserving the existing local import/export workflow.

### Intended design

- Use Google Identity Services for authorization.
- Use Google Picker as the familiar Open Project dialog.
- Request the narrow `drive.file` OAuth scope, not access to the user's entire Drive.
- Read only files explicitly selected by the user or created by Amy Studio.
- Save the Drive file ID in temporary project-session state so subsequent saves can update the same file.
- Continue supporting local `.amy.json`, `.json`, and gzip-compressed JSON projects.
- Keep local export available as a backup at all times.

### Requirements

- Configure a Google Cloud project, OAuth consent screen, web client ID, API key for Picker, and authorized Amy Studio origins.
- Clearly show whether the current project is local or connected to Drive.
- Handle expired authorization, revoked access, conflicts, offline use, and Save As without losing local work.
- Never embed Google access or refresh tokens in exported projects.
- Do not silently synchronize or overwrite a project.

### Suggested delivery

1. Open from Drive and Save As to Drive.
2. Save updates to the selected Drive file.
3. Conflict detection and recovery through local export.
4. Optional recent Drive projects, stored without sensitive tokens.

## Amy programming assistant

### Goal

Provide contextual help for Amy programming, compiler diagnostics, documentation, examples, optimization advice, and project navigation.

### Initial BYOK mode

BYOK means that the user supplies their own OpenAI API key. Amy Studio does not provide or use the project owner's key.

- The key belongs to the user and API usage is billed to that user's OpenAI account.
- Keep the key in JavaScript memory only by default.
- Never store it in `localStorage`, IndexedDB, project files, exports, diagnostics, analytics, URLs, or logs.
- Reloading or closing the page clears the key.
- Do not transmit it to an Amy Studio server; direct requests go from the browser to OpenAI only if the API and browser security policy permit that architecture.
- Display a clear warning that browser extensions, injected scripts, compromised dependencies, or cross-site scripting could expose a client-side key.
- Provide an immediate Disconnect/Clear Key command.
- Keep the assistant disabled until the user explicitly enables it and supplies a key for the current session.

### Safer future mode

A later option may use a small secured proxy or local companion application:

- The key remains outside the Studio page.
- The proxy applies authentication, request limits, and abuse protection.
- A local companion can preserve Amy Studio's local-first philosophy without exposing the key to page JavaScript.
- This mode must not become mandatory for compiling or editing Amy projects.

### Assistant scope

- Ground answers in the current Amy language reference, cookbook, examples, and compiler diagnostics.
- Let the user explicitly choose what source code or project files are sent.
- Show the proposed code before applying it.
- Never modify, compile, upload, or replace project data without a visible user action.
- Do not send ROMs, BIOS files, commercial assets, API keys, or unrelated embedded files.
- Mark generated suggestions as advisory; compilation and automated tests remain the authority.

### Investigation gates

Before implementation:

1. Confirm whether direct OpenAI API calls from the deployed Amy Studio origin are supported and appropriate.
2. Complete a threat review covering XSS, third-party scripts, browser extensions, logging, error reporting, and accidental project export.
3. Define the minimum project context needed for useful answers.
4. Prototype a documentation-only assistant before allowing code edits.
5. Add explicit consent, request preview, cancellation, and key-clearing tests.

## Non-goals

- Amy Studio will not require Google Drive, OpenAI, or an Amy Studio account.
- Amy Studio will not store user API keys in its project format.
- Cloud or AI integration will not replace local files, offline compilation, deterministic tests, or the ROM debugger.
- No integration may silently upload a complete project.
