"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi, ApiError } from "@/api/client";
import { sessionTokens } from "@/api/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

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
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", code: "" },
  });

  const submitPassword = form.handleSubmit(async ({ email, password }) => {
    setRequestError(undefined);
    try {
      await adminApi.passwordLogin({ email, password });
      form.setValue("password", "");
      setStep("otp");
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : "Не удалось связаться с admin API");
    }
  });

  const submitOtp = form.handleSubmit(async ({ email, code }) => {
    if (!code) return;
    setRequestError(undefined);
    try {
      const session = await adminApi.verifyOtp({ email, code });
      sessionTokens.setStaff(session.accessToken);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : "Не удалось подтвердить код");
    }
  });

  return (
    <main className="relative grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-xl bg-primary p-3 text-primary-foreground">
            <ShieldCheck />
          </div>
          <CardTitle className="text-2xl">{step === "password" ? "VPN Platform" : "Подтвердите вход"}</CardTitle>
          <CardDescription>
            {step === "password" ? "Вход сотрудника платформы" : `Введите шестизначный код, отправленный на ${form.getValues("email")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4" onSubmit={step === "password" ? submitPassword : submitOtp}>
              {step === "password" && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Рабочий email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {step === "otp" && (
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="items-center text-center">
                      <FormLabel>Код из письма</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} autoFocus {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {requestError && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting && <Spinner />}
                {step === "password" ? "Продолжить" : "Подтвердить вход"}
              </Button>
              {step === "otp" && (
                <Button className="w-full" type="button" variant="ghost" onClick={() => setStep("password")}>
                  Вернуться к email и паролю
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">Сессия и права доступа проверяются на сервере.</p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
