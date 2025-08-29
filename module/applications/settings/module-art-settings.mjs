import ModuleArt from "../../module-art.mjs";

/**
 * A class responsible for allowing GMs to configure art provided by installed modules.
 */
export default class ModuleArtSettingsConfig extends FormApplication {
  /** @inheritDoc */
  constructor(object={}, options={}) {
    object = foundry.utils.mergeObject(game.settings.get("dnd5e", "moduleArtConfiguration"), object, {inplace: false});
    super(object, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("DND5E.ModuleArtConfigL"),
      id: "module-art-config",
      template: "systems/dnd5e/templates/apps/module-art-config.hbs",
      popOut: true,
      width: 600,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options={}) {
    const context = super.getData(options);
    context.config = [];
    for ( const config of ModuleArt.getArtModules() ) {
      const settings = this.object[config.id] ?? { portraits: true, tokens: true };
      context.config.push({ ...config, ...settings });
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action]").on("click", this._onAction.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle priority increase or decrease actions.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const action = event.currentTarget.dataset.action;
    const item = event.currentTarget.closest("[data-id]");
    const id = item.dataset.id;
    const configs = [];
    for ( const element of this.form.elements ) {
      const [id, key] = element.name.split(".");
      if ( key === "priority" ) configs.push({ id, priority: Number(element.value) });
    }
    const idx = configs.findIndex(config => config.id === id);
    if ( idx < 0 ) return;
    if ( (action === "increase") && (idx === 0) ) return;
    if ( (action === "decrease") && (idx === configs.length - 1) ) return;
    const sortBefore = action === "increase";
    const config = configs[idx];
    const target = configs[sortBefore ? idx - 1 : idx + 1];
    configs.splice(idx, 1);
    const updates = foundry.utils.performIntegerSort(config, {
      target, sortBefore,
      siblings: configs,
      sortKey: "priority"
    });
    updates.forEach(({ target, update }) => this.form.elements[`${target.id}.priority`].value = update.priority);
    if ( action === "increase" ) item.previousElementSibling.insertAdjacentElement("beforebegin", item);
    else item.nextElementSibling.insertAdjacentElement("afterend", item);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    await game.settings.set("dnd5e", "moduleArtConfiguration", foundry.utils.expandObject(formData));
    return SettingsConfig.reloadConfirm({world: true});
  }
}
