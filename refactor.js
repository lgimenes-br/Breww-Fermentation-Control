const fs = require('fs');

function processFile(file, importStmt) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('safeFixed')) {
    content = importStmt + "\n" + content;
  }
  
  // Custom replacements
  
  // FermenterDetail.tsx
  if (file.includes('FermenterDetail.tsx')) {
    content = content.replace(/Number\(\(fermenter\.targetTemp \+ delta\)\.toFixed\(1\)\)/g, "Number(safeFixed(fermenter.targetTemp + delta, 1))");
    content = content.replace(/\{Number\(fermenter\.currentDevice\?\.temperature \|\| 0\)\.toFixed\(1\)\}/g, "{safeFixed(fermenter.currentDevice?.temperature, 1)}");
    content = content.replace(/\{Number\(fermenter\.targetTemp \|\| 0\)\.toFixed\(1\)\}°C/g, "{safeFixed(fermenter.targetTemp, 1)}°C");
    content = content.replace(/\{Number\(fermenter\.currentDevice\?\.temperature \|\| 0\)\.toFixed\(1\)\}/g, "{safeFixed(fermenter.currentDevice?.temperature, 1)}");
    content = content.replace(/\{Number\(fermenter\.currentDevice\?\.gravity \|\| 0\)\.toFixed\(3\)\}/g, "{safeFixed(fermenter.currentDevice?.gravity, 3)}");
    content = content.replace(/\{Number\(fermenter\.targetTemp \|\| 0\)\.toFixed\(1\)\}°/g, "{safeFixed(fermenter.targetTemp, 1)}°");
    content = content.replace(/\{Number\(fermenter\.currentFridgeTemp \|\| 0\)\.toFixed\(1\)\}°/g, "{safeFixed(fermenter.currentFridgeTemp, 1)}°");
    content = content.replace(/\{Number\(actualOG \|\| 0\)\.toFixed\(3\)\}/g, "{safeFixed(actualOG, 3)}");
    content = content.replace(/\{fermenter\.active_batch_fg \? Number\(fermenter\.active_batch_fg\)\.toFixed\(3\) \: '-'\}/g, "{fermenter.active_batch_fg ? safeFixed(fermenter.active_batch_fg, 3) : '-'}");
    content = content.replace(/\{Number\(currentAttenuation \|\| 0\)\.toFixed\(0\)\}%/g, "{safeFixed(currentAttenuation, 0)}%");
    content = content.replace(/\{Number\(abv \|\| 0\)\.toFixed\(1\)\}%/g, "{safeFixed(abv, 1)}%");
  }
  
  // Dashboard.tsx
  if (file.includes('Dashboard.tsx')) {
    content = content.replace(/\{Number\(f\.currentDevice\?\.temperature \|\| 0\)\.toFixed\(1\)\}/g, "{safeFixed(f.currentDevice?.temperature, 1)}");
    content = content.replace(/\{Number\(f\.targetTemp \|\| 0\)\.toFixed\(1\)\}°/g, "{safeFixed(f.targetTemp, 1)}°");
    content = content.replace(/\{Number\(f\.currentFridgeTemp \|\| 0\)\.toFixed\(1\)\}°/g, "{safeFixed(f.currentFridgeTemp, 1)}°");
    content = content.replace(/\{Number\(f\.currentDevice\?\.gravity \|\| 0\)\.toFixed\(3\)\}/g, "{safeFixed(f.currentDevice?.gravity, 3)}");
    content = content.replace(/\{Number\(f\.active_batch_og \|\| 0\)\.toFixed\(3\)\}/g, "{safeFixed(f.active_batch_og, 3)}");
  }
  
  // FermentationProfile.tsx
  if (file.includes('FermentationProfile.tsx')) {
    content = content.replace(/displayOg\?\.toFixed\(3\)/g, "safeFixed(displayOg, 3)");
    content = content.replace(/displayFg\?\.toFixed\(3\)/g, "safeFixed(displayFg, 3)");
  }

  // FinishedBrewDetail.tsx
  if (file.includes('FinishedBrewDetail.tsx')) {
    content = content.replace(/brew\.abv\.toFixed\(1\)/g, "safeFixed(brew.abv, 1)");
    content = content.replace(/brew\.fg\.toFixed\(3\)/g, "safeFixed(brew.fg, 3)");
    content = content.replace(/attenuation\.toFixed\(1\)/g, "safeFixed(attenuation, 1)");
    content = content.replace(/brew\.og\.toFixed\(3\)/g, "safeFixed(brew.og, 3)");
    content = content.replace(/calories\.toFixed\(0\)/g, "safeFixed(calories, 0)");
  }

  // GravityChart.tsx
  if (file.includes('GravityChart.tsx')) {
    content = content.replace(/val\.toFixed\(3\)/g, "safeFixed(val, 3)");
    content = content.replace(/value\.toFixed\(3\)/g, "safeFixed(value, 3)");
    content = content.replace(/og\.toFixed\(3\)/g, "safeFixed(og, 3)");
    content = content.replace(/fg\.toFixed\(3\)/g, "safeFixed(fg, 3)");
  }

  // InsightModal.tsx
  if (file.includes('InsightModal.tsx')) {
    content = content.replace(/insight\.predictedFG\.toFixed\(3\)/g, "safeFixed(insight.predictedFG, 3)");
    content = content.replace(/val\.toFixed\(3\)/g, "safeFixed(val, 3)");
    content = content.replace(/value\.toFixed\(3\)/g, "safeFixed(value, 3)");
  }

  fs.writeFileSync(file, content);
}

processFile('components/Dashboard.tsx', "import { safeFixed } from '../utils/format';");
processFile('components/FermentationProfile.tsx', "import { safeFixed } from '../utils/format';");
processFile('components/FermenterDetail.tsx', "import { safeFixed } from '../utils/format';");
processFile('components/FinishedBrewDetail.tsx', "import { safeFixed } from '../utils/format';");
processFile('components/GravityChart.tsx', "import { safeFixed } from '../utils/format';");
processFile('components/InsightModal.tsx', "import { safeFixed } from '../utils/format';");

console.log('Done');
