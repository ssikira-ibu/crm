export interface AuthUser {
  uid: string;
  email: string;
}

export interface AppState {
  user: AuthUser;
  query?: unknown;
  params?: unknown;
}
