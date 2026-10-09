import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { browserStorage } from "../browser.ts";
import {
  authoredLevel,
  exampleMap,
  publishMap,
  readDraft,
  saveDraft,
  validateMap,
} from "../custom-map.ts";
import { YOUR_MAP_PATH } from "../game/journeyUrl.ts";
import { useGridArrows } from "../hooks.ts";
import "../maker.css";
import { CardSettings } from "./CardSettings.tsx";
import { CommitInput } from "./CommitInput.tsx";
import { MakerIntro } from "./MakerIntro.tsx";
import { downloadMap, readMapFile } from "./mapFile.ts";
import { PublishPanel } from "./PublishPanel.tsx";
import { RouteColumn } from "./RouteColumn.tsx";
import { useMapDraft } from "./useMapDraft.ts";

/** The saved draft, or the example map; saving it straight away tells us whether storage works. */
export function loader() {
  const storage = browserStorage();
  const initialMap = readDraft(storage);

  return { initialMap, initiallySaved: saveDraft(storage, initialMap) };
}

/** A shuffle seed. Read only from event handlers, never while rendering. */
const shuffleSeed = () => Date.now() >>> 0;

export function Maker() {
  const { initialMap, initiallySaved } = useLoaderData<typeof loader>();
  const storage = browserStorage();
  const navigate = useNavigate();
  const draft = useMapDraft(storage, initialMap, initiallySaved);
  const [selected, setSelected] = useState(1);
  const boardRef = useRef<HTMLFieldSetElement>(null);
  const { map, setNotice } = draft;
  const validation = validateMap(map);

  function checkRoute() {
    draft.setPreview(validation.journey);
    setNotice(
      validation.valid
        ? "The highlighted postcards belong to one legal journey."
        : "Keep shaping the world. Export and play unlock when a route is valid.",
    );
  }

  function play() {
    try {
      publishMap(storage, map, shuffleSeed());
      void navigate(YOUR_MAP_PATH);
    } catch {
      setNotice("This browser could not save the playable map. You can export it instead.");
    }
  }

  function exportMap() {
    if (!validation.valid || !validation.map) {
      setNotice(validation.message);

      return;
    }

    downloadMap(validation.map);
    setNotice(
      "A little world, packed as JSON. It contains your map design, not your game progress.",
    );
  }

  async function importMap(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    try {
      draft.replace(
        await readMapFile(file),
        "Map imported. Check its route before export or play.",
      );
    } catch (error) {
      setNotice(
        `Import kept your current map. ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      input.value = "";
    }
  }

  useGridArrows(boardRef, 3, 6);

  return (
    <>
      <a className="skip-link" href="#maker-board">
        Skip to your map
      </a>
      <main className="desk maker">
        <title>The Mapmaker’s Desk — Elsewhere, by Post</title>
        <MakerIntro />
        <label className="map-title-label" htmlFor="map-title">
          Your map’s title
          <CommitInput
            id="map-title"
            maxLength={60}
            value={map.title}
            onCommit={(title) => {
              draft.edit((candidate) => {
                candidate.title = title;
              });
            }}
          />
        </label>
        <section className="maker-layout" aria-label="Map authoring desk">
          <RouteColumn
            level={authoredLevel(map)}
            validation={validation}
            selected={selected}
            preview={draft.preview}
            canUndo={draft.canUndo}
            boardRef={boardRef}
            onSelect={setSelected}
            onUndo={draft.undo}
            onReset={() => {
              draft.replace(exampleMap(), "A fresh blue echo. Undo brings your previous map back.");
            }}
            onCheck={checkRoute}
          />
          <aside className="maker-controls" aria-label="Selected postcard settings">
            <CardSettings
              index={selected}
              card={map.cards[selected]}
              onEdit={(change) => {
                draft.editCard(selected, change);
              }}
            />
            <PublishPanel
              valid={validation.valid}
              notice={draft.notice}
              onPlay={play}
              onExport={exportMap}
              onImport={(event) => {
                void importMap(event);
              }}
            />
          </aside>
        </section>
        <footer>
          <span id="draft-status">
            {draft.saved
              ? "Your draft is saved on this device."
              : "Saving is unavailable. You can still export a valid map."}
          </span>
          <span className="footer-motto">The world fits on your desk.</span>
        </footer>
      </main>
    </>
  );
}
