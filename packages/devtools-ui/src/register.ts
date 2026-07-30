import { FlowformDevtoolsTimeline } from './timeline-element.js';

export const TIMELINE_TAG = 'flowform-devtools-timeline';

export const registerTimeline = (tag: string = TIMELINE_TAG): void => {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, FlowformDevtoolsTimeline);
  }
};

registerTimeline();
