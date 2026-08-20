"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi, ApiError } from "@/api/client";
import { sessionTokens } from "@/api/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(10, "Минимум 10 символов"),
  code: z.string().regex(/^[0-9]{6}$/, "Введите шестизначный код").optional().or(z.literal("")),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [requestError, setRequestError] = useState<string>();
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", code: "" },
  });

  const submitPassword = handleSubmit(async ({ email, password }) => {
    setRequestError(undefined);
    try { await adminApi.passwordLogin({ email, password }); setStep("otp"); }
    catch (error) { setRequestError(error instanceof ApiError ? error.message : "Не удалось связаться с admin API"); }
  });

  const submitOtp = handleSubmit(async ({ email, code }) => {
    if (!code) return;
    setRequestError(undefined);
    try {
      const session = await adminApi.verifyOtp({ email, code });
      sessionTokens.setStaff(session.accessToken);
      router.replace("/");
      router.refresh();
    } catch (error) { setRequestError(error instanceof ApiError ? error.message : "Не удалось подтвердить код"); }
  });

  return <main className="relative grid min-h-screen place-items-center bg-muted/40 p-4"><div className="absolute right-4 top-4"><ThemeToggle /></div><Card className="w-full max-w-md"><CardHeader className="items-center text-center"><div className="mb-2 rounded-xl bg-primary p-3 text-primary-foreground"><ShieldCheck /></div><CardTitle className="text-2xl">VPN Platform</CardTitle><CardDescription>{step === "password" ? "Вход сотрудника через admin API" : `Код отправлен для ${getValues("email")}`}</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={step === "password" ? submitPassword : submitOtp}><div><label className="mb-1.5 block text-sm font-medium" htmlFor="email">Рабочий email</label><Input id="email" type="email" autoComplete="username" disabled={step === "otp"} {...register("email")} />{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div>{step === "password" ? <div><label className="mb-1.5 block text-sm font-medium" htmlFor="password">Пароль</label><Input id="password" type="password" autoComplete="current-password" {...register("password")} />{errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}</div> : <div><label className="mb-1.5 block text-sm font-medium" htmlFor="code">Email OTP</label><Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...register("code")} />{errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}</div>}{requestError && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{requestError}</p>}<Button className="w-full" disabled={isSubmitting} type="submit">{step === "password" ? "Продолжить" : "Подтвердить вход"}</Button>{step === "otp" && <Button className="w-full" type="button" variant="ghost" onClick={() => setStep("password")}>Изменить данные</Button>}<p className="text-center text-xs text-muted-foreground">Сессия и permissions проверяются vpn-platform-backend.</p></form></CardContent></Card></main>;
}
