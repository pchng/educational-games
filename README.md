# Wonder Patch

Wonder Patch is a collection of browser games for early learners. The first game, **Addition Adventure**, gives players five questions per round and one star for each correct answer.

| Level | Addends | Carrying |
| --- | --- | --- |
| Easy | 1–9 | Single-digit practice with sums up to 18 |
| Medium | 10–99 | A mix of problems with and without carrying |
| Hard | 100–999 | A mix of problems with and without carrying, including across several columns |

Players can type an answer or use the on-screen number buttons. Hints show counting dots on Easy and place-value guidance on Medium and Hard. Correct answers and retries play short sound effects, which can be turned off in the header. The browser saves the sound setting, stars, and the current round for each level using local storage. Progress is specific to the browser and site address.

## Play locally

Open `index.html` in a browser, or run this from the repository root and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Browsers vary in how they handle local storage on `file:` URLs. The local server gives the game a consistent address for testing saved progress.

## Publish with GitHub Pages

Push the files to GitHub and choose **Settings → Pages → Deploy from a branch**. Select your branch and **/(root)**, then save. The app uses relative asset paths and runs without a build step. [GitHub Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

All code, illustrations, and fonts are served with the site. The app uses no accounts, analytics, API keys, or external services.
