function formatParts(parts: Intl.DateTimeFormatPart[]): string {
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}. ${values.month}. ${values.day}.`;
}

export function formatMetadataDate(
  value: string | undefined,
  options: { dateOnly?: boolean } = {},
): string | null {
  if (value === undefined) {
    return null;
  }

  if (options.dateOnly === true) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match === null) {
      return null;
    }

    return `${match[1]}. ${Number(match[2])}. ${Number(match[3])}.`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatParts(
    new Intl.DateTimeFormat("ko-KR", {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).formatToParts(date),
  );
}
