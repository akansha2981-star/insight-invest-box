/**
 * IST-aware market timing utility.
 * Indian stock market: Mon–Fri, 9:15 AM – 3:30 PM IST.
 */

function getIST(): Date {
  // Get current time in IST
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

export function isMarketOpen(): boolean {
  const ist = getIST();
  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 9:15 AM = 555 min, 3:30 PM = 930 min
  return timeInMinutes >= 555 && timeInMinutes <= 930;
}

export function getMarketStatusText(): { label: string; isOpen: boolean; detail: string } {
  const ist = getIST();
  const day = ist.getDay();
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    return { label: "Market Closed", isOpen: false, detail: "Weekend · Opens Monday 9:15 AM IST" };
  }

  if (timeInMinutes < 555) {
    return { label: "Pre-Market", isOpen: false, detail: "Opens at 9:15 AM IST" };
  }

  if (timeInMinutes > 930) {
    return { label: "Market Closed", isOpen: false, detail: "Closed at 3:30 PM IST · Opens tomorrow 9:15 AM" };
  }

  return { label: "Markets Open", isOpen: true, detail: "NSE / BSE · Live Data" };
}
