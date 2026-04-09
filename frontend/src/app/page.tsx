"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  useRedirectIfAuthed("/customers");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/customers");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setGooglePending(true);
    try {
      await signInWithGoogle();
      router.replace("/customers");
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
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled}
              />
            </div>
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
