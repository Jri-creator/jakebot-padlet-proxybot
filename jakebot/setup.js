#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const path = require('path');

/* ================= SETUP SCRIPT ================= */

const CONFIG_FILE = './config.json';

console.log('🐨 Welcome to JakeBot Setup!');
console.log('═══════════════════════════════════════════════════════');
console.log('This script will help you configure JakeBot for your Padlet board.');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function runSetup() {
  try {
    console.log('📋 Please provide the following information:\n');

    // Get Padlet URL
    const padletUrl = await ask('1️⃣  Padlet Board URL (e.g., https://padlet.com/user/board-name): ');
    
    // Extract Padlet ID from URL
    let padletId = '';
    const urlMatch = padletUrl.match(/padlet\.com\/[^\/]+\/(.+)/);
    if (urlMatch) {
      padletId = urlMatch[1];
      console.log(`   ✓ Detected Padlet ID: ${padletId}\n`);
    } else {
      console.log('   ⚠️  Could not auto-detect Padlet ID from URL.');
      padletId = await ask('   Please enter your Padlet ID manually: ');
      console.log('');
    }

    // Get original author name
    const originalAuthor = await ask('2️⃣  Your Padlet Display Name (the name you post under): ');
    console.log('');

    // Get Mind Buddy email
    const mindBuddyEmail = await ask('3️⃣  Mind Buddy Padlet Email (for posting as your Mind Buddy): ');
    console.log('');

    // Get Mind Buddy password
    const mindBuddyPassword = await ask('4️⃣  Mind Buddy Padlet Password: ');
    console.log('');

    // Get Mind Buddy name
    const mindBuddyName = await ask('5️⃣  Mind Buddy Name (e.g., Jake): ');
    console.log('');

    // Get Mind Buddy bio
    console.log('6️⃣  About Your Mind Buddy');
    console.log('   Tell us about your Mind Buddy! This will be used in the "About" post.');
    console.log('   What makes them special? What do they like? What\'s their personality?');
    console.log('   (Press Enter twice when done, or type a single period "." and press Enter to finish)\n');
    
    let bioText = '';
    let bioInputLine = '';
    let consecutiveEmptyLines = 0;
    
    while (true) {
      bioInputLine = await ask('   ');
      if (bioInputLine === '.') break;
      if (bioInputLine === '') {
        consecutiveEmptyLines++;
        if (consecutiveEmptyLines >= 2) break;
        bioText += '\n';
      } else {
        consecutiveEmptyLines = 0;
        bioText += (bioText ? '\n' : '') + bioInputLine;
      }
    }
    
    bioText = bioText.trim();
    if (!bioText) {
      bioText = `Hi! I'm ${mindBuddyName}, ${originalAuthor}'s Mind Buddy. 🐨 I have my own thoughts and feelings, and I love exploring ideas and thinking independently!`;
    }
    console.log(`   ✓ Bio saved (${bioText.length} characters)\n`);

    // Get signalers
    console.log('7️⃣  Signalers (characters that trigger proxying)');
    console.log('   Default: 🐨, [, ]');
    console.log('   Press Enter to use defaults, or enter custom signalers separated by commas.');
    const signalersInput = await ask('   Signalers: ');
    const signalers = signalersInput.trim() 
      ? signalersInput.split(',').map(s => s.trim()).filter(s => s)
      : ['🐨', '[', ']'];
    console.log(`   ✓ Using signalers: ${signalers.join(', ')}\n`);

    // Get check interval
    console.log('8️⃣  Post Check Interval (how often to check for new posts, in milliseconds)');
    console.log('   Default: 5000 (5 seconds)');
    const intervalInput = await ask('   Interval (ms): ');
    const postCheckInterval = intervalInput.trim() ? parseInt(intervalInput, 10) : 5000;
    console.log(`   ✓ Using interval: ${postCheckInterval}ms\n`);

    // Get max proxy age
    console.log('9️⃣  Max Proxy Age (how old a post can be before it won\'t be proxied, in minutes)');
    console.log('   Default: 10 (10 minutes)');
    const ageInput = await ask('   Max age (minutes): ');
    const maxProxyMinutes = ageInput.trim() ? parseInt(ageInput, 10) : 10;
    const maxProxyAge = maxProxyMinutes * 60 * 1000;
    console.log(`   ✓ Using max age: ${maxProxyMinutes} minutes\n`);

    // Build config object
    const config = {
      padletUrl: padletUrl.trim(),
      padletId: padletId.trim(),
      originalAuthor: originalAuthor.trim(),
      mindBuddyEmail: mindBuddyEmail.trim(),
      mindBuddyPassword: mindBuddyPassword.trim(),
      mindBuddyName: mindBuddyName.trim(),
      mindBuddyBio: bioText,
      signalers: signalers,
      postCheckInterval: postCheckInterval,
      maxProxyAge: maxProxyAge
    };

    // Save config
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Configuration saved successfully!');
    console.log(`📁 Config file created at: ${path.resolve(CONFIG_FILE)}`);
    console.log('');
    console.log('🚀 You can now run JakeBot with: node watch.js');
    console.log('');
    console.log('💡 To reconfigure JakeBot, run this setup script again.');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Check if config already exists
if (fs.existsSync(CONFIG_FILE)) {
  console.log('⚠️  A configuration file already exists.');
  console.log('');
  rl.question('Do you want to overwrite it? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('');
      runSetup();
    } else {
      console.log('Setup cancelled. Your existing configuration has been preserved.');
      rl.close();
    }
  });
} else {
  runSetup();
}