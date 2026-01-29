import { getCollectionDocumentOptions } from "../../../utils.mjs";
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
    const entryOptions = getCollectionDocumentOptions(this.document.collection, {
      disabled: entry => entry._id === this.document.id
    });
    context.fields = ["previous", "up", "next"].map(name => ({
      field: new StringField(),
      label: game.i18n.localize(`DND5E.JOURNALENTRY.Navigation.${name.capitalize()}`),
      name: `flags.dnd5e.navigation.${name}`,
      options: entryOptions,
      value: data[name]
    }));
    return context;
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
