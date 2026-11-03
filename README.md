# PrepDesk — Practice Questions

A lightweight, static question-bank website built with plain HTML, CSS and JavaScript. It is designed to be hosted directly on GitHub Pages.

## Features

- Subject navigation (currently OS, DBMS, CN and C)
- Questions loaded from separate JSON files
- Answers hidden until you reveal them
- Mark each question as **Unattempted**, **Wrong**, or **Correct**
- Subject-wise counts and overall reviewed progress
- Search questions and filter by status or topic
- Shuffle question order
- Light/dark theme
- Progress saved automatically in browser `localStorage`
- Export/import progress as JSON
- Responsive layout for mobile and desktop
- No backend, build step, package manager or framework required

## Run locally

Because the site loads JSON files with `fetch()`, do not open `index.html` directly using a `file://` URL. Start a local static server from this folder instead.

For example, with Python:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Host on GitHub Pages

1. Create a new GitHub repository.
2. Upload the contents of this folder (the `index.html`, `styles.css`, `app.js`, and `data/` folder).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish the site.

Your site will be available at the GitHub Pages URL shown in Settings → Pages.

## Add a subject

1. Create a new JSON file inside `data/`, for example `data/coa.json`.
2. Add a subject entry to `data/subjects.json`:

```json
{
  "id": "coa",
  "name": "Computer Organization",
  "short": "COA",
  "file": "coa.json",
  "description": "Computer architecture and organization."
}
```

3. Add questions to `data/coa.json`.

## Question format

Each subject file contains a JSON array. A question has a stable, unique `id`, a `topic`, a `type`, and the question text.

```json
[
  {
    "id": "coa-001",
    "topic": "Pipelining",
    "type": "MCQ",
    "question": "Which hazard occurs due to a dependency between instructions?",
    "options": ["Structural", "Data", "Control", "None of these"],
    "answer": "Data",
    "explanation": "A data hazard occurs when an instruction depends on the result of an earlier instruction."
  }
]
```

### Supported fields

- `id` — required; keep it unique and stable so progress remains associated with the question.
- `topic` — optional topic label used by the topic filter.
- `type` — optional label, such as `MCQ`, `Theory`, or `Numerical`.
- `question` — question text.
- `options` — optional array of choices. Omit it for descriptive questions.
- `answer` — answer text shown when revealed.
- `explanation` — optional explanation shown below the answer.
- `code` — optional code snippet shown below the answer.

The app escapes question and answer text for safe display. For multi-line text, use `\n` in JSON strings.

## Progress and privacy

Progress is stored only in the browser's local storage. It is not sent to GitHub or any server. It is specific to the browser and device. Use **Export progress** to make a backup, and **Import progress** to restore it elsewhere.

If you edit a question, keep its `id` unchanged to preserve its marking. If you replace a question with a different one, give it a new `id`.

## Notes

- The initial question bank contains one sample question each for OS, DBMS, CN and C. Replace or extend these examples with your own questions.
- A few web fonts are loaded from Google Fonts; the website otherwise has no runtime dependencies. If you want fully offline styling, remove the `@import` line at the top of `styles.css` and it will use system fonts.
