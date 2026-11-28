# Wonder Patch

> [!WARNING]
> **This entire repository is public.** Anyone can view the files and commit history on GitHub, including files outside the GitHub Pages publishing folder.
>
> **DO NOT commit sensitive or private information, including personally identifiable information (PII).** Keep passwords, API keys, private documents, and identifying details about children out of the repository.

Wonder Patch is a collection of browser games for early learners. The first game, **Addition Adventure**, gives players five questions per round and one star for each correct answer.

| Level | Addends | Carrying |
| --- | --- | --- |
| Easy | 1–9 | Single-digit practice with sums up to 18 |
| Medium | 10–99 | A mix of problems with and without carrying |
| Hard | 100–999 | A mix of problems with and without carrying, including across several columns |

Players can type or tap the on-screen number buttons, starting with the ones on the right. Optional carry boxes sit above the columns. Hints let players trade ten pieces for one in the next column, and retries highlight the first column to check.

Choose **Practice steps** under a difficulty to focus on a skill, such as making 10 or carrying from the ones. Each new round ends with an illustrated Fox story challenge with a **Read aloud** button that plays bundled narration. The browser saves the sound setting, stars, in-progress rounds, and current work for each practice step. Progress is specific to the browser and site address.

## Play locally

Open `index.html` in a browser, or run this from the repository root and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Browsers vary in how they handle local storage on `file:` URLs. The local server gives the game a consistent address for testing saved progress.

All code, illustrations, and fonts are served with the site. The app uses no accounts, analytics, API keys, or external services.
