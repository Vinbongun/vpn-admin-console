"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@demo-vpn.local", password: "demo" },
  });

  return <main className="relative grid min-h-screen place-items-center bg-muted/40 p-4"><div className="absolute right-4 top-4"><ThemeToggle /></div><Card className="w-full max-w-md"><CardHeader className="items-center text-center"><div className="mb-2 rounded-xl bg-primary p-3 text-primary-foreground"><ShieldCheck /></div><CardTitle className="text-2xl">VPN Platform</CardTitle><CardDescription>Локальный mock-вход для разработки Admin Console</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit(async () => router.push("/"))}><div><label className="mb-1.5 block text-sm font-medium" htmlFor="email">Рабочий email</label><Input id="email" type="email" autoComplete="username" {...register("email")} />{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div><div><label className="mb-1.5 block text-sm font-medium" htmlFor="password">Пароль</label><Input id="password" type="password" autoComplete="current-password" {...register("password")} />{errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}</div><Button className="w-full" disabled={isSubmitting} type="submit">Войти в mock-панель</Button><p className="text-center text-xs text-muted-foreground">Настоящая staff-сессия, MFA и RBAC будут предоставлены admin API.</p></form></CardContent></Card></main>;
}
