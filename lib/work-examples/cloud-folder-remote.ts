export type CloudFolderRemotePhoto = {
  name: string;
  mime: string;
  sizeBytes: number;
  download: () => Promise<Buffer>;
};
