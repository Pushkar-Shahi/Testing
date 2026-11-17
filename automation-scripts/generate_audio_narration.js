const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = '/Users/shahi/.gemini/antigravity/brain/7a44b73e-1787-47fa-9817-75a8231d223e/scratch/video_assets';

const scenes = [
  {
    id: 'scene1',
    text: "Welcome to FlexHunter, the AI-powered college internship pipeline. For students like Tanmay with morning classes, standard portals push full-time offline roles that clash with college lectures. Here on Screen 1, we set our non-negotiables: Remote Only, maximum 15 hours per week, and stipend required."
  },
  {
    id: 'scene2',
    text: "Next, we block out morning lectures on the interactive timetable matrix. Classes like Calculus, Economics, and Physics are locked. FlexHunter dynamically calculates our remaining free afternoon bandwidth, showing 68 free hours per week. Clicking Save Preferences transitions to our personalized feed."
  },
  {
    id: 'scene3',
    text: "Moving to the Curated Match Feed, all 40-hour offline roles are eliminated. Each opportunity displays upfront stipends, weekly hours, and circular match percentage rings. Inspecting the UI/UX Design role reveals an AI Compatibility Breakdown, highlighting matched skills in green and schedule warnings in amber."
  },
  {
    id: 'scene4',
    text: "When students apply on external job boards, FlexHunter eliminates repetitive re-entry. Clicking Apply via Extension simulates our 380-pixel Chrome side panel over Internshala. It automatically extracts role details, verifies compatibility, and autofills student credentials and a tailored cover pitch in one click."
  },
  {
    id: 'scene5',
    text: "The role is automatically logged into Applied on our 5-column Kanban board, complete with an urgency timer to prevent ghosting. When follow-up is due, students click Draft Follow-Up Email to generate a tailored outreach note referencing their afternoon availability, ready to copy in one click."
  },
  {
    id: 'scene6',
    text: "FlexHunter also includes a dedicated Saved Jobs collection and an AI Resume Studio with a 94 out of 100 ATS score and role-specific pitch generators. Finally, for late-night study sessions, our Sun and Moon button switches instantly to full Dark Mode. This completes the end-to-end student job hunting journey."
  }
];

function getDuration(filePath) {
  const output = execSync(`export PATH="/opt/homebrew/bin:$PATH"; ffmpeg -i "${filePath}" 2>&1 | grep "Duration"`).toString();
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (match) {
    const hours = parseFloat(match[1]);
    const mins = parseFloat(match[2]);
    const secs = parseFloat(match[3]);
    return hours * 3600 + mins * 60 + secs;
  }
  return 20.0;
}

const metadata = [];

scenes.forEach((scene, index) => {
  const aiffPath = path.join(ASSETS_DIR, `${scene.id}.aiff`);
  const wavPath = path.join(ASSETS_DIR, `${scene.id}.wav`);
  console.log(`Generating audio for ${scene.id}...`);
  execSync(`say -v Samantha "${scene.text}" -o "${aiffPath}"`);
  execSync(`export PATH="/opt/homebrew/bin:$PATH"; ffmpeg -y -i "${aiffPath}" -ar 44100 -ac 2 "${wavPath}"`);
  fs.unlinkSync(aiffPath);
  const dur = getDuration(wavPath);
  console.log(`${scene.id} duration: ${dur.toFixed(2)}s`);
  metadata.push({
    id: scene.id,
    duration: dur,
    text: scene.text,
    wavPath
  });
});

// Concatenate all wavs into a single narration track: narration.wav
const concatListPath = path.join(ASSETS_DIR, 'concat.txt');
const fileEntries = metadata.map(m => `file '${m.wavPath}'`).join('\n');
fs.writeFileSync(concatListPath, fileEntries);

const fullNarrationPath = path.join(ASSETS_DIR, 'full_narration.wav');
execSync(`export PATH="/opt/homebrew/bin:$PATH"; ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${fullNarrationPath}"`);

const totalDur = getDuration(fullNarrationPath);
console.log(`\nAll audio generated successfully! Total Narration Duration: ${totalDur.toFixed(2)}s (~${(totalDur / 60).toFixed(1)} minutes)`);

fs.writeFileSync(path.join(ASSETS_DIR, 'scenes_metadata.json'), JSON.stringify(metadata, null, 2));
