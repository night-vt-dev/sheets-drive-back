// Map a raw Sheets row (array) to a normalized object your app uses.
// Customize this to your spreadsheet's columns.

exports.normalizeRow = (row = []) => {
  // Example schema: [Name, Qty, Price]
  const [name, qty, price] = row;

  const toNumber = (x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
    // If you want decimal parsing for EU commas, add replace(',', '.')
  };

  return {
    name: String(name ?? '').trim(),
    qty: toNumber(qty),
    price: toNumber(price),
  };
};
