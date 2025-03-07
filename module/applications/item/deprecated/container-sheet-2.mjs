import ContainerSheet from "../container-sheet.mjs";

export default class ContainerSheet2 extends ContainerSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ContainerSheet2` application has been deprecated and replaced with `ContainerSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2" }
    );
    super(...args);
  }
}
