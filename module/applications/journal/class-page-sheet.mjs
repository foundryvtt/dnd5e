import { formatNumber, linkForUuid } from "../../utils.mjs";
import Actor5e from "../../documents/actor/actor.mjs";
import Proficiency from "../../documents/actor/proficiency.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import JournalEditor from "./journal-editor.mjs";

/**
 * Journal entry page that displays an automatically generated summary of a class along with additional description.
 */
export default class JournalClassPageSheet extends (foundry.appv1?.sheets?.JournalPageSheet ?? JournalPageSheet) {

  /** @inheritDoc */
  static get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{dropSelector: ".drop-target"}],
      height: "auto",
      width: 500,
      submitOnChange: true
    });
    options.classes.push("class-journal");
    return options;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get template() {
    return `systems/dnd5e/templates/journal/page-${this.document.type}-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  toc = {};

  /* -------------------------------------------- */

  /**
   * Whether this page represents a class or subclass.
   * @type {string}
   */
  get type() {
    return this.document.type;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = super.getData(options);
    context.system = context.document.system;
    context.systemFields = this.document.system.schema.fields;

    context.styleOptions = [
      { value: "", label: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.Style.Inferred") },
      { rule: true },
      { value: "2024", label: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.Style.Modern") },
      { value: "2014", label: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.Style.Legacy") }
    ];

    context.title = Object.fromEntries(
      Array.fromRange(4, 1).map(n => [`level${n}`, context.data.title.level + n - 1])
    );
    context.type = this.type;

    const linked = await fromUuid(this.document.system.item);
    context.subclasses = this.type === "class" ? await this._getSubclasses(this.document.system.subclassItems) : null;

    if ( !linked ) return context;
    context.linked = {
      document: linked,
      name: linked.name,
      lowercaseName: linked.name.toLowerCase()
    };
    const modernStyle = context.modernStyle = (context.system.style || linked.system.source.rules) === "2024";

    context.advancement = this._getAdvancement(linked, { modernStyle });
    context.enriched = await this._getDescriptions(context.document);
    context.table = await this._getTable(linked, { modernStyle });
    context.optionalTable = await this._getOptionalTable(linked, { modernStyle });
    context.features = await this._getFeatures(linked, { modernStyle });
    context.optionalFeatures = await this._getFeatures(linked, { modernStyle, optional: true });

    if ( context.subclasses?.length ) {
      for ( const subclass of context.subclasses ) {
        const initialLevel = parseInt(Object.entries(subclass.document.advancement.byLevel)
          .find(([lvl, d]) => d.length)?.[0] ?? 1);
        subclass.table = await this._getTable(subclass.document, { initialLevel, modernStyle });
        subclass.features = await this._getFeatures(subclass.document, { modernStyle });
      }
      context.subclasses.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name, game.i18n.lang));
    }

    if ( linked.system.primaryAbility ) {
      context.primaryAbility = game.i18n.getListFormatter(
        { type: linked.system.primaryAbility.all ? "conjunction" : "disjunction" }
      ).format(Array.from(linked.system.primaryAbility.value).map(v => CONFIG.DND5E.abilities[v]?.label));
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare features granted by various advancement types.
   * @param {Item5e} item                  Class item belonging to this journal.
   * @param {object} options
   * @param {boolean} options.modernStyle  Is the modern style being displayed?
   * @returns {object}                     Prepared advancement section.
   * @protected
   */
  _getAdvancement(item, { modernStyle }) {
    const advancement = {};

    const hp = item.advancement.byType.HitPoints?.[0];
    if ( hp ) {
      advancement.hp = {
        hitDice: modernStyle ? hp.hitDie.toUpperCase() : `1${hp.hitDie}`,
        max: hp.hitDieValue,
        average: Math.floor(hp.hitDieValue / 2) + 1
      };
    }

    const traits = item.advancement.byType.Trait ?? [];
    const makeTrait = type => {
      const advancement = traits.find(a => {
        const rep = a.representedTraits();
        if ( (rep.size > 1) || (rep.first() !== type) ) return false;
        return (a.classRestriction !== "secondary") && (a.level === 1) && (a.configuration.mode === "default");
      });
      if ( !advancement ) return game.i18n.localize("None");
      return advancement.hint || Trait.localizedList(advancement.configuration);
    };
    if ( traits.length ) {
      advancement.traits = {
        armor: makeTrait("armor"),
        weapons: makeTrait("weapon"),
        tools: makeTrait("tool"),
        saves: makeTrait("saves"),
        skills: makeTrait("skills")
      };
    }

    advancement.equipment = item.system.startingEquipmentDescription;

    return advancement;
  }

  /* -------------------------------------------- */

  /**
   * Enrich all of the entries within the descriptions object on the sheet's system data.
   * @param {JournalEntryPage} page  Journal page being enriched.
   * @returns {Promise<object>}      Object with enriched descriptions.
   * @protected
   */
  async _getDescriptions(page) {
    const descriptions = await Promise.all(Object.entries(page.system.description ?? {})
      .map(async ([id, text]) => {
        const enriched = await TextEditor.enrichHTML(text, {
          relativeTo: this.object,
          secrets: this.object.isOwner
        });
        return [id, enriched];
      })
    );
    return Object.fromEntries(descriptions);
  }

  /* -------------------------------------------- */

  /**
   * Prepare table based on non-optional GrantItem advancement & ScaleValue advancement.
   * @param {Item5e} item                      Class item belonging to this journal.
   * @param {object} options
   * @param {number} [options.initialLevel=1]  Level at which the table begins.
   * @param {boolean} options.modernStyle      Is the modern style being displayed?
   * @returns {object}                         Prepared table.
   * @protected
   */
  async _getTable(item, { initialLevel=1, modernStyle }={}) {
    const hasFeatures = !!item.advancement.byType.ItemGrant;
    const scaleValues = (item.advancement.byType.ScaleValue ?? []);
    const spellProgression = await this._getSpellProgression(item);

    const headers = [[{content: game.i18n.localize("DND5E.Level")}]];
    if ( item.type === "class" ) headers[0].push({content: game.i18n.localize("DND5E.ProficiencyBonus")});
    if ( hasFeatures ) headers[0].push({content: game.i18n.localize("DND5E.Features")});
    headers[0].push(...scaleValues.map(a => ({content: a.title})));
    if ( spellProgression ) {
      if ( spellProgression.headers.length > 1 ) {
        headers[0].forEach(h => h.rowSpan = 2);
        headers[0].push(...spellProgression.headers[0]);
        headers[1] = spellProgression.headers[1];
      } else {
        headers[0].push(...spellProgression.headers[0]);
      }
    }

    const cols = [{ class: "level", span: 1 }];
    if ( item.type === "class" ) cols.push({class: "prof", span: 1});
    if ( hasFeatures ) cols.push({class: "features", span: 1});
    if ( scaleValues.length ) cols.push({class: "scale", span: scaleValues.length});
    if ( spellProgression ) cols.push(...spellProgression.cols);

    const prepareFeature = uuid => {
      const index = fromUuidSync(uuid);
      if ( index?.type !== "feat" ) return null;
      return linkForUuid(uuid);
    };

    const rows = [];
    for ( const level of Array.fromRange((CONFIG.DND5E.maxLevel - (initialLevel - 1)), initialLevel) ) {
      let features = [];
      for ( const advancement of item.advancement.byLevel[level] ) {
        switch ( advancement.constructor.typeName ) {
          case "AbilityScoreImprovement":
            features.push(game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.Title"));
            continue;
          case "ItemGrant":
            if ( advancement.configuration.optional ) continue;
            features.push(...await Promise.all(advancement.configuration.items.map(i => prepareFeature(i.uuid))));
            break;
        }
      }
      features = features.filter(_ => _);

      // Level & proficiency bonus
      const cells = [{class: "level", content: modernStyle ? level : level.ordinalString()}];
      if ( item.type === "class" ) cells.push({class: "prof", content: `+${Proficiency.calculateMod(level)}`});
      if ( hasFeatures ) cells.push({class: "features", content: features.join(", ")});
      scaleValues.forEach(s => cells.push({class: "scale", content: s.valueForLevel(level)?.display}));
      const spellCells = spellProgression?.rows[rows.length];
      if ( spellCells ) cells.push(...spellCells);

      // Skip empty rows on subclasses
      if ( item.type === "subclass" ) {
        let displayRow = features.length || spellCells;
        if ( rows.length ) displayRow ||= rows.at(-1).some((cell, index) =>
          (cell.class === "scale") && (cell.content !== cells[index].content)
        );
        else if ( scaleValues.length ) displayRow ||= cells.filter(c => (c.class === "scale") && c.content).length;
        if ( !displayRow ) continue;
      }

      rows.push(cells);
    }

    return { headers, cols, rows };
  }

  /* -------------------------------------------- */

  /**
   * Build out the spell progression data.
   * @param {Item5e} item  Class item belonging to this journal.
   * @returns {object}     Prepared spell progression table.
   * @protected
   */
  async _getSpellProgression(item) {
    const spellcasting = foundry.utils.deepClone(item.spellcasting);
    if ( !spellcasting || (spellcasting.progression === "none") ) return null;

    const table = { rows: [] };

    if ( spellcasting.type === "leveled" ) {
      const spells = {};
      const maxSpellLevel = CONFIG.DND5E.SPELL_SLOT_TABLE[CONFIG.DND5E.SPELL_SLOT_TABLE.length - 1].length;
      Array.fromRange(maxSpellLevel, 1).forEach(l => spells[`spell${l}`] = {});

      let largestSlot;
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1).reverse() ) {
        const progression = { slot: 0 };
        spellcasting.levels = level;
        Actor5e.computeClassProgression(progression, item, { spellcasting });
        Actor5e.prepareSpellcastingSlots(spells, "leveled", progression);

        if ( !largestSlot ) largestSlot = Object.values(spells).reduce((slot, { max, level }) => {
          if ( !max ) return slot;
          return Math.max(slot, level || -1);
        }, -1);

        table.rows.push(Array.fromRange(largestSlot, 1).map(spellLevel => {
          return {class: "spell-slots", content: spells[`spell${spellLevel}`]?.max || "&mdash;"};
        }));
      }

      // Prepare headers & columns
      table.headers = [
        [{content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlotsPerSpellLevel"), colSpan: largestSlot}],
        Array.fromRange(largestSlot, 1).map(spellLevel => ({content: spellLevel.ordinalString()}))
      ];
      table.cols = [{class: "spellcasting", span: largestSlot}];
      table.rows.reverse();
    }

    else if ( spellcasting.type === "pact" ) {
      const spells = { pact: {} };

      table.headers = [[
        { content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlots") },
        { content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlotLevel") }
      ]];
      table.cols = [{class: "spellcasting", span: 2}];

      // Loop through each level, gathering "Spell Slots" & "Slot Level" for each one
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        const progression = { pact: 0 };
        spellcasting.levels = level;
        Actor5e.computeClassProgression(progression, item, { spellcasting });
        Actor5e.prepareSpellcastingSlots(spells, "pact", progression);
        table.rows.push([
          { class: "spell-slots", content: `${spells.pact.max}` },
          { class: "slot-level", content: spells.pact.level.ordinalString() }
        ]);
      }
    }

    else {
      /**
       * A hook event that fires to generate the table for custom spellcasting types.
       * The actual hook names include the spellcasting type (e.g. `dnd5e.buildPsionicSpellcastingTable`).
       * @param {object} table                          Table definition being built. *Will be mutated.*
       * @param {Item5e} item                           Class for which the spellcasting table is being built.
       * @param {SpellcastingDescription} spellcasting  Spellcasting descriptive object.
       * @function dnd5e.buildSpellcastingTable
       * @memberof hookEvents
       */
      Hooks.callAll(
        `dnd5e.build${spellcasting.type.capitalize()}SpellcastingTable`, table, item, spellcasting
      );
    }

    return table;
  }

  /* -------------------------------------------- */

  /**
   * Prepare options table based on optional GrantItem advancement.
   * @param {Item5e} item                  Class item belonging to this journal.
   * @param {object} options
   * @param {boolean} options.modernStyle  Is the modern style being displayed?
   * @returns {object|null}                Prepared optional features table.
   * @protected
   */
  async _getOptionalTable(item, { modernStyle }) {
    const headers = [[
      { content: game.i18n.localize("DND5E.Level") },
      { content: game.i18n.localize("DND5E.Features") }
    ]];

    const cols = [
      { class: "level", span: 1 },
      { class: "features", span: 1 }
    ];

    const prepareFeature = uuid => {
      const index = fromUuidSync(uuid);
      if ( index?.type !== "feat" ) return null;
      return linkForUuid(uuid);
    };

    const rows = [];
    for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
      let features = [];
      for ( const advancement of item.advancement.byLevel[level] ) {
        switch ( advancement.constructor.typeName ) {
          case "ItemGrant":
            if ( !advancement.configuration.optional ) continue;
            features.push(...await Promise.all(advancement.configuration.items.map(i => prepareFeature(i.uuid))));
            break;
        }
      }
      features = features.filter(_ => _);
      if ( !features.length ) continue;

      // Level & proficiency bonus
      const cells = [
        { class: "level", content: modernStyle ? level : level.ordinalString() },
        { class: "features", content: features.join(", ") }
      ];
      rows.push(cells);
    }
    if ( !rows.length ) return null;

    return { headers, cols, rows };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data for each class feature listed.
   * @param {Item5e} item                       Class or subclass item belonging to this journal.
   * @param {object} options
   * @param {boolean} options.modernStyle       Is the modern style being displayed?
   * @param {boolean} [options.optional=false]  Should optional features be fetched rather than required features?
   * @returns {object[]}   Prepared features.
   * @protected
   */
  async _getFeatures(item, { modernStyle, optional=false }) {
    const prepareFeature = async (f, level) => {
      const document = await fromUuid(f.uuid);
      if ( document?.type !== "feat" ) return null;
      return {
        document, level,
        name: modernStyle ? game.i18n.format("JOURNALENTRYPAGE.DND5E.Class.Features.Name", {
          name: document.name, level: formatNumber(level)
        }) : document.name,
        description: await TextEditor.enrichHTML(document.system.description.value, {
          relativeTo: item, secrets: false
        })
      };
    };

    let features = [];
    const itemGrants = Array.from(item.advancement.byType.ItemGrant ?? []);
    for ( const advancement of itemGrants ) {
      if ( !!advancement.configuration.optional !== optional ) continue;
      features.push(...advancement.configuration.items.map(f => prepareFeature(f, advancement.level)));
    }

    const asiLevels = (item.advancement.byType.AbilityScoreImprovement ?? []).map(a => a.level).sort((a, b) => a - b);
    if ( asiLevels.length ) {
      const [firstLevel, ...otherLevels] = asiLevels;
      const name = game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.Journal.Name");
      features.push({
        description: game.i18n.format(
          `DND5E.ADVANCEMENT.AbilityScoreImprovement.Journal.Description${modernStyle ? "Modern" : "Legacy"}`,
          {
            class: item.name,
            firstLevel: formatNumber(firstLevel),
            firstLevelOrdinal: formatNumber(firstLevel, { ordinal: true }),
            maxAbilityScore: formatNumber(CONFIG.DND5E.maxAbilityScore),
            otherLevels: game.i18n.getListFormatter({ style: "long" }).format(otherLevels.map(l => formatNumber(l))),
            otherLevelsOrdinal: game.i18n.getListFormatter({ style: "long" })
              .format(otherLevels.map(l => formatNumber(l, { ordinal: true })))
          }
        ),
        level: asiLevels[0],
        name: modernStyle ? game.i18n.format("JOURNALENTRYPAGE.DND5E.Class.Features.Name", {
          name: name, level: formatNumber(firstLevel)
        }) : name
      });
    }

    features = await Promise.all(features);
    return features.filter(f => f).sort((lhs, rhs) => lhs.level - rhs.level);
  }

  /* -------------------------------------------- */

  /**
   * Fetch each subclass and their features.
   * @param {string[]} uuids   UUIDs for the subclasses to fetch.
   * @returns {object[]|null}  Prepared subclasses.
   * @protected
   */
  async _getSubclasses(uuids) {
    const prepareSubclass = async uuid => {
      const document = await fromUuid(uuid);
      return this._getSubclass(document);
    };

    const subclasses = await Promise.all(uuids.map(prepareSubclass));
    return subclasses.length ? subclasses : null;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for the provided subclass.
   * @param {Item5e} item  Subclass item being prepared.
   * @returns {object}     Presentation data for this subclass.
   * @protected
   */
  async _getSubclass(item) {
    return {
      document: item,
      name: item.name,
      description: await TextEditor.enrichHTML(item.system.description.value, {
        relativeTo: item, secrets: false
      })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.toc = JournalEntryPage.buildTOC(html.get());
    return html;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll(".item-delete").forEach(e => {
      e.addEventListener("click", this._onDeleteItem.bind(this));
    });
    html[0].querySelectorAll(".launch-text-editor").forEach(e => {
      e.addEventListener("click", this._onLaunchTextEditor.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped item.
   * @param {Event} event  The triggering click event.
   * @returns {JournalClassSummary5ePageSheet}
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    const container = event.currentTarget.closest("[data-item-uuid]");
    const uuidToDelete = container?.dataset.itemUuid;
    if ( !uuidToDelete ) return;
    switch ( container.dataset.itemType ) {
      case "linked":
        await this.document.update({"system.item": ""});
        return this.render();
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.delete(uuidToDelete);
        await this.document.update({"system.subclassItems": Array.from(itemSet)});
        return this.render();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle launching the individual text editing window.
   * @param {Event} event  The triggering click event.
   */
  _onLaunchTextEditor(event) {
    event.preventDefault();
    const textKeyPath = event.currentTarget.dataset.target;
    const label = event.target.closest(".form-group").querySelector("label");
    const editor = new JournalEditor({ document: this.document, textKeyPath, window: { title: label?.innerText } });
    editor.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if ( data?.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);
    const type = this.type === item.type ? "linked" : item.type;
    switch ( type ) {
      case "linked":
        await this.document.update({"system.item": item.uuid});
        return this.render();
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.add(item.uuid);
        await this.document.update({"system.subclassItems": Array.from(itemSet)});
        return this.render();
      default:
        return false;
    }
  }
}
