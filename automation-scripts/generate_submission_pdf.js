const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTML_FILE = '/Users/shahi/Desktop/Learn/Product Development /FlexHunter_MVP_Final_Submission.html';
const OUT_PDF = '/Users/shahi/Desktop/Learn/Product Development /FlexHunter_MVP_Final_Submission.pdf';
const ARTIFACT_PDF = '/Users/shahi/.gemini/antigravity/brain/7a44b73e-1787-47fa-9817-75a8231d223e/FlexHunter_MVP_Final_Submission.pdf';

async function main() {
  console.log('Launching Chrome to render PDF...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.goto('file://' + HTML_FILE, { waitUntil: 'networkidle0' });

  // Wait a moment for all local images to load
  await new Promise((r) => setTimeout(r, 1200));

  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm'
    }
  });

  console.log(`Saved PDF to ${OUT_PDF}`);

  // Also copy to artifact directory for easy download/preview
  fs.copyFileSync(OUT_PDF, ARTIFACT_PDF);
  console.log(`Copied PDF to artifact directory: ${ARTIFACT_PDF}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
