import { createUserProfile, normalizeUserProfiles } from "../models/userProfile.js";
import { loadUsersFromStorage, saveUsersToStorage } from "./storageService.js";
import { isSupabasePersistenceEnabled } from "../config/appConfig.js";
import {
  signInWithEmailPassword,
  signOutCurrentSession,
  signUpWithEmailPassword,
  restoreSignedInUserFromSession,
} from "./supabaseAuthService.js";

function sanitizeUserName(name) {
  return typeof name === "string" ? name.trim() : "";
}

function sanitizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function sanitizePassword(password) {
  return typeof password === "string" ? password : "";
}

function normalizeAddUserInput(input) {
  if (typeof input === "string") {
    return {
      name: sanitizeUserName(input),
      email: "",
      password: "",
    };
  }

  if (!input || typeof input !== "object") {
    return {
      name: "",
      email: "",
      password: "",
    };
  }

  return {
    name: sanitizeUserName(input.name),
    email: sanitizeEmail(input.email),
    password: sanitizePassword(input.password),
  };
}

async function ensureUserProfileExists(user, preferredName = "") {
  const users = normalizeUserProfiles(await loadUsersFromStorage());
  if (!user?.id) {
    return { users, userId: null, created: false };
  }

  const existing = users.find((profile) => profile.id === user.id);
  if (existing) {
    return { users, userId: existing.id, created: false };
  }

  const displayName =
    sanitizeUserName(preferredName) ||
    sanitizeUserName(user.user_metadata?.display_name) ||
    sanitizeEmail(user.email) ||
    user.id;

  const nextUser = {
    id: user.id,
    name: displayName,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, nextUser];
  await saveUsersToStorage(updatedUsers);
  return { users: updatedUsers, userId: nextUser.id, created: true };
}

function buildEmailValidationResult(users) {
  return {
    users,
    message: "Email is required for sign up.",
    newUserId: null,
  };
}

function buildPasswordValidationResult(users) {
  return {
    users,
    message: "Password must be at least 6 characters.",
    newUserId: null,
  };
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

async function addUserWithSupabase(input) {
  const users = normalizeUserProfiles(await loadUsersFromStorage());
  const { name, email, password } = normalizeAddUserInput(input);

  if (!email) {
    return buildEmailValidationResult(users);
  }

  if (password.length < 6) {
    return buildPasswordValidationResult(users);
  }

  const fallbackName = email;
  const displayName = name || fallbackName;

  try {
    const { user } = await signUpWithEmailPassword(email, password, {
      display_name: displayName,
    });

    if (!user?.id) {
      return {
        users,
        message: "Sign up succeeded, but no user id was returned.",
        newUserId: null,
      };
    }

    const ensured = await ensureUserProfileExists(user, displayName);
    if (!ensured.created) {
      return {
        users: ensured.users,
        message: "Account is already available in tracker users.",
        newUserId: ensured.userId,
      };
    }

    return {
      users: ensured.users,
      message: `Sign up successful for "${displayName}".`,
      newUserId: ensured.userId,
    };
  } catch (error) {
    return {
      users,
      message: `Sign up failed: ${error.message}`,
      newUserId: null,
    };
  }
}

export async function getUsersState() {
  const users = normalizeUserProfiles(await loadUsersFromStorage());
  return { users };
}

export async function addUser(input) {
  if (isSupabasePersistenceEnabled()) {
    return addUserWithSupabase(input);
  }

  const normalized = normalizeAddUserInput(input);
  return addUserLocal(normalized.name);
}

export async function signInUser(input) {
  const users = normalizeUserProfiles(await loadUsersFromStorage());

  if (!isSupabasePersistenceEnabled()) {
    return {
      users,
      message: "Sign in is only available in Supabase mode.",
      currentUserId: null,
    };
  }

  const { email, password } = normalizeAddUserInput(input);

  if (!email) {
    return {
      users,
      message: "Email is required for sign in.",
      currentUserId: null,
    };
  }

  if (!password) {
    return {
      users,
      message: "Password is required for sign in.",
      currentUserId: null,
    };
  }

  try {
    const { user } = await signInWithEmailPassword(email, password);
    const ensured = await ensureUserProfileExists(user);

    if (!ensured.userId) {
      return {
        users: ensured.users,
        message: "Sign in succeeded, but no user id was returned.",
        currentUserId: null,
      };
    }

    return {
      users: ensured.users,
      message: `Signed in as "${ensured.users.find((item) => item.id === ensured.userId)?.name || email}".`,
      currentUserId: ensured.userId,
    };
  } catch (error) {
    return {
      users,
      message: `Sign in failed: ${error.message}`,
      currentUserId: null,
    };
  }
}

export async function signOutUser() {
  const users = normalizeUserProfiles(await loadUsersFromStorage());

  if (!isSupabasePersistenceEnabled()) {
    return {
      users,
      message: "Sign out is only available in Supabase mode.",
    };
  }

  try {
    await signOutCurrentSession();
    return {
      users,
      message: "Signed out successfully.",
    };
  } catch (error) {
    return {
      users,
      message: `Sign out failed: ${error.message}`,
    };
  }
}

export async function restoreSignedInUser() {
  const users = normalizeUserProfiles(await loadUsersFromStorage());

  if (!isSupabasePersistenceEnabled()) {
    return {
      users,
      currentUserId: null,
      isAuthenticated: false,
      message: "",
    };
  }

  try {
    const restored = await restoreSignedInUserFromSession();
    if (!restored?.user) {
      return {
        users,
        currentUserId: null,
        isAuthenticated: false,
        message: "",
      };
    }

    const ensured = await ensureUserProfileExists(restored.user);
    return {
      users: ensured.users,
      currentUserId: ensured.userId,
      isAuthenticated: Boolean(ensured.userId),
      message: ensured.userId ? "Restored signed-in session." : "",
    };
  } catch (error) {
    return {
      users,
      currentUserId: null,
      isAuthenticated: false,
      message: "",
    };
  }
}
