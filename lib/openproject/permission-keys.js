// OpenProject permission identifiers we check from the UI. These match the
// strings returned in `role.permissions[]` on /api/v3/roles/{id}.
// Client-safe (no server-only imports) so React components can reference
// PERM.X instead of bare strings.

export const PERM = {
  VIEW_WORK_PACKAGES: "view_work_packages",
  ADD_WORK_PACKAGES: "add_work_packages",
  EDIT_WORK_PACKAGES: "edit_work_packages",
  DELETE_WORK_PACKAGES: "delete_work_packages",
  MOVE_WORK_PACKAGES: "move_work_packages",
  ASSIGN_VERSIONS: "assign_versions",
  MANAGE_VERSIONS: "manage_versions",
  MANAGE_CATEGORIES: "manage_categories",
  ADD_WORK_PACKAGE_ATTACHMENTS: "add_work_package_attachments",
  ADD_WORK_PACKAGE_NOTES: "add_work_package_notes",
  EDIT_WORK_PACKAGE_NOTES: "edit_work_package_notes",
  EDIT_OWN_WORK_PACKAGE_NOTES: "edit_own_work_package_notes",
  ADD_WORK_PACKAGE_WATCHERS: "add_work_package_watchers",
  DELETE_WORK_PACKAGE_WATCHERS: "delete_work_package_watchers",
  MANAGE_MEMBERS: "manage_members",
  VIEW_MEMBERS: "view_members",
  LOG_TIME: "log_time",
  LOG_OWN_TIME: "log_own_time",
  EDIT_TIME_ENTRIES: "edit_time_entries",
  EDIT_OWN_TIME_ENTRIES: "edit_own_time_entries",
};

// Convenience: action-level → permission-key map for UI gates.
export const PERM_FOR_ACTION = {
  createIssue: PERM.ADD_WORK_PACKAGES,
  editIssue: PERM.EDIT_WORK_PACKAGES,
  deleteIssue: PERM.DELETE_WORK_PACKAGES,
  manageSprint: PERM.MANAGE_VERSIONS,
  manageLabels: PERM.MANAGE_CATEGORIES,
  addAttachment: PERM.ADD_WORK_PACKAGE_ATTACHMENTS,
  addComment: PERM.ADD_WORK_PACKAGE_NOTES,
  addWatcher: PERM.ADD_WORK_PACKAGE_WATCHERS,
  removeWatcher: PERM.DELETE_WORK_PACKAGE_WATCHERS,
  logTime: PERM.LOG_TIME,
  logOwnTime: PERM.LOG_OWN_TIME,
};
