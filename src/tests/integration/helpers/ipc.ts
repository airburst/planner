import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type IpcHandler = (event: null, ...args: unknown[]) => Promise<unknown> | unknown;
type IpcMain = { handle: (channel: string, fn: IpcHandler) => void };

interface MockIpc {
  ipcMain: IpcMain;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}

export function createMockIpc(): MockIpc {
  const handlers = new Map<string, IpcHandler>();

  return {
    ipcMain: {
      handle: (channel, fn) => {
        handlers.set(channel, fn);
      }
    },
    invoke: async <T>(channel: string, ...args: unknown[]): Promise<T> => {
      const fn = handlers.get(channel);
      if (!fn) {
        throw new Error(`No handler registered for channel: ${channel}`);
      }
      return fn(null, ...args) as T;
    }
  };
}

export function registerPlannerHandlers(ipcMain: IpcMain, db: unknown, schema: unknown) {
  require("../../../../public/ipc/plans.js")(ipcMain, db, schema);
  require("../../../../public/ipc/people.js")(ipcMain, db, schema);
  require("../../../../public/ipc/accounts.js")(ipcMain, db, schema);
  require("../../../../public/ipc/income-streams.js")(ipcMain, db, schema);
}
