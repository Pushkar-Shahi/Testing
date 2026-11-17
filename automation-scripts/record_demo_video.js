const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ASSETS_DIR = '/Users/shahi/.gemini/antigravity/brain/7a44b73e-1787-47fa-9817-75a8231d223e/scratch/video_assets';
const METADATA_PATH = path.join(ASSETS_DIR, 'scenes_metadata.json');
const CLIPS_DIR = path.join(ASSETS_DIR, 'clips');
const OUT_MP4 = '/Users/shahi/Desktop/Learn/Product Development /FlexHunter_MVP_2Min_Demo.mp4';
const ARTIFACT_MP4 = '/Users/shahi/.gemini/antigravity/brain/7a44b73e-1787-47fa-9817-75a8231d223e/FlexHunter_MVP_2Min_Demo.mp4';

const FPS = 20;
const FRAME_INTERVAL_MS = 1000 / FPS;
const VIEWPORT = { width: 1440, height: 810 }; // Exact 16:9 HD widescreen

if (fs.existsSync(CLIPS_DIR)) {
  fs.rmSync(CLIPS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(CLIPS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function injectOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('virtual-cursor')) return;

    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.cssText = `
      position: fixed;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: rgba(37, 99, 235, 0.9);
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 12px rgba(0,0,0,0.45);
      pointer-events: none;
      z-index: 999999;
      left: 0;
      top: 0;
      transform: translate(720px, 405px) translate(-50%, -50%);
      transition: background-color 0.15s;
    `;
    document.body.appendChild(cursor);

    const ripple = document.createElement('div');
    ripple.id = 'virtual-ripple';
    ripple.style.cssText = `
      position: fixed;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid #10b981;
      pointer-events: none;
      z-index: 999998;
      opacity: 0;
      left: 0;
      top: 0;
      transform: translate(720px, 405px) translate(-50%, -50%) scale(0.4);
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    `;
    document.body.appendChild(ripple);

    const caption = document.createElement('div');
    caption.id = 'demo-caption';
    caption.style.cssText = `
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(15, 23, 42, 0.94);
      color: #f8fafc;
      padding: 8px 20px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.01em;
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: nowrap;
      pointer-events: none;
    `;
    caption.innerText = 'FlexHunter MVP Demo';
    document.body.appendChild(caption);

    window.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });

    window.addEventListener('mousedown', (e) => {
      cursor.style.backgroundColor = '#10b981';
      ripple.style.opacity = '1';
      ripple.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1.45)`;
      setTimeout(() => {
        cursor.style.backgroundColor = 'rgba(37, 99, 235, 0.9)';
        ripple.style.opacity = '0';
        ripple.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(0.4)`;
      }, 280);
    });

    window.setDemoCaption = (text) => {
      const el = document.getElementById('demo-caption');
      if (el) el.innerText = text;
    };
  });
}

// Safely scroll element into view, compute viewport center, move cursor, and click
async function scrollAndClick(page, finderFn, pauseAfter = 600, ...args) {
  const coords = await page.evaluate((fnStr, fnArgs) => {
    const fn = eval('(' + fnStr + ')');
    const el = fn(...fnArgs);
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, finderFn.toString(), args);

  if (!coords) {
    console.log('Warning: Target element not found for click.');
    return false;
  }

  await page.mouse.move(coords.x, coords.y, { steps: 18 });
  await sleep(150);
  await page.mouse.click(coords.x, coords.y);
  await sleep(pauseAfter);
  return true;
}

async function moveCursorOnly(page, finderFn, pauseAfter = 600, ...args) {
  const coords = await page.evaluate((fnStr, fnArgs) => {
    const fn = eval('(' + fnStr + ')');
    const el = fn(...fnArgs);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, finderFn.toString(), args);

  if (coords) {
    await page.mouse.move(coords.x, coords.y, { steps: 18 });
    await sleep(pauseAfter);
  }
}

async function smoothScrollMain(page, targetTop) {
  await page.evaluate((top) => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top, behavior: 'smooth' });
  }, targetTop);
  await sleep(750);
}

async function run() {
  const scenesMeta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));

  console.log('Launching Chrome (1440x810)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await injectOverlay(page);

  const client = await page.target().createCDPSession();
  let latestFrameBuffer = await page.screenshot({ type: 'jpeg', quality: 90 });

  client.on('Page.screencastFrame', async (event) => {
    latestFrameBuffer = Buffer.from(event.data, 'base64');
    await client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });

  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 88,
    everyNthFrame: 1
  });

  async function recordScene(sceneIndex, captionText, actionFn) {
    const meta = scenesMeta[sceneIndex];
    const totalTargetFrames = Math.round(meta.duration * FPS);
    const sceneFramesDir = path.join(CLIPS_DIR, `${meta.id}_frames`);
    fs.mkdirSync(sceneFramesDir, { recursive: true });

    console.log(`\nStarting ${meta.id} (${meta.duration.toFixed(2)}s -> ${totalTargetFrames} frames)...`);
    await page.evaluate((txt) => window.setDemoCaption(txt), captionText);

    let frameCounter = 0;
    const startTime = Date.now();

    const ticker = setInterval(() => {
      if (frameCounter < totalTargetFrames && latestFrameBuffer) {
        frameCounter++;
        const fname = `frame_${String(frameCounter).padStart(5, '0')}.jpg`;
        fs.writeFileSync(path.join(sceneFramesDir, fname), latestFrameBuffer);
      }
    }, FRAME_INTERVAL_MS);

    await actionFn();

    while (frameCounter < totalTargetFrames) {
      await sleep(50);
    }
    clearInterval(ticker);

    const clipOut = path.join(CLIPS_DIR, `${meta.id}.mp4`);
    execSync(`export PATH="/opt/homebrew/bin:$PATH"; ffmpeg -y -framerate ${FPS} -i "${sceneFramesDir}/frame_%05d.jpg" -i "${meta.wavPath}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${clipOut}"`, { stdio: 'ignore' });
    console.log(`Finished ${meta.id} (${frameCounter} frames written in ${((Date.now() - startTime)/1000).toFixed(2)}s).`);
    return clipOut;
  }

  const clipFiles = [];

  // ==================== SCENE 1: Screen 1 Constraints ====================
  clipFiles.push(await recordScene(0, 'Screen 1: Non-Negotiables — Weekly Hours, Remote Only & Stipend Required', async () => {
    await sleep(1200);
    const sliderBox = await page.evaluate(() => {
      const s = document.querySelector('input[type="range"]');
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { x20: r.left + r.width * 0.60, x15: r.left + r.width * 0.40, y: r.top + r.height / 2 };
    });
    if (sliderBox) {
      await page.mouse.move(sliderBox.x20, sliderBox.y, { steps: 18 });
      await page.mouse.click(sliderBox.x20, sliderBox.y);
      await sleep(1400);
      await page.mouse.move(sliderBox.x15, sliderBox.y, { steps: 18 });
      await page.mouse.click(sliderBox.x15, sliderBox.y);
      await sleep(1400);
    }

    // Flip Stipend Required toggle
    await scrollAndClick(page, () => {
      const toggles = Array.from(document.querySelectorAll('button.rounded-full.p-1'));
      return toggles[1] || null;
    }, 1500);

    // Hover over skills pills
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Figma')), 1400);
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Social Media')), 1400);
  }));

  // ==================== SCENE 2: Timetable Matrix & Save ====================
  clipFiles.push(await recordScene(1, 'College Lecture Matrix: Blocking morning classes · 68 free hrs / week', async () => {
    await smoothScrollMain(page, 500);
    await sleep(800);

    // Toggle two lecture slots
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('table tbody td button'))[22], 1200);
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('table tbody td button'))[25], 1200);

    // Hover over free hrs/week badge
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('free hrs')), 2000);

    // Scroll back up and click Save Preferences
    await smoothScrollMain(page, 0);
    await sleep(500);
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Preferences')), 2000);
  }));

  // ==================== SCENE 3: Screen 2 Curated Match Feed ====================
  clipFiles.push(await recordScene(2, 'Screen 2: Curated Feed · Circular match scores & AI Compatibility Breakdown', async () => {
    await sleep(1000);

    // Click Social Media Marketing Associate card
    await scrollAndClick(page, () => {
      const h = Array.from(document.querySelectorAll('h3')).find(el => el.innerText.includes('Social Media'));
      return h ? (h.closest('.p-4') || h) : null;
    }, 2000);

    // Click back on UI/UX Design Intern
    await scrollAndClick(page, () => {
      const h = Array.from(document.querySelectorAll('h3')).find(el => el.innerText.includes('UI/UX Design'));
      return h ? (h.closest('.p-4') || h) : null;
    }, 1800);

    // Highlight AI Compatibility Breakdown Pros and Warnings
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText === 'Pros'), 1600);
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText === 'Schedule Warnings'), 1800);

    // Click Save to Board
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save to Board')), 2000);
  }));

  // ==================== SCENE 4: Screen 4 Extension Simulation ====================
  clipFiles.push(await recordScene(3, 'Screen 4: Chrome Extension Overlay on Internshala · 1-Click Autofill', async () => {
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Apply via Extension')), 2200);

    // Highlight extension sections inside overlay
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('Job Detected')), 1400);
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('Strong fit')), 1600);
    await moveCursorOnly(page, () => Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('One-Click Autofill')), 1800);
    await moveCursorOnly(page, () => document.querySelector('textarea'), 1800);

    // Scroll & Click Auto-Fill Application & Track in CRM button!
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Auto-Fill Application')), 3000);
  }));

  // ==================== SCENE 5: Screen 3 Kanban CRM & Email ====================
  clipFiles.push(await recordScene(4, 'Screen 3: 5-Stage Kanban CRM · Stage Advancing & Follow-Up Email Generator', async () => {
    // Navigate to Application Tracker
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Application Tracker')), 2000);

    // Click Move > on a card
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Move')), 1500);

    // Click Draft Follow-Up Email
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Draft Follow-Up Email')), 2000);

    // Click Copy Email & Subject inside modal
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Copy Email')), 1800);

    // Close modal
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Close'), 1200);
  }));

  // ==================== SCENE 6: Saved Jobs, Resume Studio & Dark Mode ====================
  clipFiles.push(await recordScene(5, 'Saved Jobs, AI Resume Studio (94/100 ATS) & Universal Dark Mode', async () => {
    // Click Saved Jobs
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Saved Jobs')), 2200);

    // Click Resume Studio
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('aside nav button')).find(b => b.innerText.includes('Resume Studio')), 2500);

    // Switch Pitch Role to Content Marketing
    await scrollAndClick(page, () => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Content Marketing')), 1800);

    // Toggle Dark Mode via TopBar Moon/Sun icon!
    await scrollAndClick(page, () => document.querySelector('button[title*="Mode"]'), 2500);

    await page.evaluate(() => window.setDemoCaption('FlexHunter MVP · Live at pushkar-shahi.github.io/flexhunter-mvp/ ✓'));
    await sleep(1800);
  }));

  await client.send('Page.stopScreencast');
  await browser.close();

  console.log('\nConcatenating all 6 synced video clips...');
  const concatTxt = path.join(CLIPS_DIR, 'clips_concat.txt');
  fs.writeFileSync(concatTxt, clipFiles.map(c => `file '${c}'`).join('\n'));

  execSync(`export PATH="/opt/homebrew/bin:$PATH"; ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${OUT_MP4}"`);
  console.log(`Final MP4 Video Generated: ${OUT_MP4}`);

  fs.copyFileSync(OUT_MP4, ARTIFACT_MP4);
  console.log(`Copied to artifact directory: ${ARTIFACT_MP4}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
