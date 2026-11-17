const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = '/Users/shahi/.gemini/antigravity/brain/7a44b73e-1787-47fa-9817-75a8231d223e';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 920 });

  // 1. Load the app
  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle0' });

  // 2. Set dark mode in localStorage and toggle document class
  await page.evaluate(() => {
    localStorage.setItem('flexhunter_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot Screen 1 (Settings / Availability & Constraints) in Dark Mode
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_screen1_settings.png') });
  console.log('Saved dark_mode_screen1_settings.png');

  // Navigate to Screen 2: Match Feed
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const feedBtn = buttons.find((b) => b.innerText.includes('Match Feed'));
    if (feedBtn) feedBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_screen2_feed.png') });
  console.log('Saved dark_mode_screen2_feed.png');

  // Navigate to Screen 3: Application Tracker
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const trackerBtn = buttons.find((b) => b.innerText.includes('Application Tracker'));
    if (trackerBtn) trackerBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_screen3_tracker.png') });
  console.log('Saved dark_mode_screen3_tracker.png');

  // Open Follow-Up Email Modal from tracker
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const draftBtn = buttons.find((b) => b.innerText.includes('Draft Follow-Up Email'));
    if (draftBtn) draftBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_email_modal.png') });
  console.log('Saved dark_mode_email_modal.png');

  // Close modal and navigate to Extension Simulation
  await page.evaluate(() => {
    const closeBtns = Array.from(document.querySelectorAll('button'));
    const close = closeBtns.find((b) => b.innerText.includes('Close'));
    if (close) close.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const extBtn = buttons.find((b) => b.innerText.includes('Extension') || b.innerText.includes('Preview Extension'));
    if (extBtn) extBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_screen4_extension.png') });
  console.log('Saved dark_mode_screen4_extension.png');

  // Saved Jobs (reload fresh to have clean state)
  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('nav button'));
    const savedBtn = buttons.find((b) => b.innerText.includes('Saved Jobs'));
    if (savedBtn) savedBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_saved_jobs.png') });
  console.log('Saved dark_mode_saved_jobs.png');

  // Resume Studio
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('nav button'));
    const resumeBtn = buttons.find((b) => b.innerText.includes('Resume Studio'));
    if (resumeBtn) resumeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'dark_mode_resume_studio.png') });
  console.log('Saved dark_mode_resume_studio.png');

  await browser.close();
  console.log('All screenshots completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
