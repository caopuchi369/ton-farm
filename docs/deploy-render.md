# Deploy to Render

## 1. Push This Folder to GitHub

Render deploys most easily from a Git repository.

```bash
git init
git add .
git commit -m "Initial TON Farm MVP"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/ton-farm.git
git push -u origin main
```

## 2. Create a Render Web Service

1. Open Render Dashboard.
2. Click `New +`.
3. Choose `Web Service`.
4. Connect the GitHub repository.
5. Use these settings:

```text
Runtime: Node
Build Command: npm install
Start Command: npm run start
Health Check Path: /api/health
Plan: Free
```

If Render detects `render.yaml`, it can also create the service from the blueprint.

## 3. Set Environment Variables

After Render creates the service, copy the generated HTTPS URL, for example:

```text
https://ton-farm.onrender.com
```

Then set:

```bash
APP_URL=https://ton-farm.onrender.com
APP_ICON_URL=https://ton-farm.onrender.com/icon.svg
TON_NETWORK=mainnet
TON_TREASURY_ADDRESS=EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_RETURN_URL=https://t.me/your_bot/your_app
```

Redeploy after saving environment variables.

## 4. Verify

Open:

```text
https://ton-farm.onrender.com/
https://ton-farm.onrender.com/api/health
https://ton-farm.onrender.com/tonconnect-manifest.json
```

The manifest URL must show the same HTTPS domain in `url` and `iconUrl`.

## 5. Bind in BotFather

In `@BotFather`:

1. Select your bot with `/mybots`.
2. Open `Bot Settings`.
3. Configure `Menu Button` with the Render URL.
4. Open `Configure Mini App`.
5. Enable the Mini App and set the same Render URL.
