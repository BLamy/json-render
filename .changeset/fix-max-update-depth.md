---
"@json-render/react": patch
---

Fix infinite re-render loop caused by multiple unbound form inputs (Input, Textarea, Select) all registering field validation at the same empty path with different `checks` configs, causing them to overwrite each other endlessly. Stabilize context values in ActionProvider, ValidationProvider, and useUIStream by using refs for state/callbacks, preventing unnecessary re-render cascades on every state update.
