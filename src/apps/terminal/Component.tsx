import { ReactTerminal, TerminalContextProvider } from "react-terminal";
import type { CSSProperties } from "react";

const TerminalComponent = () => {
  const commands = {
    help: (
      <div className="space-y-1">
        <div>Available commands:</div>
        <div>- help</div>
        <div>- echo &lt;text&gt;</div>
        <div>- about</div>
        <div>- clear</div>
      </div>
    ),
    echo: (arg: string) => arg ?? "",
    about: "Simple in-browser terminal powered by react-terminal.",
  };

  const terminalStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    width: "100%",
    height: "100%",
  };

  return (
    <TerminalContextProvider>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-border bg-background text-foreground">
        <ReactTerminal
          prompt="user@pc:~$"
          theme="dracula"
          showControlBar={false}
          showControlButtons={false}
          errorMessage="Command not found. Try 'help'."
          commands={commands}
          welcomeMessage="Welcome to the terminal. Type 'help' to see available commands."
          style={terminalStyle}
        />
      </div>
    </TerminalContextProvider>
  );
};

export default TerminalComponent;
