import {
  EMAIL,
  FOCUS,
  GITHUB_URL,
  GRADUATION,
  LINKEDIN,
  LOCATION,
  NAME,
  PHONE,
  ROLE,
  SCHOOL,
} from "@/lib/site";

const CRLF = "\r\n";

function escapeVCardText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\r", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function buildVCard(): string {
  const nameParts = NAME.trim().split(/\s+/);
  const givenName = nameParts.shift() ?? "";
  const familyName = nameParts.pop() ?? "";
  const additionalNames = nameParts.join(" ");
  const [locality, ...regionParts] = LOCATION.split(",");
  const region = regionParts.join(",").trim();

  return (
    [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCardText(NAME)}`,
      `N:${escapeVCardText(familyName)};${escapeVCardText(givenName)};${escapeVCardText(additionalNames)};;`,
      `ORG:${escapeVCardText(SCHOOL)}`,
      `TITLE:${escapeVCardText(ROLE)}`,
      `EMAIL:${EMAIL}`,
      `TEL;TYPE=CELL:${PHONE}`,
      `URL:${LINKEDIN}`,
      `URL:${GITHUB_URL}`,
      `ADR:;;;${escapeVCardText(locality.trim())};${escapeVCardText(region)};;United States`,
      `NOTE:${escapeVCardText(`${FOCUS} · ${SCHOOL} · graduating ${GRADUATION}`)}`,
      "END:VCARD",
    ].join(CRLF) + CRLF
  );
}

export function GET(): Response {
  return new Response(buildVCard(), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": 'inline; filename="samuel-molero.vcf"',
      "Content-Type": "text/vcard; charset=utf-8",
    },
  });
}
