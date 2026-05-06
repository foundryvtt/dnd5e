/**
 * @import { AdventureImportAction } from "../_types.mjs";
 */

/**
 * Extend the base Adventure class to implement system-specific logic.
 * @extends {Adventure}
 */
export default class Adventure5e extends foundry.documents.Adventure {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * List of configuration data for each import action. Options can either be defined using the `dnd5e.importActions`
   * flag on the adventure to use pre-defined actions or fetched from the adventure registry if custom actions or
   * more complex configurations are required.
   * @type {AdventureImportAction[]}
   */
  get importActions() {
    const flag = this.getFlag("dnd5e", "importActions");
    if ( flag ) return this.getFlag("dnd5e", "importActions")
      .filter(id => id in CONFIG.DND5E.adventure.importActions)
      .map(id => ({ ...CONFIG.DND5E.adventure.importActions[id], id }));
    return dnd5e.registry.adventures.get(this.uuid).importActions;
  }

  /* -------------------------------------------- */

  /**
   * The quickstart configuration data for the module in which this adventure appears. If `adventures` is defined in
   * the quickstart configuration, will only return a result if this adventure is defined for this system.
   * @type {QuickstartManifestData|null}
   */
  get quickstartConfig() {
    if ( this.compendium?.metadata.packageType !== "module" ) return null;
    const manifest = game.modules.get(this.compendium.metadata.packageName);
    if ( !manifest.quickstart?.adventures?.[game.system.uuid]
      || (manifest.quickstart.adventures[game.system.id].uuid === this.uuid) ) return manifest.quickstart;
    return null;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( source.actors?.length ) {
      for ( const a of source.actors ) {
        // Migrate encounter groups to their own Actor type.
        if ( (a.type === "group") && (a.system?.type?.value === "encounter") ) a.type = "encounter";
      }
    }
    return super.migrateData(source);
  }

  /* -------------------------------------------- */
  /*  Import Actions                              */
  /* -------------------------------------------- */

  /**
   * Post-import action that activates a specific scene defined by the adventure. The scene can be defined using
   * an ID in the import action config as `initialScene` or using the `dnd5e.initialScene` flag on the adventure.
   * @type {AdventureImportPostHandler}
   */
  static async activateScene(config, importResult, importOptions) {
    const sceneId = config.initialScene ?? this.getFlag("dnd5e", "initialScene");
    const scene = game.scenes.get(sceneId);
    if ( !scene ) {
      console.warn(_loc("DND5E.ADVENTURE.Warning.SceneMissing", { adventure: this.name, id: sceneId }));
      return;
    }
    return scene.activate();
  }

  /* -------------------------------------------- */

  /**
   * Post-quickstart that activates the first scene found in a quickstarted adventure.
   * @type {AdventureImportQuickstartHandler}
   */
  static async activateSceneQuickstart(adventures) {
    for ( const { adventure, config } of adventures ) {
      const result = await Adventure5e.activateScene.call(adventure, config);
      if ( result instanceof Scene ) return;
    }
  }

  /* -------------------------------------------- */

  /**
   * Post-import action that modifies the join page of the world with adventure-specific description and background.
   * The join details can be defined in the import action config as `joinBackground` and `joinDescription` or using
   * the `dnd5e.joinBackground` and `dnd5e.joinDescription` flags on the adventure. If neither of these are defined
   * it will check to see if there is a `quickstart` flag defined for the module and use those values instead.
   * @type {AdventureImportPostHandler}
   */
  static async customizeWorld(config, importResult, importOptions) {
    const quickstart = this.quickstartConfig?.world ?? {};
    const background = config.joinBackground ?? this.getFlag("dnd5e", "joinBackground") ?? quickstart.background;
    const description = config.joinDescription ?? this.getFlag("dnd5e", "joinDescription") ?? quickstart.description;
    if ( !background && !description ) return;
    const worldData = { background, description, action: "editWorld", id: game.world.id };
    await foundry.utils.fetchJsonWithTimeout(foundry.utils.getRoute("setup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(worldData)
    });
    game.world.updateSource(worldData);
  }

  /* -------------------------------------------- */

  /**
   * Post-import action that displays a specific journal defined by the adventure. The journal can be defined using
   * either an ID or UUID specified in the import action config as `initialJournal` or using the `dnd5e.initialJournal`
   * flag on the adventure.
   * @type {AdventureImportPostHandler}
   */
  static async displayJournal(config, importResult, importOptions) {
    const journalId = config.initialJournal ?? this.getFlag("dnd5e", "initialJournal");
    const journal = journalId?.length === 16 ? game.journal.get(journalId) : await fromUuid(journalId);
    if ( !journal || !((journal instanceof JournalEntry) || (journal instanceof JournalEntryPage)) ) {
      console.warn(_loc("DND5E.ADVENTURE.Warning.JournalMissing", { adventure: this.name, id: journalId }));
      return;
    }
    return journal instanceof JournalEntryPage
      ? journal.parent.sheet.render({ force: true, pageId: journal.id })
      : journal.sheet.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Post-quickstart that displays all journals found in quickstarted adventures.
   * @type {AdventureImportQuickstartHandler}
   */
  static async displayJournalQuickstart(adventures) {
    for ( const { adventure, config } of adventures ) {
      await Adventure5e.displayJournal.call(adventure, config);
    }
  }
}
