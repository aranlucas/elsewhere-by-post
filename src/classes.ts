/** Joins the class names that apply, skipping conditions that are false. */
export const classes = (...names: (string | false)[]): string =>
  names.filter((name) => name !== false).join(" ");
