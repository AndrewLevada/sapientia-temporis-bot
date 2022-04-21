export const productionUrl = "https://sapientia-temporis-bot.herokuapp.com";

interface AdminRole {
  username: string;
  userId: string;
  analyticsExcluded?: boolean;
  notificationsPing?: boolean;
  adminSettings?: boolean;
}

export const admins: readonly AdminRole[] = [
  {
    username: "andrewlevada",
    userId: "548598411",
    analyticsExcluded: true,
    adminSettings: true,
  },
  {
    username: "artemshushunov",
    userId: "352592747",
    analyticsExcluded: true,
    adminSettings: true,
  },
];

export function getAdminRole(userId: string | undefined): AdminRole | null {
  if (!userId) return null;
  return admins.find(u => u.userId === userId) || null;
}

export function getAdminRoleFromUsername(username: string | undefined): AdminRole | null {
  if (!username) return null;
  return admins.find(u => u.username === username) || null;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
