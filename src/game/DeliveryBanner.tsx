import { ArrowIcon } from "../icons.tsx";

export interface DeliveryBannerProps {
  delivery: string | null;
  isLastLevel: boolean;
  onNext: () => void;
  onRemix: () => void;
}

/** The level-complete banner that lands on the table once the courier delivers. */
export function DeliveryBanner({ delivery, isLastLevel, onNext, onRemix }: DeliveryBannerProps) {
  return (
    <div id="delivery" className="delivery" hidden={delivery === null}>
      <span className="delivered-mark">DELIVERED ✓</span>
      <p id="delivery-copy">{delivery}</p>
      <div className="delivery-actions">
        <button type="button" id="next" className="next" onClick={onNext}>
          {isLastLevel ? "Back to the first postcard" : "Next postcard"} <ArrowIcon />
        </button>
        <button type="button" id="remix" className="quiet" onClick={onRemix}>
          Shuffle this map again ↗
        </button>
      </div>
    </div>
  );
}
