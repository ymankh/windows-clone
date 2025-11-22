import { ReactTerminal, TerminalContextProvider } from "react-terminal";
import type { CSSProperties } from "react";

const TerminalComponent = () => {
  const commands = {
    help: (
      <div className="space-y-1">
        <div>Available commands:</div>
        <div>- help</div>
        <div>- facts</div>
        <div>- summary</div>
        <div>- experience</div>
        <div>- echo &lt;text&gt;</div>
        <div>- about</div>
        <div>- clear</div>
      </div>
    ),
    facts: (
      <div className="space-y-1 text-sm leading-relaxed">
        <div>Name: Yaman AlKhashashneh</div>
        <div>Role: Full Stack Web Developer (Master’s in Mathematics)</div>
        <div>Location: Amman, Jordan</div>
        <div>Email: Yaman.AlKhashashneh@gmail.com</div>
        <div>Phone: +962 780373018</div>
        <div>Stack: Go, TypeScript, .NET 8, GCP (BigQuery/Firebase), Esri ArcGIS</div>
      </div>
    ),
    summary:
      "Full-stack dev with a Master’s in Mathematics; experience building internal tools, scalable APIs, and GIS-enabled apps across Go, TypeScript, .NET 8, GCP, and ArcGIS.",
    experience: (
      <div className="space-y-2 text-sm leading-relaxed">
        <div>
          <div className="font-semibold">Petra Pathway (External Force @ Google)</div>
          <div>Full-Stack Developer | Amman | 2025-03 – Present</div>
          <div>Go, TypeScript, Firebase, BigQuery, GCP; internal tools and automation.</div>
        </div>
        <div>
          <div className="font-semibold">UtilNet</div>
          <div>Full-Stack Web Developer | Amman | 2024-10 – 2025-03</div>
          <div>.NET 8 APIs and GIS apps for telecom/data center using Esri ArcGIS.</div>
        </div>
        <div>
          <div className="font-semibold">Orange Coding Academy</div>
          <div>Full-stack trainee | Irbid | 2024-05 – Present</div>
          <div>ASP.NET Core, Angular, C#, TypeScript; 900+ hrs technical training.</div>
        </div>
        <div>
          <div className="font-semibold">Ministry of Education</div>
          <div>Math & Statistics Teacher | Amman | 2021-08 – 2023-09</div>
        </div>
        <div>
          <div className="font-semibold">Jordan University of Science and Technology</div>
          <div>Teaching Assistant | Irbid | 2020-08 – 2021-08</div>
        </div>
      </div>
    ),
    echo: (arg: string) => arg ?? "",
    about: "Terminal with quick facts pulled from Yaman AlKhashashneh’s resume.",
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
