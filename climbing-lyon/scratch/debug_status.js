const { getGymStatus } = require('../src/utils/timeUtils');

const mockOpeningHours = {
  monday: "10:00-23:00",
  tuesday: "10:00-23:00",
  wednesday: "10:00-23:00",
  thursday: "10:00-23:00",
  friday: "10:00-23:00",
  saturday: "09:00-20:00",
  sunday: "09:00-22:30"
};

// Mocking Date for testing
const testStatus = (dayIndex, hour, minute) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayIndex];
  
  // We need to override Date or modify getGymStatus to accept a date
  // Since we can't easily override Date in a simple way without a library here,
  // let's just copy the logic and test it.
};

const parseTime = (str) => {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})[h:](\d{1,2})?/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2] || "0", 10);
    return h * 60 + m;
  }
  return null;
};

const getStatusForTest = (hoursRange, nowH, nowM) => {
    if (!hoursRange || hoursRange.trim().toLowerCase() === 'fermé') return "CLOSED";
    const parts = hoursRange.split(/[-–—à]| au /i).map(s => s.trim());
    if (parts.length < 2) return "CLOSED_ERROR";
    const openTotal = parseTime(parts[0]);
    const closeTotal = parseTime(parts[1]);
    const nowTotal = nowH * 60 + nowM;
    const SOON_THRESHOLD = 60;
    
    let effectiveCloseTotal = closeTotal;
    if (closeTotal <= openTotal) effectiveCloseTotal += 24 * 60;

    if (nowTotal < openTotal - SOON_THRESHOLD) return "CLOSED";
    if (nowTotal < openTotal) return "OPENING_SOON";
    if (nowTotal < effectiveCloseTotal - SOON_THRESHOLD) return "OPEN";
    if (nowTotal < effectiveCloseTotal) return "CLOSING_SOON";
    return "CLOSED";
};

const formats = [
    "09:00-22:30",
    "9h - 22h",
    "10:00 à 20:00",
    "8h30-12:00",
    "FERMÉ",
    "18:00–01:00" // midnight wrap
];

formats.forEach(f => {
    console.log(`\nTesting format: "${f}"`);
    const h = 10, m = 0; // 10:00
    console.log(`  At 10:00 -> ${getStatusForTest(f, 10, 0)}`);
    console.log(`  At 21:45 -> ${getStatusForTest(f, 21, 45)}`);
    if (f.includes('01:00')) {
        console.log(`  At 00:30 -> ${getStatusForTest(f, 0, 30)}`);
    }
});
