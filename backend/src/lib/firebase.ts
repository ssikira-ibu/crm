import admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";
import { config } from "../config.js";

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.FIREBASE_PROJECT_ID,
    clientEmail: config.FIREBASE_CLIENT_EMAIL,
    privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

export const auth: Auth = app.auth();
