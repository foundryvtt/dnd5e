import DocumentSheet5e from "../../api/document-sheet.mjs";
import { createCheckboxInput } from "../../fields.mjs";

const { BooleanField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * Application for configuring a journal entry's listing in Table of Contents and its pages.
 */
export default class JournalTOCConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    form: {
      submitOnChange: true
    },
    id: "journal-toc-config-{id}",
    position: {
      width: 400
    },
    window: {
      title: "DND5E.TABLEOFCONTENTS.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/dnd5e/templates/journal/config/journal-toc-config.hbs"
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
    return this.document.collection;
  }

  /* --------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  /* --------------------------------------------- */

  /** @override */
  get subtitle() {
    return this.document.name;
  }

  /* --------------------------------------------- */
  /*  Rendering                                    */
  /* --------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const TableOfContentsCompendium = dnd5e.applications.journal.TableOfContentsCompendium;
    const { chapterOptions, counts } = await TableOfContentsCompendium._getEntryBreakdown(this.compendium);

    const data = this.document.flags.dnd5e ?? {};
    context.fields = [
      {
        field: new StringField(),
        label: "DND5E.TABLEOFCONTENTS.FIELDS.type.label",
        localize: true,
        name: "type",
        options: TableOfContentsCompendium.TYPE_OPTIONS,
        value: data.type,
        visible: true
      },
      {
        field: new NumberField({ integer: true }),
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.FIELDS.position.label"),
        name: "position",
        value: data.position,
        visible: (data.type === "appendix") || (data.type === "chapter")
      },
      {
        field: new NumberField(),
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.FIELDS.position.label"),
        name: "append",
        options: chapterOptions,
        value: data.append,
        visible: data.type === "special"
      },
      {
        field: new NumberField({ integer: true }),
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.FIELDS.order.label"),
        name: "order",
        value: data.order,
        visible: data.type === "special"
      },
      {
        field: new StringField(),
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.FIELDS.title.label"),
        name: "title",
        placeholder: this.document.name,
        value: data.title,
        visible: !!data.type
      },
      {
        field: new BooleanField(),
        input: createCheckboxInput,
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.HideAllPages"),
        name: "hidePages",
        value: data.showPages === false,
        visible: data.type === "chapter"
      },
      {
        field: new BooleanField(),
        input: createCheckboxInput,
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.FIELDS.showPages.label"),
        name: "showPages",
        value: data.showPages === true,
        visible: (data.type === "appendix") || (data.type === "special")
      },
      {
        field: new SetField(new StringField()),
        label: game.i18n.localize("DND5E.TABLEOFCONTENTS.HiddenPages"),
        name: "hiddenPages",
        options: this.document.pages
          .map(page => {
            const option = { value: page.id, label: page.name, sort: page.sort };
            if ( this.document.categories.size ) {
              const category = this.document.categories.get(page.category);
              option.groupSort = category?.sort ?? -Infinity;
              option.group = category?.name ?? game.i18n.localize("JOURNAL.Uncategorized");
            }
            return option;
          })
          .sort((lhs, rhs) => (lhs.groupSort - rhs.groupSort) || (lhs.sort - rhs.sort)),
        value: this.#getHiddenPages(),
        visible: ((data.type === "chapter") && (data.showPages !== false))
          || (((data.type === "appendix") || (data.type === "special")) && (data.showPages === true))
      }
    ];

    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const update = {};

    const flagKeys = ["type", "position", "append", "order", "title"];
    if ( "hidePages" in submitData ) {
      if ( submitData.hidePages ) update.showPages = false;
      else update["-=showPages"] = null;
    } else {
      flagKeys.push("showPages");
    }
    for ( const key of flagKeys ) {
      if ( submitData[key] || (submitData[key] === 0) ) update[key] = submitData[key];
      else update[`-=${key}`] = null;
    }

    if ( submitData.hiddenPages ) {
      const currentlyHidden = this.#getHiddenPages();
      const formHidden = new Set(submitData.hiddenPages);
      const pageUpdates = [
        ...formHidden.difference(currentlyHidden).map(_id => ({ _id, "flags.dnd5e.tocHidden": true })),
        ...currentlyHidden.difference(formHidden).map(_id => ({ _id, "flags.dnd5e.-=tocHidden": null }))
      ];
      if ( pageUpdates.length ) update._pageUpdates = pageUpdates;
    }

    return { flags: { dnd5e: update } };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _processSubmitData(event, form, submitData, options={}) {
    if ( "_pageUpdates" in (submitData.flags?.dnd5e ?? {}) ) {
      await this.document.updateEmbeddedDocuments("JournalEntryPage", submitData.flags.dnd5e._pageUpdates);
      delete submitData.flags.dnd5e._pageUpdates;
    }
    await super._processSubmitData(event, form, submitData, options);
    this.document.collection.render();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Return the IDs of all pages in this journal entry that are hidden in the table of contents.
   * @returns {Set<string>}
   */
  #getHiddenPages() {
    return this.document.pages.reduce((hidden, page) => {
      if ( page.flags.dnd5e?.tocHidden ) hidden.add(page.id);
      return hidden;
    }, new Set());
  }
}
