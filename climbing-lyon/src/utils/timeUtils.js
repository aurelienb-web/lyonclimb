/**
 * Utility functions for time and gym status calculation
 */

/**
 * Helper to parse time strings like "10:00", "10h00", "10h", "9:30"
 * Returns minutes since midnight
 */
export const parseTime = (str) => {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  // Match "10:00" or "10h00" or "10h"
  const match = clean.match(/(\d{1,2})[h:](\d{1,2})?/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2] || "0", 10);
    return h * 60 + m;
  }
  return null;
};

/**
 * Utility functions for time and gym status calculation
 */
export const getGymStatus = (openingHours) => {
  if (!openingHours) return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };

  // Use Lyon timezone for current time
  const nowInLyon = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[nowInLyon.getDay()];
  const hoursRange = openingHours[dayName];

  // Robust check for "Fermé" (case-insensitive, trimmed)
  if (!hoursRange || hoursRange.trim().toLowerCase() === 'fermé') {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }

  // Parse range like "10:00-23:00" or "10h - 22h30" or "10:00 à 20:00"
  const parts = hoursRange.split(/[-–—à]| au /i).map(s => s.trim());
  if (parts.length < 2) {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }

  const openTotal = parseTime(parts[0]);
  const closeTotal = parseTime(parts[1]);

  if (openTotal === null || closeTotal === null) {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }

  const nowH = nowInLyon.getHours();
  const nowM = nowInLyon.getMinutes();
  const nowTotal = nowH * 60 + nowM;

  const SOON_THRESHOLD = 60; // minutes

  // Handle midnight wrap-around (e.g. 10:00-01:00)
  let effectiveCloseTotal = closeTotal;
  if (closeTotal <= openTotal) {
    effectiveCloseTotal += 24 * 60; // Add 24 hours to closing time
  }

  if (nowTotal < openTotal - SOON_THRESHOLD) {
    return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
  }
  
  if (nowTotal < openTotal) {
    const diff = openTotal - nowTotal;
    return { status: 'OPENING_SOON', label: `Ouvre dans ${diff} min`, color: '#3498db' };
  }

  if (nowTotal < effectiveCloseTotal - SOON_THRESHOLD) {
    return { status: 'OPEN', label: 'Ouvert', color: '#27ae60' };
  }

  if (nowTotal < effectiveCloseTotal) {
    const diff = effectiveCloseTotal - nowTotal;
    return { status: 'CLOSING_SOON', label: `Ferme dans ${diff} min`, color: '#f39c12' };
  }

  return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
};
