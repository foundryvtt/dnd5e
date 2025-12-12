import Application5e from "../../api/application.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * Application for configuring which documents appear in the Table of Contents.
 */
export default class CompendiumTOCConfig extends Application5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["config-sheet", "standard-form"],
    compendium: null,
    form: {
      handler: CompendiumTOCConfig.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 600
    },
    tag: "form",
    window: {
      title: "DND5E.TABLEOFCONTENTS.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/dnd5e/templates/journal/config/compendium-toc-config.hbs"
    }
  };

  /* --------------------------------------------- */
  /*  Properties                                   */
  /* --------------------------------------------- */

  /**
   * The compendium being configured.
   * @type {CompendiumCollection}
   */
  get compendium() {
    return this.options.compendium;
  }

  /* --------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  /* --------------------------------------------- */

  /** @override */
  get subtitle() {
    return this.compendium.metadata.label;
  }

  /* --------------------------------------------- */
  /*  Rendering                                    */
  /* --------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.id = `compendium-toc-config-${options.compendium.collection.replaceAll(".", "_")}`;
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // TODO: Ideally this would be `getIndex({ fields: ["flags.dnd5e.type", "flags.dnd5e.position"] })`
    // but that doesn't seem to properly update the flags when they are updated
    const docs = await this.compendium.getDocuments();
    const counts = {};
    const chapterOptions = docs
      .reduce((arr, doc) => {
        const flags = doc.flags.dnd5e ?? {};
        if ( flags.type ) {
          counts[`${flags.type}-${flags.position ?? 0}`] ??= 0;
          counts[`${flags.type}-${flags.position ?? 0}`] += 1;
        }
        if ( (flags.type === "appendix") || (flags.type === "chapter") ) {
          const sort = dnd5e.applications.journal.TableOfContentsCompendium.TYPES[flags.type] + (flags.position ?? 0);
          arr.push({ label: game.i18n.format("DND5E.TABLEOFCONTENTS.Special.After", { chapter: doc.name }), sort });
        }
        return arr;
      }, [{ value: null, label: game.i18n.localize("DND5E.TABLEOFCONTENTS.Special.End"), rule: true }])
      .sort((lhs, rhs) => lhs.sort - rhs.sort)
      .map((option, value) => ({ ...option, value }));

    context.folders = [];
    const traverse = node => {
      if ( !node ) return;
      context.folders.push({
        name: node.folder?.name ?? game.i18n.localize("DND5E.TABLEOFCONTENTS.NoFolder"),
        entries: node.entries.map(o => {
          const entry = this.compendium.get(o._id);
          const data = entry.flags?.dnd5e ?? {};
          const fields = [{
            field: new StringField(),
            name: `${entry._id}.type`,
            options: [
              { value: "chapter", label: game.i18n.localize("DND5E.TABLEOFCONTENTS.Type.Chapter") },
              { value: "appendix", label: game.i18n.localize("DND5E.TABLEOFCONTENTS.Type.Appendix") },
              { value: "header", label: game.i18n.localize("DND5E.TABLEOFCONTENTS.Type.Header") },
              { value: "special", label: game.i18n.localize("DND5E.TABLEOFCONTENTS.Type.Special") }
            ],
            value: data.type
          }];

          switch ( data.type ) {
            case "appendix":
            case "chapter":
              fields.push({
                field: new NumberField({ integer: true }),
                name: `${entry._id}.position`,
                value: data.position
              });
              break;
            case "special":
              fields.push({
                field: new NumberField(),
                name: `${entry._id}.append`,
                options: chapterOptions,
                value: data.append
              });
              break;
          }

          const warn = data.type && (data.type !== "special") && (counts[`${data.type}-${data.position ?? 0}`] > 1);
          return {
            data, entry, fields,
            warning: warn ? game.i18n.localize(
              `DND5E.TABLEOFCONTENTS.Warning.Duplicate${data.type === "header" ? "Header" : "Position"}`
            ) : null
          };
        })
      });
      node.children.forEach(traverse);
    };
    traverse(this.compendium.tree);
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @this {CompendiumTOCConfig}
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    const updates = [];
    for ( const [id, flags] of Object.entries(submitData) ) {
      const update = { _id: id };
      for ( const key of ["type", "position", "append"] ) {
        if ( flags[key] || (flags[key] === 0) ) update[`flags.dnd5e.${key}`] = flags[key];
        else update[`flags.dnd5e.-=${key}`] = null;
      }
      updates.push(update);
    }
    await JournalEntry.updateDocuments(updates, { pack: this.compendium.collection });
    this.compendium.render();
    this.render();
  }
}
