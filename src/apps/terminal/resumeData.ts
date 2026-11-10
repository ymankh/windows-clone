// Résumé content shown by the Terminal app. Edit it here rather than in the
// component markup.

export const resumeFacts = [
  { label: "Name", value: "Yaman AlKhashashneh" },
  { label: "Role", value: "Full Stack Web Developer (Master’s in Mathematics)" },
  { label: "Location", value: "Amman, Jordan" },
  { label: "Email", value: "Yaman.AlKhashashneh@gmail.com" },
  { label: "Phone", value: "+962 780373018" },
  { label: "Stack", value: "Go, TypeScript, .NET 8, GCP (BigQuery/Firebase), Esri ArcGIS" },
] as const;

export const resumeSummary =
  "Full-stack dev with a Master’s in Mathematics; experience building internal tools, scalable APIs, and GIS-enabled apps across Go, TypeScript, .NET 8, GCP, and ArcGIS.";

export const resumeAbout =
  "Terminal with quick facts pulled from Yaman AlKhashashneh’s resume.";

export type ResumeExperience = {
  organization: string;
  role: string;
  details?: string;
};

export const resumeExperience: ResumeExperience[] = [
  {
    organization: "Petra Pathway (External Force @ Google)",
    role: "Full-Stack Developer | Amman | 2025-03 – Present",
    details: "Go, TypeScript, Firebase, BigQuery, GCP; internal tools and automation.",
  },
  {
    organization: "UtilNet",
    role: "Full-Stack Web Developer | Amman | 2024-10 – 2025-03",
    details: ".NET 8 APIs and GIS apps for telecom/data center using Esri ArcGIS.",
  },
  {
    organization: "Orange Coding Academy",
    role: "Full-stack trainee | Irbid | 2024-05 – Present",
    details: "ASP.NET Core, Angular, C#, TypeScript; 900+ hrs technical training.",
  },
  {
    organization: "Ministry of Education",
    role: "Math & Statistics Teacher | Amman | 2021-08 – 2023-09",
  },
  {
    organization: "Jordan University of Science and Technology",
    role: "Teaching Assistant | Irbid | 2020-08 – 2021-08",
  },
];

export const terminalCommandNames = [
  "help",
  "facts",
  "summary",
  "experience",
  "echo <text>",
  "about",
  "clear",
] as const;
