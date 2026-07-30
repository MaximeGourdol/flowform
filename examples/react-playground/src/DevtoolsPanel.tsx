import { type ReactElement, useEffect, useRef } from 'react';
import '@flowform/devtools-ui/register';
import type { FlowformDevtoolsTimeline } from '@flowform/devtools-ui';
import type { DevtoolsApi } from '@flowform/plugin-devtools';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'flowform-devtools-timeline': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export const DevtoolsPanel = ({ api }: { api: DevtoolsApi }): ReactElement => {
  const ref = useRef<FlowformDevtoolsTimeline>(null);

  useEffect(() => {
    ref.current?.setApi(api);
  }, [api]);

  return <flowform-devtools-timeline ref={ref} />;
};
