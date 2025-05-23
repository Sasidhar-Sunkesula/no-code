import { webcontainer } from "@/config/webContainer";
import { path as nodePath } from "@/lib/path";
import { mountFiles } from "@/lib/runtime";
import { isDevCommand } from "@/lib/utils";
import { useGeneralStore } from "@/stores/general";
import { useProjectStore } from "@/stores/project";
import { terminalStore } from "@/stores/terminal";
import { ActionState, FileAction, ShellAction } from "@repo/common/types";
import type { WebContainer } from "@webcontainer/api";
import { BoltShell } from "./shell";

export interface ActionAlert {
  type: string;
  title: string;
  description: string;
  content: string;
  source?: "terminal" | "preview"; // Add source to differentiate between terminal and preview errors
}
function outputHasError(output: string) {
  const lowerCaseOutput = output.toLowerCase();
  const errorWords = ["error", "failed", "abort", "timeout", "not found"];
  return errorWords.some((word) => lowerCaseOutput.includes(word));
}
class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = "ActionCommandError";
  }

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}

interface Dependencies {
  updateActionStatus: (
    messageId: string,
    actionId: number,
    status: ActionState["state"]
  ) => void;
  webcontainerPromise: Promise<WebContainer>;
  getShellTerminal: () => BoltShell;
  onAlert?: (alert: ActionAlert) => void;
}
class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #shellTerminal: () => BoltShell;
  #globalExecutionQueue = Promise.resolve();

  constructor(private deps: Dependencies) {
    this.#webcontainer = this.deps.webcontainerPromise;
    this.#shellTerminal = this.deps.getShellTerminal;
  }

  // Adds a task to the global queue and ensures sequential execution
  private addToExecutionQueue(callback: () => Promise<void>) {
    this.#globalExecutionQueue = this.#globalExecutionQueue
      .then(() => callback())
      .catch((error) => {
        console.error("Queue execution failed:", error);
        // Ensure the queue continues even if one task fails
        return Promise.resolve();
      });
  }

  // Public method to add a new action
  public addAction(messageId: string, action: FileAction | ShellAction) {
    // Queue the action execution
    this.addToExecutionQueue(async () => {
      await this.#executeAction(messageId, action);
    });
  }

  async #executeAction(messageId: string, action: FileAction | ShellAction) {
    if (action.type === "file") {
      await this.#runFileAction(action);
      return;
    }
    // we need to create a new abort controller for each action
    const abortController = new AbortController();
    const modifiedAction: ShellAction = {
      ...action,
      abort: () => {
        abortController.abort();
        this.deps.updateActionStatus(messageId, action.id, "aborted");
      },
      abortSignal: abortController.signal,
    };
    this.deps.updateActionStatus(messageId, action.id, "running");
    const type = isDevCommand(action.command) ? "start" : "shell";
    try {
      switch (type) {
        case "shell": {
          await this.#runShellAction(modifiedAction);
          break;
        }
        case "start": {
          // making the start app non blocking, knowingly not waiting for the start command to complete
          this.#runStartAction(modifiedAction)
            .then(() =>
              this.deps.updateActionStatus(messageId, action.id, "completed")
            )
            .catch((err: Error) => {
              if (modifiedAction.abortSignal?.aborted) {
                return;
              }
              this.deps.updateActionStatus(
                messageId,
                modifiedAction.id,
                "error"
              );
              console.error(`[${action.type}]:Action failed\n\n`, err);

              if (!(err instanceof ActionCommandError)) {
                return;
              }

              this.deps.onAlert?.({
                type: "error",
                title: "Dev Server Failed",
                description: err.header,
                content: err.output,
              });
            });
          /*
           * adding a delay to avoid any race condition between 2 start actions
           * i am up for a better approach
           */
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return;
        }
      }

      this.deps.updateActionStatus(
        messageId,
        modifiedAction.id,
        modifiedAction.abortSignal?.aborted ? "aborted" : "completed"
      );
    } catch (error) {
      if (modifiedAction.abortSignal?.aborted) {
        return;
      }
      this.deps.updateActionStatus(messageId, modifiedAction.id, "error");
      console.error(`[${modifiedAction.type}]:Action failed\n\n`, error);

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.deps.onAlert?.({
        type: "error",
        title: "Dev Server Failed",
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ShellAction) {
    if (action.type !== "shell") {
      throw new Error("Expected shell action");
    }
    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      throw new Error("Shell terminal not found");
    }

    const resp = await shell.executeCommand(action.command, () => {
      console.log(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort?.();
    });
    console.log(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0) {
      throw new ActionCommandError(
        `Failed To Execute Shell Command`,
        resp?.output || "No Output Available"
      );
    }
  }

  async #runStartAction(action: ShellAction) {
    if (!this.#shellTerminal) {
      throw new Error("Shell terminal not found");
    }
    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      throw new Error("Shell terminal not found");
    }

    const resp = await shell.executeCommand(action.command, () => {
      console.log(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort?.();
    });
    console.log(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0 && outputHasError(resp?.output || "")) {
      console.log(
        `Failed To Start Application: ${action.command}`,
        resp?.output
      );
      throw new ActionCommandError(
        "Failed To Start Application",
        resp?.output || "No Output Available"
      );
    }
    return resp;
  }

  async #runFileAction(action: FileAction) {
    if (action.type !== "file") {
      throw new Error("Expected file action");
    }
    const webcontainer = await this.#webcontainer;

    try {
      await mountFiles(
        { filePath: action.filePath, content: action.content },
        webcontainer
      );
      console.log(`File written ${action.filePath}`);
    } catch (error) {
      console.error("Failed to write file\n\n", error);
      throw error;
    }
  }

  async runBuildAction() {
    const webcontainer = await this.#webcontainer;

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn("npm", ["run", "build"]);

    let output = "";
    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      })
    );

    const exitCode = await buildProcess.exit;

    if (exitCode !== 0) {
      this.deps.onAlert?.({
        type: "error",
        title: "Build Failed",
        description: "Your project build failed",
        content: output || "No Output Available",
      });
      throw new Error("Build failed");
    }

    // Check for common build directories
    const commonBuildDirs = [
      "dist",
      "build",
      ".next",
      "public",
      "out",
      "output",
    ];
    let buildDir = "";

    // Try to find the first existing build directory
    for (const dir of commonBuildDirs) {
      const dirPath = nodePath.join(webcontainer.workdir, dir);

      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        console.log(`Found build directory: ${buildDir}`);
        break;
      } catch (error) {
        // Directory doesn't exist, try the next one
        console.log(
          `Build directory ${dir} not found, trying next option. ${error}`
        );
      }
    }

    // If no build directory was found, use the default (dist)
    if (!buildDir) {
      buildDir = nodePath.join(webcontainer.workdir, "dist");
      console.log(`No build directory found, defaulting to: ${buildDir}`);
    }

    return {
      path: buildDir,
      exitCode,
      output,
    };
  }
}

export const actionRunner = new ActionRunner({
  updateActionStatus: (messageId, actionId, status) =>
    useProjectStore.getState().updateActionStatus(messageId, actionId, status),
  webcontainerPromise: webcontainer,
  // Use the same bolt terminal instance from terminal store that was initialized by terminal tabs
  getShellTerminal: () => terminalStore.boltTerminal,
  onAlert: (alert) => useGeneralStore.setState({ actionAlert: alert }),
});
