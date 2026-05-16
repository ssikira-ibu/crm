export const ALLOWED_EMAIL_DOMAIN = "stu.ibu.edu.ba";
export const ALLOWED_EMAIL_SUFFIX = `@${ALLOWED_EMAIL_DOMAIN}`;

export function isAllowedAccountEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(ALLOWED_EMAIL_SUFFIX));
}

export function allowedAccountMessage(): string {
  return `Use your ${ALLOWED_EMAIL_SUFFIX} email address to continue.`;
}
