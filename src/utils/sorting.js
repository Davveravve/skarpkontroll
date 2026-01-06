// src/utils/sorting.js - Natural sorting utilities

/**
 * Natural sort comparison - handles numbers in strings correctly
 * "a2" < "a10" < "a17" < "b1"
 */
export const naturalCompare = (a, b) => {
  const regex = /(\d+)|(\D+)/g;
  const aParts = (a || '').match(regex) || [];
  const bParts = (b || '').match(regex) || [];

  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';

    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      const cmp = aPart.localeCompare(bPart, 'sv', { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  return 0;
};

/**
 * Sort array by name using natural sorting
 */
export const sortByName = (items) => {
  return [...items].sort((a, b) => naturalCompare(a.name, b.name));
};

/**
 * Sort array by order field, then by name as fallback
 */
export const sortByOrder = (items) => {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? 999999;
    const orderB = b.order ?? 999999;
    if (orderA !== orderB) return orderA - orderB;
    return naturalCompare(a.name, b.name);
  });
};
