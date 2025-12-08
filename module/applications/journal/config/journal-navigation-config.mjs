import DocumentSheet5e from "../../api/document-sheet.mjs";

const { StringField } = foundry.data.fields;

/**
 * Application for configuring the navigation links in a journal.
 */
export default class JournalNavigationConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    form: {
      submitOnChange: true
    },
    position: {
      width: 400
    },
    window: {
      title: "DND5E.JOURNALENTRY.Navigation.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/dnd5e/templates/journal/config/navigation-config.hbs"
    }
  };

  /* --------------------------------------------- */
  /*  Properties                                   */
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
    const data = this.document.getFlag("dnd5e", "navigation") ?? {};
    const entryOptions = this.#getEntryOptions();
    context.fields = ["previous", "up", "next"].map(name => ({
      field: new StringField(),
      label: game.i18n.localize(`DND5E.JOURNALENTRY.Navigation.${name.capitalize()}`),
      name: `flags.dnd5e.navigation.${name}`,
      options: entryOptions,
      value: data[name]
    }));
    return context;
  }

  /* --------------------------------------------- */

  /**
   * Build the list of journal entries.
   * @returns {FormSelectOption[]}
   */
  #getEntryOptions() {
    const options = [];
    const traverse = (node, parentName) => {
      if ( !node ) return;
      let group;
      if ( node.folder ) group = parentName ? `${parentName} > ${node.folder.name}` : node.folder.name;
      for ( const entry of node.entries ) {
        options.push({ value: entry._id, label: entry.name, group, disabled: entry._id === this.document.id });
      }
      node.children.forEach((c, idx) => traverse(c, group));
    };
    traverse(this.document.pack ? game.packs.get(this.document.pack).tree : game.journal.tree);
    return options;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);

    const navigation = submitData.flags.dnd5e.navigation;
    const keys = Object.keys(this.document.flags.dnd5e ?? {});
    if ( Object.values(navigation).some(v => v) ) {
      submitData.flags.dnd5e.navigation = Object.entries(navigation).reduce((obj, [k, v]) => {
        if ( v ) obj[k] = v;
        else obj[`-=${k}`] = null;
        return obj;
      }, {});
    } else if ( (keys.length > 1) || ((keys.length === 1) && (keys[0] !== "navigation")) ) {
      submitData.flags = { dnd5e: { "-=navigation": null } };
    } else {
      submitData.flags = { "-=dnd5e": null };
    }

    return submitData;
  }
}
