import Advancement from "../advancement.mjs";
import AdvancementConfig from "../advancement-config.mjs";
import AdvancementFlow from "../advancement-flow.mjs";

/**
 * Advancement that presents the player with a choice of multiple items that they can take. Keeps track of which
 * items were selected at which levels.
 *
 * @extends {Advancement}
 */
export class ItemChoiceAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaults: {
        configuration: {
          choices: {},
          allowDrops: true,
          pool: []
        }
      },
      order: 50,
      icon: "systems/dnd5e/icons/svg/item-choice.svg",
      title: game.i18n.localize("DND5E.AdvancementItemChoiceTitle"),
      hint: game.i18n.localize("DND5E.AdvancementItemChoiceHint"),
      multiLevel: true,
      apps: {
        config: ItemChoiceConfig,
        flow: ItemChoiceFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.from(Object.keys(this.data.configuration.choices));
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return this.data.value[level] !== undefined;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level) {
    return `${this.title} <em>(${game.i18n.localize("DND5E.AdvancementChoices")})</em>`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level) {
    const items = this.data.value[level];
    if ( !items ) return "";
    return Object.values(items).reduce((html, uuid) => html + game.dnd5e.utils._linkForUuid(uuid), "");
  }

}


/**
 * Configuration application for item choices.
 *
 * @extends {AdvancementConfig}
 */
export class ItemChoiceConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "item-choice", "two-column"],
      dragDrop: [{ dropSelector: ".drop-target" }],
      dropKeyPath: "pool",
      template: "systems/dnd5e/templates/advancement/item-choice-config.html",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareConfigurationUpdate(configuration) {
    if ( configuration.choices ) configuration.choices = this.constructor._cleanedObject(configuration.choices);
    return configuration;
  }

}


/**
 * Inline application that presents the player with a choice of items.
 *
 * @extends {AdvancementFlow}
 */
export class ItemChoiceFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/item-choice-flow.html"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const maxChoices = this.advancement.data.configuration.choices[this.level];
    const added = this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? this.advancement.data.value[this.level];
    const checked = new Set(Object.values(added ?? {}));

    const allUuids = new Set([...this.advancement.data.configuration.pool, ...checked]);
    const items = await Promise.all(Array.from(allUuids).map(async uuid => {
      const item = await fromUuid(uuid);
      item.checked = checked.has(uuid);
      return item;
    }));

    return foundry.utils.mergeObject(super.getData(), {
      choices: {
        max: maxChoices,
        current: checked.size,
        full: checked.size >= maxChoices
      },
      items
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("a[data-uuid]").click(this._onClickFeature.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    this._calculateCurrent();
  }

  /* -------------------------------------------- */

  /**
   * Adjust the currently selected number to reflect for and enable/disable inputs as necessary.
   */
  _calculateCurrent() {
    // Recalculate the currently selected number
    const current = Array.from(this.form.querySelectorAll("input")).reduce((current, i) => {
      return ( (i.type === "hidden") || i.checked ) ? current + 1 : current;
    }, 0);
    this.form.dataset.current = current;

    // Enabled/disabled non-selected checkboxes
    const checkboxes = this.form.querySelectorAll("input[type='checkbox']");
    if ( current >= parseInt(this.form.dataset.max) ) {
      checkboxes.forEach(c => c.disabled = !c.checked);
    } else {
      checkboxes.forEach(c => c.disabled = false);
    }

    // Update the current value listed in the UI
    this.form.querySelector(".current").innerText = current;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on a feature during item grant to preview the feature.
   * @param {MouseEvent} event  The triggering event.
   * @protected
   */
  async _onClickFeature(event) {
    event.preventDefault();
    const uuid = event.currentTarget.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Item entry from the Advancement.
   * @param {Event} event        The originating click event.
   * @returns {Promise<Item5e>}  The updated parent Item after the application re-renders.
   * @private
   */
  async _onItemDelete(event) {
    // event.preventDefault();
    // const uuidToDelete = event.currentTarget.closest("[data-item-uuid]")?.dataset.itemUuid;
    // if ( !uuidToDelete ) return;
    // const items = foundry.utils.getProperty(this.advancement.data.configuration, this.options.dropKeyPath);
    // const updates = { configuration: this.prepareConfigurationUpdate({
    //   [this.options.dropKeyPath]: items.filter(uuid => uuid !== uuidToDelete)
    // }) };
    // await this.advancement.update(updates);
    // this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    if ( parseInt(this.form.dataset.current) >= parseInt(this.form.dataset.max) ) return false;

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    const existingItems = Array.from(this.form.querySelectorAll("input")).map(i => i.name);

    // Check to ensure the dropped item doesn't already exist on the actor

    // If the item already exists, simply check its checkbox
    if ( existingItems.includes(item.uuid) ) {
      const existingInput = this.form.querySelector(`input[name='${item.uuid}']`);
      existingInput.checked = true;
      this._calculateCurrent();
      return false;
    }

    // TODO: Add a new input
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const retainedData = this.retainedData?.items.reduce((obj, i) => {
      obj[foundry.utils.getProperty(i, "flags.dnd5e.sourceId")] = i;
      return obj;
    }, {});
    await this.advancement.apply(this.level, formData, retainedData);
  }

}
