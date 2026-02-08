#!/usr/bin/env bash
set -e

echo "JakeBot setup starting..."


# 1. Update system
sudo apt update

# 2. Install Node.js + npm (Ubuntu repo version is OK to start)
sudo apt install -y nodejs npm

# 3. Create project directory if needed (let's not)
# mkdir -p jakebot

# Instead, just cd into it. It's going to exist anyway if the user properly cloned the repo.
cd jakebot

# 4. Initialize npm project if not present (we need this for Playwright and its browsers) (Although this should already be done if the user cloned the repo?)
if [ ! -f package.json ]; then
  npm init -y
fi

# 5. Install Playwright
npm install playwright

# 6. Install Playwright browsers
npx playwright install

# 7. Dependencies for Playwright browsers is needed. (I knew I forgot something!)
sudo npx playwright install-deps

echo
echo "Setup complete."
echo
echo "Next steps:"
echo "CD into jakebot, run node setup.js, then run node watch.js"
echo
echo "JakeBot is ready to help your Mind Buddy."
