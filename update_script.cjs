const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../ramazanda-hayir-yarisi/src/gameData.ts');

let code = fs.readFileSync(targetPath, 'utf8');

// Replace GROUP_PASSWORD
code = code.replace(/export const GROUP_PASSWORD = 'ramazan2025';/, "export const GROUP_PASSWORD = 'ramazan2026';");

// Replace PARTICIPANTS
code = code.replace(/export const PARTICIPANTS: Record<string, string> = \{[\s\S]*?\};/,
    `export const PARTICIPANTS: Record<string, string> = {
    'yolcu1': 'Bilal Çiçek',
    'yolcu2': 'Şehmus Çiçek',
    'yolcu3': 'Sevda Çiçek',
    'yolcu4': 'Sümeyye Çiçek',
    'yolcu5': 'Zeynep Akalan',
    'yolcu6': 'Aişe Kübra Çiçek',
    'yolcu7': 'Rabia Çiçek',
    'yolcu8': 'Zeynep Çiçek',
    'yolcu9': 'Esra Çiçek',
    'yolcu10': 'İrem Sude Akalan',
    'yolcu11': 'Ahmet Asaf Çiçek',
    'yolcu12': 'Osman Arslan',
    'yolcu13': 'Ömer Sami Çiçek',
    'yolcu14': 'Emirhan Akalan',
    'yolcu15': 'Yusuf Ensar Çiçek',
    'yolcu16': 'Emrullah Akalan',
    'yolcu17': 'Furkan Akalan',
};`);

// Replace Question interface
code = code.replace(/export interface Question \{[\s\S]*?correctIndex: number;\r?\n\}/,
    `export interface Question {
    id: number;
    difficulty: Difficulty;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
}`);

// Add explanation to all questions
const regex = /(QUESTIONS_SET[1-7]:\s*Question\[\]\s*=\s*\[)([\s\S]*?)(\];)/g;
code = code.replace(regex, (match, prefix, content, suffix) => {
    // We target correctIndex: number } and append explanation
    const newContent = content.replace(/(correctIndex:\s*\d+)(\s*\})/g, '$1, explanation: "Bu sorunun detayı ve açıklaması burada yer alacak." $2');
    return prefix + newContent + suffix;
});

fs.writeFileSync(targetPath, code);
console.log('Update gameData.ts successfully');
