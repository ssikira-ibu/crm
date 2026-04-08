export interface AuthUser {
  uid: string;
  email: string;
}

export interface AppState {
  user: AuthUser;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}
