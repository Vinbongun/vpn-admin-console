import { splitLeadingCountryFlag } from "@/lib/flag-emoji";

export function EndpointName({ name }: { name: string }) {
  const { flag, label } = splitLeadingCountryFlag(name);
  return (
    <>
      {flag && <span className="mr-1">{flag}</span>}
      {label}
    </>
  );
}
