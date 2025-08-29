import * as Trait from "../../../documents/actor/trait.mjs";
import { formatLength, formatNumber, simplifyBonus, splitSemicolons, staticID } from "../../../utils.mjs";
import { createCheckboxInput } from "../../fields.mjs";
import Tabs5e from "../../tabs.mjs";
import DocumentSheetV2Mixin from "../../mixins/sheet-v2-mixin.mjs";
import ItemSheet5e from "../../item/item-sheet.mjs";

/**
 * Adds common V2 Actor sheet functionality.
 * @param {typeof ActorSheet5e} Base  The base class being mixed.
 * @returns {typeof ActorSheetV2}
 * @mixin
 */
export default function ActorSheetV2Mixin(Base) {
  foundry.utils.logCompatibilityWarning(
    "The `ActorSheetV2Mixin` application has been deprecated and integrated into `BaseActorSheet`.",
    { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
  );
  return class ActorSheetV2 extends DocumentSheetV2Mixin(Base) {
    constructor(object, options={}) {
      const key = `${object.type}${object.limited ? ":limited" : ""}`;
      const { width, height } = game.user.getFlag("dnd5e", `sheetPrefs.${key}`) ?? {};
      if ( width && !("width" in options) ) options.width = width;
      if ( height && !("height" in options) ) options.height = height;
      super(object, options);
    }

    /**
     * The cached concentration information for the character.
     * @type {{items: Set<Item5e>, effects: Set<ActiveEffect5e>}}
     * @internal
     */
    _concentration;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderOuter() {
      const html = await super._renderOuter();
      if ( !game.user.isGM && this.actor.limited ) return html;
      const header = html[0].querySelector(".window-header");

      // Preparation warnings.
      const warnings = document.createElement("a");
      warnings.classList.add("pseudo-header-button", "preparation-warnings");
      warnings.dataset.tooltip = "Warnings";
      warnings.setAttribute("aria-label", game.i18n.localize("Warnings"));
      warnings.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
      warnings.addEventListener("click", this._onOpenWarnings.bind(this));
      header.querySelector(".window-title").insertAdjacentElement("afterend", warnings);

      // Render tabs.
      const nav = document.createElement("nav");
      nav.classList.add("tabs", "tabs-right");
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

      return html;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _render(force=false, options={}) {
      await super._render(force, options);
      const [warnings] = this.element.find(".pseudo-header-button.preparation-warnings");
      warnings?.toggleAttribute("hidden", !this.actor._preparationWarnings?.length);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _getHeaderButtons() {
      const buttons = super._getHeaderButtons();
      const tokenButton = buttons.find(b => b.class === "configure-token");
      if ( tokenButton && this.actor.isToken ) tokenButton.icon = "far fa-user-circle";
      return buttons;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      this._concentration = this.actor.concentration; // Cache concentration so it's not called for every item.
      const context = await super.getData(options);
      const activeTab = (game.user.isGM || !this.actor.limited)
        ? this._tabs?.[0]?.active ?? this.options.tabs[0].initial
        : "biography";
      const sheetPrefs = `sheetPrefs.${this.actor.type}.tabs.${activeTab}`;
      context.cssClass += ` tab-${activeTab}`;
      context.sidebarCollapsed = !!game.user.getFlag("dnd5e", `${sheetPrefs}.collapseSidebar`);
      if ( context.sidebarCollapsed ) context.cssClass += " collapsed";
      const { attributes } = this.actor.system;

      // Portrait
      const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
      const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
      const defaultArtwork = Actor.implementation.getDefaultArtwork(context.source)?.img;
      context.portrait = {
        token: showTokenPortrait,
        src: showTokenPortrait ? token.texture.src : this.actor.img ?? defaultArtwork,
        path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
      };

      // Death Saves
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      context.death = {};
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

      // Senses
      context.senses = Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
        const value = attributes.senses[k];
        if ( value ) obj[k] = { label, value };
        return obj;
      }, {});

      if ( attributes.senses.special ) splitSemicolons(attributes.senses.special).forEach((label, i) => {
        context.senses[`custom${i + 1}`] = { label };
      });

      // Containers
      for ( const container of context.containers ?? [] ) {
        const ctx = context.itemContext[container.id];
        ctx.capacity = await container.system.computeCapacity();
        ctx.capacity.maxLabel = Number.isFinite(ctx.capacity.max) ? ctx.capacity.max : "&infin;";
      }

      // Effects & Conditions
      const conditionIds = new Set();
      context.conditions = Object.entries(CONFIG.DND5E.conditionTypes).reduce((arr, [k, c]) => {
        if ( c.pseudo ) return arr; // Filter out pseudo-conditions.
        let { name, img, reference, label, icon } = c;
        if ( label ) {
          foundry.utils.logCompatibilityWarning(
            "The `label` property of status conditions has been deprecated in place of using `name`.",
            { since: "DnD5e 5.0", until: "DnD5e 5.2" }
          );
          name = label;
        }

        const id = staticID(`dnd5e${k}`);
        conditionIds.add(id);
        const existing = this.actor.effects.get(id);
        const { disabled } = existing ?? {};

        if ( icon ) {
          foundry.utils.logCompatibilityWarning(
            "The `icon` property of status conditions has been deprecated in place of using `img`.",
            { since: "DnD5e 5.0", until: "DnD5e 5.2" }
          );
          img = icon;
        }

        arr.push({
          name, reference,
          id: k,
          img: existing?.img ?? img,
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
          if ( source instanceof ActiveEffect ) {
            source = source.target;
            if ( (source instanceof Item) && source.parent && (source.parent !== this.object) ) source = source.parent;
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
      context.flags = this._prepareFlags();
      context.hasConditions = true;
      const sourceVersion = context.system.source?.rules;
      context.modernRules = sourceVersion
        ? sourceVersion === "2024"
        : game.settings.get("dnd5e", "rulesVersion") === "modern";

      return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare flags displayed in the special traits tab.
     * @returns {object}
     */
    _prepareFlags() {
      const sections = [];
      const source = (this._mode === this.constructor.MODES.PLAY ? this.document : this.document._source);
      const flags = {
        classes: Object.values(this.document.classes)
          .map(cls => ({ value: cls.id, label: cls.name }))
          .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang)),
        data: source.flags?.dnd5e ?? {},
        disabled: this._mode === this.constructor.MODES.PLAY
      };

      // Character Flags
      for ( const [key, config] of Object.entries(CONFIG.DND5E.characterFlags) ) {
        const flag = { ...config, name: `flags.dnd5e.${key}`, value: foundry.utils.getProperty(flags.data, key) };
        const fieldOptions = { label: config.name, hint: config.hint };
        if ( config.type === Boolean ) {
          flag.field = new foundry.data.fields.BooleanField(fieldOptions);
          flag.input = createCheckboxInput;
        }
        else if ( config.type === Number ) flag.field = new foundry.data.fields.NumberField(fieldOptions);
        else flag.field = new foundry.data.fields.StringField(fieldOptions);

        if ( !config.deprecated || flag.value ) {
          sections[config.section] ??= [];
          sections[config.section].push(flag);
        }
      }

      // Global Bonuses
      const globals = [];
      const addBonus = field => {
        if ( field instanceof foundry.data.fields.SchemaField ) Object.values(field.fields).forEach(f => addBonus(f));
        else globals.push({ field, name: field.fieldPath, value: foundry.utils.getProperty(source, field.fieldPath) });
      };
      addBonus(this.document.system.schema.fields.bonuses);
      if ( globals.length ) sections[game.i18n.localize("DND5E.BONUSES.FIELDS.bonuses.label")] = globals;

      flags.sections = Object.entries(sections).map(([label, fields]) => ({ label, fields }));
      return flags;
    }

    /* -------------------------------------------- */

    /** @override */
    _prepareTraits() {
      const traits = {};
      for ( const [trait, config] of Object.entries(CONFIG.DND5E.traits) ) {
        if ( ["dm", "languages"].includes(trait) ) continue;
        const key = config.actorKeyPath ?? `system.traits.${trait}`;
        const data = foundry.utils.deepClone(foundry.utils.getProperty(this.actor, key));
        if ( !data ) continue;
        let values = data.value;
        if ( !values ) values = [];
        else if ( values instanceof Set ) values = Array.from(values);
        else if ( !Array.isArray(values) ) values = [values];
        values = values.map(key => {
          const value = { key, label: Trait.keyLabel(key, { trait }) ?? key };
          const icons = value.icons = [];
          if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[key]?.isPhysical ) icons.push(...data.bypasses.map(p => {
            const type = CONFIG.DND5E.itemProperties[p]?.label;
            return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
          }));
          return value;
        });
        if ( data.custom ) splitSemicolons(data.custom).forEach(label => values.push({ label }));
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
            label: `${CONFIG.DND5E.damageTypes[k]?.label ?? k} ${formatNumber(total, { signDisplay: "always" })}`,
            color: total > 0 ? "maroon" : "green"
          };
          const icons = value.icons = [];
          if ( dm.bypasses.size && CONFIG.DND5E.damageTypes[k]?.isPhysical ) icons.push(...dm.bypasses.map(p => {
            const type = CONFIG.DND5E.itemProperties[p]?.label;
            return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
          }));
          return value;
        }).filter(f => f);
        if ( values.length ) traits.dm = values;
      }

      // Handle languages
      const languages = this.actor.system.traits?.languages?.labels;
      if ( languages?.languages?.length ) traits.languages = languages.languages.map(label => ({ label }));
      for ( const [key, { label }] of Object.entries(CONFIG.DND5E.communicationTypes) ) {
        const data = this.actor.system.traits?.languages?.communication?.[key];
        if ( !data?.value ) continue;
        traits.languages ??= [];
        traits.languages.push({ label, value: formatLength(data.value, data.units) });
      }

      // Display weapon masteries
      for ( const key of this.actor.system.traits?.weaponProf?.mastery?.value ?? [] ) {
        let value = traits.weapon?.find(w => w.key === key);
        if ( !value ) {
          value = { key, label: Trait.keyLabel(key, { trait: "weapon" }) ?? key, icons: [] };
          traits.weapon ??= [];
          traits.weapon.push(value);
        }
        value.icons.push({ icon: "mastery", label: game.i18n.format("DND5E.WEAPON.Mastery.Label") });
      }

      return traits;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _prepareItems(context) {
      super._prepareItems(context);

      // Spell slots
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      context.spellbook.forEach(section => {
        section.categories = [
          { activityPartial: "dnd5e.activity-column-school" },
          { activityPartial: "dnd5e.activity-column-time" },
          { activityPartial: "dnd5e.activity-column-range" },
          { activityPartial: "dnd5e.activity-column-target" },
          { activityPartial: "dnd5e.activity-column-roll" },
          { activityPartial: "dnd5e.activity-column-uses" },
          { activityPartial: "dnd5e.activity-column-formula" },
          { activityPartial: "dnd5e.activity-column-controls" }
        ];
        if ( !section.usesSlots ) return;
        const spells = foundry.utils.getProperty(this.actor.system.spells, section.prop);
        const max = spells.override ?? spells.max ?? 0;
        const value = spells.value ?? 0;
        section.pips = Array.fromRange(Math.max(max, value), 1).map(n => {
          const filled = spells.value >= n;
          const temp = n > max;
          const label = temp
            ? game.i18n.localize("DND5E.SpellSlotTemporary")
            : filled
              ? game.i18n.format(`DND5E.SpellSlotN.${plurals.select(n)}`, { n })
              : game.i18n.localize("DND5E.SpellSlotExpended");
          const classes = ["pip"];
          if ( filled ) classes.push("filled");
          if ( temp ) classes.push("tmp");
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
        const linked = item.system.linkedActivity?.item;

        // Activation
        const cost = system.activation?.value ?? "";
        const abbr = {
          action: "DND5E.ActionAbbr",
          bonus: "DND5E.BonusActionAbbr",
          reaction: "DND5E.ReactionAbbr",
          minute: "DND5E.TimeMinuteAbbr",
          hour: "DND5E.TimeHourAbbr",
          day: "DND5E.TimeDayAbbr"
        }[system.activation.type];
        ctx.activation = abbr ? `${cost}${game.i18n.localize(abbr)}` : item.labels.activation;

        // Range
        const units = system.range?.units;
        if ( units && (units !== "none") ) {
          if ( units in CONFIG.DND5E.movementUnits ) {
            ctx.range = {
              distance: true,
              value: system.range.value,
              unit: CONFIG.DND5E.movementUnits[units].abbreviation,
              parts: formatLength(system.range.value, units, { parts: true })
            };
          }
          else ctx.range = { distance: false };
        }

        // Prepared
        const mode = system.preparation?.mode;
        const config = CONFIG.DND5E.spellPreparationModes[mode] ?? {};
        if ( config.prepares && !linked ) {
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

        // Subtitle
        ctx.subtitle = [
          linked ? linked.name : this.actor.classes[system.sourceClass]?.name,
          item.labels.components.vsm
        ].filterJoin(" &bull; ");

        ctx.dataset = {
          itemLevel: item.system.level,
          itemName: item.name,
          itemSort: item.sort,
          itemPreparationMode: item.system.preparation.mode,
          itemPreparationPrepared: item.system.preparation.prepared,
          linkedName: linked?.name
        };
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

      // To Hit
      const toHit = parseInt(item.labels.modifier);
      ctx.toHit = item.hasAttack && !isNaN(toHit) ? toHit : null;

      // Save
      ctx.save = { ...item.system.activities?.getByType("save")[0]?.save };
      ctx.save.ability = ctx.save.ability?.size ? ctx.save.ability.size === 1
        ? CONFIG.DND5E.abilities[ctx.save.ability.first()]?.abbreviation
        : game.i18n.localize("DND5E.AbbreviationDC") : null;

      // Activities
      ctx.activities = item.system.activities
        ?.filter(a => !item.getFlag("dnd5e", "riders.activity")?.includes(a.id))
        ?.map(this._prepareActivity.bind(this));

      // Linked Uses
      const cachedFor = fromUuidSync(item.flags.dnd5e?.cachedFor, { relative: this.actor, strict: false });
      if ( cachedFor ) ctx.linkedUses = cachedFor.consumption?.targets.find(t => t.type === "activityUses")
        ? cachedFor.uses : cachedFor.consumption?.targets.find(t => t.type === "itemUses")
          ? cachedFor.item.system.uses : null;
    }

    /* -------------------------------------------- */

    /**
     * Prepare activity data.
     * @param {Activity} activity  The activity.
     * @returns {object}
     * @protected
     */
    _prepareActivity(activity) {
      let { _id, activation, img, labels, name, range, save, uses } = activity.prepareSheetContext();

      // To Hit
      const toHit = parseInt(labels.toHit);

      // Activation
      const activationAbbr = {
        action: "DND5E.ActionAbbr",
        bonus: "DND5E.BonusActionAbbr",
        reaction: "DND5E.ReactionAbbr",
        minute: "DND5E.TimeMinuteAbbr",
        hour: "DND5E.TimeHourAbbr",
        day: "DND5E.TimeDayAbbr"
      }[activation?.type || ""];

      // Limited Uses
      uses = { ...(uses ?? {}) };
      uses.hasRecharge = uses.max && (uses.recovery?.[0]?.period === "recharge");
      uses.isOnCooldown = uses.hasRecharge && (uses.value < 1);

      return {
        _id, labels, name, range, uses,
        activation: activationAbbr
          ? `${activation.value ?? ""}${game.i18n.localize(activationAbbr)}`
          : labels.activation,
        icon: {
          src: img,
          svg: img.endsWith(".svg")
        },
        isSpell: activity.item.type === "spell",
        save: save ? {
          ...save,
          ability: save.ability?.size
            ? save.ability.size === 1
              ? CONFIG.DND5E.abilities[save.ability.first()]?.abbreviation
              : game.i18n.localize("DND5E.AbbreviationDC")
            : null
        } : null,
        toHit: isNaN(toHit) ? null : toHit
      };
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _getLabels() {
      const labels = super._getLabels();
      labels.damageAndHealing = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
      return labels;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    activateListeners(html) {
      super.activateListeners(html);
      html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
      html.find(".rollable:is(.saving-throw, .ability-check)").on("click", this._onRollAbility.bind(this));
      html.find(".sidebar-collapser").on("click", this._onToggleSidebar.bind(this));
      html.find("[data-item-id][data-action]").on("click", this._onItemAction.bind(this));
      html.find("dialog.warnings").on("click", this._onCloseWarnings.bind(this));
      this.form.querySelectorAll("[data-reference-tooltip]").forEach(this._applyReferenceTooltips.bind(this));

      // Prevent default middle-click scrolling when locking a tooltip.
      this.form.addEventListener("pointerdown", event => {
        if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
          event.preventDefault();
        }
      });

      if ( this.isEditable ) {
        html.find(".meter > .hit-points").on("click", event => this._toggleEditHP(event, true));
        html.find(".meter > .hit-points > input").on("blur", event => this._toggleEditHP(event, false));
      }

      // Play mode only.
      if ( this._mode === this.constructor.MODES.PLAY ) {
        html.find(".portrait").on("click", this._onShowPortrait.bind(this));
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _onChangeTab(event, tabs, active) {
      super._onChangeTab(event, tabs, active);
      const sheetPrefs = `sheetPrefs.${this.actor.type}.tabs.${active}`;
      const sidebarCollapsed = game.user.getFlag("dnd5e", `${sheetPrefs}.collapseSidebar`);
      if ( sidebarCollapsed !== undefined ) this._toggleSidebar(sidebarCollapsed);
      const createChild = this.form.querySelector(".create-child");
      createChild.setAttribute("aria-label", game.i18n.format("SIDEBAR.Create", {
        type: game.i18n.localize(`DOCUMENT.${active === "effects" ? "ActiveEffect" : "Item"}`)
      }));
    }

    /* -------------------------------------------- */

    /**
     * Handle closing the warnings dialog.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onCloseWarnings(event) {
      if ( event.target instanceof HTMLDialogElement ) event.target.close();
      if ( event.target instanceof HTMLAnchorElement ) event.target.closest("dialog")?.close();
    }

    /* -------------------------------------------- */

    /** @override */
    _onCreateChild() {
      const activeTab = this._tabs?.[0]?.active ?? this.options.tabs[0].initial;

      if ( activeTab === "effects" ) return ActiveEffect.implementation.create({
        name: game.i18n.localize("DND5E.EffectNew"),
        icon: "icons/svg/aura.svg"
      }, { parent: this.actor, renderSheet: true });

      if ( activeTab === "spells" ) return Item.implementation.create({
        name: game.i18n.format("DOCUMENT.New", { type: game.i18n.format(CONFIG.Item.typeLabels.spell) }),
        type: "spell",
        img: Item.implementation.getDefaultArtwork({ type: "spell" })?.img ?? Item.implementation.DEFAULT_ICON
      }, { parent: this.actor, renderSheet: true });

      const features = ["feat", "race", "background", "class", "subclass"];
      if ( this.actor.type === "npc" ) features.push("weapon");

      let types = {
        features,
        inventory: ["weapon", "equipment", "consumable", "tool", "container", "loot"]
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
     * Handling beginning a drag-drop operation on an Activity.
     * @param {DragEvent} event  The originating drag event.
     * @protected
     */
    _onDragActivity(event) {
      const { itemId } = event.target.closest("[data-item-id]").dataset;
      const { activityId } = event.target.closest("[data-activity-id]").dataset;
      const activity = this.actor.items.get(itemId)?.system.activities?.get(activityId);
      if ( activity ) event.dataTransfer.setData("text/plain", JSON.stringify(activity.toDragData()));
    }

    /* -------------------------------------------- */

    /**
     * Handle beginning a drag-drop operation on an Item.
     * @param {DragEvent} event  The originating drag event.
     * @protected
     */
    _onDragItem(event) {
      const { itemId } = event.target.closest("[data-item-id]").dataset;
      const item = this.actor.items.get(itemId);
      if ( item ) event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _onDragStart(event) {
      // Add another deferred deactivation to catch the second pointerenter event that seems to be fired on Firefox.
      requestAnimationFrame(() => game.tooltip.deactivate());
      game.tooltip.deactivate();

      if ( event.target.matches("[data-item-id] > .item-row") ) return this._onDragItem(event);
      else if ( event.target.matches("[data-item-id] [data-activity-id], [data-item-id][data-activity-id]") ) {
        return this._onDragActivity(event);
      }
      return super._onDragStart(event);
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
        case "delete": item?.deleteDialog(); break;
        case "edit": item?.sheet.render(true, { mode: ItemSheet5e.MODES.EDIT }); break;
        case "view": item?.sheet.render(true, { mode: ItemSheet5e.MODES.PLAY }); break;
      }
    }

    /* -------------------------------------------- */

    /**
     * Handle opening the warnings dialog.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onOpenWarnings(event) {
      event.stopImmediatePropagation();
      const { top, left, height } = event.target.getBoundingClientRect();
      const { clientWidth } = document.documentElement;
      const dialog = this.form.querySelector("dialog.warnings");
      Object.assign(dialog.style, { top: `${top + height}px`, left: `${Math.min(left - 16, clientWidth - 300)}px` });
      dialog.showModal();
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

    /** @inheritDoc */
    _onResize(event) {
      super._onResize(event);
      const { width, height } = this.position;
      const key = `${this.actor.type}${this.actor.limited ? ":limited": ""}`;
      game.user.setFlag("dnd5e", `sheetPrefs.${key}`, { width, height });
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
      if ( game.release.generation < 13 ) {
        new ImagePopout(img, { title: this.actor.name, uuid: this.actor.uuid }).render(true);
      } else {
        new foundry.applications.apps.ImagePopout({
          src: img,
          uuid: this.actor.uuid,
          window: { title: this.actor.name }
        }).render({ force: true });
      }
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
     * Handle the user toggling the sidebar collapsed state.
     * @protected
     */
    _onToggleSidebar() {
      const collapsed = this._toggleSidebar();
      const activeTab = this._tabs?.[0]?.active ?? "details";
      game.user.setFlag("dnd5e", `sheetPrefs.${this.actor.type}.tabs.${activeTab}.collapseSidebar`, collapsed);
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
      const collapser = this.form.querySelector(".sidebar-collapser");
      const icon = collapser.querySelector("i");
      collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
      collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
      icon.classList.remove("fa-caret-left", "fa-caret-right");
      icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
      return collapsed;
    }

    /* -------------------------------------------- */

    /**
     * Handle rolling an ability check or saving throw.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onRollAbility(event) {
      const ability = event.currentTarget.closest("[data-ability]").dataset.ability;
      const isSavingThrow = event.currentTarget.classList.contains("saving-throw");
      if ( ability === "concentration" ) this.actor.rollConcentration({ event, legacy: false });
      else if ( isSavingThrow ) this.actor.rollSavingThrow({ ability, event });
      else this.actor.rollAbilityCheck({ ability, event });
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
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Can an item be expanded on the sheet?
     * @param {Item5e} item  Item on the sheet.
     * @returns {boolean}
     */
    canExpand(item) {
      return !["class", "subclass"].includes(item.type);
    }
  };
}
