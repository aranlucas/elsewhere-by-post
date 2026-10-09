import type { ChangeEvent } from "react";

export interface PublishPanelProps {
  valid: boolean;
  notice: string;
  onPlay: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function PublishPanel({ valid, notice, onPlay, onExport, onImport }: PublishPanelProps) {
  return (
    <div className="maker-publish">
      <button type="button" id="play-map" className="send" disabled={!valid} onClick={onPlay}>
        Shuffle &amp; play my map <span aria-hidden="true">→</span>
      </button>
      <button type="button" id="export-map" className="tool" disabled={!valid} onClick={onExport}>
        Export postcard JSON
      </button>
      <label className="import-label">
        Import postcard JSON
        <input id="import-map" type="file" accept=".json,application/json" onChange={onImport} />
      </label>
      <output id="maker-notice" aria-live="polite">
        {notice}
      </output>
    </div>
  );
}
