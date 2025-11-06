/**
 * @import { TransformationSettingData } from "./data/settings/_types.mjs";
 * @import { ActivityUsageUpdates, ActivityUseConfiguration } from "./documents/activity/mixin.mjs";
 */

/**
 * Configuration data for abilities.
 *
 * @typedef AbilityConfiguration
 * @property {string} label                               Localized label.
 * @property {string} abbreviation                        Localized abbreviation.
 * @property {string} fullKey                             Fully written key used as alternate for enrichers.
 * @property {string} [reference]                         Reference to a rule page describing this ability.
 * @property {string} [type]                              Whether this is a "physical" or "mental" ability.
 * @property {Object<string, number|string>}  [defaults]  Default values for this ability based on actor type.
 *                                                        If a string is used, the system will attempt to fetch.
 *                                                        the value of the specified ability.
 * @property {string} [icon]                              An SVG icon that represents the ability.
 */

/* -------------------------------------------- */

/**
 * @typedef ActivityActivationTypeConfiguration
 * @property {string} [counted]         Localized label for the countable activation type.
 * @property {string} label             Localized label for the activation type.
 * @property {string} [header]          Localized label for the activation type header.
 * @property {string} [group]           Localized label for the presentational group.
 * @property {boolean} [passive=false]  Classify this item as a passive feature on NPC sheets.
 * @property {boolean} [scalar=false]   Does this activation type have a numeric value attached?
 * @property {ActivityActivationAutoConsumptionConfiguration} [consume]  Configuration for automatically consuming
 *                                                                       this resource.
 */

/**
 * @typedef ActivityActivationAutoConsumptionConfiguration
 * @property {ActivityActivationAutoConsumptionPredicate} [canConsume]  A predicate to check if this usage qualifies
 *                                                                      for auto-consumption.
 * @property {string} property  The path to the property that is consumed.
 */

/**
 * @callback ActivityActivationAutoConsumptionPredicate
 * @property {Activity} activity  The activity with the consumption.
 * @returns {boolean|void}        Return explicit false to block auto-consumption.
 */

/* -------------------------------------------- */

/**
 * @typedef ActivityConsumptionTargetConfiguration
 * @property {string} label                                     Localized label for the target type.
 * @property {ConsumptionConsumeFunction} consume               Function used to consume according to this type.
 * @property {ConsumptionLabelsFunction} consumptionLabels      Function used to generate a hint of consumption amount.
 * @property {string} [nonEmbeddedHint]                         Hint displayed in the target field when this type is
 *                                                              configured on an non-embedded item.
 * @property {{value: string, label: string}[]} [scalingModes]  Additional scaling modes for this consumption type in
 *                                                              addition to the default "amount" scaling.
 * @property {boolean} [targetRequiresEmbedded]                 Use text input rather than select when not embedded.
 * @property {ConsumptionValidTargetsFunction} [validTargets]   Function for creating an array of consumption targets.
 */

/**
 * @callback ConsumptionConsumeFunction
 * @this {ConsumptionTargetData}
 * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
 * @param {ActivityUsageUpdates} updates     Updates to be performed.
 * @throws ConsumptionError
 */

/**
 * @callback ConsumptionLabelsFunction
 * @this {ConsumptionTargetData}
 * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
 * @param {object} [options={}]
 * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
 * @returns {ConsumptionLabels}
 */

/**
 * @typedef ConsumptionLabels
 * @property {string} label      Label displayed for the consumption checkbox.
 * @property {string} hint       Hint text describing what should be consumed.
 * @property {{ type: string, message: string }} [notes]  Additional notes relating to the consumption to be performed.
 * @property {boolean} [warn]    Display a warning icon indicating consumption will fail.
 */

/**
 * @callback ConsumptionValidTargetsFunction
 * @this {ConsumptionTargetData}
 * @returns {FormSelectOption[]}
 */

/* -------------------------------------------- */

/**
 * @typedef ActivityTypeConfiguration
 * @property {typeof Activity} documentClass  The activity's document class.
 * @property {boolean} [configurable=true]    Whether the activity is editable via the UI.
 * @property {boolean} [hidden]               Should this activity type be hidden in the selection dialog?
 */

/* -------------------------------------------- */

/**
 * Configuration data for actor sizes.
 *
 * @typedef ActorSizeConfiguration
 * @property {string} label                   Localized label.
 * @property {string} abbreviation            Localized abbreviation.
 * @property {number} hitDie                  Default hit die denomination for NPCs of this size.
 * @property {number} [token=1]               Default token size.
 * @property {number} [capacityMultiplier=1]  Multiplier used to calculate carrying capacities.
 * @property {number} numerical               Numerical representation of size.
 */

/* -------------------------------------------- */

/**
 * Configuration information for advancement types.
 *
 * @typedef AdvancementTypeConfiguration
 * @property {typeof Advancement} documentClass  The advancement's document class.
 * @property {Set<string>} validItemTypes        What item types this advancement can be used with.
 * @property {boolean} [hidden]                  Should this advancement type be hidden in the selection dialog?
 */

/* -------------------------------------------- */

/**
 * Information needed to represent different area of effect target types.
 *
 * @typedef AreaTargetDefinition
 * @property {string} label        Localized label for this type.
 * @property {string} counted      Localization path for counted plural forms.
 * @property {string} template     Type of `MeasuredTemplate` create for this target type.
 * @property {string} [reference]  Reference to a rule page describing this area of effect.
 * @property {string[]} [sizes]    List of available sizes for this template. Options are chosen from the list:
 *                                 "radius", "width", "height", "length", "thickness". No more than 3 dimensions
 *                                 may be specified.
 * @property {boolean} [standard]  Is this a standard area of effect as defined explicitly by the rules?
 */

/* -------------------------------------------- */

/**
 * @typedef CharacterFlagConfiguration
 * @property {string} name
 * @property {string} hint
 * @property {string} section
 * @property {typeof boolean|string|number} type
 * @property {string} placeholder
 * @property {string[]} [abilities]
 * @property {Object<string, string>} [choices]
 * @property {boolean} [deprecated]               Hide the flag unless it already has a value.
 * @property {string[]} [skills]
 */

/* -------------------------------------------- */

/**
 * @typedef CraftingConfiguration
 * @property {CraftingCostsMultiplier} consumable        Discounts for crafting a magical consumable.
 * @property {Record<string, CraftingCosts>} exceptions  Crafting costs for items that are exception to the general
 *                                                       crafting rules, by identifier.
 * @property {Record<string, CraftingCosts>} magic       Magic item crafting costs by rarity.
 * @property {CraftingCostsMultiplier} mundane           Multipliers for crafting mundane items.
 * @property {Record<number, CraftingCosts>} scrolls     Crafting costs for spell scrolls by level.
 */

/**
 * @typedef CraftingCostsMultiplier
 * @property {number} days  The days multiplier.
 * @property {number} gold  The gold multiplier.
 */

/**
 * @typedef CraftingCosts
 * @property {number} days  The number of days required to craft the item, not including its base item.
 * @property {number} gold  The amount of gold required for the raw materials, not including the base item.
 */

/* -------------------------------------------- */

/**
 * Configuration data for creature types.
 *
 * @typedef CreatureTypeConfiguration
 * @property {string} label               Localized label.
 * @property {string} plural              Localized plural form used in swarm name.
 * @property {string} [reference]         Reference to a rule page describing this type.
 * @property {boolean} [detectAlignment]  Is this type detectable by spells such as "Detect Evil and Good"?
 */

/* -------------------------------------------- */

/**
 * @typedef CurrencyConfiguration
 * @property {string} label         Localized label for the currency.
 * @property {string} abbreviation  Localized abbreviation for the currency.
 * @property {number} conversion    Number by which this currency should be multiplied to arrive at a standard value.
 * @property {string} icon          Icon representing the currency in the interface.
 */

/* -------------------------------------------- */

/**
 * Configuration data for damage types.
 *
 * @typedef DamageTypeConfiguration
 * @property {string} label          Localized label.
 * @property {string} icon           Icon representing this type.
 * @property {boolean} [isPhysical]  Is this a type that can be bypassed by magical or silvered weapons?
 * @property {string} [reference]    Reference to a rule page describing this damage type.
 * @property {Color} [color]         Visual color of the damage type.
 */

/* -------------------------------------------- */

/**
 * Valid `dropEffect` value (see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect).
 * @typedef {"copy"|"move"|"link"|"none"} DropEffectValue
 */

/* -------------------------------------------- */

/**
 * Encumbrance configuration data.
 *
 * @typedef EncumbranceConfiguration
 * @property {Record<string, number>} currencyPerWeight  Pieces of currency that equal a base weight (lbs or kgs).
 * @property {number} draftMultiplier                    The carry capacity multiplier to apply to draft animals pulling
 *                                                       a vehicle.
 * @property {Record<string, object>} effects            Data used to create encumbrance-related Active Effects.
 * @property {object} threshold                          Amount to multiply strength to get given capacity threshold.
 * @property {Record<string, number>} threshold.encumbered
 * @property {Record<string, number>} threshold.heavilyEncumbered
 * @property {Record<string, number>} threshold.maximum
 * @property {Record<string, { ft: number, m: number }>} speedReduction  Speed reduction caused by encumbered status.
 * @property {Record<string, number>} vehicleWeightMultiplier  Multiplier used to determine vehicle carrying capacity.
 * @property {Record<string, Record<string, string>>} baseUnits  Base units used to calculate carrying weight.
 */

/* -------------------------------------------- */

/**
 * @typedef FacilityConfiguration
 * @property {Record<string, Record<number, number>>} advancement  The number of free facilities of a given type awarded
 *                                                                 at certain character levels.
 * @property {Record<string, FacilityOrder>} orders                Orders that can be issued to a facility.
 * @property {Record<string, FacilitySize>} sizes                  Facility size categories.
 * @property {Record<string, SubtypeTypeConfiguration>} types      Facility types and subtypes.
 */

/**
 * @typedef FacilityOrder
 * @property {string} label       The human-readable name of the order.
 * @property {string} icon        The SVG icon for this order.
 * @property {boolean} [basic]    Whether this order can be issued to basic facilities.
 * @property {number} [duration]  The amount of time taken to complete the order if different to a normal bastion turn.
 * @property {boolean} [hidden]   This order is not normally available for execution.
 */

/**
 * @typedef FacilitySize
 * @property {string} label    The human-readable name of the size category.
 * @property {number} days     The number of days to build the facility.
 * @property {number} squares  The maximum area the facility may occupy in the bastion plan.
 * @property {number} value    The cost in gold pieces to build the facility.
 */

/* -------------------------------------------- */

/**
 * A filter description.
 *
 * @typedef FilterDescription
 * @property {string} k        Key on the data object to check.
 * @property {any} v           Value to compare.
 * @property {string} [o="_"]  Operator or comparison function to use.
 */

/* -------------------------------------------- */

/**
 * @typedef HabitatConfiguration5e
 * @property {string} label        The human-readable habitat name.
 * @property {boolean} [subtypes]  Whether this habitat is divided into sub-types.
 */

/* -------------------------------------------- */

/**
 * @typedef IndividualTargetDefinition
 * @property {string} label           Localized label for this type.
 * @property {string} [counted]       Localization path for counted plural forms. Only necessary for scalar types.
 * @property {boolean} [scalar=true]  Can this target take an associated numeric value?
 */

/* -------------------------------------------- */

/**
 * Configuration data for item properties.
 *
 * @typedef ItemPropertyConfiguration
 * @property {string} label           Localized label.
 * @property {string} [abbreviation]  Localized abbreviation.
 * @property {string} [icon]          Icon that can be used in certain places to represent this property.
 * @property {string} [reference]     Reference to a rule page describing this property.
 * @property {boolean} [isPhysical]   Is this property one that can cause damage resistance bypasses?
 * @property {boolean} [isTag]        Is this spell property a tag, rather than a component?
 */

/* -------------------------------------------- */

/**
 * Configuration data for limited use periods.
 *
 * @typedef LimitedUsePeriodConfiguration
 * @property {string} label                Localized label.
 * @property {string}  abbreviation        Shorthand form of the label.
 * @property {"combat"|"special"} [group]  Grouping if outside the normal "time" group.
 * @property {boolean} [formula]           Whether this limited use period restores charges via formula.
 */

/* -------------------------------------------- */

/**
 * Configuration data for a map marker style. Options not included will fall back to the value set in `default` style.
 * Any additional styling options added will be passed into the custom marker class and be available for rendering.
 *
 * @typedef MapLocationMarkerStyle
 * @property {typeof PIXI.Container} [icon]  Map marker class used to render the icon.
 * @property {number} [backgroundColor]      Color of the background inside the circle.
 * @property {number} [borderColor]          Color of the border in normal state.
 * @property {number} [borderHoverColor]     Color of the border when hovering over the marker.
 * @property {string} [fontFamily]           Font used for rendering the code on the marker.
 * @property {number} [shadowColor]          Color of the shadow under the marker.
 * @property {number} [textColor]            Color of the text on the marker.
 */

/* -------------------------------------------- */

/**
 * @typedef MovementTypeConfiguration
 * @property {string} label            Localized label for the movement type.
 * @property {string} [travel]         Travel type in `CONFIG.DND5E.travelTypes` to map this movement speed to. If not
 *                                     provided, then `land` is assumed.
 * @property {boolean} [walkFallback]  When this special movement type runs out, can the actor fall back to using their
 *                                     walk speed at 2x cost?
 */

/* -------------------------------------------- */

/**
 * @typedef RegisteredItemData
 * @property {string} name        Name of the item.
 * @property {string} identifier  Item identifier.
 * @property {string} img         Item's icon.
 * @property {string[]} sources   UUIDs of different compendium items matching this identifier.
 */

/* -------------------------------------------- */

/**
 * Configuration data for rest types.
 *
 * @typedef RestTypeConfiguration
 * @property {Record<string, number>} duration      Duration of different rest variants in minutes.
 * @property {string} label                         Localized label for the rest type.
 * @property {string} icon                          Icon representing this rest type. Can be either a set of FontAwesome
 *                                                  classes or an image path.
 * @property {string[]} [activationPeriods]         Activation types that should be displayed in the chat card.
 * @property {number} [exhaustionDelta]             Delta exhaustion to apply to creatures undergoing the rest.
 * @property {boolean} [recoverHitDice]             Should hit dice be recovered during this rest?
 * @property {boolean} [recoverHitPoints]           Should hit points be recovered during this rest?
 * @property {string[]} [recoverPeriods]            What recovery periods should be applied when this rest is taken. The
 *                                                  ordering of the periods determines which is applied if more than one
 *                                                  recovery profile is found.
 * @property {Set<string>} [recoverSpellSlotTypes]  Types of spellcasting slots to recover during this rest.
 */

/* -------------------------------------------- */

/**
 * @callback RequestCallback5e
 * @param {Actor5e} actor               The actor fulfilling the request.
 * @param {ChatMessage5e} request       The request message.
 * @param {object} config               Additional request configuration.
 * @param {RequestOptions5e} [options]  Additional options provided at fulfillment time.
 * @returns {Promise<ChatMessage5e>}    Result chat message that will be associated with request.
 */

/**
 * @typedef RequestOptions5e
 * @property {Event} [event]  The event forwarded from the user clicking the request button.
 */

/* -------------------------------------------- */

/**
 * Configuration information for rule types.
 *
 * @typedef RuleTypeConfiguration
 * @property {string} label         Localized label for the rule type.
 * @property {string} [references]  Key path for a configuration object that contains reference data.
 */

/* -------------------------------------------- */

/**
 * Configuration data for skills.
 *
 * @typedef SkillConfiguration
 * @property {string} label        Localized label.
 * @property {string} ability      Key for the default ability used by this skill.
 * @property {string} fullKey      Fully written key used as alternate for enrichers.
 * @property {string} [reference]  Reference to a rule page describing this skill.
 * @property {object} [pace]       Configuration for skills affected by travel pace.
 * @property {Set<TravelPace5e>} [pace.advantage]     Grant advantage on this skill when traveling at the given paces.
 * @property {Set<TravelPace5e>} [pace.disadvantage]  Grant disadvantage on this skill when traveling at the given
 *                                                    paces.
 */

/* -------------------------------------------- */

/**
 * Configuration data for spellcasting foci.
 *
 * @typedef SpellcastingFocusConfiguration
 * @property {string} label                    Localized label for this category.
 * @property {Object<string, string>} itemIds  Item IDs or UUIDs.
 */

/* -------------------------------------------- */

/**
 * @typedef SpellcastingPreparationState5e
 * @property {string} label  The human-readable label.
 * @property {number} value  A unique number representing this state.
 */

/* -------------------------------------------- */

/**
 * Configuration data for spell schools.
 *
 * @typedef SpellSchoolConfiguration
 * @property {string} label        Localized label.
 * @property {string} icon         Spell school icon.
 * @property {string} fullKey      Fully written key used as alternate for enrichers.
 * @property {string} [reference]  Reference to a rule page describing this school.
 */

/* -------------------------------------------- */

/**
 * @typedef SpellScrollValues
 * @property {number} bonus  Attack to hit bonus.
 * @property {number} dc     Saving throw DC.
 */

/* -------------------------------------------- */

/**
 * @typedef _StatusEffectConfig5e
 * @property {string} img                    Image used to represent the condition on the token.
 * @property {number} [order]                Order status to the start of the token HUD, rather than alphabetically.
 * @property {string} [reference]            UUID of a journal entry with details on this condition.
 * @property {string} [special]              Set this condition as a special status effect under this name.
 * @property {string[]} [riders]             Additional conditions, by id, to apply as part of this condition.
 * @property {string} [exclusiveGroup]       Any status effects with the same group will not be able to be applied at
 *                                           the same time through the token HUD (multiple statuses applied through
 *                                           other effects can still coexist).
 * @property {number} [coverBonus]           A bonus this condition provides to AC and dexterity saving throws.
 * @property {boolean} [neverBlockMovement]  If true, a token with this status will not block movement for other tokens.
 */

/**
 * Configuration data for system status effects.
 * @typedef {Omit<StatusEffectConfig, "img"> & _StatusEffectConfig5e} StatusEffectConfig5e
 */

/**
 * @typedef _ConditionConfiguration
 * @property {string} name         Localized name for the condition.
 * @property {boolean} [pseudo]    Is this a pseudo-condition, i.e. one that does not appear in the conditions appendix
 *                                 but acts as a status effect?
 * @property {number} [levels]     The number of levels of exhaustion an actor can obtain.
 * @property {{ rolls: number, speed: number }} [reduction]  Amount D20 Tests & Speed are reduced per exhaustion level
 *                                                           when using the modern rules. Speed reduction is measured
 *                                                           in the default imperial units and converted to metric
 *                                                           if necessary.
 */

/**
 * Configuration data for system conditions.
 * @typedef {Omit<StatusEffectConfig5e, "name"> & _ConditionConfiguration} ConditionConfiguration
 */

/* -------------------------------------------- */

/**
 * Configuration data for an items that have sub-types.
 *
 * @typedef SubtypeTypeConfiguration
 * @property {string} label                       Localized label for this type.
 * @property {Record<string, string>} [subtypes]  Enum containing localized labels for subtypes.
 */

/* -------------------------------------------- */

/**
 * Important information on a targeted token.
 *
 * @typedef TargetDescriptor5e
 * @property {string} uuid  The UUID of the target.
 * @property {string} img   The target's image.
 * @property {string} name  The target's name.
 * @property {number} ac    The target's armor class, if applicable.
 */

/* -------------------------------------------- */

/**
 * @typedef ToolConfiguration
 * @property {string} ability  Default ability used for the tool.
 * @property {string} id       UUID of reference tool or ID within pack defined by `DND5E.sourcePacks.ITEMS`.
 */

/* -------------------------------------------- */

/**
 * Trait configuration information.
 *
 * @typedef TraitConfiguration
 * @property {object} labels
 * @property {string} labels.title         Localization key for the trait name.
 * @property {string} labels.localization  Prefix for a localization key that can be used to generate various
 *                                         plural variants of the trait type.
 * @property {string} [labels.all]         Localization to use for the "all" option for this trait. If not provided,
 *                                         then no all option will be available.
 * @property {string} icon                 Path to the icon used to represent this trait.
 * @property {string} [actorKeyPath]       If the trait doesn't directly map to an entry as `traits.[key]`, where is
 *                                         this trait's data stored on the actor?
 * @property {string} [configKey]          If the list of trait options doesn't match the name of the trait, where can
 *                                         the options be found within `CONFIG.DND5E`?
 * @property {boolean|number} [dataType]   Type of data represented.
 * @property {string} [labelKeyPath]       If config is an enum of objects, where can the label be found?
 * @property {object} [subtypes]           Configuration for traits that take some sort of base item.
 * @property {string} [subtypes.keyPath]   Path to subtype value on base items, should match a category key.
 *                                         Deprecated in favor of the standardized `system.type.value`.
 * @property {string[]} [subtypes.ids]     Key for base item ID objects within `CONFIG.DND5E`.
 * @property {object} [children]           Mapping of category key to an object defining its children.
 * @property {boolean} [sortCategories]    Whether top-level categories should be sorted.
 * @property {boolean} [expertise]         Can an actor receive expertise in this trait?
 * @property {boolean} [mastery]           Can an actor receive mastery in this trait?
 */

/* -------------------------------------------- */

/**
 * @typedef TransformationConfiguration
 * @property {Record<string, TransformationFlagConfiguration>} effects
 * @property {Record<string, TransformationFlagConfiguration>} keep
 * @property {Record<string, TransformationFlagConfiguration>} merge
 * @property {Record<string, TransformationFlagConfiguration>} others
 * @property {Record<string, TransformationPresetConfiguration} presets
 */

/**
 * @typedef TransformationFlagConfiguration
 * @property {string} label         Localized label for the flag.
 * @property {string} [hint]        Localized hint for the flag.
 * @property {boolean} [default]    This should be part of the default transformation settings.
 * @property {string[]} [disables]  Names of specific settings to disable, or whole categories if an `*` is used.
 */

/**
 * @typedef TransformationPresetConfiguration
 * @property {string} icon                                  Icon representing this preset on the button.
 * @property {string} label                                 Localized label for the preset.
 * @property {Partial<TransformationSettingData>} settings  Options that will be set for the preset.
 */

/* -------------------------------------------- */

/**
 * @typedef TravelPaceConfiguration
 * @property {string} label       The human-readable label.
 * @property {number} standard    The standard pace value in miles per day.
 * @property {number} multiplier  The speed up or slow down factor for this travel pace.
 */

/* -------------------------------------------- */

/**
 * @typedef TreasureConfiguration5e
 * @property {string} label  The human-readable treasure category name.
 */

/* -------------------------------------------- */

/**
 * @typedef UnitConfiguration
 * @property {string} label              Localized label for the unit.
 * @property {string} abbreviation       Localized abbreviation for the unit.
 * @property {number} conversion         Multiplier used to convert between various units.
 * @property {string} [counted]          Localization path for counted plural forms in various unit display modes.
 *                                       Only necessary if non-supported unit or using a non-standard name for a
 *                                       supported unit.
 * @property {string} [formattingUnit]   Unit formatting value as supported by javascript's internationalization system:
 *                                       https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers. Only
 *                                       required if the formatting name doesn't match the unit key.
 * @property {"imperial"|"metric"} type  Whether this is an "imperial" or "metric" unit.
 */

/**
 * @typedef {UnitConfiguration} MovementUnitConfiguration
 * @property {"day"|"round"} [travelResolution]  Whether the distance is per-round or per-day when used in the context
 *                                               of overland travel.
 */

/**
 * @typedef {Omit<UnitConfiguration, "abbreviation"|"type">} TimeUnitConfiguration
 * @property {boolean} [combat=false]  Is this a combat-specific time unit?
 * @property {boolean} [option=true]   Should this be available when users can select from a list of units?
 */

/**
 * @typedef {Omit<UnitConfiguration, "abbreviation">} TravelUnitConfiguration
 * @property {string} abbreviationDay   Abbreviated form when using days as the travel period.
 * @property {string} abbreviationHour  Abbreviated form when using hours as the travel period.
 */

/* -------------------------------------------- */

/**
 * @typedef UnitValue5e
 * @property {string} units
 * @property {number} value
 */

/* -------------------------------------------- */

/**
 * @typedef WeaponMasterConfiguration
 * @property {string} label        Localized label for the mastery
 * @property {string} [reference]  Reference to a rule page describing this mastery.
 */
