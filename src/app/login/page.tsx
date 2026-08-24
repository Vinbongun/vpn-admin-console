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

const passwordSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(10, "Минимум 10 символов"),
});
type PasswordValues = z.infer<typeof passwordSchema>;

const otpSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, "Введите шестизначный код"),
});
type OtpValues = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [requestError, setRequestError] = useState<string>();

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { email: "", password: "" } });
  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });

  const submitPassword = passwordForm.handleSubmit(async ({ email: enteredEmail, password }) => {
    setRequestError(undefined);
    try {
      await adminApi.passwordLogin({ email: enteredEmail, password });
      setEmail(enteredEmail);
      passwordForm.reset();
      setStep("otp");
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : "Не удалось связаться с admin API");
    }
  });

  const submitOtp = otpForm.handleSubmit(async ({ code }) => {
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

  const backToPassword = () => {
    otpForm.reset();
    setRequestError(undefined);
    setStep("password");
  };

  return (
    <main className="relative grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 justify-self-center rounded-xl bg-primary p-3 text-primary-foreground">
            <ShieldCheck />
          </div>
          <CardTitle className="text-2xl">{step === "password" ? "VPN Platform" : "Подтвердите вход"}</CardTitle>
          <CardDescription>{step === "password" ? "Вход сотрудника платформы" : `Введите шестизначный код, отправленный на ${email}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "password" ? (
            <Form {...passwordForm}>
              <form className="space-y-4" onSubmit={submitPassword}>
                <FormField
                  control={passwordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
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
                {requestError && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>{requestError}</AlertDescription>
                  </Alert>
                )}
                <Button className="w-full" disabled={passwordForm.formState.isSubmitting} type="submit">
                  {passwordForm.formState.isSubmitting && <Spinner />}
                  Продолжить
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form className="space-y-4" onSubmit={submitOtp}>
                <FormField
                  control={otpForm.control}
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
                {requestError && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>{requestError}</AlertDescription>
                  </Alert>
                )}
                <Button className="w-full" disabled={otpForm.formState.isSubmitting} type="submit">
                  {otpForm.formState.isSubmitting && <Spinner />}
                  Подтвердить вход
                </Button>
                <Button className="w-full" type="button" variant="ghost" onClick={backToPassword}>
                  Ввести другой email
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
