/**
 * Test script for getGymStatus logic
 */

const getGymStatus = (openingHours, mockDate) => {
  if (!openingHours) return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = mockDate || new Date();
  const dayName = days[now.getDay()];
  const hoursRange = openingHours[dayName];

  if (!hoursRange || hoursRange === 'Fermé') {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }

  // Parse "10:00-23:00"
  const [openStr, closeStr] = hoursRange.split('-');
  const [openH, openM] = openStr.split(':').map(Number);
  const [closeH, closeM] = closeStr.split(':').map(Number);

  const nowH = now.getHours();
  const nowM = now.getMinutes();
  
  const nowTotal = nowH * 60 + nowM;
  const openTotal = openH * 60 + openM;
  const closeTotal = closeH * 60 + closeM;

  const SOON_THRESHOLD = 60; // minutes

  if (nowTotal < openTotal - SOON_THRESHOLD) {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }
  
  if (nowTotal < openTotal) {
    return { status: 'OPENING_SOON', label: 'Ouvre bientôt', color: '#3498db' };
  }

  if (nowTotal < closeTotal - SOON_THRESHOLD) {
    return { status: 'OPEN', label: 'Ouvert', color: '#27ae60' };
  }

  if (nowTotal < closeTotal) {
    return { status: 'CLOSING_SOON', label: 'Ferme bientôt', color: '#f39c12' };
  }

  return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
};

const gymHours = {
    friday: "10:00-23:00"
};

const testCases = [
    { time: "08:30", expected: "CLOSED" },
    { time: "09:15", expected: "OPENING_SOON" },
    { time: "10:00", expected: "OPEN" },
    { time: "12:00", expected: "OPEN" },
    { time: "22:15", expected: "CLOSING_SOON" },
    { time: "23:00", expected: "CLOSED" },
    { time: "23:15", expected: "CLOSED" }
];

console.log("Testing getGymStatus logic for Friday 10:00-23:00:");
testCases.forEach(tc => {
    const [h, m] = tc.time.split(':').map(Number);
    const mockDate = new Date(2026, 3, 17, h, m); // 2026-04-17 (Friday)
    const status = getGymStatus(gymHours, mockDate);
    console.log(`Time: ${tc.time} -> Result: ${status.status} (${status.label}) - ${status.status === tc.expected ? 'PASS' : 'FAIL'}`);
});
