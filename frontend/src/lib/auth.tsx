"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

async function exchangeTokenForSession(user: User) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Unable to create server session");
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onIdTokenChanged(getFirebaseAuth(), async (next) => {
      if (!next) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await exchangeTokenForSession(next);
        setUser(next);
      } catch (err) {
        console.error("Failed to create server session", err);
        setUser(null);
        await firebaseSignOut(getFirebaseAuth());
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithEmail: async (email, password) => {
        const result = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
        try {
          await exchangeTokenForSession(result.user);
        } catch (err) {
          await firebaseSignOut(getFirebaseAuth());
          throw err;
        }
      },
      signInWithGoogle: async () => {
        const result = await signInWithPopup(
          getFirebaseAuth(),
          new GoogleAuthProvider(),
        );
        try {
          await exchangeTokenForSession(result.user);
        } catch (err) {
          await firebaseSignOut(getFirebaseAuth());
          throw err;
        }
      },
      signOut: async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        await firebaseSignOut(getFirebaseAuth());
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useRequireAuth(redirectTo = "/") {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== redirectTo) {
      router.replace(redirectTo);
    }
  }, [user, loading, pathname, redirectTo, router]);

  return { user, loading };
}

export function useRedirectIfAuthed(target = "/home") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(target);
  }, [user, loading, target, router]);

  return { user, loading };
}
