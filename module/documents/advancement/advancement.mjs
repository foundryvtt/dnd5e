import AdvancementConfig from "../../applications/advancement/advancement-config-v2.mjs";
import AdvancementFlow from "../../applications/advancement/advancement-flow.mjs";
import BaseAdvancement from "../../data/advancement/base-advancement.mjs";
import PseudoDocumentMixin from "../mixins/pseudo-document.mjs";

/**
 * @import { PseudoDocumentsMetadata } from "../mixins/pseudo-document.mjs";
 */

/**
 * Error that can be thrown during the advancement update preparation process.
 */
class AdvancementError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "AdvancementError";
  }
}

/**
 * Abstract base class which various advancement types can subclass.
 * @param {Item5e} item          Item to which this advancement belongs.
 * @param {object} [data={}]     Raw data stored in the advancement object.
 * @param {object} [options={}]  Options which affect DataModel construction.
 * @abstract
 */
export default class Advancement extends PseudoDocumentMixin(BaseAdvancement) {
  constructor(data, {parent=null, ...options}={}) {
    if ( parent instanceof Item ) parent = parent.system;
    super(data, {parent, ...options});

    /**
     * A collection of Application instances which should be re-rendered whenever this document is updated.
     * The keys of this object are the application ids and the values are Application instances. Each
     * Application in this object will have its render method called by {@link Document#render}.
     * @type {Object<Application>}
     */
    Object.defineProperty(this, "apps", {
      value: {},
      writable: false,
      enumerable: false
    });
  }

  /* -------------------------------------------- */

  static ERROR = AdvancementError;

  /* -------------------------------------------- */

  /**
   * Information on how an advancement type is configured.
   *
   * @typedef {PseudoDocumentsMetadata} AdvancementMetadata
   * @property {object} dataModels
   * @property {DataModel} configuration  Data model used for validating configuration data.
   * @property {DataModel} value          Data model used for validating value data.
   * @property {number} order          Number used to determine default sorting order of advancement items.
   * @property {string} icon           Icon used for this advancement type if no user icon is specified.
   * @property {string} typeIcon       Icon used when selecting this advancement type during advancement creation.
   * @property {string} title          Title to be displayed if no user title is specified.
   * @property {string} hint           Description of this type shown in the advancement selection dialog.
   * @property {boolean} multiLevel    Can this advancement affect more than one level? If this is set to true,
   *                                   the level selection control in the configuration window is hidden and the
   *                                   advancement should provide its own implementation of `Advancement#levels`
   *                                   and potentially its own level configuration interface.
   * @property {Set<string>} validItemTypes  Set of types to which this advancement can be added. (deprecated)
   * @property {object} apps
   * @property {*} apps.config         Subclass of AdvancementConfig that allows for editing of this advancement type.
   * @property {*} apps.flow           Subclass of AdvancementFlow that is displayed while fulfilling this advancement.
   */

  /**
   * Configuration information for this advancement type.
   * @type {AdvancementMetadata}
   */
  static get metadata() {
    return {
      name: "Advancement",
      label: "DOCUMENT.DND5E.Advancement",
      order: 100,
      icon: "icons/svg/upgrade.svg",
      typeIcon: "icons/svg/upgrade.svg",
      title: game.i18n.localize("DND5E.AdvancementTitle"),
      hint: "",
      multiLevel: false,
      validItemTypes: new Set(["background", "class", "race", "subclass"]),
      apps: {
        config: AdvancementConfig,
        flow: AdvancementFlow
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Perform the pre-localization of this data model.
   */
  static localize() {
    foundry.helpers.Localization.localizeDataModel(this);
    if ( this.metadata.dataModels?.configuration ) {
      foundry.helpers.Localization.localizeDataModel(this.metadata.dataModels.configuration);
    }
    if ( this.metadata.dataModels?.value ) {
      foundry.helpers.Localization.localizeDataModel(this.metadata.dataModels.value);
    }
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Should this advancement be applied to a class based on its class restriction setting? This will always return
   * true for advancements that are not within an embedded class item.
   * @type {boolean}
   * @protected
   */
  get appliesToClass() {
    const originalClass = this.item.isOriginalClass;
    return !this.classRestriction
      || (this.classRestriction === "primary" && [true, null].includes(originalClass))
      || (this.classRestriction === "secondary" && !originalClass);
  }

  /* -------------------------------------------- */

  /**
   * The default icon that will be used if one isn't specified.
   * @type {string}
   * @protected
   */
  get _defaultIcon() {
    return this.constructor.metadata.icon;
  }

  /* -------------------------------------------- */

  /**
   * The default title that will be used if one isn't specified.
   * @type {string}
   * @protected
   */
  get _defaultTitle() {
    return this.constructor.metadata.title;
  }

  /* -------------------------------------------- */

  /**
   * List of levels in which this advancement object should be displayed. Will be a list of class levels if this
   * advancement is being applied to classes or subclasses, otherwise a list of character levels.
   * @returns {number[]}
   */
  get levels() {
    return this.level !== undefined ? [this.level] : [];
  }

  /* -------------------------------------------- */
  /*  Preparation Methods                         */
  /* -------------------------------------------- */

  /**
   * Prepare data for the Advancement.
   */
  prepareData() {
    this.title = this.title || this._defaultTitle;
    this.icon = this.icon || this._defaultIcon;
  }

  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before an Advancement is created.
   * @param {object} data      The initial data object provided to the document creation request.
   * @returns {boolean|void}   A return value of false indicates the creation operation should be cancelled.
   * @protected
   */
  _preCreate(data) {
    if ( !["class", "subclass"].includes(this.item.type)
      || foundry.utils.hasProperty(data, "level")
      || this.constructor.metadata.multiLevel ) return;
    this.updateSource({level: 1});
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /**
   * Has the player made choices for this advancement at the specified level?
   * @param {number} level  Level for which to check configuration.
   * @returns {boolean}     Have any available choices been made?
   */
  configuredForLevel(level) {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Value used for sorting this advancement at a certain level.
   * @param {number} level  Level for which this entry is being sorted.
   * @returns {string}      String that can be used for sorting.
   */
  sortingValueForLevel(level) {
    return `${this.constructor.metadata.order.paddedString(4)} ${this.titleForLevel(level)}`;
  }

  /* -------------------------------------------- */

  /**
   * Title displayed in advancement list for a specific level.
   * @param {number} level                           Level for which to generate a title.
   * @param {object} [options={}]
   * @param {boolean} [options.legacyDisplay=false]  Use legacy formatting?
   * @param {boolean} [options.configMode=false]     Is the advancement's item sheet in configuration mode? When in
   *                                                 config mode, the choices already made on this actor should not
   *                                                 be displayed.
   * @returns {string}                               HTML title with any level-specific information.
   */
  titleForLevel(level, options={}) {
    return this.title;
  }

  /* -------------------------------------------- */

  /**
   * Summary content displayed beneath the title in the advancement list.
   * @param {number} level                           Level for which to generate the summary.
   * @param {object} [options={}]
   * @param {boolean} [options.legacyDisplay=false]  Use legacy formatting?
   * @param {boolean} [options.configMode=false]     Is the advancement's item sheet in configuration mode? When in
   *                                                 config mode, the choices already made on this actor should not
   *                                                 be displayed.
   * @returns {string}                               HTML content of the summary.
   */
  summaryForLevel(level, options={}) {
    return "";
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /**
   * Can an advancement of this type be added to the provided item?
   * @param {Item5e} item  Item to check against.
   * @returns {boolean}    Should this be enabled as an option when creating an advancement.
   */
  static availableForItem(item) {
    return true;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async delete(options={}) {
    if ( this.item.actor?.system.metadata?.supportsAdvancement
        && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = dnd5e.applications.advancement.AdvancementManager
        .forDeletedAdvancement(this.item.actor, this.item.id, this.id);
      if ( manager.steps.length ) return manager.render(true);
    }
    return super.delete(options);
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Locally apply this advancement to the actor.
   * @param {number} level   Level being advanced.
   * @param {object} data    Data from the advancement form.
   * @abstract
   */
  async apply(level, data) { }


  /* -------------------------------------------- */

  /**
   * Retrieves the data to pass to the apply method in order to apply this advancement automatically, if possible.
   * @param {number} level    Level being advanced.
   * @returns {object|false}  Data to pass to the apply method, or `false` if advancement requirers user intervention.
   */
  automaticApplicationValue(level) {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Locally apply this advancement from stored data, if possible. If stored data can not be restored for any reason,
   * throw an AdvancementError to display the advancement flow UI.
   * @param {number} level  Level being advanced.
   * @param {object} data   Data from `Advancement#reverse` needed to restore this advancement.
   * @abstract
   */
  async restore(level, data) { }

  /* -------------------------------------------- */

  /**
   * Locally remove this advancement's changes from the actor.
   * @param {number} level  Level being removed.
   * @returns {object}      Data that can be passed to the `Advancement#restore` method to restore this reversal.
   * @abstract
   */
  async reverse(level) { }

  /* -------------------------------------------- */

  /**
   * Fetch an item and create a clone with the proper flags.
   * @param {string} uuid  UUID of the item to fetch.
   * @param {string} [id]  Optional ID to use instead of a random one.
   * @returns {object|null}
   */
  async createItemData(uuid, id) {
    const source = await fromUuid(uuid);
    if ( !source ) return null;
    const { _stats } = game.items.fromCompendium(source);
    const advancementOrigin = `${this.item.id}.${this.id}`;
    return source.clone({
      _stats,
      _id: id ?? foundry.utils.randomID(),
      "flags.dnd5e.sourceId": uuid,
      "flags.dnd5e.advancementOrigin": advancementOrigin,
      "flags.dnd5e.advancementRoot": this.item.getFlag("dnd5e", "advancementRoot") ?? advancementOrigin
    }, { keepId: true }).toObject();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Construct context menu options for this Activity.
   * @returns {ContextMenuEntry[]}
   */
  getContextMenuOptions() {
    if ( this.item.isOwner && !this.item.collection?.locked ) return [
      {
        name: "DND5E.ADVANCEMENT.Action.Edit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        callback: () => this.sheet?.render(true)
      },
      {
        name: "DND5E.ADVANCEMENT.Action.Duplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        condition: li => this?.constructor.availableForItem(this.item),
        callback: () => {
          const createData = this.toObject();
          delete createData._id;
          this.item.createAdvancement(createData.type, createData, { renderSheet: false });
        }
      },
      {
        name: "DND5E.ADVANCEMENT.Action.Delete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        callback: () => this.deleteDialog()
      }
    ];

    return [{
      name: "DND5E.ADVANCEMENT.Action.View",
      icon: "<i class='fas fa-eye fa-fw'></i>",
      callback: () => this.sheet?.render(true)
    }];
  }

  /* -------------------------------------------- */

  /**
   * Handle context menu events on activities.
   * @param {Item5e} item         The Item the Activity belongs to.
   * @param {HTMLElement} target  The element the menu was triggered on.
   */
  static onContextMenu(item, target) {
    const { id } = target.closest("[data-id]")?.dataset ?? {};
    const advancement = item.advancement?.byId[id];
    if ( !advancement ) return;
    const menuItems = advancement.getContextMenuOptions();

    /**
     * A hook even that fires when the context menu for an Advancement is opened.
     * @function dnd5e.getItemAdvancementContext
     * @memberof hookEvents
     * @param {Advancement} advancement       The Advancement.
     * @param {HTMLElement} target            The element that menu was triggered on.
     * @param {ContextMenuEntry[]} menuItems  The context menu entries.
     */
    Hooks.callAll("dnd5e.getItemAdvancementContext", advancement, target, menuItems);
    ui.context.menuItems = menuItems;
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /** @override */
  static _createDialogData(type, parent) {
    const Advancement = CONFIG.DND5E.advancementTypes[type].documentClass;
    return {
      type,
      disabled: !Advancement.availableForItem(parent),
      label: Advancement.metadata?.title,
      hint: Advancement.metadata?.hint,
      icon: Advancement.metadata?.typeIcon ?? Advancement.metadata?.icon
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static _createDialogTypes(parent) {
    return Object.entries(CONFIG.DND5E.advancementTypes)
      .filter(([, { hidden, validItemTypes }]) => !hidden && validItemTypes?.has(parent.type))
      .map(([k]) => k);
  }
}
