import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  app = initializeApp({
    credential: cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "{}"),
    ),
  });
  return app;
}

let auth: Auth | undefined;

export function getAdminAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getAdminApp());
  return auth;
}
