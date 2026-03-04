import { normalizeUserProfiles } from "../models/userProfile.js";
import { loadUsersFromStorage } from "./storageService.js";

export async function getUsersState() {
  const users = normalizeUserProfiles(await loadUsersFromStorage());
  return { users };
}
