export function formatBs(monto) {
  try {
    const valor = Math.round((monto || 0) * 100) / 100;
    let [entero, decimal] = valor.toFixed(2).split('.');
    entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Bs ${entero},${decimal}`;
  } catch {
    return 'Bs ' + (monto || 0).toFixed(2);
  }
}

export function formatUSD(monto) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(monto);
  } catch {
    return '$ ' + (monto || 0).toFixed(2);
  }
}

export function usdToBs(usd) {
  const tasa = window.configGlobal?.tasa_efectiva || 400;
  return usd * tasa;
}