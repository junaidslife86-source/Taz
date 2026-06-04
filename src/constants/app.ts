/** Current product name shown in the UI and new backups */
export const APP_NAME = "Taz";

/** Previous name — still accepted for imports and IndexedDB */
export const APP_NAME_LEGACY = "MyFinancePal";

export const SUPPORTED_BACKUP_APP_NAMES = [APP_NAME, APP_NAME_LEGACY] as const;

export type BackupAppName = (typeof SUPPORTED_BACKUP_APP_NAMES)[number];

export function isSupportedBackupAppName(
  name: unknown,
): name is BackupAppName {
  return name === APP_NAME || name === APP_NAME_LEGACY;
}

/** Do not rename — existing browsers store data under this IndexedDB name */
export const INDEXED_DB_NAME = APP_NAME_LEGACY;

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "taz-sidebar-collapsed";
export const SIDEBAR_COLLAPSED_STORAGE_KEY_LEGACY =
  "myfinancepal-sidebar-collapsed";

export function readSidebarCollapsedPreference(): boolean {
  try {
    return (
      localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true" ||
      localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY_LEGACY) === "true"
    );
  } catch {
    return false;
  }
}

export function writeSidebarCollapsedPreference(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
}
