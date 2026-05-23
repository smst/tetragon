# <img src="public/tetragon.svg" width="20" /> tetragon

## Local Development Setup

### 1. Install Node Dependencies
Clone the repository and install the required packages:
```bash
git clone https://github.com/smst/tetragon.git
cd tetragon
npm install
```

### 2. Configure Environment Variables
Create a file named `.env.local` in the root directory (at the same level as `package.json`):

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_publishable_key>
SUPABASE_SERVICE_ROLE_KEY=<supabase_secret_key>
CRON_SECRET=<cron_secret>
```

These keys may be found in the Tetragon project settings on [Vercel](vercel.com).

For constants such as coefficients or multipliers for the design challenge scoring formula, you can include additional environment variables in `.env.local`. Prefix each variable with `NEXT_PUBLIC_`:
```
NEXT_PUBLIC_DESIGN_KIT_MASS=62.5
```

### 3. Editor Configuration
Any code editor web development-focused IDE can be used. If using VSCode, ensure that the appropriate extensions are installed:
* **ESLint** (`dbaeumer.vscode-eslint`)
* **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
* **PostCSS Language Support** (`csstools.postcss`)

### 5. Launch Development Server
Boot the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.
