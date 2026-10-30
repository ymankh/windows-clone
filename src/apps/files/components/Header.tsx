type HeaderProps = { path: string; label: string };

export const Header = ({ path, label }: HeaderProps) => (
  <div className="flex items-center justify-between border-b border-border px-4 py-2">
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Current folder
      </div>
      <div className="text-sm font-semibold">{path}</div>
    </div>
    <div className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
      {label}
    </div>
  </div>
);
