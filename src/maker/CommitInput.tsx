import { useState } from "react";

export interface CommitInputProps {
  id: string;
  value: string;
  maxLength: number;
  onCommit: (value: string) => void;
}

/**
 * A text field that commits on blur or Enter, like a native change event, so a
 * half-typed name is never validated or saved as an undo step.
 */
export function CommitInput({ id, value, maxLength, onCommit }: CommitInputProps) {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);

  // When the map changes underneath (undo, import, a rejected edit), show its value.
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }

  const commit = () => {
    if (draft !== value) onCommit(draft);
    setDraft(value);
  };

  return (
    <input
      id={id}
      maxLength={maxLength}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
    />
  );
}
