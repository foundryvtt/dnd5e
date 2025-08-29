import Advancement from "../../documents/advancement/advancement.mjs";
import { log } from "../../utils.mjs";
import Application5e from "../api/application.mjs";

/**
 * Internal type used to manage each step within the advancement process.
 *
 * @typedef {object} AdvancementStep
 * @property {string} type                Step type from "forward", "reverse", "restore", or "delete".
 * @property {AdvancementFlow} [flow]     Flow object for the advancement being applied by this step. In the case of
 *                                        "delete" steps, this flow indicates the advancement flow that originally
 *                                        deleted the item.
 * @property {Item5e} [item]              For "delete" steps only, the item to be removed.
 * @property {object} [class]             Contains data on class if step was triggered by class level change.
 * @property {Item5e} [class.item]        Class item that caused this advancement step.
 * @property {number} [class.level]       Level the class should be during this step.
 * @property {number} [level]             Character level at this step, if different than flow's level.
 * @property {boolean} [automatic=false]  Should the manager attempt to apply this step without user interaction?
 * @property {boolean} [synthetic=false]  Was this step created as a result of an item introduced or deleted?
 */

/**
 * @typedef AdvancementManagerConfiguration
 * @property {boolean} [automaticApplication=false]  Apply advancement steps automatically if no user input is required.
 * @property {boolean} [showVisualizer=false]        Display the step debugging application.
 */

/**
 * Application for controlling the advancement workflow and displaying the interface.
 *
 * @param {Actor5e} actor        Actor on which this advancement is being performed.
 * @param {object} [options={}]  Additional application options.
 */
export default class AdvancementManager extends Application5e {
  constructor(actor, options={}) {
    super(options);
    this.actor = actor;
    this.clone = actor.clone({}, { keepId: true });
    if ( this.options.showVisualizer ) this.#visualizer = new AdvancementVisualizer({ manager: this });
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["advancement", "manager", "themed", "theme-light"], // TODO: Remove when flows converted to App V2.
    window: {
      icon: "fa-solid fa-forward",
      title: "DND5E.ADVANCEMENT.Manager.Title.Default"
    },
    actions: {
      complete: AdvancementManager.#process,
      next: AdvancementManager.#process,
      previous: AdvancementManager.#process,
      restart: AdvancementManager.#process
    },
    position: {
      width: 460
    },
    automaticApplication: false,
    showVisualizer: false
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    manager: {
      template: "systems/dnd5e/templates/advancement/advancement-manager.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The original actor to which changes will be applied when the process is complete.
   * @type {Actor5e}
   */
  actor;

  /* -------------------------------------------- */

  /**
   * Is the prompt currently advancing through un-rendered steps?
   * @type {boolean}
   */
  #advancing = false;

  /* -------------------------------------------- */

  /**
   * A clone of the original actor to which the changes can be applied during the advancement process.
   * @type {Actor5e}
   */
  clone;

  /* -------------------------------------------- */

  /** @inheritDoc */
  get subtitle() {
    const parts = [];

    // Item Name
    const item = this.step.flow.item;
    parts.push(item.name);

    // Class/Subclass level
    let level = this.step.flow.level;
    if ( this.step.class && ["class", "subclass"].includes(item.type) ) level = this.step.class.level;
    if ( level ) parts.push(game.i18n.format("DND5E.AdvancementLevelHeader", { level }));

    // Step Count
    const visibleSteps = this.steps.filter(s => !s.automatic);
    const visibleIndex = visibleSteps.indexOf(this.step);
    if ( visibleIndex >= 0 ) parts.push(game.i18n.format("DND5E.ADVANCEMENT.Manager.Steps", {
      current: visibleIndex + 1,
      total: visibleSteps.length
    }));

    return parts.join(" • ");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get id() {
    return `actor-${this.actor.id}-advancement`;
  }

  /* -------------------------------------------- */

  /**
   * Get the step that is currently in progress.
   * @type {object|null}
   */
  get step() {
    return this.steps[this.#stepIndex] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Step being currently displayed.
   * @type {number|null}
   */
  #stepIndex = null;

  /* -------------------------------------------- */

  /**
   * Individual steps that will be applied in order.
   * @type {AdvancementStep[]}
   */
  steps = [];

  /* -------------------------------------------- */

  /**
   * Get the step before the current one.
   * @type {object|null}
   */
  get previousStep() {
    return this.steps[this.#stepIndex - 1] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the step after the current one.
   * @type {object|null}
   */
  get nextStep() {
    const nextIndex = this.#stepIndex === null ? 0 : this.#stepIndex + 1;
    return this.steps[nextIndex] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Side application for debugging advancement steps.
   * @type {AdvancementVisualizer}
   */
  #visualizer;

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Construct a manager for a newly added advancement from drag-drop.
   * @param {Actor5e} actor               Actor from which the advancement should be updated.
   * @param {string} itemId               ID of the item to which the advancements are being dropped.
   * @param {Advancement[]} advancements  Dropped advancements to add.
   * @param {object} [options={}]         Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forNewAdvancement(actor, itemId, advancements, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem || !advancements.length ) return manager;

    const currentLevel = this.currentLevel(clonedItem, manager.clone);
    const minimumLevel = advancements.reduce((min, a) => Math.min(a.levels[0] ?? Infinity, min), Infinity);
    if ( minimumLevel > currentLevel ) return manager;

    const oldFlows = Array.fromRange(currentLevel + 1).slice(minimumLevel)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Revert advancements through minimum level
    oldFlows.reverse().forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Add new advancements
    const advancementArray = clonedItem.toObject().system.advancement;
    advancementArray.push(...advancements.map(a => {
      const obj = a.toObject();
      if ( obj.constructor.dataModels?.value ) a.value = (new a.constructor.metadata.dataModels.value()).toObject();
      else obj.value = foundry.utils.deepClone(a.constructor.metadata.defaults?.value ?? {});
      return obj;
    }));
    clonedItem.updateSource({"system.advancement": advancementArray});

    const newFlows = Array.fromRange(currentLevel + 1).slice(minimumLevel)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Restore existing advancements and apply new advancements
    newFlows.forEach(flow => {
      const matchingFlow = oldFlows.find(f => (f.advancement.id === flow.advancement.id) && (f.level === flow.level));
      if ( matchingFlow ) manager.steps.push({ type: "restore", flow: matchingFlow, automatic: true });
      else manager.steps.push({ type: "forward", flow });
    });

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a newly added item.
   * @param {Actor5e} actor         Actor to which the item is being added.
   * @param {object} itemData       Data for the item being added.
   * @param {object} [options={}]   Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forNewItem(actor, itemData, options={}) {
    const manager = new this(actor, options);

    // Prepare data for adding to clone
    const dataClone = foundry.utils.deepClone(itemData);
    dataClone._id = foundry.utils.randomID();
    if ( itemData.type === "class" ) {
      dataClone.system.levels = 0;
      if ( !manager.clone.system.details.originalClass ) {
        manager.clone.updateSource({"system.details.originalClass": dataClone._id});
      }
    }

    // Add item to clone & get new instance from clone
    manager.clone.updateSource({items: [dataClone]});
    const clonedItem = manager.clone.items.get(dataClone._id);

    // For class items, prepare level change data
    if ( itemData.type === "class" ) {
      return manager.createLevelChangeSteps(clonedItem, itemData.system?.levels ?? 1);
    }

    // All other items, just create some flows up to current character level (or class level for subclasses)
    Array.fromRange(this.currentLevel(clonedItem, manager.clone) + 1)
      .flatMap(l => this.flowsForLevel(clonedItem, l))
      .forEach(flow => manager.steps.push({ type: "forward", flow }));

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for modifying choices on an item at a specific level.
   * @param {Actor5e} actor         Actor from which the choices should be modified.
   * @param {object} itemId         ID of the item whose choices are to be changed.
   * @param {number} level          Level at which the choices are being changed.
   * @param {object} [options={}]   Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forModifyChoices(actor, itemId, level, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem ) return manager;

    const flows = Array.fromRange(this.currentLevel(clonedItem, manager.clone) + 1).slice(level)
      .flatMap(l => this.flowsForLevel(clonedItem, l));

    // Revert advancements through changed level
    flows.reverse().forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Create forward advancements for level being changed
    flows.reverse().filter(f => f.level === level).forEach(flow => manager.steps.push({ type: "forward", flow }));

    // Create restore advancements for other levels
    flows.filter(f => f.level > level).forEach(flow => manager.steps.push({ type: "restore", flow, automatic: true }));

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for an advancement that needs to be deleted.
   * @param {Actor5e} actor         Actor from which the advancement should be unapplied.
   * @param {string} itemId         ID of the item from which the advancement should be deleted.
   * @param {string} advancementId  ID of the advancement to delete.
   * @param {object} [options={}]   Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forDeletedAdvancement(actor, itemId, advancementId, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    const advancement = clonedItem?.advancement.byId[advancementId];
    if ( !advancement ) return manager;

    const minimumLevel = advancement.levels[0];
    const currentLevel = this.currentLevel(clonedItem, manager.clone);

    // If minimum level is greater than current level, no changes to remove
    if ( (minimumLevel > currentLevel) || !advancement.appliesToClass ) return manager;

    advancement.levels
      .reverse()
      .filter(l => l <= currentLevel)
      .map(l => new advancement.constructor.metadata.apps.flow(clonedItem, advancementId, l))
      .forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    if ( manager.steps.length ) manager.steps.push({ type: "delete", advancement, automatic: true });

    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for an item that needs to be deleted.
   * @param {Actor5e} actor         Actor from which the item should be deleted.
   * @param {string} itemId         ID of the item to be deleted.
   * @param {object} [options={}]   Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forDeletedItem(actor, itemId, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(itemId);
    if ( !clonedItem ) return manager;

    // For class items, prepare level change data
    if ( clonedItem.type === "class" ) {
      return manager.createLevelChangeSteps(clonedItem, clonedItem.system.levels * -1);
    }

    // All other items, just create some flows down from current character level
    Array.fromRange(this.currentLevel(clonedItem, manager.clone) + 1)
      .flatMap(l => this.flowsForLevel(clonedItem, l))
      .reverse()
      .forEach(flow => manager.steps.push({ type: "reverse", flow, automatic: true }));

    // Add a final step to remove the item only if there are advancements to apply
    if ( manager.steps.length ) manager.steps.push({ type: "delete", item: clonedItem, automatic: true });
    return manager;
  }

  /* -------------------------------------------- */

  /**
   * Construct a manager for a change in a class's levels.
   * @param {Actor5e} actor         Actor whose level has changed.
   * @param {string} classId        ID of the class being changed.
   * @param {number} levelDelta     Levels by which to increase or decrease the class.
   * @param {object} options        Rendering options passed to the application.
   * @returns {AdvancementManager}  Prepared manager. Steps count can be used to determine if advancements are needed.
   */
  static forLevelChange(actor, classId, levelDelta, options={}) {
    const manager = new this(actor, options);
    const clonedItem = manager.clone.items.get(classId);
    if ( !clonedItem ) return manager;
    return manager.createLevelChangeSteps(clonedItem, levelDelta);
  }

  /* -------------------------------------------- */

  /**
   * Create steps based on the provided level change data.
   * @param {string} classItem      Class being changed.
   * @param {number} levelDelta     Levels by which to increase or decrease the class.
   * @returns {AdvancementManager}  Manager with new steps.
   */
  createLevelChangeSteps(classItem, levelDelta) {
    const raceItem = this.clone.system?.details?.race instanceof Item ? this.clone.system.details.race : null;
    const pushSteps = (flows, data) => this.steps.push(...flows.map(flow => ({ flow, ...data })));
    const getItemFlows = (characterLevel, classLevel) => this.clone.items.contents.flatMap(i => {
      if ( ["class", "subclass", "race"].includes(i.type) ) return [];
      if ( ["class", "subclass"].includes(i.system.advancementRootItem?.type) && i.system.advancementClassLinked ) {
        const rootClass = i.system.advancementRootItem.class ?? i.system.advancementRootItem;
        if ( rootClass !== classItem ) return [];
        return this.constructor.flowsForLevel(i, classLevel);
      }
      return this.constructor.flowsForLevel(i, characterLevel);
    });

    // Level increased
    for ( let offset = 1; offset <= levelDelta; offset++ ) {
      const classLevel = classItem.system.levels + offset;
      const characterLevel = (this.actor.system.details.level ?? 0) + offset;
      const stepData = {
        type: "forward", class: { item: classItem, level: classLevel }, level: characterLevel
      };
      pushSteps(this.constructor.flowsForLevel(raceItem, characterLevel), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem, classLevel), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem.subclass, classLevel), stepData);
      pushSteps(getItemFlows(characterLevel, classLevel), stepData);
    }

    // Level decreased
    for ( let offset = 0; offset > levelDelta; offset-- ) {
      const classLevel = classItem.system.levels + offset;
      const characterLevel = (this.actor.system.details.level ?? 0) + offset;
      const stepData = {
        type: "reverse", class: {item: classItem, level: classLevel}, automatic: true, level: characterLevel
      };
      pushSteps(getItemFlows(characterLevel, classLevel).reverse(), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem.subclass, classLevel).reverse(), stepData);
      pushSteps(this.constructor.flowsForLevel(classItem, classLevel).reverse(), stepData);
      pushSteps(this.constructor.flowsForLevel(raceItem, characterLevel).reverse(), stepData);
      if ( classLevel === 1 ) this.steps.push({ type: "delete", item: classItem, automatic: true });
    }

    // Ensure the class level ends up at the appropriate point
    this.steps.push({
      type: "forward", automatic: true,
      class: { item: classItem, level: classItem.system.levels += levelDelta },
      level: (this.actor.system.details.level ?? 0) + levelDelta
    });

    return this;
  }

  /* -------------------------------------------- */

  /**
   * Creates advancement flows for all advancements at a specific level.
   * @param {Item5e} item                               Item that has advancement.
   * @param {number} level                              Level in question.
   * @param {object} [options={}]
   * @param {AdvancementStep[]} [options.findExisting]  Find if an existing matching flow exists.
   * @returns {AdvancementFlow[]}                       Created or matched flow applications.
   */
  static flowsForLevel(item, level, { findExisting }={}) {
    const match = (advancement, step) => (step.flow?.item.id === item.id)
      && (step.flow?.advancement.id === advancement.id)
      && (step.flow?.level === level);
    return (item?.advancement.byLevel[level] ?? [])
      .filter(a => a.appliesToClass)
      .map(a => {
        const existing = findExisting?.find(s => match(a, s))?.flow;
        if ( !existing ) return new a.constructor.metadata.apps.flow(item, a.id, level);
        existing.item = item;
        return existing;
      });
  }

  /* -------------------------------------------- */

  /**
   * Determine the proper working level either from the provided item or from the cloned actor.
   * @param {Item5e} item    Item being advanced. If class or subclass, its level will be used.
   * @param {Actor5e} actor  Actor being advanced.
   * @returns {number}       Working level.
   */
  static currentLevel(item, actor) {
    return item.system.advancementLevel ?? actor.system.details.level ?? 0;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.window ??= {};
    options.window.subtitle ??= this.subtitle;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if ( !this.step ) return context;

    const visibleSteps = this.steps.filter(s => !s.automatic);
    const visibleIndex = visibleSteps.indexOf(this.step);

    return {
      ...context,
      actor: this.clone,
      // Keep styles from non-converted flow applications functioning
      // Should be removed when V1 of `AdvancementFlow` is deprecated
      flowClasses: this.step.flow instanceof Application ? "dnd5e advancement flow" : "",
      flowId: this.step.flow.id,
      steps: {
        current: visibleIndex + 1,
        total: visibleSteps.length,
        hasPrevious: visibleIndex > 0,
        hasNext: visibleIndex < visibleSteps.length - 1
      }
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  render(forced=false, options={}) {
    if ( this.steps.length && (this.#stepIndex === null) ) this.#stepIndex = 0;

    // Ensure the level on the class item matches the specified level
    if ( this.step?.class ) {
      let level = this.step.class.level;
      if ( this.step.type === "reverse" ) level -= 1;
      this.step.class.item.updateSource({"system.levels": level});
      this.clone.reset();
    }

    /**
     * A hook event that fires when an AdvancementManager is about to be processed.
     * @function dnd5e.preAdvancementManagerRender
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager The advancement manager about to be rendered
     */
    const allowed = Hooks.call("dnd5e.preAdvancementManagerRender", this);

    // Abort if not allowed
    if ( allowed === false ) return this;

    const automaticData = (this.options.automaticApplication && (options.direction !== "backward"))
      ? this.step?.flow?.getAutomaticApplicationValue() : false;

    if ( this.step?.automatic || (automaticData !== false) ) {
      if ( this.#advancing ) return this;
      this.#forward({ automaticData });
      return this;
    }

    return super.render(forced, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    super._onRender(context, options);
    if ( !this.rendered || !this.step ) return;
    this.#visualizer?.render({ force: true });

    // Render the step
    this.step.flow._element = null;
    this.step.flow.options.manager ??= this;
    await this.step.flow._render(true, options);
    this.setPosition();
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async close(options={}) {
    if ( !options.skipConfirmation ) {
      return new foundry.applications.api.Dialog({
        window: {
          title: `${game.i18n.localize("DND5E.ADVANCEMENT.Manager.ClosePrompt.Title")}: ${this.actor.name}`
        },
        position: { width: 400 },
        content: game.i18n.localize("DND5E.ADVANCEMENT.Manager.ClosePrompt.Message"),
        buttons: [
          {
            action: "stop",
            icon: "fas fa-times",
            label: game.i18n.localize("DND5E.ADVANCEMENT.Manager.ClosePrompt.Action.Stop"),
            default: true,
            callback: () => {
              this.#visualizer?.close();
              super.close(options);
            }
          },
          {
            action: "continue",
            icon: "fas fa-chevron-right",
            label: game.i18n.localize("DND5E.ADVANCEMENT.Manager.ClosePrompt.Action.Continue")
          }
        ]
      }).render({ force: true });
    }
    this.#visualizer?.close();
    await super.close(options);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle one of the buttons for moving through the process.
   * @this {AdvancementManager}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #process(event, target) {
    target.disabled = true;
    this.element.querySelector(".error")?.classList.remove("error");
    try {
      switch ( target.dataset.action ) {
        case "restart":
          if ( this.previousStep ) await this.#restart(event);
          break;
        case "previous":
          if ( this.previousStep ) await this.#backward(event);
          break;
        case "next":
        case "complete":
          await this.#forward(event);
          break;
      }
    } finally {
      target.disabled = false;
    }
  }

  /* -------------------------------------------- */
  /*  Process                                     */
  /* -------------------------------------------- */

  /**
   * Advance through the steps until one requiring user interaction is encountered.
   * @param {object} config
   * @param {object} [config.automaticData]  Data provided to handle automatic application.
   * @param {Event} [config.event]           Triggering click event if one occurred.
   * @returns {Promise}
   */
  async #forward({ automaticData, event }) {
    this.#advancing = true;
    try {
      do {
        const flow = this.step.flow;
        const type = this.step.type;
        const preEmbeddedItems = Array.from(this.clone.items);

        // Apply changes based on step type
        if ( (type === "delete") && this.step.item ) {
          if ( this.step.flow?.retainedData?.retainedItems ) {
            this.step.flow.retainedData.retainedItems[this.step.item.flags.dnd5e?.sourceId] = this.step.item.toObject();
          }
          this.clone.items.delete(this.step.item.id);
        } else if ( (type === "delete") && this.step.advancement ) {
          this.step.advancement.item.deleteAdvancement(this.step.advancement.id, { source: true });
        }
        else if ( type === "restore" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else if ( type === "reverse" ) await flow.retainData(await flow.advancement.reverse(flow.level));
        else if ( automaticData && flow ) await flow.advancement.apply(flow.level, automaticData);
        else if ( flow ) await flow._updateObject(event, flow._getSubmitData());

        this.#synthesizeSteps(preEmbeddedItems);
        this.#stepIndex++;

        // Ensure the level on the class item matches the specified level
        if ( this.step?.class ) {
          let level = this.step.class.level;
          if ( this.step.type === "reverse" ) level -= 1;
          this.step.class.item.updateSource({"system.levels": level});
        }
        this.clone.reset();
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof Advancement.ERROR) ) throw error;
      ui.notifications.error(error.message);
      this.step.automatic = false;
      if ( this.step.type === "restore" ) this.step.type = "forward";
    } finally {
      this.#advancing = false;
    }

    if ( this.step ) this.render({ force: true, direction: "forward" });
    else this.#complete();
  }

  /* -------------------------------------------- */

  /**
   * Add synthetic steps for any added or removed items with advancement.
   * @param {Item5e[]} preEmbeddedItems  Items present before the current step was applied.
   */
  #synthesizeSteps(preEmbeddedItems) {
    // Build a set of item IDs for non-synthetic steps
    const initialIds = this.steps.reduce((ids, step) => {
      if ( step.synthetic || !step.flow?.item ) return ids;
      ids.add(step.flow.item.id);
      return ids;
    }, new Set());

    const preIds = new Set(preEmbeddedItems.map(i => i.id));
    const postIds = new Set(this.clone.items.map(i => i.id));
    const addedIds = postIds.difference(preIds).difference(initialIds);
    const deletedIds = preIds.difference(postIds).difference(initialIds);

    for ( const addedId of addedIds ) {
      const item = this.clone.items.get(addedId);
      if ( !item.hasAdvancement ) continue;

      let handledLevel = 0;
      for ( let idx = this.#stepIndex; idx < this.steps.length; idx++ ) {
        // Find spots where the level increases
        const getLevel = step => (item.system.advancementClassLinked ? undefined : step?.level)
          ?? step?.flow?.level ?? step?.class?.level;
        const thisLevel = getLevel(this.steps[idx]);
        const nextLevel = getLevel(this.steps[idx + 1]);
        if ( (thisLevel < handledLevel) || (thisLevel === nextLevel) ) continue;

        // Determine if there is any advancement to be done for the added item to this level
        // from the previously handled level
        const steps = Array.fromRange(thisLevel - handledLevel + 1, handledLevel)
          .flatMap(l => this.constructor.flowsForLevel(item, l, { findExisting: this.steps }))
          .map(flow => ({ type: "forward", flow, synthetic: true }));

        // Add new steps at the end of the level group
        this.steps.splice(idx + 1, 0, ...steps);
        idx += steps.length;

        handledLevel = nextLevel ?? handledLevel;
      }
    }

    if ( (this.step.type === "delete") && this.step.synthetic ) return;
    for ( const deletedId of deletedIds ) {
      let item = preEmbeddedItems.find(i => i.id === deletedId);
      if ( !item?.hasAdvancement ) continue;

      // Temporarily add the item back
      this.clone.updateSource({items: [item.toObject()]});
      item = this.clone.items.get(item.id);

      // Check for advancement from the maximum level handled by this manager to zero
      let steps = [];
      Array.fromRange(this.clone.system.details.level + 1)
        .flatMap(l => this.constructor.flowsForLevel(item, l))
        .reverse()
        .forEach(flow => steps.push({ type: "reverse", flow, automatic: true, synthetic: true }));

      // Add a new remove item step to the end of the synthetic steps to finally get rid of this item
      steps.push({ type: "delete", flow: this.step.flow, item, automatic: true, synthetic: true });

      // Add new steps after the current step
      this.steps.splice(this.#stepIndex + 1, 0, ...steps);
    }
  }

  /* -------------------------------------------- */

  /**
   * Reverse through the steps until one requiring user interaction is encountered.
   * @param {Event} [event]                  Triggering click event if one occurred.
   * @param {object} [options]               Additional options to configure behavior.
   * @param {boolean} [options.render=true]  Whether to render the Application after the step has been reversed. Used
   *                                         by the restart workflow.
   * @returns {Promise}
   */
  async #backward(event, { render=true }={}) {
    this.#advancing = true;
    try {
      do {
        this.#stepIndex--;
        if ( !this.step ) break;
        const flow = this.step.flow;
        const type = this.step.type;
        const preEmbeddedItems = Array.from(this.clone.items);

        // Reverse step based on step type
        if ( (type === "delete") && this.step.item ) this.clone.updateSource({items: [this.step.item]});
        else if ( (type === "delete") && this.step.advancement ) this.advancement.item.createAdvancement(
          this.advancement.typeName, this.advancement._source, { source: true }
        );
        else if ( type === "reverse" ) await flow.advancement.restore(flow.level, flow.retainedData);
        else if ( flow ) await flow.retainData(await flow.advancement.reverse(flow.level));

        this.#clearSyntheticSteps(preEmbeddedItems);
        this.clone.reset();
      } while ( this.step?.automatic );
    } catch(error) {
      if ( !(error instanceof Advancement.ERROR) ) throw error;
      ui.notifications.error(error.message);
      this.step.automatic = false;
    } finally {
      this.#advancing = false;
    }

    if ( !render ) return;
    if ( this.step ) this.render(true, { direction: "backward" });
    else this.close({ skipConfirmation: true });
  }

  /* -------------------------------------------- */

  /**
   * Remove synthetic steps for any added or removed items.
   * @param {Item5e[]} preEmbeddedItems  Items present before the current step was applied.
   */
  #clearSyntheticSteps(preEmbeddedItems) {
    // Create a disjoint union of the before and after items
    const preIds = new Set(preEmbeddedItems.map(i => i.id));
    const postIds = new Set(this.clone.items.map(i => i.id));
    const modifiedIds = postIds.symmetricDifference(preIds);

    // Remove any synthetic steps after the current step if their item has been modified
    for ( const [idx, element] of Array.from(this.steps.entries()).reverse() ) {
      if ( idx <= this.#stepIndex ) break;
      if ( element.synthetic && modifiedIds.has(element.flow?.item?.id) ) this.steps.splice(idx, 1);
    }
  }

  /* -------------------------------------------- */

  /**
   * Reset back to the manager's initial state.
   * @param {MouseEvent} [event]  The triggering click event if one occurred.
   * @returns {Promise}
   */
  async #restart(event) {
    const restart = await foundry.applications.api.Dialog.confirm({
      window: { title: game.i18n.localize("DND5E.ADVANCEMENT.Manager.RestartPrompt.Title") },
      content: `<p>${game.i18n.localize("DND5E.ADVANCEMENT.Manager.RestartPrompt.Message")}</p>`
    });
    if ( !restart ) return;
    // While there is still a renderable step.
    while ( this.steps.slice(0, this.#stepIndex).some(s => !s.automatic) ) {
      await this.#backward(event, {render: false});
    }
    this.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Apply changes to actual actor after all choices have been made.
   * @param {Event} event  Button click that triggered the change.
   * @returns {Promise}
   */
  async #complete(event) {
    const updates = this.clone.toObject();
    const items = updates.items;
    delete updates.items;

    // Gather changes to embedded items
    const { toCreate, toUpdate, toDelete } = items.reduce((obj, item) => {
      if ( !this.actor.items.get(item._id) ) {
        obj.toCreate.push(item);
      } else {
        obj.toUpdate.push(item);
        obj.toDelete.findSplice(id => id === item._id);
      }
      return obj;
    }, { toCreate: [], toUpdate: [], toDelete: this.actor.items.map(i => i.id) });

    /**
     * A hook event that fires at the final stage of a character's advancement process, before actor and item updates
     * are applied.
     * @function dnd5e.preAdvancementManagerComplete
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager  The advancement manager.
     * @param {object} actorUpdates                    Updates to the actor.
     * @param {object[]} toCreate                      Items that will be created on the actor.
     * @param {object[]} toUpdate                      Items that will be updated on the actor.
     * @param {string[]} toDelete                      IDs of items that will be deleted on the actor.
     */
    if ( Hooks.call("dnd5e.preAdvancementManagerComplete", this, updates, toCreate, toUpdate, toDelete) === false ) {
      log("AdvancementManager completion was prevented by the 'preAdvancementManagerComplete' hook.");
      return this.close({ skipConfirmation: true });
    }

    // Apply changes from clone to original actor
    await Promise.all([
      this.actor.update(updates, { isAdvancement: true }),
      this.actor.createEmbeddedDocuments("Item", toCreate, { keepId: true, isAdvancement: true }),
      this.actor.updateEmbeddedDocuments("Item", toUpdate, { isAdvancement: true }),
      this.actor.deleteEmbeddedDocuments("Item", toDelete, { isAdvancement: true })
    ]);

    /**
     * A hook event that fires when an AdvancementManager is done modifying an actor.
     * @function dnd5e.advancementManagerComplete
     * @memberof hookEvents
     * @param {AdvancementManager} advancementManager The advancement manager that just completed
     */
    Hooks.callAll("dnd5e.advancementManagerComplete", this);

    // Close prompt
    return this.close({ skipConfirmation: true });
  }
}

/* -------------------------------------------- */

/**
 * Debug application for visualizing advancement steps.
 * Note: Intentionally not localized due to its nature as a debug application.
 */
class AdvancementVisualizer extends Application5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["advancement-visualizer"],
    window: {
      title: "Advancement Steps"
    },
    position: {
      top: 50,
      left: 50,
      width: 440
    },
    manager: null
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    steps: {
      template: "systems/dnd5e/templates/advancement/advancement-visualizer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The advancement manager that this is visualizing.
   * @type {AdvancementManager}
   */
  get manager() {
    return this.options.manager;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.steps = this.manager.steps.map(step => ({
      ...step,
      current: step === this.manager.step
    }));
    return context;
  }
}
