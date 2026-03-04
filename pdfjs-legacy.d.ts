declare module "pdfjs-dist/legacy/build/pdf" {
  const pdfjsLib: {
    version: string;
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (params: { data: ArrayBuffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (i: number) => Promise<{
          getTextContent: () => Promise<{
            items: Array<{ str?: string }>;
          }>;
        }>;
      }>;
    };
  };
  export default pdfjsLib;
}
