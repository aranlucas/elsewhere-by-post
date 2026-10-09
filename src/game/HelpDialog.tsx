import type { RefObject } from "react";
import { ArrowIcon } from "../icons.tsx";

export function HelpDialog({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const close = () => {
    ref.current?.close();
  };

  return (
    // `closedby="any"` lets a backdrop click or Escape dismiss it natively.
    <dialog id="help" ref={ref} aria-labelledby="help-title" closedby="any">
      <button type="button" className="close-help" aria-label="Close instructions" onClick={close}>
        ×
      </button>
      <span className="eyebrow">WELCOME TO ELSEWHERE</span>
      <h2 id="help-title">The world is a postcard.</h2>
      <p>
        Make a route from the <b>departure house</b> to the <b>delivery house</b>. Collect every
        round postage stamp along the way.
      </p>
      <ol>
        <li>
          <b>Turn:</b> select a postcard, then press Turn card or <kbd>R</kbd>. The little ↻ button
          turns it too.
        </li>
        <li>
          <b>Swap:</b> tap two postcards, or drag one onto another. Cards marked ⌖ are pinned.
        </li>
        <li>
          <b>Send:</b> the courier follows connected roads. If a route is incomplete, it shows how
          far it can get. Try as often as you like.
        </li>
      </ol>
      <div className="echo-explainer">
        <span>↟</span>
        <p>
          <b>A small impossibility, from journey 04:</b> matching echo doors join distant postcards
          when both arrows point the same way. Each pair can be crossed once per journey.
        </p>
      </div>
      <p className="keyboard-guide">
        <b>Keyboard:</b> Tab to a card; arrow keys move focus. Enter selects. R turns (Shift+R turns
        back), U undoes, P sends, Escape clears selection. All actions also have buttons.
      </p>
      <button type="button" className="send close-help" onClick={close}>
        Let’s get pleasantly lost <ArrowIcon />
      </button>
    </dialog>
  );
}
