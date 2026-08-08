export {};

/**
 * Глобальный объект Telegram Mini Apps в WebView.
 * @see https://core.telegram.org/bots/webapps
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          start_param?: string;
          user?: {
            id?: number;
            username?: string;
            first_name?: string;
            last_name?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close?: () => void;
        openLink?: (url: string) => void;
      };
    };
  }
}
