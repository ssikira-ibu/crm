import "server-only";
import {
  applicationDefault,
  initializeApp,
  getApps,
  cert,
  type App,
  type Credential,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { serverEnv } from "./env";

const credential: Credential = serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON))
  : applicationDefault();

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  app = initializeApp({ credential });
  return app;
}

let auth: Auth | undefined;

export function getAdminAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getAdminApp());
  return auth;
}
