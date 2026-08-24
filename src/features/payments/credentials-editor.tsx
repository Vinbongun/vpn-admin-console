"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type CredentialPair = { key: string; value: string };

export function credentialsToRecord(pairs: CredentialPair[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (key) record[key] = pair.value;
  }
  return record;
}

export function CredentialsEditor({ pairs, onChange }: { pairs: CredentialPair[]; onChange: (next: CredentialPair[]) => void }) {
  const update = (index: number, patch: Partial<CredentialPair>) => onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)));
  const remove = (index: number) => onChange(pairs.filter((_, i) => i !== index));
  const add = () => onChange([...pairs, { key: "", value: "" }]);

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Учётные данные шлюза</FieldLabel>
      <p className="text-xs text-muted-foreground">У каждого шлюза свой набор полей (логин/пароль, API-ключ и т.п.) — добавьте нужные пары ключ-значение.</p>
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input aria-label="Ключ" placeholder="Ключ, например apiKey" value={pair.key} onChange={(event) => update(index, { key: event.target.value })} className="flex-1" />
          <Input aria-label="Значение" placeholder="Значение" type="password" value={pair.value} onChange={(event) => update(index, { value: event.target.value })} className="flex-1" />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
            <XIcon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <PlusIcon />
        Добавить поле
      </Button>
    </div>
  );
}
