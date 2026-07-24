import { useEffect, useRef, useState } from 'react';
import { createReceiptStage } from './receipt-stage.js';

interface ReceiptStageProps {
  imageUrl: string;
  generatedTime: string;
  identityLabel: string;
  modeLabel: string;
  scheduleId: string;
}

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
  }, [props.imageUrl, props.generatedTime, props.identityLabel, props.modeLabel, props.scheduleId]);

  if (fallback) {
    return <img src={props.imageUrl} alt="Attendance QR Code" className="qrcode-image qrcode-image-fallback" />;
  }

  return <div ref={containerRef} className="receipt-stage-host" />;
}
