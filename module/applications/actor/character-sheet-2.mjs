import CharacterData from "../../data/actor/character.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { setTheme } from "../../settings.mjs";
import { formatNumber, simplifyBonus, staticID } from "../../utils.mjs";
import ContextMenu5e from "../context-menu.mjs";
import SheetConfig5e from "../sheet-config.mjs";
import Tabs5e from "../tabs.mjs";
import ActorSheet5eCharacter from "./character-sheet.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter2 extends ActorSheet5eCharacter {
  constructor(object, options={}) {
    const key = `character${object.limited ? ":limited" : ""}`;
    const { width, height } = game.user.getFlag("dnd5e", `sheetPrefs.${key}`) ?? {};
    if ( width && !("width" in options) ) options.width = width;
    if ( height && !("height" in options) ) options.height = height;
    super(object, options);
  }

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "character"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "details" }],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".containers .container", dropSelector: null },
        { dragSelector: ".favorites :is([data-item-id], [data-effect-id])", dropSelector: null },
        { dragSelector: ":is(.race, .background)[data-item-id]", dropSelector: null },
        { dragSelector: ".classes .gold-icon[data-item-id]", dropSelector: null },
        { dragSelector: "[data-key] .skill-name, [data-key] .tool-name", dropSelector: null },
        { dragSelector: ".spells-list .spell-header, .slots[data-favorite-id]", dropSelector: null }
      ],
      scrollY: [".main-content"],
      width: 800,
      height: 1000,
      resizable: true
    });
  }

  /**
   * Available sheet modes.
   * @enum {number}
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2
  };

  /**
   * Proficiency class names.
   * @enum {string}
   */
  static PROFICIENCY_CLASSES = {
    0: "none",
    0.5: "half",
    1: "full",
    2: "double"
  };

  /**
   * @typedef {object} SheetTabDescriptor5e
   * @property {string} tab     The tab key.
   * @property {string} label   The tab label's localization key.
   * @property {string} [icon]  A font-awesome icon.
   * @property {string} [svg]   An SVG icon.
   */

  /**
   * Sheet tabs.
   * @type {SheetTabDescriptor5e[]}
   */
  static TABS = [
    { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" }
  ];

  /**
   * The mode the sheet is currently in.
   * @type {ActorSheet5eCharacter2.MODES}
   * @protected
   */
  _mode = this.constructor.MODES.PLAY;

  /**
   * Whether the user has manually opened the death save tray.
   * @type {boolean}
   * @protected
   */
  _deathTrayOpen = false;

  /**
   * The cached concentration information for the character.
   * @type {{items: Set<Item5e>, effects: Set<ActiveEffect5e>}}
   * @internal
   */
  _concentration;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "systems/dnd5e/templates/actors/character-sheet-2.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");

    // Add edit <-> play slide toggle.
    if ( this.isEditable ) {
      const toggle = document.createElement("slide-toggle");
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
      toggle.classList.add("mode-slider");
      toggle.dataset.tooltip = "DND5E.SheetModeEdit";
      toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
      toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
      toggle.addEventListener("dblclick", event => event.stopPropagation());
      header.insertAdjacentElement("afterbegin", toggle);
    }

    // Adjust header buttons.
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });

    const idLink = header.querySelector(".document-id-link");
    if ( idLink ) {
      const firstButton = header.querySelector(".header-button");
      firstButton?.insertAdjacentElement("beforebegin", idLink);
    }

    if ( !game.user.isGM && this.actor.limited ) {
      html[0].classList.add("limited");
      return html;
    }

    // Render tabs.
    const nav = document.createElement("nav");
    nav.classList.add("tabs");
    nav.dataset.group = "primary";
    nav.append(...this.constructor.TABS.map(({ tab, label, icon, svg }) => {
      const item = document.createElement("a");
      item.classList.add("item", "control");
      item.dataset.group = "primary";
      item.dataset.tab = tab;
      item.dataset.tooltip = label;
      item.setAttribute("aria-label", label);
      if ( icon ) item.innerHTML = `<i class="${icon}"></i>`;
      else if ( svg ) item.innerHTML = `<dnd5e-icon src="systems/dnd5e/icons/svg/${svg}.svg"></dnd5e-icon>`;
      return item;
    }));
    html[0].insertAdjacentElement("afterbegin", nav);
    this._tabs = this.options.tabs.map(t => {
      t.callback = this._onChangeTab.bind(this);
      if ( this._tabs?.[0]?.active !== t.initial ) t.initial = this._tabs?.[0]?.active ?? t.initial;
      return new Tabs5e(t);
    });

    // Set theme
    // TODO: Re-enable this when we support V12 only
    // setTheme(html[0], this.actor.getFlag("dnd5e", "theme"));

    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force=false, options={}) {
    await super._render(force, options);
    if ( !this.rendered ) return;
    const context = options.renderContext ?? options.action;
    const data = options.renderData ?? options.data;
    const isUpdate = (context === "update") || (context === "updateActor");
    const hp = foundry.utils.getProperty(data ?? {}, "system.attributes.hp.value");
    if ( isUpdate && (hp === 0) ) this._toggleDeathTray(true);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    this._concentration = this.actor.concentration; // Cache concentration so it's not called for every item.
    const context = await super.getData(options);
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
    context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
    const activeTab = (game.user.isGM || !this.actor.limited) ? this._tabs?.[0]?.active ?? "details" : "biography";
    context.cssClass += ` tab-${activeTab}`;
    const sidebarCollapsed = game.user.getFlag("dnd5e", `sheetPrefs.character.tabs.${activeTab}.collapseSidebar`);
    if ( sidebarCollapsed ) {
      context.cssClass += " collapsed";
      context.sidebarCollapsed = true;
    }
    const { attributes, details, traits } = this.actor.system;

    // Class
    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    // Portrait
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    context.portrait = {
      token: showTokenPortrait,
      src: showTokenPortrait ? token.texture.src : this.actor.img,
      // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
      path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
    };

    // Exhaustion
    const max = CONFIG.DND5E.conditionTypes.exhaustion.levels;
    context.exhaustion = Array.fromRange(max, 1).reduce((acc, n) => {
      const label = game.i18n.format("DND5E.ExhaustionLevel", { n });
      const classes = ["pip"];
      const filled = attributes.exhaustion >= n;
      if ( filled ) classes.push("filled");
      if ( n === max ) classes.push("death");
      const pip = { n, label, filled, tooltip: label, classes: classes.join(" ") };

      if ( n <= max / 2 ) acc.left.push(pip);
      else acc.right.push(pip);
      return acc;
    }, { left: [], right: [] });

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value > obj.value ) Object.assign(obj, { value, label });
      return obj;
    }, { value: 0, label: CONFIG.DND5E.movementTypes.walk });

    // Hit Dice
    context.hd = attributes.hd;

    // Death Saves
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    context.death = { open: this._deathTrayOpen };
    ["success", "failure"].forEach(deathSave => {
      context.death[deathSave] = [];
      for ( let i = 1; i < 4; i++ ) {
        const n = deathSave === "failure" ? i : 4 - i;
        const i18nKey = `DND5E.DeathSave${deathSave.titleCase()}Label`;
        const filled = attributes.death[deathSave] >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        if ( deathSave === "failure" ) classes.push("failure");
        context.death[deathSave].push({
          n, filled,
          tooltip: i18nKey,
          label: game.i18n.localize(`${i18nKey}N.${plurals.select(n)}`),
          classes: classes.join(" ")
        });
      }
    });

    // Ability Scores
    context.abilityRows = Object.entries(context.abilities).reduce((obj, [k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.sign = Math.sign(ability.mod) < 0 ? "-" : "+";
      ability.mod = Math.abs(ability.mod);
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      if ( obj.bottom.length > 5 ) obj.top.push(ability);
      else obj.bottom.push(ability);
      return obj;
    }, { top: [], bottom: [] });
    context.abilityRows.optional = Object.keys(CONFIG.DND5E.abilities).length - 6;

    // Saving Throws
    context.saves = {};
    for ( let ability of Object.values(context.abilities) ) {
      ability = context.saves[ability.key] = { ...ability };
      ability.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? ability.baseProf : ability.proficient];
      ability.hover = CONFIG.DND5E.proficiencyLevels[ability.proficient];
      ability.sign = Math.sign(ability.save) < 0 ? "-" : "+";
      ability.mod = Math.abs(ability.save);
    }

    if ( this.actor.statuses.has(CONFIG.specialStatusEffects.CONCENTRATING) || context.editable ) {
      context.saves.concentration = {
        isConcentration: true,
        class: "colspan concentration",
        label: game.i18n.localize("DND5E.Concentration"),
        abbr: game.i18n.localize("DND5E.Concentration"),
        mod: Math.abs(attributes.concentration.save),
        sign: attributes.concentration.save < 0 ? "-" : "+"
      };
    }

    // Size
    context.size = {
      label: CONFIG.DND5E.actorSizes[traits.size]?.label ?? traits.size,
      abbr: CONFIG.DND5E.actorSizes[traits.size]?.abbreviation ?? "—",
      mod: attributes.encumbrance.mod
    };

    // Skills & Tools
    for ( const [key, entry] of Object.entries(context.skills).concat(Object.entries(context.tools)) ) {
      entry.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? entry.baseValue : entry.value];
      entry.sign = Math.sign(entry.total) < 0 ? "-" : "+";
      entry.mod = Math.abs(entry.total);
      if ( key in CONFIG.DND5E.skills ) entry.reference = CONFIG.DND5E.skills[key].reference;
      else if ( key in CONFIG.DND5E.toolIds ) entry.reference = Trait.getBaseItemUUID(CONFIG.DND5E.toolIds[key]);
    }

    // Character Background
    context.creatureType = {
      class: details.type.value === "custom" ? "none" : "",
      icon: CONFIG.DND5E.creatureTypes[details.type.value]?.icon ?? "/icons/svg/mystery-man.svg",
      title: details.type.value === "custom"
        ? details.type.custom
        : CONFIG.DND5E.creatureTypes[details.type.value]?.label,
      reference: CONFIG.DND5E.creatureTypes[details.type.value]?.reference,
      subtitle: details.type.subtype
    };

    if ( details.race instanceof dnd5e.documents.Item5e ) context.race = details.race;
    if ( details.background instanceof dnd5e.documents.Item5e ) context.background = details.background;

    // Senses
    context.senses = Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
      const value = attributes.senses[k];
      if ( value ) obj[k] = { label, value };
      return obj;
    }, {});

    if ( attributes.senses.special ) attributes.senses.special.split(";").forEach((v, i) => {
      context.senses[`custom${i + 1}`] = { label: v.trim() };
    });
    if ( foundry.utils.isEmpty(context.senses) ) delete context.senses;

    // Inventory
    this._prepareItems(context);

    // Spellcasting
    context.spellcasting = [];
    const msak = simplifyBonus(this.actor.system.bonuses.msak.attack, context.rollData);
    const rsak = simplifyBonus(this.actor.system.bonuses.rsak.attack, context.rollData);

    for ( const item of Object.values(this.actor.classes).sort((a, b) => b.system.levels - a.system.levels) ) {
      const sc = item.spellcasting;
      if ( !sc?.progression || (sc.progression === "none") ) continue;
      const ability = this.actor.system.abilities[sc.ability];
      const mod = ability?.mod ?? 0;
      const attackBonus = msak === rsak ? msak : 0;
      const attack = mod + this.actor.system.attributes.prof + attackBonus;
      const name = item.system.spellcasting.progression === sc.progression ? item.name : item.subclass?.name;
      context.spellcasting.push({
        label: game.i18n.format("DND5E.SpellcastingClass", { class: name }),
        ability: { sign: Math.sign(mod) < 0 ? "-" : "+", value: Math.abs(mod), ability: sc.ability },
        attack: { sign: Math.sign(attack) < 0 ? "-" : "+", value: Math.abs(attack) },
        primary: this.actor.system.attributes.spellcasting === sc.ability,
        save: ability?.dc ?? 0,
        spellPreparationLimit: sc.spellPreparationLimit
      });
    }

    // Containers
    for ( const container of context.containers ) {
      const ctx = context.itemContext[container.id];
      ctx.capacity = await container.system.computeCapacity();
    }

    // Effects & Conditions
    const conditionIds = new Set();
    context.conditions = Object.entries(CONFIG.DND5E.conditionTypes).reduce((arr, [k, c]) => {
      if ( c.pseudo ) return arr; // Filter out pseudo-conditions.
      const { label: name, icon, reference } = c;
      const id = staticID(`dnd5e${k}`);
      conditionIds.add(id);
      const existing = this.actor.effects.get(id);
      const { disabled, img } = existing ?? {};
      arr.push({
        name, reference,
        id: k,
        icon: img ?? icon,
        disabled: existing ? disabled : true
      });
      return arr;
    }, []);

    for ( const category of Object.values(context.effects) ) {
      category.effects = await category.effects.reduce(async (arr, effect) => {
        effect.updateDuration();
        if ( conditionIds.has(effect.id) && !effect.duration.remaining ) return arr;
        const { id, name, img, disabled, duration } = effect;
        const toggleable = !this._concentration?.effects.has(effect);
        let source = await effect.getSource();
        // If the source is an ActiveEffect from another Actor, note the source as that Actor instead.
        if ( (source instanceof dnd5e.documents.ActiveEffect5e) && (source.target !== this.object) ) {
          source = source.target;
        }
        arr = await arr;
        arr.push({
          id, name, img, disabled, duration, source, toggleable,
          parentId: effect.target === effect.parent ? null : effect.parent.id,
          durationParts: duration.remaining ? duration.label.split(", ") : [],
          hasTooltip: source instanceof dnd5e.documents.Item5e
        });
        return arr;
      }, []);
    }

    context.effects.suppressed.info = context.effects.suppressed.info[0];

    // Characteristics
    context.characteristics = [
      "alignment", "eyes", "height", "faith", "hair", "weight", "gender", "skin", "age"
    ].map(k => {
      const fields = CharacterData.schema.fields.details.fields;
      const field = fields[k];
      const name = `system.details.${k}`;
      return { name, label: field.label, value: foundry.utils.getProperty(this.actor, name) ?? "" };
    });

    // Favorites
    context.favorites = await this._prepareFavorites();
    context.favorites.sort((a, b) => a.sort - b.sort);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getLabels() {
    const labels = super._getLabels();
    labels.damageAndHealing = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
    return labels;
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareTraits() {
    const traits = {};
    for ( const [trait, config] of Object.entries(CONFIG.DND5E.traits) ) {
      const key = config.actorKeyPath ?? `system.traits.${trait}`;
      const data = foundry.utils.deepClone(foundry.utils.getProperty(this.actor, key));
      if ( !data ) continue;
      let values = data.value;
      if ( !values ) values = [];
      else if ( values instanceof Set ) values = Array.from(values);
      else if ( !Array.isArray(values) ) values = [values];
      values = values.map(key => {
        const value = { label: Trait.keyLabel(key, { trait }) ?? key };
        const icons = value.icons = [];
        if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[key]?.isPhysical ) icons.push(...data.bypasses);
        return value;
      });
      if ( data.custom ) data.custom.split(";").forEach(v => values.push({ label: v.trim() }));
      if ( values.length ) traits[trait] = values;
    }
    // If petrified, display "All Damage" instead of all damage types separately
    if ( this.document.hasConditionEffect("petrification") ) {
      traits.dr = [{ label: game.i18n.localize("DND5E.DamageAll") }];
    }
    // Combine damage & condition immunities in play mode.
    if ( (this._mode === this.constructor.MODES.PLAY) && traits.ci ) {
      traits.di ??= [];
      traits.di.push(...traits.ci);
      delete traits.ci;
    }

    // Prepare damage modifications
    const dm = this.actor.system.traits?.dm;
    if ( dm ) {
      const rollData = this.actor.getRollData({ deterministic: true });
      const values = Object.entries(dm.amount).map(([k, v]) => {
        const total = simplifyBonus(v, rollData);
        if ( !total ) return null;
        const value = {
          label: `${CONFIG.DND5E.damageTypes[k]?.label ?? key} ${formatNumber(total, { signDisplay: "always" })}`,
          color: total > 0 ? "maroon" : "green"
        };
        const icons = value.icons = [];
        if ( dm.bypasses.size && CONFIG.DND5E.damageTypes[k]?.isPhysical ) icons.push(...dm.bypasses);
        return value;
      }).filter(f => f);
      if ( values.length ) traits.dm = values;
    }

    return traits;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItems(context) {
    super._prepareItems(context);
    context.containers = context.inventory
      .findSplice(entry => entry.dataset.type === "container")
      ?.items?.sort((a, b) => a.sort - b.sort);
    context.inventory = context.inventory.filter(entry => entry.items.length);
    context.inventory.push({ label: "DND5E.Contents", items: [], dataset: { type: "all" } });

    // Remove races & background as they are shown on the details tab instead.
    context.features = context.features.filter(f => (f.dataset.type !== "background") && (f.dataset.type !== "race"));
    context.features.forEach(f => {
      if ( f.hasActions ) f.dataset.type = "active";
      else f.dataset.type = "passive";
    });

    // Add extra categories for features grouping.
    Object.values(this.actor.classes ?? {}).sort((a, b) => b.system.levels - a.system.levels).forEach(cls => {
      context.features.push({
        label: game.i18n.format("DND5E.FeaturesClass", { class: cls.name }),
        items: [],
        dataset: { type: cls.identifier }
      });
    });

    if ( this.actor.system.details.race instanceof dnd5e.documents.Item5e ) {
      context.features.push({ label: "DND5E.FeaturesRace", items: [], dataset: { type: "race" } });
    }

    if ( this.actor.system.details.background instanceof dnd5e.documents.Item5e ) {
      context.features.push({ label: "DND5E.FeaturesBackground", items: [], dataset: { type: "background" } });
    }

    context.features.push({ label: "DND5E.FeaturesOther", items: [], dataset: { type: "other" } });
    context.classes = context.features.findSplice(f => f.isClass)?.items;

    // Spell slots
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    context.spellbook.forEach(section => {
      if ( !section.usesSlots ) return;
      const spells = foundry.utils.getProperty(this.actor.system.spells, section.prop);
      const max = spells.override ?? spells.max ?? 0;
      section.pips = Array.fromRange(max, 1).map(n => {
        const filled = spells.value >= n;
        const label = filled
          ? game.i18n.format(`DND5E.SpellSlotN.${plurals.select(n)}`, { n })
          : game.i18n.localize("DND5E.SpellSlotExpended");
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        return { n, label, filled, tooltip: label, classes: classes.join(" ") };
      });
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItem(item, ctx) {
    const { system } = item;

    // Spells
    if ( item.type === "spell" ) {

      // Activation
      const cost = system.activation?.cost;
      const abbr = {
        action: "DND5E.ActionAbbr",
        bonus: "DND5E.BonusActionAbbr",
        reaction: "DND5E.ReactionAbbr",
        minute: "DND5E.TimeMinuteAbbr",
        hour: "DND5E.TimeHourAbbr",
        day: "DND5E.TimeDayAbbr"
      }[system.activation.type];
      ctx.activation = cost && abbr ? `${cost}${game.i18n.localize(abbr)}` : item.labels.activation;

      // Range
      const units = system.range?.units;
      if ( units && (units !== "none") ) {
        if ( units in CONFIG.DND5E.movementUnits ) {
          ctx.range = {
            distance: true,
            value: system.range.value,
            unit: game.i18n.localize(`DND5E.Dist${units.capitalize()}Abbr`)
          };
        }
        else ctx.range = { distance: false };
      }

      // To Hit
      const toHit = parseInt(item.labels.modifier);
      if ( item.hasAttack && !isNaN(toHit) ) {
        ctx.toHit = {
          sign: Math.sign(toHit) < 0 ? "-" : "+",
          abs: Math.abs(toHit)
        };
      }

      // Prepared
      const mode = system.preparation?.mode;
      const config = CONFIG.DND5E.spellPreparationModes[mode] ?? {};
      if ( config.prepares ) {
        const isAlways = mode === "always";
        const prepared = isAlways || system.preparation.prepared;
        ctx.preparation = {
          applicable: true,
          disabled: !item.isOwner || isAlways,
          cls: prepared ? "active" : "",
          icon: `<i class="fa-${prepared ? "solid" : "regular"} fa-${isAlways ? "certificate" : "sun"}"></i>`,
          title: isAlways
            ? CONFIG.DND5E.spellPreparationModes.always.label
            : prepared
              ? CONFIG.DND5E.spellPreparationModes.prepared.label
              : game.i18n.localize("DND5E.SpellUnprepared")
        };
      }
      else ctx.preparation = { applicable: false };
    }

    // Gear
    else {

      // Attuned
      if ( ctx.attunement ) {
        ctx.attunement.applicable = true;
        ctx.attunement.disabled = !item.isOwner;
        ctx.attunement.cls = ctx.attunement.cls === "attuned" ? "active" : "";
      }
      else ctx.attunement = { applicable: false };

      // Equipped
      if ( "equipped" in system ) {
        ctx.equip = {
          applicable: true,
          cls: system.equipped ? "active" : "",
          title: `DND5E.${system.equipped ? "Equipped" : "Unequipped"}`,
          disabled: !item.isOwner
        };
      }
      else ctx.equip = { applicable: false };

      // Subtitles
      ctx.subtitle = [system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");
    }

    // Concentration
    if ( this._concentration.items.has(item) ) ctx.concentration = true;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
    html.find(".death-tab").on("click", () => this._toggleDeathTray());
    html.find("[data-action]").on("click", this._onAction.bind(this));
    html.find("[data-item-id][data-action]").on("click", this._onItemAction.bind(this));
    html.find(".rollable:is(.saving-throw, .ability-check)").on("click", this._onRollAbility.bind(this));
    html.find("proficiency-cycle").on("change", this._onChangeInput.bind(this));
    html.find(".sidebar .collapser").on("click", this._onToggleSidebar.bind(this));
    this.form.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));
    this.form.querySelectorAll("[data-reference-tooltip]").forEach(this._applyReferenceTooltips.bind(this));

    // Prevent default middle-click scrolling when locking a tooltip.
    this.form.addEventListener("pointerdown", event => {
      if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
        event.preventDefault();
      }
    });

    // Apply special context menus for items outside inventory elements
    const featuresElement = html[0].querySelector(`[data-tab="features"] ${this.options.elements.inventory}`);
    if ( featuresElement ) new ContextMenu5e(html, ".pills-lg [data-item-id]", [], {
      onOpen: (...args) => featuresElement._onOpenContextMenu(...args)
    });

    if ( this.isEditable ) {
      html.find(".meter > .hit-points").on("click", event => this._toggleEditHP(event, true));
      html.find(".meter > .hit-points > input").on("blur", event => this._toggleEditHP(event, false));
      html.find(".create-child").on("click", this._onCreateChild.bind(this));
    }

    // Edit mode only.
    if ( this._mode === this.constructor.MODES.EDIT ) {
      html.find(".tab.details .item-action").on("click", this._onItemAction.bind(this));
    }

    // Play mode only.
    else {
      html.find(".portrait").on("click", this._onShowPortrait.bind(this));
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _disableOverriddenFields(html) {
    // When in edit mode, field values will be the base value, rather than the derived value, so it should not be
    // necessary to disable them anymore.
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData={}) {
    // Skip over ActorSheet#_getSubmitData to allow for editing overridden values.
    return FormApplication.prototype._getSubmitData.call(this, updateData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _disableFields(form) {
    super._disableFields(form);
    form.querySelectorAll(".interface-only").forEach(input => input.disabled = false);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeTab(event, tabs, active) {
    super._onChangeTab(event, tabs, active);
    this.form.className = this.form.className.replace(/tab-\w+/g, "");
    this.form.classList.add(`tab-${active}`);
    const sidebarCollapsed = game.user.getFlag("dnd5e", `sheetPrefs.character.tabs.${active}.collapseSidebar`);
    if ( sidebarCollapsed !== undefined ) this._toggleSidebar(sidebarCollapsed);
    const createChild = this.form.querySelector(".create-child");
    createChild.setAttribute("aria-label", game.i18n.format("SIDEBAR.Create", {
      type: game.i18n.localize(`DOCUMENT.${active === "effects" ? "ActiveEffect" : "Item"}`)
    }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async activateEditor(name, options={}, initialContent="") {
    options.relativeLinks = true;
    options.plugins = {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        compact: true,
        destroyOnSave: false,
        onSave: () => this.saveEditor(name, { remove: false })
      })
    };
    return super.activateEditor(name, options, initialContent);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragStart(event) {
    // Add another deferred deactivation to catch the second pointerenter event that seems to be fired on Firefox.
    requestAnimationFrame(() => game.tooltip.deactivate());
    game.tooltip.deactivate();

    const { key } = event.target.closest("[data-key]")?.dataset ?? {};
    const { level, preparationMode } = event.target.closest("[data-level]")?.dataset ?? {};
    const isSlots = event.target.closest("[data-favorite-id]") || event.target.classList.contains("spell-header");
    let type;
    if ( key in CONFIG.DND5E.skills ) type = "skill";
    else if ( key in CONFIG.DND5E.toolIds ) type = "tool";
    else if ( preparationMode && (level !== "0") && isSlots ) type = "slots";
    if ( !type ) return super._onDragStart(event);
    const dragData = { dnd5e: { action: "favorite", type } };
    if ( type === "slots" ) dragData.dnd5e.id = preparationMode === "pact" ? "pact" : `spell${level}`;
    else dragData.dnd5e.id = key;
    event.dataTransfer.setData("application/json", JSON.stringify(dragData));
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sheet mode.
   * @param {Event} event  The triggering event.
   * @protected
   */
  async _onChangeSheetMode(event) {
    const { MODES } = this.constructor;
    const toggle = event.currentTarget;
    const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    await this.submit();
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a pip on the character sheet.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onTogglePip(event) {
    const n = Number(event.target.closest("[data-n]")?.dataset.n);
    if ( !n || isNaN(n) ) return;
    const prop = event.currentTarget.dataset.prop;
    let value = foundry.utils.getProperty(this.actor, prop);
    if ( value === n ) value--;
    else value = n;
    return this.actor.update({ [prop]: value });
  }

  /* -------------------------------------------- */

  /**
   * Toggle editing hit points.
   * @param {PointerEvent} event  The triggering event.
   * @param {boolean} edit        Whether to toggle to the edit state.
   * @protected
   */
  _toggleEditHP(event, edit) {
    const target = event.currentTarget.closest(".hit-points");
    const label = target.querySelector(":scope > .label");
    const input = target.querySelector(":scope > input");
    label.hidden = edit;
    input.hidden = !edit;
    if ( edit ) input.focus();
  }

  /* -------------------------------------------- */

  /**
   * Toggle the death save tray.
   * @param {boolean} [open]  Force a particular open state.
   * @protected
   */
  _toggleDeathTray(open) {
    const tray = this.form.querySelector(".death-tray");
    const tab = tray.querySelector(".death-tab");
    tray.classList.toggle("open", open);
    this._deathTrayOpen = tray.classList.contains("open");
    tab.dataset.tooltip = `DND5E.DeathSave${this._deathTrayOpen ? "Hide" : "Show"}`;
    tab.setAttribute("aria-label", game.i18n.localize(tab.dataset.tooltip));
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sidebar collapsed state.
   * @protected
   */
  _onToggleSidebar() {
    const collapsed = this._toggleSidebar();
    const activeTab = this._tabs?.[0]?.active ?? "details";
    game.user.setFlag("dnd5e", `sheetPrefs.character.tabs.${activeTab}.collapseSidebar`, collapsed);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the sidebar collapsed state.
   * @param {boolean} [collapsed]  Force a particular collapsed state.
   * @returns {boolean}            The new collapsed state.
   * @protected
   */
  _toggleSidebar(collapsed) {
    this.form.classList.toggle("collapsed", collapsed);
    collapsed = this.form.classList.contains("collapsed");
    const collapser = this.form.querySelector(".sidebar .collapser");
    const icon = collapser.querySelector("i");
    collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
    collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
    icon.classList.remove("fa-caret-left", "fa-caret-right");
    icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
    return collapsed;
  }

  /* -------------------------------------------- */

  /**
   * Handle showing the character's portrait or token art.
   * @protected
   */
  _onShowPortrait() {
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    const img = showTokenPortrait ? token.texture.src : this.actor.img;
    new ImagePopout(img, { title: this.actor.name, uuid: this.actor.uuid }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle the user performing some sheet action.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const target = event.currentTarget;
    switch ( target.dataset.action ) {
      case "findItem": this._onFindItem(target.dataset.itemType); break;
      case "removeFavorite": this._onRemoveFavorite(event); break;
      case "spellcasting": this._onToggleSpellcasting(event); break;
      case "toggleInspiration": this._onToggleInspiration(); break;
      case "useFavorite": this._onUseFavorite(event); break;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInput(event) {
    const { name } = event.target.dataset;
    const { itemId } = event.target.closest("[data-item-id]")?.dataset ?? {};
    const item = this.actor.items.get(itemId);
    if ( event.target.closest(".favorites") && name && item ) return item.update({ [name]: event.target.value });
    return super._onChangeInput(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _onConfigureSheet(event) {
    event.preventDefault();
    new SheetConfig5e(this.document, {
      top: this.position.top + 40,
      left: this.position.left + ((this.position.width - DocumentSheet.defaultOptions.width) / 2)
    }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new embedded child.
   * @returns {ActiveEffect5e|Item5e|void}
   * @protected
   */
  _onCreateChild() {
    const activeTab = this._tabs?.[0]?.active ?? "details";

    if ( activeTab === "effects" ) return ActiveEffect.implementation.create({
      name: game.i18n.localize("DND5E.EffectNew"),
      icon: "icons/svg/aura.svg"
    }, { parent: this.actor, renderSheet: true });

    if ( activeTab === "spells" ) return Item.implementation.create({
      name: game.i18n.format("DOCUMENT.New", { type: game.i18n.format(CONFIG.Item.typeLabels.spell) }),
      type: "spell",
      img: Item.implementation.getDefaultArtwork({ type: "spell" })?.img ?? Item.implementation.DEFAULT_ICON
    }, { parent: this.actor, renderSheet: true });

    let types = {
      inventory: ["weapon", "equipment", "consumable", "tool", "container", "loot"],
      features: ["feat", "race", "background", "class", "subclass"]
    }[activeTab] ?? [];

    types = types.filter(type => {
      const model = CONFIG.Item.dataModels[type];
      return !model.metadata?.singleton || !this.actor.itemTypes[type].length;
    });

    if ( types.length ) return Item.implementation.createDialog({}, {
      parent: this.actor, pack: this.actor.pack, types
    });
  }

  /* -------------------------------------------- */

  /**
   * Show available items of a given type.
   * @param {string} type  The item type.
   * @protected
   */
  _onFindItem(type) {
    switch ( type ) {
      case "class": game.packs.get("dnd5e.classes").render(true); break;
      case "race": game.packs.get("dnd5e.races").render(true); break;
      case "background": game.packs.get("dnd5e.backgrounds").render(true); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling inspiration.
   * @protected
   */
  _onToggleInspiration() {
    this.actor.update({ "system.attributes.inspiration": !this.actor.system.attributes.inspiration });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the character's primary spellcasting ability.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onToggleSpellcasting(event) {
    const ability = event.currentTarget.closest("[data-ability]")?.dataset.ability;
    this.actor.update({ "system.attributes.spellcasting": ability });
  }

  /* -------------------------------------------- */

  /**
   * Initialize item tooltips on an element.
   * @param {HTMLElement} element  The tooltipped element.
   * @protected
   */
  _applyItemTooltips(element) {
    if ( "tooltip" in element.dataset ) return;
    const target = element.closest("[data-item-id], [data-uuid]");
    let uuid = target.dataset.uuid;
    if ( !uuid ) {
      const item = this.actor.items.get(target.dataset.itemId);
      uuid = item?.uuid;
    }
    if ( !uuid ) return;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
    element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
    element.dataset.tooltipDirection ??= "LEFT";
  }

  /* -------------------------------------------- */

  /**
   * Initialize a rule tooltip on an element.
   * @param {HTMLElement} element  The tooltipped element.
   * @protected
   */
  _applyReferenceTooltips(element) {
    if ( "tooltip" in element.dataset ) return;
    const uuid = element.dataset.referenceTooltip;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
  }

  /* -------------------------------------------- */

  /**
   * Handle performing some action on an owned Item.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onItemAction(event) {
    if ( event.target.closest("select") ) return;
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const action = event.currentTarget.dataset.action;
    const item = this.actor.items.get(itemId);

    switch ( action ) {
      case "edit": item?.sheet.render(true); break;
      case "delete": item?.deleteDialog(); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an ability check or saving throw.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onRollAbility(event) {
    const abilityId = event.currentTarget.closest("[data-ability]").dataset.ability;
    const isSavingThrow = event.currentTarget.classList.contains("saving-throw");
    if ( abilityId === "concentration" ) this.actor.rollConcentration({ event });
    else if ( isSavingThrow ) this.actor.rollAbilitySave(abilityId, { event });
    else this.actor.rollAbilityTest(abilityId, { event });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onResize(event) {
    super._onResize(event);
    const { width, height } = this.position;
    const key = `character${this.actor.limited ? ":limited": ""}`;
    game.user.setFlag("dnd5e", `sheetPrefs.${key}`, { width, height });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _filterItem(item) {
    if ( item.type === "container" ) return true;
  }

  /* -------------------------------------------- */
  /*  Favorites                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    if ( !event.target.closest(".favorites") ) return super._onDrop(event);
    const dragData = event.dataTransfer.getData("application/json");
    if ( !dragData ) return super._onDrop(event);
    let data;
    try {
      data = JSON.parse(dragData);
    } catch(e) {
      console.error(e);
      return;
    }
    const { action, type, id } = data.dnd5e ?? {};
    if ( action === "favorite" ) return this._onDropFavorite(event, { type, id });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, data) {
    if ( !event.target.closest(".favorites") ) return super._onDropItem(event, data);
    const item = await Item.implementation.fromDropData(data);
    if ( item?.parent !== this.actor ) return super._onDropItem(event, data);
    const uuid = item.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "item", id: uuid });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropActiveEffect(event, data) {
    if ( !event.target.closest(".favorites") ) return super._onDropActiveEffect(event, data);
    const effect = await ActiveEffect.implementation.fromDropData(data);
    if ( effect.target !== this.actor ) return super._onDropActiveEffect(event, data);
    const uuid = effect.getRelativeUUID(this.actor);
    return this._onDropFavorite(event, { type: "effect", id: uuid });
  }

  /* -------------------------------------------- */

  /**
   * Handle an owned item or effect being dropped in the favorites area.
   * @param {PointerEvent} event         The triggering event.
   * @param {ActorFavorites5e} favorite  The favorite that was dropped.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onDropFavorite(event, favorite) {
    if ( this.actor.system.hasFavorite(favorite.id) ) return this._onSortFavorites(event, favorite.id);
    return this.actor.system.addFavorite(favorite);
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a favorite.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onRemoveFavorite(event) {
    const { favoriteId } = event.currentTarget.closest("[data-favorite-id]")?.dataset ?? {};
    if ( !favoriteId ) return;
    return this.actor.system.removeFavorite(favoriteId);
  }

  /* -------------------------------------------- */

  /**
   * Handle re-ordering the favorites list.
   * @param {DragEvent} event  The drop event.
   * @param {string} srcId     The identifier of the dropped favorite.
   * @returns {Promise<Actor5e>|void}
   * @protected
   */
  _onSortFavorites(event, srcId) {
    const dropTarget = event.target.closest("[data-favorite-id]");
    if ( !dropTarget ) return;
    let source;
    let target;
    const targetId = dropTarget.dataset.favoriteId;
    if ( srcId === targetId ) return;
    const siblings = this.actor.system.favorites.filter(f => {
      if ( f.id === targetId ) target = f;
      else if ( f.id === srcId ) source = f;
      return f.id !== srcId;
    });
    const updates = SortingHelpers.performIntegerSort(source, { target, siblings });
    const favorites = this.actor.system.favorites.reduce((map, f) => map.set(f.id, { ...f }), new Map());
    for ( const { target, update } of updates ) {
      const favorite = favorites.get(target.id);
      foundry.utils.mergeObject(favorite, update);
    }
    return this.actor.update({ "system.favorites": Array.from(favorites.values()) });
  }

  /* -------------------------------------------- */

  /**
   * Handle using a favorited item.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise|void}
   * @protected
   */
  _onUseFavorite(event) {
    const { favoriteId } = event.currentTarget.closest("[data-favorite-id]").dataset;
    const favorite = fromUuidSync(favoriteId, { relative: this.actor });
    if ( favorite instanceof dnd5e.documents.Item5e ) return favorite.use({}, { event });
    if ( favorite instanceof dnd5e.documents.ActiveEffect5e ) return favorite.update({ disabled: !favorite.disabled });
  }

  /* -------------------------------------------- */

  /**
   * Prepare favorites for display.
   * @returns {Promise<object>}
   * @protected
   */
  async _prepareFavorites() {
    // Legacy resources
    const resources = Object.entries(this.actor.system.resources).reduce((arr, [k, r]) => {
      const { value, max, sr, lr, label } = r;
      const source = this.actor._source.system.resources[k];
      if ( label && max ) arr.push({
        id: `resources.${k}`,
        type: "resource",
        img: "icons/svg/upgrade.svg",
        resource: { value, max, source },
        css: "uses",
        title: label,
        subtitle: [
          sr ? game.i18n.localize("DND5E.AbbreviationSR") : null,
          lr ? game.i18n.localize("DND5E.AbbreviationLR") : null
        ].filterJoin(" &bull; ")
      });
      return arr;
    }, []);

    return resources.concat(await this.actor.system.favorites.reduce(async (arr, f) => {
      const { id, type, sort } = f;
      const favorite = fromUuidSync(id, { relative: this.actor });
      if ( !favorite && ((type === "item") || (type === "effect")) ) return arr;
      arr = await arr;

      let data;
      if ( type === "item" ) data = await favorite.system.getFavoriteData();
      else if ( type === "effect" ) data = await favorite.getFavoriteData();
      else data = await this._getFavoriteData(type, id);
      if ( !data ) return arr;
      let {
        img, title, subtitle, value, uses, quantity, modifier, passive,
        save, range, reference, toggle, suppressed, level
      } = data;

      const css = [];
      if ( uses ) {
        css.push("uses");
        uses.value = Math.round(uses.value);
      }
      else if ( modifier !== undefined ) css.push("modifier");
      else if ( save?.dc ) css.push("save");
      else if ( value !== undefined ) css.push("value");

      if ( toggle === false ) css.push("disabled");
      if ( uses?.max > 100 ) css.push("uses-sm");
      if ( modifier !== undefined ) {
        const value = Number(modifier.replace?.(/\s+/g, "") ?? modifier);
        if ( !isNaN(value) ) modifier = { abs: Math.abs(value), sign: value < 0 ? "-" : "+" };
      }

      const rollableClass = [];
      if ( this.isEditable && (type !== "slots") ) rollableClass.push("rollable");
      if ( type === "skill" ) rollableClass.push("skill-name");
      else if ( type === "tool" ) rollableClass.push("tool-name");

      if ( suppressed ) subtitle = game.i18n.localize("DND5E.Suppressed");
      arr.push({
        id, img, type, title, value, uses, sort, save, modifier, passive, range, reference, suppressed, level,
        itemId: type === "item" ? favorite.id : null,
        effectId: type === "effect" ? favorite.id : null,
        parentId: (type === "effect") && (favorite.parent !== favorite.target) ? favorite.parent.id: null,
        preparationMode: type === "slots" ? id === "pact" ? "pact" : "prepared" : null,
        key: (type === "skill") || (type === "tool") ? id : null,
        toggle: toggle === undefined ? null : { applicable: true, value: toggle },
        quantity: quantity > 1 ? quantity : "",
        rollableClass: rollableClass.filterJoin(" "),
        css: css.filterJoin(" "),
        bareName: type === "slots",
        subtitle: Array.isArray(subtitle) ? subtitle.filterJoin(" &bull; ") : subtitle
      });
      return arr;
    }, []));
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for a favorited entry.
   * @param {"skill"|"tool"|"slots"} type  The type of favorite.
   * @param {string} id                    The favorite's identifier.
   * @returns {Promise<FavoriteData5e|void>}
   * @protected
   */
  async _getFavoriteData(type, id) {
    // Spell slots
    if ( type === "slots" ) {
      const { value, max, level } = this.actor.system.spells[id] ?? {};
      const uses = { value, max, name: `system.spells.${id}.value` };
      if ( id === "pact" ) return {
        uses, level,
        title: game.i18n.localize("DND5E.SpellSlotsPact"),
        subtitle: [game.i18n.localize(`DND5E.SpellLevel${level}`), game.i18n.localize("DND5E.AbbreviationSR")],
        img: "icons/magic/unholy/silhouette-robe-evil-power.webp"
      };

      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      return {
        uses, level,
        title: game.i18n.format(`DND5E.SpellSlotsN.${plurals.select(level)}`, { n: level }),
        subtitle: game.i18n.localize("DND5E.AbbreviationLR"),
        img: `systems/dnd5e/icons/spell-tiers/${id}.webp`
      };
    }

    // Skills & Tools
    else {
      const data = this.actor.system[`${type}s`]?.[id];
      if ( !data ) return;
      const { total, ability, passive } = data ?? {};
      const subtitle = game.i18n.format("DND5E.AbilityPromptTitle", {
        ability: CONFIG.DND5E.abilities[ability].label
      });
      let img;
      let title;
      let reference;
      if ( type === "tool" ) {
        reference = Trait.getBaseItemUUID(CONFIG.DND5E.toolIds[id]);
        ({ img, name: title } = Trait.getBaseItem(reference, { indexOnly: true }));
      }
      else if ( type === "skill" ) ({ icon: img, label: title, reference } = CONFIG.DND5E.skills[id]);
      return { img, title, subtitle, modifier: total, passive, reference };
    }
  }
}
