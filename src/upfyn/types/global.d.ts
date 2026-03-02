export {};

declare global {
  const __APP_VERSION__: string;

  interface Window {
    __ROUTER_BASENAME__?: string;
    refreshProjects?: () => void | Promise<void>;
    openSettings?: (tab?: string) => void;
  }

  // VAPI web widget custom element
  namespace JSX {
    interface IntrinsicElements {
      'vapi-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'public-key'?: string;
        'assistant-id'?: string;
        mode?: string;
        theme?: string;
        position?: string;
        size?: string;
        radius?: string;
        'base-color'?: string;
        'accent-color'?: string;
        'button-base-color'?: string;
        'button-accent-color'?: string;
        'main-label'?: string;
      };
    }
  }
}
