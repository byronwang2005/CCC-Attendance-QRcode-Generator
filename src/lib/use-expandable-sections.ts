import { type RefObject, useLayoutEffect, useRef } from 'react';
import { transitionExpandableSection } from './expandable-section';

type ExpandableSectionRefs<Key extends string> = Readonly<
  Record<Key, RefObject<HTMLElement | null>>
>;

export const useExpandableSections = <Key extends string>(
  sectionRefs: ExpandableSectionRefs<Key>,
  activeKey: Key | null
) => {
  const stableSectionRefs = useRef(sectionRefs);
  const transitionId = useRef(0);
  const transitionReady = useRef(false);

  useLayoutEffect(() => {
    const sections = (Object.entries(stableSectionRefs.current) as Array<[
      Key,
      RefObject<HTMLElement | null>
    ]>)
      .map(([key, ref]) => ({ key, element: ref.current }))
      .filter((section): section is { key: Key; element: HTMLElement } => Boolean(section.element));
    const targetSections = sections
      .filter(({ key }) => key === activeKey)
      .map(({ element }) => element);
    const nextTransitionId = transitionId.current + 1;
    transitionId.current = nextTransitionId;

    if (!transitionReady.current) {
      transitionReady.current = true;
      void Promise.all(sections.map(({ element }) => (
        transitionExpandableSection(element, targetSections.includes(element), { animate: false })
      )));
      return;
    }

    const visibleSections = sections
      .map(({ element }) => element)
      .filter((element) => !element.hidden);
    void (async () => {
      await Promise.all(
        visibleSections
          .filter((element) => !targetSections.includes(element))
          .map((element) => transitionExpandableSection(element, false))
      );
      if (transitionId.current !== nextTransitionId) return;
      await Promise.all(targetSections.map((element) => transitionExpandableSection(element, true)));
    })();
  }, [activeKey]);
};
