export interface PrintableDocument {
  title: string;
  html: string;
  filename: string;
}

export interface PrintExportOptions {
  openInNewTab?: boolean;
  triggerPrint?: boolean;
}
