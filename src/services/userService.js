import { createUserProfile, normalizeUserProfiles } from "../models/userProfile.js";
import { loadUsersFromStorage, saveUsersToStorage } from "./storageService.js";

function sanitizeUserName(name) {
  return typeof name === "string" ? name.trim() : "";
}

async function addUserLocal(name) {
  const sanitizedName = sanitizeUserName(name);
  if (!sanitizedName) {
    return {
      users: normalizeUserProfiles(await loadUsersFromStorage()),
      message: "User name cannot be empty.",
      newUserId: null,
    };
  }

  const users = normalizeUserProfiles(await loadUsersFromStorage());
  const duplicate = users.some(
    (user) => user.name.toLowerCase() === sanitizedName.toLowerCase()
  );

  if (duplicate) {
    return {
      users,
      message: "User already exists.",
      newUserId: null,
    };
  }

  const newUser = createUserProfile(sanitizedName);
  const updatedUsers = [...users, newUser];
  await saveUsersToStorage(updatedUsers);

  return {
    users: updatedUsers,
    message: `User "${sanitizedName}" added successfully.`,
    newUserId: newUser.id,
  };
}

export async function getUsersState() {
  const users = normalizeUserProfiles(await loadUsersFromStorage());
  return { users };
}

export async function addUser(name) {
  return addUserLocal(name);
}
