import { CountryFlag } from "@/components/country-flag";
import { parseLeadingCountryCode } from "@/lib/country-code";

export function EndpointName({ name }: { name: string }) {
  const { code, label } = parseLeadingCountryCode(name);
  return (
    <>
      {code && <CountryFlag code={code} className="mr-1" />}
      {label}
    </>
  );
}
