#!/usr/bin/env node
const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ===== CONFIG =====
const PADLET_URL = 'https://padlet.com/jacobbutcher28/lets-chat-qjrhalto59z8efms';
const POST_CHECK_INTERVAL = 5000;
const PAGE_REFRESH_INTERVAL = 10000;
const MAX_PROXY_AGE = 10 * 60 * 1000; // 10 minutes
const MAX_POSTS = 10;

let signalers = ['🐨', '[', ']'];

// ===== LOG FILES =====
const LOG_DIR = './logs';
const DEBUG_LOG = path.join(LOG_DIR, 'debug.log');
const HTML_LOG = path.join(LOG_DIR, 'page_snapshot.html');

// ===== STATE =====
let autoproxyEnabled = true;
let seenPostIds = new Set();

if (fs.existsSync('state.json')) {
  try {
    const s = JSON.parse(fs.readFileSync('state.json', 'utf-8'));
    seenPostIds = new Set(s.seenPostIds || []);
    signalers = s.signalers || signalers;
  } catch {}
}

// ===== LOGGING =====
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(DEBUG_LOG, line + '\n');
}

function saveHTMLSnapshot(html) {
  fs.writeFileSync(HTML_LOG, html);
  log(`📄 HTML snapshot saved`);
}

// ===== HELPERS =====
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay(min = 0, max = 120000) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function isSignalPost(text) {
  return signalers.some(sig => text.includes(sig));
}
function isCommandPost(text) {
  const t = text.trim();
  return /^\[Jake:/i.test(t) && t.endsWith(']');
}
function parseCommand(text) {
  const content = text.slice(6, -1).trim();
  const [cmd, ...args] = content.split(' ');
  return { cmd: cmd.toUpperCase(), args };
}

// ===== TIMESTAMP PARSER =====
function parseTimestamp(str) {
  if (!str) return null;
  const now = Date.now();

  const abs = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*•\s*(\w+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (abs) {
    const months = {
      january:0,february:1,march:2,april:3,may:4,june:5,
      july:6,august:7,september:8,october:9,november:10,december:11
    };
    let h = parseInt(abs[1]);
    const m = parseInt(abs[2]);
    if (abs[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (abs[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(
      parseInt(abs[6]),
      months[abs[4].toLowerCase()],
      parseInt(abs[5]),
      h, m
    ).getTime();
  }

  const rel = [
    [/(\d+)\s*seconds?\s*ago/i, 1000],
    [/(\d+)\s*minutes?\s*ago/i, 60000],
    [/(\d+)\s*hours?\s*ago/i, 3600000],
    [/(\d+)\s*days?\s*ago/i, 86400000],
    [/an?\s*minute\s*ago/i, 60000],
    [/an?\s*hour\s*ago/i, 3600000],
    [/just now/i, 0],
  ];

  for (const [rx, mult] of rel) {
    const m = str.match(rx);
    if (m) return now - (parseInt(m[1] || 1) * mult);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// ===== CLI PROMPT (PLAIN, NO HIDING) =====
async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(question, ans => {
    rl.close();
    res(ans);
  }));
}

// ===== PROXY QUEUE =====
const proxyQueue = [];
let proxyBusy = false;

async function enqueueProxy(post, page) {
  proxyQueue.push({ post, page });
  if (!proxyBusy) await processQueue();
}

async function processQueue() {
  proxyBusy = true;
  while (proxyQueue.length) {
    const { post, page } = proxyQueue.shift();
    await proxyPost(post, page);
  }
  proxyBusy = false;
}

async function proxyPost(post, page) {
  try {
    let cleanText = post.text;
    for (const sig of signalers) {
      cleanText = cleanText.replace(new RegExp(sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    }
    cleanText = cleanText.trim();
    if (!cleanText) return;

    await page.bringToFront();
    await page.keyboard.press('c');
    await page.waitForTimeout(700);
    await page.keyboard.type(cleanText, { delay: 15 });
    /*await page.keyboard.hold('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.release('Control');*/
    if (process.platform === 'darwin') {
  await page.keyboard.press('Meta+Enter');   // macOS
} else {
  await page.keyboard.press('Control+Enter'); // Windows/Linux
}


    log(`✅ Proxied post: ${cleanText.slice(0, 40)}...`);
  } catch (e) {
    log(`❌ Proxy error: ${e.message}`);
  }
}

// ===== MAIN =====
(async () => {
  log('=== JakeBot Starting ===');

  const email = await prompt('Padlet Email: ');
  const password = await prompt('Padlet Password: ');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  log('Navigating to login page...');
  await page.goto('https://padlet.com/auth/login');
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.keyboard.press('Enter');
  /*await page.waitForSelector('input[type="password"]', { timeout: 30000 });
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });*/
  await page.waitForSelector('input[type="password"]', { timeout: 30000 });
await page.fill('input[type="password"]', password);

// Try Enter first
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

// If still on login page, try clicking known buttons
const stillOnLogin = page.url().includes('/auth/login');
if (stillOnLogin) {
  const buttonSelectors = [
    'button[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Continue")',
    '[role="button"]:has-text("Log in")'
  ];

  for (const sel of buttonSelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      break;
    }
  }
}

// Wait for navigation OR dashboard
/*await page.waitForURL(url => !url.includes('/auth/login'), {
  timeout: 30000
});*/


  log('Navigating to Padlet board...');
  await page.goto(PADLET_URL);
  await page.waitForTimeout(60000);

  saveHTMLSnapshot(await page.content());
  log('🔍 Starting watch loop...');
  let lastRefresh = Date.now();

  while (true) {
    try {
      await delay(POST_CHECK_INTERVAL);

      if (Date.now() - lastRefresh > PAGE_REFRESH_INTERVAL) {
        log('🔄 Refreshing page...');
        await page.reload({ waitUntil: 'networkidle' });
        lastRefresh = Date.now();
        saveHTMLSnapshot(await page.content());
      }

      const posts = await page.evaluate(MAX_POSTS => {
        return Array.from(document.querySelectorAll('[data-testid="post"], article'))
          .slice(0, MAX_POSTS)
          .map(el => ({
            id: el.getAttribute('data-id') || el.id || Math.random().toString(36),
            text: el.innerText || '',
            timeText: el.querySelector('time')?.textContent || null
          }));
      }, MAX_POSTS);

      for (const post of posts) {
        if (seenPostIds.has(post.id)) continue;
        seenPostIds.add(post.id);

        const ts = parseTimestamp(post.timeText);
        if (!ts || Date.now() - ts > MAX_PROXY_AGE) continue;

        if (isCommandPost(post.text)) {
          const { cmd } = parseCommand(post.text);
          autoproxyEnabled = cmd !== 'BOT OFF';
          continue;
        }

        if (!autoproxyEnabled || !isSignalPost(post.text)) continue;

        await delay(randomDelay());
        await enqueueProxy(post, page);
      }

      fs.writeFileSync('state.json', JSON.stringify({
        seenPostIds: [...seenPostIds],
        signalers
      }));

    } catch (e) {
      log(`❌ Loop error: ${e.message}`);
    }
  }
})();
