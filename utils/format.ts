export const safeFixed = (value: any, precision: number = 1): string => {
  if (value === null || value === undefined) return '0.' + '0'.repeat(precision);
  const num = Number(value);
  return isNaN(num) ? '0.' + '0'.repeat(precision) : num.toFixed(precision);
};
