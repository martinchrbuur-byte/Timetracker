export const DEFAULT_USER = {
  id: "default",
  name: "Default",
  createdAt: new Date(0).toISOString(),
};

export function isUserProfileRecord(value) {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.createdAt === "string"
  );
}

export function createUserProfile(name) {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeUserProfiles(users) {
  const validUsers = users.filter(isUserProfileRecord);
  const hasDefault = validUsers.some((user) => user.id === DEFAULT_USER.id);

  if (hasDefault) {
    return validUsers;
  }

  return [DEFAULT_USER, ...validUsers];
}
