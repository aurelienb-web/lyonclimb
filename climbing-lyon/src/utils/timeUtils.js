/**
 * Utility functions for time and gym status calculation
 */

export const getGymStatus = (openingHours) => {
  if (!openingHours) return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
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
    const diff = openTotal - nowTotal;
    return { status: 'OPENING_SOON', label: `Ouvre dans ${diff} min`, color: '#3498db' };
  }

  if (nowTotal < closeTotal - SOON_THRESHOLD) {
    return { status: 'OPEN', label: 'Ouvert', color: '#27ae60' };
  }

  if (nowTotal < closeTotal) {
    const diff = closeTotal - nowTotal;
    return { status: 'CLOSING_SOON', label: `Ferme dans ${diff} min`, color: '#f39c12' };
  }

  return { status: 'CLOSED', label: 'Fermé', color: '#e74c3c' };
};
