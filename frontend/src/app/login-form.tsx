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

export function LoginForm() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  useRedirectIfAuthed("/home");

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
    <main className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden w-[45%] flex-col justify-between bg-foreground p-10 text-background lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-background text-foreground text-xs font-bold">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">CRM</span>
        </div>
        <div>
          <p className="text-2xl font-semibold leading-snug tracking-tight">
            Manage your customer
            <br />
            relationships with clarity.
          </p>
          <p className="mt-3 text-sm text-background/60">
            Track contacts, notes, reminders, and more — all in one place.
          </p>
        </div>
        <p className="text-xs text-background/40">
          Built with Next.js, Prisma, and Firebase.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 lg:hidden">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                C
              </div>
              <span className="text-lg font-semibold tracking-tight">CRM</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your CRM account to continue.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
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
                    <Loader2 className="size-3.5 animate-spin" /> Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <Separator />
            <span className="absolute inset-0 -top-2.5 mx-auto w-fit bg-background px-2 text-xs text-muted-foreground">
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
                <Loader2 className="size-3.5 animate-spin" /> Connecting
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
