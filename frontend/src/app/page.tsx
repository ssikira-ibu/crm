"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth, useRedirectIfAuthed } from "@/lib/auth";

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-not-found": "No account exists for that email.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Try again shortly.",
  "auth/popup-closed-by-user": "Sign-in cancelled.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

function describeError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return FRIENDLY_AUTH_ERRORS[err.code] ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  useRedirectIfAuthed("/customers");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const [googlePending, setGooglePending] = useState(false);
  const pending = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    try {
      await signInWithEmail(values.email, values.password);
      router.replace("/home");
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function onGoogle() {
    setGooglePending(true);
    try {
      await signInWithGoogle();
      router.replace("/home");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setGooglePending(false);
    }
  }

  const disabled = pending || googlePending || loading;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Use your CRM account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        disabled={disabled}
                        {...field}
                      />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        disabled={disabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={disabled}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <Separator />
            <span className="absolute inset-0 -top-2.5 mx-auto w-fit bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogle}
            disabled={disabled}
          >
            {googlePending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Connecting
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
