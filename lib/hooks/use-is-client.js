"use client";

import { useSyncExternalStore } from "react";

// Returns true once we're past hydration on the client. The portal-based
// popovers (menu, user menu, notification bell, etc.) need this so they
// don't try to read `document.body` during SSR.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useIsClient() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
