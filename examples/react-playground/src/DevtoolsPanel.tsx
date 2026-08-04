import {
  Component,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import '@flowform/devtools-ui/register';
import type { FlowformDevtoolsTimeline } from '@flowform/devtools-ui';
import type { DevtoolsApi } from '@flowform/plugin-devtools';
import { useDevtools } from '@flowform/react';

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

class DevtoolsBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  override state: { message: string | null } = { message: null };

  static getDerivedStateFromError(error: Error): { message: string } {
    return { message: error.message };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div style={boundaryStyle}>
          <strong>Devtools unavailable</strong>
          <p style={{ margin: '6px 0 0' }}>{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const boundaryStyle = {
  border: '1px solid #fca5a5',
  background: '#fef2f2',
  color: '#b91c1c',
  padding: 12,
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
} as const;

const DevtoolsTimeline = (): ReactElement => {
  const api = useDevtools<DevtoolsApi>();
  const ref = useRef<FlowformDevtoolsTimeline>(null);

  useEffect(() => {
    ref.current?.setApi(api);
  }, [api]);

  return <flowform-devtools-timeline ref={ref} />;
};

export const DevtoolsPanel = (): ReactElement => (
  <DevtoolsBoundary>
    <DevtoolsTimeline />
  </DevtoolsBoundary>
);
