# Site Administration & Distribution SOP

## 1. GitHub Secrets Usage (API Keys)
**Rule:** Never hardcode API keys or tokens in `hugo.toml` or any tracked file.
**Process for new keys:**
1. Go to GitHub Repo -> Settings -> Secrets and variables -> Actions.
2. Click 'New repository secret'. Name it clearly (e.g., `NEW_API_KEY`).
3. In your GitHub Actions workflow file (`.github/workflows/`), reference it as `${{ secrets.NEW_API_KEY }}`.

## 2. Content Distribution SOP
**Rule:** No automated cross-posting. Maximize algorithm reach via native formatting.
**Process:**
1. **Publish:** Push article to `manujg.com/lab/` or `/posts/`.
2. **Wait:** Allow 48 hours for Google Search Console to index the canonical link.
3. **Draft Native Post:** Write a 3-4 paragraph summary highlighting the core problem and the framework/solution used to solve it. 
4. **Link Placement:** Do not put the URL in the main post body. Publish the post, then immediately add the link to the full article in the first comment.