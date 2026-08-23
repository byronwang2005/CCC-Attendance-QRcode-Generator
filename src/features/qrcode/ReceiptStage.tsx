import { useEffect, useRef, useState } from 'react';
import { createReceiptStage, type ReceiptStageOptions } from './receipt-stage';

export type ReceiptStageProps = ReceiptStageOptions;

export function ReceiptStage(props: ReceiptStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let stage: { destroy: () => void } | null = null;
    setFallback(false);

    void createReceiptStage(container, props)
      .then((nextStage: { destroy: () => void }) => {
        if (disposed) nextStage.destroy();
        else stage = nextStage;
      })
      .catch(() => {
        if (!disposed) setFallback(true);
      });

    return () => {
      disposed = true;
      stage?.destroy();
    };
  }, [
    props.accentColor,
    props.ambientColor,
    props.generatedTime,
    props.identityLabel,
    props.imageUrl,
    props.modeLabel,
    props.scheduleId,
    props.validTime
  ]);

  if (fallback) {
    return (
      <article className="receipt-stage-fallback" aria-label="二维码二维回执">
        <header>CCC ATTENDANCE</header>
        <dl>
          <div><dt>GENERATED TIME</dt><dd>{props.generatedTime}</dd></div>
          <div><dt>MODE</dt><dd>{props.modeLabel}</dd></div>
          <div><dt>IDENTITY</dt><dd>{props.identityLabel}</dd></div>
          <div><dt>SCHEDULE ID</dt><dd>{props.scheduleId}</dd></div>
          <div><dt>VALID TIME</dt><dd>{props.validTime}</dd></div>
        </dl>
        <img src={props.imageUrl} alt="Attendance QR Code" />
        <footer>SCAN · ATTEND · COMPLETE</footer>
      </article>
    );
  }

  return <div ref={containerRef} className="receipt-stage-host" aria-hidden="true" />;
}
