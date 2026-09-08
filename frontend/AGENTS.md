<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# House style

## No em dashes

Never use an em dash (`—`, U+2014). Not in code comments, not in commit
messages, not in UI copy in either language, and not when writing back to the
person you are working for.

Use whatever the sentence actually needs instead:

- a colon, where the second half explains the first
- a full stop, where it is really two sentences
- brackets, where it is an aside
- a plain hyphen `-`, where a dash is genuinely the right mark

Two characters look like an em dash and are not. Leave them alone:

- `─` (U+2500) draws the section rules that head most files here.
  `// ── Validation ───────` is box-drawing, not punctuation.
- `–` (U+2013) is an en dash, used for ranges.

To check a change before committing:

```sh
grep -rn $'—' src scripts   # should print nothing
```
