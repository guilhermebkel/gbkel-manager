export type FolderEntryKind = "folder" | "file";

export type FolderEntry = {
  kind: FolderEntryKind;
  name: string;
  relativePath: string;
};

export type PageContent = {
  pageName: string;
  body: string;
  style?: string;
};
