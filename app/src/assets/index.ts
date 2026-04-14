/**
 * WealthWise Kids — Asset Index
 *
 * Usage with react-native-svg:
 *   import { SvgXml } from 'react-native-svg';
 *   import { darkBg, authBg } from '../assets';
 *
 *   <SvgXml xml={darkBg} style={StyleSheet.absoluteFillObject}
 *           preserveAspectRatio="xMidYMid slice" width="100%" height="100%" />
 */

// ─── Background SVGs ─────────────────────────────────────────────────────────

/** Dark navy with stars + grid — quiz, lessons, student screens */
export const darkBg = `<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gs1" cx="30%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#1a3870" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#080F1E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gs2" cx="80%" cy="70%" r="50%">
      <stop offset="0%" stop-color="#0d2d5e" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#080F1E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="390" height="844" fill="#080F1E"/>
  <rect width="390" height="844" fill="url(#gs1)"/>
  <rect width="390" height="844" fill="url(#gs2)"/>
  <g opacity="0.5" fill="white">
    <circle cx="40" cy="60" r="1.2"/><circle cx="120" cy="30" r="1.8"/>
    <circle cx="200" cy="80" r="1.2"/><circle cx="320" cy="45" r="1.8"/>
    <circle cx="350" cy="120" r="1.2"/><circle cx="80" cy="160" r="1.2"/>
    <circle cx="270" cy="200" r="1.8"/><circle cx="150" cy="250" r="1.2"/>
    <circle cx="380" cy="300" r="1.2"/><circle cx="22" cy="330" r="1.5"/>
    <circle cx="190" cy="360" r="1"/><circle cx="340" cy="400" r="1.5"/>
    <circle cx="60" cy="450" r="1.2"/><circle cx="280" cy="500" r="1.8"/>
    <circle cx="100" cy="550" r="1"/><circle cx="360" cy="580" r="1.5"/>
    <circle cx="170" cy="620" r="1.2"/><circle cx="50" cy="680" r="1"/>
    <circle cx="300" cy="720" r="1.5"/><circle cx="130" cy="780" r="1.2"/>
    <circle cx="250" cy="820" r="1.8"/>
  </g>
  <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
    <line x1="0" y1="0" x2="0" y2="844"/><line x1="48" y1="0" x2="48" y2="844"/>
    <line x1="96" y1="0" x2="96" y2="844"/><line x1="144" y1="0" x2="144" y2="844"/>
    <line x1="192" y1="0" x2="192" y2="844"/><line x1="240" y1="0" x2="240" y2="844"/>
    <line x1="288" y1="0" x2="288" y2="844"/><line x1="336" y1="0" x2="336" y2="844"/>
    <line x1="0" y1="48" x2="390" y2="48"/><line x1="0" y1="96" x2="390" y2="96"/>
    <line x1="0" y1="144" x2="390" y2="144"/><line x1="0" y1="192" x2="390" y2="192"/>
    <line x1="0" y1="240" x2="390" y2="240"/><line x1="0" y1="288" x2="390" y2="288"/>
    <line x1="0" y1="336" x2="390" y2="336"/><line x1="0" y1="384" x2="390" y2="384"/>
    <line x1="0" y1="432" x2="390" y2="432"/><line x1="0" y1="480" x2="390" y2="480"/>
    <line x1="0" y1="528" x2="390" y2="528"/><line x1="0" y1="576" x2="390" y2="576"/>
    <line x1="0" y1="624" x2="390" y2="624"/><line x1="0" y1="672" x2="390" y2="672"/>
    <line x1="0" y1="720" x2="390" y2="720"/><line x1="0" y1="768" x2="390" y2="768"/>
    <line x1="0" y1="816" x2="390" y2="816"/>
  </g>
</svg>`;

/** Navy → teal gradient — WelcomeScreen, SignIn, SignUp */
export const authBg = `<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gauth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B3A6B"/>
      <stop offset="100%" stop-color="#0D7377"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#gauth)"/>
  <circle cx="50" cy="80" r="160" fill="rgba(255,255,255,0.04)"/>
  <circle cx="350" cy="700" r="200" fill="rgba(255,255,255,0.04)"/>
  <circle cx="200" cy="422" r="300" fill="rgba(255,255,255,0.02)"/>
</svg>`;

/** Off-white with subtle navy tint — Parent dashboard, Settings, Reports */
export const lightBg = `<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="glight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(27,58,107,0.06)"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="#F8F9FC"/>
  <rect width="390" height="200" fill="url(#glight)"/>
  <circle cx="-20" cy="120" r="180" fill="rgba(27,58,107,0.04)"/>
  <circle cx="420" cy="600" r="200" fill="rgba(27,58,107,0.03)"/>
</svg>`;

/** Navy/green gradient with confetti — QuizResults (pass state) */
export const celebrateBg = `<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gcelebrate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B3A6B"/>
      <stop offset="50%" stop-color="#0D3B26"/>
      <stop offset="100%" stop-color="#1B3A6B"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#gcelebrate)"/>
  <circle cx="195" cy="200" r="280" fill="rgba(240,165,0,0.06)"/>
  <circle cx="195" cy="200" r="180" fill="rgba(240,165,0,0.06)"/>
  <circle cx="195" cy="200" r="80" fill="rgba(240,165,0,0.04)"/>
  <circle cx="60" cy="100" r="5" fill="#F5C518" opacity="0.7"/>
  <circle cx="320" cy="80" r="4" fill="#27AE60" opacity="0.7"/>
  <circle cx="140" cy="180" r="4" fill="#F5C518" opacity="0.5"/>
  <circle cx="280" cy="160" r="5" fill="#fff" opacity="0.4"/>
  <circle cx="50" cy="250" r="4" fill="#27AE60" opacity="0.6"/>
  <circle cx="340" cy="300" r="4" fill="#F5C518" opacity="0.5"/>
  <circle cx="80" cy="500" r="3" fill="#F5C518" opacity="0.4"/>
  <circle cx="360" cy="450" r="5" fill="#27AE60" opacity="0.5"/>
  <circle cx="200" cy="650" r="4" fill="#F5C518" opacity="0.3"/>
  <circle cx="30" cy="700" r="3" fill="#fff" opacity="0.3"/>
  <circle cx="370" cy="750" r="4" fill="#27AE60" opacity="0.4"/>
</svg>`;

/** Dark golden — StoreScreen, coin purchases */
export const storeBg = `<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gcoin" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#2a1a00"/>
      <stop offset="100%" stop-color="#0a0a12"/>
    </radialGradient>
  </defs>
  <rect width="390" height="844" fill="#0a0c18"/>
  <rect width="390" height="844" fill="url(#gcoin)"/>
  <circle cx="195" cy="120" r="100" fill="none" stroke="rgba(245,197,24,0.06)" stroke-width="40"/>
  <circle cx="195" cy="120" r="60" fill="none" stroke="rgba(245,197,24,0.08)" stroke-width="20"/>
  <circle cx="195" cy="120" r="30" fill="rgba(245,197,24,0.06)"/>
  <circle cx="40" cy="400" r="22" fill="rgba(245,197,24,0.06)" stroke="rgba(245,197,24,0.12)" stroke-width="2"/>
  <circle cx="350" cy="600" r="16" fill="rgba(245,197,24,0.06)" stroke="rgba(245,197,24,0.10)" stroke-width="2"/>
  <circle cx="20" cy="650" r="10" fill="rgba(245,197,24,0.05)"/>
  <circle cx="370" cy="200" r="14" fill="rgba(245,197,24,0.05)" stroke="rgba(245,197,24,0.10)" stroke-width="1.5"/>
</svg>`;

// ─── Graphics SVGs ─────────────────────────────────────────────────────────

/** WealthCoin — store, rewards, coin balance displays */
export const wealthCoin = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gcoin" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#FFE066"/>
      <stop offset="40%" stop-color="#F5C518"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </radialGradient>
    <filter id="coinDrop">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(245,197,24,0.4)"/>
    </filter>
  </defs>
  <circle cx="60" cy="62" r="52" fill="#B8860B" filter="url(#coinDrop)"/>
  <circle cx="60" cy="60" r="52" fill="url(#gcoin)"/>
  <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
  <text x="60" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="rgba(0,0,0,0.30)" letter-spacing="1">WEALTH</text>
  <text x="60" y="72" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="rgba(0,0,0,0.20)">💰</text>
  <text x="60" y="86" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="700" fill="rgba(0,0,0,0.30)" letter-spacing="1">WISE</text>
  <ellipse cx="44" cy="40" rx="11" ry="7" fill="rgba(255,255,255,0.25)" transform="rotate(-30 44 40)"/>
</svg>`;

/** Empty state for lessons list */
export const emptyLessons = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="70" r="56" fill="rgba(27,58,107,0.08)"/>
  <text x="100" y="85" text-anchor="middle" font-size="52">📚</text>
  <text x="100" y="128" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="16" fill="#888" font-weight="600">No lessons yet</text>
  <text x="100" y="148" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#bbb">Start School 1 to begin</text>
</svg>`;
