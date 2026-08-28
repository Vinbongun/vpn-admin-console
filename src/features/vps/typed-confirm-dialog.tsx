"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

// Опасные операции (уничтожают доступ/данные или трудно отменить) требуют набрать текст вручную, как у
// GitHub, а не просто нажать "Подтвердить" в попапе - средние по риску действия обходятся ConfirmDialog.
export function TypedConfirmDialog({
  trigger,
  title,
  description,
  confirmWord,
  confirmLabel,
  isPending,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmWord: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setText("");
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {typeof description === "string" ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription render={<div />}>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="typed-confirm-input">
            Введите <span className="font-mono">{confirmWord}</span>, чтобы подтвердить
          </Label>
          <Input id="typed-confirm-input" value={text} onChange={(event) => setText(event.target.value)} placeholder={confirmWord} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button variant="destructive" disabled={text !== confirmWord || isPending} onClick={onConfirm}>
            {isPending && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
