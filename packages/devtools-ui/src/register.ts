import { FormJourneyDevtoolsTimeline } from './timeline-element.js';
import { TIMELINE_TAG } from './constants.js';

export { TIMELINE_TAG } from './constants.js';

export const registerTimeline = (tag: string = TIMELINE_TAG): void => {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, FormJourneyDevtoolsTimeline);
  }
};

registerTimeline();
