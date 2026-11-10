import { ReactTerminal, TerminalContextProvider } from "react-terminal";
import type { CSSProperties } from "react";
import {
  resumeAbout,
  resumeExperience,
  resumeFacts,
  resumeSummary,
  terminalCommandNames,
} from "./resumeData";

const terminalStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  height: "100%",
};

const commands = {
  help: (
    <div className="space-y-1">
      <div>Available commands:</div>
      {terminalCommandNames.map((name) => (
        <div key={name}>- {name}</div>
      ))}
    </div>
  ),
  facts: (
    <div className="space-y-1 text-sm leading-relaxed">
      {resumeFacts.map((fact) => (
        <div key={fact.label}>
          {fact.label}: {fact.value}
        </div>
      ))}
    </div>
  ),
  summary: resumeSummary,
  experience: (
    <div className="space-y-2 text-sm leading-relaxed">
      {resumeExperience.map((entry) => (
        <div key={entry.organization}>
          <div className="font-semibold">{entry.organization}</div>
          <div>{entry.role}</div>
          {entry.details ? <div>{entry.details}</div> : null}
        </div>
      ))}
    </div>
  ),
  echo: (arg: string) => arg ?? "",
  about: resumeAbout,
};

const TerminalComponent = () => (
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

export default TerminalComponent;
