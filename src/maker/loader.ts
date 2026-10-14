import { browserStorage } from "../browser.ts";
import { readDraft, saveDraft } from "../custom-map.ts";

/** The saved draft, or the example map; saving it straight away tells us whether storage works. */
export function loader() {
  const storage = browserStorage();
  const initialMap = readDraft(storage);

  return { initialMap, initiallySaved: saveDraft(storage, initialMap) };
}
