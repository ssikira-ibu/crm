import "server-only";
import { readFileSync } from "fs";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function loadCredential() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) return JSON.parse(jsonEnv);

  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath) return JSON.parse(readFileSync(filePath, "utf-8"));

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS",
  );
}

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  app = initializeApp({ credential: cert(loadCredential()) });
  return app;
}

let auth: Auth | undefined;

export function getAdminAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getAdminApp());
  return auth;
}
