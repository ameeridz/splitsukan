const englishDayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatSessionDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return date;
  }

  const [, year, month, day] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    localDate.getFullYear() !== Number(year) ||
    localDate.getMonth() !== Number(month) - 1 ||
    localDate.getDate() !== Number(day)
  ) {
    return date;
  }

  const dayName = englishDayNames[localDate.getDay()];

  return `${dayName}, ${day}-${month}-${year}`;
}
