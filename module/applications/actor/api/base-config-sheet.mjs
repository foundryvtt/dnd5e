import DocumentSheet5e from "../../api/document-sheet.mjs";

/**
 * Base document sheet from which all actor configuration sheets should be based.
 */
export default class BaseConfigSheet extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["config-sheet"],
    sheetConfig: false,
    form: {
      submitOnChange: true
    }
  };
}
