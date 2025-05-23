import { Spinner } from "@/assets/icons/spinner";
import { isDevCommand, isInstallCommand } from "@/lib/utils";
import {
  FileActionState,
  ShellActionState,
  ShellState,
} from "@repo/common/types";
import { Check, CircleDashed, Terminal, X } from "lucide-react";
import { memo, useMemo } from "react";

function getCommandType(command: string) {
  if (isInstallCommand(command)) return "install";
  if (isDevCommand(command)) return "start";
  return "run";
}
const ACTION_ICONS: Record<ShellState, React.ReactNode> = {
  queued: <CircleDashed className="h-4 w-4 text-gray-600" />,
  running: <Spinner />,
  completed: <Check className="h-4 w-4 text-green-500" />,
  error: <X className="h-4 w-4 text-red-500" />,
  aborted: <X className="h-4 w-4 text-red-500" />,
};

export const ShellActionDisplay = memo(
  ({ action, onClick }: { action: ShellActionState; onClick: () => void }) => {
    const commandType = useMemo(
      () => getCommandType(action.command),
      [action.command]
    );

    const label = useMemo(() => {
      switch (commandType) {
        case "start":
          return "Start application";
        case "install":
          return "Install dependencies";
        default:
          return "Run command";
      }
    }, [commandType]);

    const showTerminalIcon =
      action.state === "running" && commandType === "start";
    const isStartCommand = commandType === "start";

    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
          {showTerminalIcon ? (
            <Terminal className="h-4 w-4" />
          ) : (
            ACTION_ICONS[action.state]
          )}
          <div
            className={
              isStartCommand ? "hover:underline cursor-pointer" : undefined
            }
            onClick={isStartCommand ? onClick : undefined}
          >
            {label}
          </div>
        </div>
        <code className="px-3 py-4 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm">
          {action.command}
        </code>
      </div>
    );
  }
);

export const FileActionDisplay = memo(
  ({ action, onClick }: { action: FileActionState; onClick: () => void }) => {
    const isInProgress =
      action.state === "creating" || action.state === "updating";
    const isCreatingAction =
      action.state === "creating" || action.state === "created";

    return (
      <div className="flex items-center gap-x-2">
        {isInProgress ? (
          <Spinner />
        ) : (
          <Check className="h-4 w-4 text-green-500" />
        )}
        <div
          className="flex-1 flex flex-row gap-x-1 items-center hover:underline cursor-pointer"
          onClick={onClick}
        >
          <span className="text-gray-800 dark:text-gray-200">
            {isCreatingAction ? "Create" : "Update"}
          </span>
          <span className="bg-gray-100 dark:bg-gray-800 rounded-md px-2">
            {action.filePath}
          </span>
        </div>
      </div>
    );
  }
);

ShellActionDisplay.displayName = "ShellActionDisplay";
FileActionDisplay.displayName = "FileActionDisplay";
