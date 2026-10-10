# Quick IT — Personal AI Digital Hub

**Quick IT** is a responsive React + TypeScript application and Capacitor Android app using the blue Q brand, 3D Clay UI and lavender Liquid Glass styling.

## Features implemented in the starter
- Email/password and Google OAuth UI using Supabase Auth (provider configuration required).
- Dashboard, searchable private vault, nested folders, favorite items and permanent searchable display IDs.
- Smart Save: upload files/photos/PDFs and save notes, code, links, prompts.
- AI assistant, conversation history, and user-authorized vault retrieval via an Edge Function (requires an API key).
- Daily tasks, photo gallery, notes, learning resources, code projects.
- Public/private group creation and private invitation links with database-side access rules.
- Responsive desktop/mobile layout and Capacitor-based Android debug APK workflow.

## Required setup
**Use a NEW Supabase project named Quick IT.** The connected older project contains other app data. Do not overwrite it.

1. Create the Supabase project in your chosen organization.
2. Open the Supabase SQL Editor and run `supabase/migrations/20261010_quick_it.sql` in the new project.
3. Copy `.env.example` to `.env`; insert the new project URL and **publishable** key. Never add a service-role/secret key to a web app.
4. In Google Cloud, create a Google OAuth client, configure branding and authorized JS origins, and add `https://YOUR_REF.supabase.co/auth/v1/callback` as an authorized redirect URI.
5. Enable **Google** on the new Supabase Auth Providers page; enter the Google client credentials there. Allow the website callback and `quickit://auth/callback` as redirect URLs. Android OAuth may also need an Android OAuth client and signing SHA-1 registered with Google.
6. For the AI assistant, securely add `OPENAI_API_KEY` to Supabase Edge Function secrets and deploy `supabase/functions/quick-it-ai`. Without that, the AI UI will return a clear setup-required error.
7. In GitHub Repository → Settings → Secrets and variables → Actions, create `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` secrets using the **new** project.

## Run locally
```bash
npm install
npm run dev
npm run build
```

## Publish website
Import this repository into Vercel as a Vite project. Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables. The included `vercel.json` sets the build output and history fallback. Configure your final domain in Supabase Auth redirect URLs and Google OAuth authorized origins.

## Build Android APK
Go to **GitHub → Actions → Build Quick IT Android APK → Run workflow**. The workflow builds a *debug* APK and publishes `quick-it-debug-apk` in run artifacts. The APK is installable for testing, but not a release-signed store build. Google login requires the configured provider, redirect and signing setup.

## Security and limitations
- Account data is private by default with RLS. The storage bucket is private. Group post access follows membership/role policy. Resource display IDs are **not** access tokens.
- API keys and Google client secrets must never be committed to this public repository.
- The app code is a development starter. More advanced functionality (automatic PDF text extraction, reminders as Android push notifications, admin tools and signed production APKs) requires additional work.
- A missing Supabase configuration deliberately shows a setup message; it does not fake server responses.
