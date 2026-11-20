export type ServerSettings = {
  host: string;
  port: number;
  aliasesFile: string;
  aliasesUrl?: string;
  reloadIntervalMs: number;
};

export type RunningServer = {
  port: number;
  stop: () => Promise<void>;
};
