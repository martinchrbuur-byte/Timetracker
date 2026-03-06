// Runtime configuration for persistence providers.
// The app reads optional values from window.TRACKER_CONFIG.

const DEFAULT_CONFIG = {
  persistence: {
    provider: "local",
    supabaseUrl: "",
    supabaseAnonKey: "",
  },
};

function getWindowConfig() {
  if (typeof window === "undefined") {
    return {};
  }

  return window.TRACKER_CONFIG || {};
}

function mergePersistenceConfig(runtimeConfig) {
  return {
    ...DEFAULT_CONFIG.persistence,
    ...(runtimeConfig.persistence || {}),
  };
}

export function getAppConfig() {
  const runtimeConfig = getWindowConfig();
  return {
    ...DEFAULT_CONFIG,
    ...runtimeConfig,
    persistence: mergePersistenceConfig(runtimeConfig),
  };
}

export function isSupabasePersistenceEnabled() {
  const config = getAppConfig();
  const { provider, supabaseUrl, supabaseAnonKey } = config.persistence;

  return (
    provider === "supabase" &&
    typeof supabaseUrl === "string" &&
    supabaseUrl.length > 0 &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.length > 0
  );
}