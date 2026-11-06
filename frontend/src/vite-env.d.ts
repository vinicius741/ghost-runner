/// <reference types="vite/client" />

interface Window {
  ghostRunnerDesktop?: import('@shared/types').DesktopBridge;
}

declare module '*.css' {
  const content: string;
  export default content;
}
