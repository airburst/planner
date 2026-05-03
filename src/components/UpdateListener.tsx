import { useEffect } from "react";
import { toast } from "sonner";

const RELEASES_URL = "https://github.com/airburst/planner/releases/latest";

/**
 * Subscribes to electron-updater events emitted by the main process and
 * surfaces them as Sonner toasts. Mounted once near the app root.
 *
 * - Mac: a new release exists → "Download" action opens GitHub.
 * - Win: new release downloaded in the background → "Restart" action
 *   triggers autoUpdater.quitAndInstall().
 * - Manual check that found nothing → small success toast.
 */
export function UpdateListener() {
  useEffect(() => {
    if (!window.api) return;

    window.api.onUpdateAvailable((version) => {
      toast.info(`Version ${version} available`, {
        duration: Infinity,
        action: {
          label: "Download",
          onClick: () => {
            void window.api.openExternal(RELEASES_URL);
          },
        },
      });
    });

    window.api.onUpdateDownloaded((version) => {
      toast.info(`Version ${version} ready to install`, {
        duration: Infinity,
        action: {
          label: "Restart",
          onClick: () => window.api.restartToUpdate(),
        },
      });
    });

    window.api.onUpdateNotAvailable(() => {
      toast.success("Planner is up to date");
    });
  }, []);

  return null;
}
