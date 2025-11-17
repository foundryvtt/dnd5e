![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=5.1.0&color=informational)

## Rolling Process

The rolling process includes a number of standard hooks that are called by most rolls performed by the system.

### `dnd5e.preRoll`

A hook event that fires before a roll is performed. Multiple hooks may be called depending on the rolling method (e.g. `dnd5e.preRollSkill`, `dnd5e.preRollAbilityCheck`, `dnd5e.preRoll`). Exact contents of the configuration object will also change based on the roll type, but the same objects will always be present. Returning `false` will prevent the normal rolling process.

| Name    | Type                           | Description                             |
| ------- | ------------------------------ | --------------------------------------- |
| config  | BasicRollProcessConfiguration  | Configuration information for the roll. |
| dialog  | BasicRollDialogConfiguration   | Configuration for the roll dialog.      |
| message | BasicRollMessageConfiguration  | Configuration for the roll message.     |

### `dnd5e.postRollConfiguration`

A hook event that fires after roll configuration is complete, but before the roll is evaluated. Multiple hooks may be called depending on the rolling method (e.g. `dnd5e.postSkillCheckRollConfiguration`, `dnd5e.postAbilityTestRollConfiguration`, and `dnd5e.postRollConfiguration` for skill checks). Exact contents of the configuration object will also change based on the roll type, but the same objects will always be present. Returning `false` will prevent the normal rolling process.

| Name    | Type                           | Description                                         |
| ------- | ------------------------------ | --------------------------------------------------- |
| rolls   | BasicRoll[]                    | Rolls that have been constructed but not evaluated. |
| config  | BasicRollProcessConfiguration  | Configuration information for the roll.             |
| dialog  | BasicRollDialogConfiguration   | Configuration for the roll dialog.                  |
| message | BasicRollMessageConfiguration  | Configuration for the roll message.                 |

### `dnd5e.buildRollConfig`

A hook event that fires when a roll config is built using the roll prompt. Multiple hooks may be called depending on the rolling method (e.g. `dnd5e.buildSkillRollConfig`, `dnd5e.buildAbilityCheckRollConfig`, `dnd5e.buildRollConfig`).

| Name     | Type                           | Description                                         |
| -------- | ------------------------------ | --------------------------------------------------- |
| app      | RollConfigurationDialog        | Roll configuration dialog.                          |
| config   | BasicRollConfiguration         | Roll configuration data.                            |
| formData | [FormDataExtended]             | Any data entered into the rolling prompt.           |
| index    | number                         | Index of the roll within all rolls being prepared.  |

### `dnd5e.postBuildRollConfiguration`

A hook event that fires after a roll config has been built using the roll prompt. Multiple hooks may be called  depending on the rolling method (e.g. `dnd5e.postBuildSkillRollConfig`, `dnd5e.postBuildAbilityCheckRollConfig`, `dnd5e.postBuildRollConfig`).

| Name             | Type                           | Description                                         |
| ---------------- | ------------------------------ | --------------------------------------------------- |
| process          | BasicRollProcessConfiguration  | Full process configuration data.                    |
| config           | BasicRollConfiguration         | Roll configuration data.                            |
| index            | number                         | Index of the roll within all rolls being prepared.  |
| options          | [object]                       |                                                     |
| options.app      | [RollConfigurationDialog]      | Roll configuration dialog.                          |
| options.formData | [FormDataExtended]             | Any data entered into the rolling prompt.           |

## Actor

### `dnd5e.compute___Progression` (`dnd5e.computeSpellProgression`, `dnd5e.computePactProgression`)

A hook event that fires while computing the spellcasting progression for each class on each actor. A different version of the hook will be fired for each spellcasting method defined in `CONFIG.DND5E.spellcasting`. Returning `false` will prevent additional computation of this progression.

| Name        | Type         | Description                                                       |
| ----------- | ------------ | ----------------------------------------------------------------- |
| spells      | object       | The `data.spells` object within actor's data. *Will be mutated.*  |
| actor       | Actor5e|void | Actor for whom the data is being prepared, if any.                |
| progression | object       | Spellcasting progression data.                                    |

### `dnd5e.prepare___Slots` (`dnd5e.prepareSpellSlots`, `dnd5e.preparePactSlots`)

A hook event that fires to convert the provided spellcasting progression into spell slots. A different version of the hook will be fired for each spellcasting method defined in `CONFIG.DND5E.spellcasting`. Returning `false` will prevent additional preparation of this progression.

| Name         | Type                    | Description                                        |
| ------------ | ----------------------- | -------------------------------------------------- |
| progression  | object                  | Spellcasting progression data. *Will be mutated.*  |
| actor        | Actor5e|void            | Actor for whom the data is being prepared.         |
| cls          | Item5e                  | Class for whom this progression is being computed. |
| spellcasting | SpellcastingDescription | Spellcasting descriptive object.                   |
| count        | number                  | Number of classes with this type of spellcasting.  |

### `dnd5e.preRollAbilityCheck` & `dnd5e.preRollSavingThrow`

See `dnd5e.preRoll` for more details. Passes `AbilityRollProcessConfiguration` for the `config` parameter.

### `dnd5e.rollAbilityCheck` & `dnd5e.rollSavingThrow`

A hook event that fires after an ability check or save has been rolled.

| Name          | Type      | Description                                                               |
| ------------- | --------- | ------------------------------------------------------------------------- |
| rolls         | D20Roll[] | The resulting rolls.                                                      |
| data          | object    |                                                                           |
| data.ability  | string    | ID of the ability that was rolled as defined in `CONFIG.DND5E.abilities`. |
| data.subject  | Actor5e   | Actor for which the hit die has been rolled.                              |

### `dnd5e.preBeginConcentrating`

Fires before a concentration effect is created. Returning `false` will prevent concentration effect from being created.

| Name       | Type     | Description                                    |
| ---------- | -------- | ---------------------------------------------- |
| actor      | Actor5e  | The actor initiating concentration.            |
| item       | Item5e   | The item that will be concentrated on.         |
| effectData | object   | Data used to create the ActiveEffect.          |
| activity   | Activity | The activity that triggered the concentration. |

### `dnd5e.beginConcentrating`

Fires after a concentration effect is created.

| Name     | Type           | Description                                    |
| -------- | -------------- | ---------------------------------------------- |
| actor    | Actor5e        | The actor initiating concentration.            |
| item     | Item5e         | The item that is being concentrated on.        |
| effect   | ActiveEffect5e | The created ActiveEffect instance.             |
| activity | Activity       | The activity that triggered the concentration. |

### `dnd5e.preEndConcentration`

Fires before a concentration effect is deleted. Returning `false` will prevent concentration effect from being deleted.

| Name   | Type           | Description                            |
| ------ | -------------- | -------------------------------------- |
| actor  | Actor5e        | The actor ending concentration.        |
| effect | ActiveEffect5e | The ActiveEffect that will be deleted. |

### `dnd5e.endConcentration`

Fires after a concentration effect is deleted.

| Name   | Type           | Description                        |
| ------ | -------------- | ---------------------------------- |
| actor  | Actor5e        | The actor ending concentration.    |
| effect | ActiveEffect5e | The ActiveEffect that was deleted. |

### `dnd5e.preRollConcentration`

See `dnd5e.preRoll` for more details. Passes `D20RollProcessConfiguration` for the `config` parameter.

### `dnd5e.rollConcentration`

A hook event that fires after a saving throw to maintain concentration is rolled for an Actor.

| Name               | Type      | Description                                             |
| ------------------ | --------- | ------------------------------------------------------- |
| rolls              | D20Roll[] | The resulting rolls.                                    |
| data               | object    |                                                         |
| data.subject       | Actor5e   | Actor for which the concentration save has been rolled. |

### `dnd5e.preCalculateDamage`

Fires before damage amount is calculated for an actor. Returning `false` will prevent damage from being applied.

| Name    | Type                     | Description                            |
| ------- | ------------------------ | -------------------------------------- |
| actor   | Actor5e                  | The actor being damaged.               |
| damages | DamageDescription[]      | Damage descriptions.                   |
| options | DamageApplicationOptions | Additional damage application options. |

### `dnd5e.calculateDamage`

Fires after damage values are calculated for an actor. Returning `false` will prevent damage from being applied.

| Name    | Type                     | Description                            |
| ------- | ------------------------ | -------------------------------------- |
| actor   | Actor5e                  | The actor being damaged.               |
| damages | DamageDescription[]      | Damage descriptions.                   |
| options | DamageApplicationOptions | Additional damage application options. |

### `dnd5e.preApplyDamage`

Fires before damage is applied to an actor. Returning `false` will prevent damage from being applied.

| Name    | Type                     | Description                                    |
| ------- | ------------------------ | ---------------------------------------------- |
| actor   | Actor5e                  | Actor the damage will be applied to.           |
| amount  | number                   | Amount of damage that will be applied.         |
| updates | object                   | Distinct updates to be performed on the actor. |
| options | DamageApplicationOptions | Additional damage application options.         |

### `dnd5e.applyDamage`

Fires after damage has been applied to an actor.

| Name    | Type                     | Description                             |
| ------- | ------------------------ | --------------------------------------- |
| actor   | Actor5e                  | Actor that has been damaged.            |
| amount  | number                   | Amount of damage that has been applied. |
| options | DamageApplicationOptions | Additional damage application options.  |

### `dnd5e.healActor` & `dnd5e.damageActor`

A hook event that fires when an actor is damaged or healed by any means. The actual name of the hook will depend on the change in hit points.

| Name          | Type    | Description                                  |
| ------------- | ------- | -------------------------------------------- |
| actor         | Actor5e | The actor that had their hit points reduced. |
| changes       | object  | The changes to hit points.                   |
| changes.hp    | number  | The change to hit points.                    |
| changes.temp  | number  | The change to temporary hit points.          |
| changes.total | number  | The summed changes to hit points.            |
| update        | object  | The original update delta.                   |
| userId        | string  | Id of the user that performed the update.    |

### `dnd5e.preRollDeathSave`

See `dnd5e.preRoll` for more details. Passes `D20RollProcessConfiguration` for the `config` parameter.

### `dnd5e.rollDeathSave`

A hook event that fires after a death saving throw has been rolled for an Actor, but before updates have been performed. Return `false` to prevent updates from being performed.

| Name            | Type      | Description                                                         |
| --------------- | --------- | ------------------------------------------------------------------- |
| rolls           | D20Roll[] | The resulting rolls.                                                |
| data            | object    |                                                                     |
| data.chatString | string    | Localizable string displayed in the create chat message. If not set, then no chat message will be displayed. |
| data.updates    | object    | Updates that will be applied to the actor as a result of this save. |
| data.subject    | Actor5e   | Actor for which the death saving throw has been rolled.             |

### `dnd5e.postRollDeathSave`

A hook event that fires after a death saving throw has been rolled and after changes have been applied.

| Name          | Type                | Description                                              |
| ------------- | ------------------- | -------------------------------------------------------- |
| rolls         | D20Roll[]           | The resulting rolls.                                     |
| data          | object              |                                                          |
| data.message  | ChatMessage5e|void  | The created results chat message.                        |
| data.subject  | Actor5e             | Actor for which the death saving throw has been rolled.  |

### `dnd5e.preRollSkill` & `dnd5e.preRollToolCheck`

See `dnd5e.preRoll` for more details. Passes `SkillToolRollProcessConfiguration` for the `config` parameter and `SkillToolRollDialogConfiguration` for the `dialog` parameter.

### `dnd5e.rollSkill` & `dnd5e.rollToolCheck`

A hook event that fires after an skill or tool check has been rolled.

| Name          | Type      | Description                                                          |
| ------------- | --------- | -------------------------------------------------------------------- |
| rolls         | D20Roll[] | The resulting rolls.                                                 |
| data          | object    |                                                                      |
| data.skill    | [string]  | ID of the skill that was rolled as defined in `CONFIG.DND5E.skills`. |
| data.tool     | [string]  | ID of the tool that was rolled as defined in `CONFIG.DND5E.tools`.   |
| data.subject  | Actor5e   | Actor for which the hit die has been rolled.                         |

### `dnd5e.preRollHitDie`

See `dnd5e.preRoll` for more details. Passes `HitDieRollProcessConfiguration` for the `config` parameter.

### `dnd5e.rollHitDie`

Fires after a hit die has been rolled, but before updates have been applied. Returning `false` will prevent updates from being performed.

| Name               | Type        | Description                                  |
| ------------------ | ----------- | -------------------------------------------- |
| rolls              | BasicRoll[] | The resulting rolls.                         |
| data               | object      |                                              |
| data.subject       | Actor5e     | Actor for which the hit die has been rolled. |
| data.updates       | object      |                                              |
| data.updates.actor | object      | Updates that will be applied to the actor.   |
| data.updates.class | object      | Updates that will be applied to the class.   |

### `dnd5e.preRollClassHitPoints`

Fires before hit points are rolled for a character's class.

| Name             | Type    | Description                                                           |
| ---------------- | ------- | --------------------------------------------------------------------- |
| actor            | Actor5e | Actor for which the hit points are being rolled.                      |
| item             | Item5e  | The class item whose hit dice will be rolled.                         |
| rollData         | object  |                                                                       |
| rollData.formula | string  | The string formula to parse.                                          |
| rollData.data    | object  | The data object against which to parse attributes within the formula. |
| messageData      | object  | The data object to use when creating the message.                     |

### `dnd5e.rollClassHitPoints`

Fires after hit points haven been rolled for a character's class.

| Name  | Type    | Description                                      |
| ----- | ------- | ------------------------------------------------ |
| actor | Actor5e | Actor for which the hit points have been rolled. |
| roll  | Roll    | The resulting roll.                              |

### `dnd5e.preRollNPCHitPoints`

Fires before hit points are rolled for an NPC.

| Name             | Type    | Description                                                           |
| ---------------- | ------- | --------------------------------------------------------------------- |
| actor            | Actor5e | Actor for which the hit points are being rolled.                      |
| rollData         | object  |                                                                       |
| rollData.formula | string  | The string formula to parse.                                          |
| rollData.data    | object  | The data object against which to parse attributes within the formula. |
| messageData      | object  | The data object to use when creating the message.                     |

### `dnd5e.rollNPChitPoints`

Fires after hit points are rolled for an NPC.

| Name  | Type    | Description                                      |
| ----- | ------- | ------------------------------------------------ |
| actor | Actor5e | Actor for which the hit points have been rolled. |
| roll  | Roll    | The resulting roll.                              |

### `dnd5e.preRollInitiativeDialog`

See `dnd5e.preRoll` for more details. Is only called when rolling initiative using the initiative dialog, not directly through the combat tracker.

### `dnd5e.preRollInitiative`

Fires before initiative is rolled for an Actor.

| Name  | Type    | Description                           |
| ------| ------- | ------------------------------------- |
| actor | Actor5e | The Actor that is rolling initiative. |
| roll  | D20Roll | The pre-evaluated roll.               |

### `dnd5e.rollInitiative`

Fires after an Actor has rolled for initiative.

| Name       | Type        | Description                                             |
| ---------- | ----------- | ------------------------------------------------------- |
| actor      | Actor5e     | The Actor that rolled initiative.                       |
| combatants | Combatant[] | The associated Combatants whose initiative was updated. |

### `dnd5e.preShortRest`

Fires before a short rest is started. Returning `false` will prevent the rest from being performed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | The actor that is being rested. |
| config | RestConfiguration | Configuration options for the rest. |

### `dnd5e.preLongRest`

Fires before a long rest is started. Returning `false` will prevent the rest from being performed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | The actor that is being rested. |
| config | RestConfiguration | Configuration options for the rest. |

### `dnd5e.preRestCompleted`

Fires after rest result is calculated, but before any updates are performed. Returning `false` will prevent updates from being performed.

| Name   | Type              | Description                               |
| ------ | ----------------- | ----------------------------------------- |
| actor  | Actor5e           | The actor that is being rested.           |
| result | RestResult        | Details on the rest to be completed.      |
| config | RestConfiguration | Configuration data for the rest occuring. |

### `dnd5e.restCompleted`

Fires when the actor completes a short or long rest.

| Name   | Type              | Description                               |
| ------ | ----------------- | ----------------------------------------- |
| actor  | Actor5e           | The actor that just completed resting.    |
| result | RestResult        | Details on the completed rest.            |
| config | RestConfiguration | Configuration data for the rest occuring. |

### `dnd5e.groupRestCompleted`

Fires when the rest process is completed for a group.

| Name   | Type                     | Description                            |
| ------ | ------------------------ | -------------------------------------- |
| group  | Actor5e                  | The group that just completed resting. |
| result | Map<Actor5e, RestResult> | Details on the rests completed.        |

### `dnd5e.transformActorV2`

A hook event that fires just before the actor is transformed.

| Name     | Type                   | Description                                                     |
| -------- | ---------------------- | --------------------------------------------------------------- |
| host     | Actor5e                | The original actor before transformation.                       |
| source   | Actor5e                | The source actor into which to transform.                       |
| data     | object                 | The data that will be used to create the new transformed actor. |
| settings | TransformationSettings | Settings that determine how the transformation is performed.    |
| options  | object                 | Rendering options passed to the actor creation.                 |

### `dnd5e.transformActor` **Deprecated**

Fires just before a new actor is created during the transform process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | The original actor before transformation. |
| target | Actor5e | The target actor being transformed into. |
| data | object | The merged data that will be used to create the newly-transformed actor. |
| options | TransformationOptions | Options that determine how the transformation is performed. |

### `dnd5e.compute___Progression` (`dnd5e.computeLeveledProgression` & `dnd5e.computePactProgression` by default)

Fires while computing the spellcasting progression for each class on each actor. A different version of the hook will be fired for each spellcasting type defined in `CONFIG.DND5E.spellcastingTypes`. Explicitly return `false` to prevent default progression from being calculated.

| Name         | Type                     | Description                                        |
| ------------ | ------------------------ | -------------------------------------------------- |
| progression  | object                   | Spellcasting progression data.                     |
| actor        | Actor5e|null             | Actor for whom the data is being prepared.         |
| cls          | Item5e                   | Class for whom this progression is being computed. |
| spellcasting | SpellcastingDescriptions | Spellcasting descriptive object.                   |
| count        | number                   | Number of classes with this type of spellcasting.  |

### `dnd5e.prepare___Slots` (`dnd5e.prepareLeveledSlots` & `dnd5e.preparePactSlots` by default)

Fires to convert the provided spellcasting progression into spell slots. A different version of the hook will be fired for each spellcasting type defined in `CONFIG.DND5E.spellcastingTypes`.

| Name        | Type    | Description                                   |
| ----------- | ------- | --------------------------------------------- |
| spells      | object  | The `data.spells` object within actor's data. |
| actor       | Actor5e | Actor for whom the data is being prepared.    |
| progression | object  | Spellcasting progression data.                |


## Actor Sheets

### `dnd5e.filterItem`

Fires when a sheet filters an item. Returning `false` will prevent item from being displayed.

| Name     | Type                          | Description                              |
| -------- | ----------------------------- | ---------------------------------------- |
| sheet    | BaseActorSheet|ContainerSheet | The sheet the item is being rendered on. |
| item     | Item5e                        | The item being filtered.                 |
| filters  | Set<string>                   | Filters applied to the Item.             |


## Actor & Item Sheets

### `dnd5e.prepareSheetContext`

Fires during preparation of sheet parts.

| Name     | Type                     | Description                                 |
| -------- | ------------------------ | ------------------------------------------- |
| sheet    | BaseActorSheet           | Sheet being rendered.                       |
| partId   | string                   | The ID of the part being prepared.          |
| context  | object                   | Preparation context that should be mutated. |
| options  | object                   | Render options.                             |


## Advancement

### `dnd5e.preAdvancementManagerRender`

Fires when an `AdvancementManager` is about to be processed. Returning `false` will prevent the normal rendering process.

| Name               | Type               | Description                                   |
| ------------------ | ------------------ | --------------------------------------------- |
| advancementManager | AdvancementManager | The advancement manager about to be rendered. |

### `dnd5e.preAdvancementManagerComplete`

| Name               | Type               | Description                                     |
| ------------------ | ------------------ | ----------------------------------------------- |
| advancementManager | AdvancementManager | The advancement manager.                        |
| actorUpdates       | object             | Updates to the actor.                           |
| toCreate           | object[]           | Items that will be created on the actor.        |
| toUpdate           | object[]           | Items that will be updated on the actor.        |
| toDelete           | string[]           | IDs of items that will be deleted on the actor. |

### `dnd5e.advancementManagerComplete`

Fires when an `AdvancementManager` is done modifying an actor.

| Name               | Type               | Description                                   |
| ------------------ | ------------------ | --------------------------------------------- |
| advancementManager | AdvancementManager | The advancement manager that just completed. |

### Document Modification Context

All of the normal 'pre' and 'post' hook events for document modification when an advancement manager flow finishes (Actor Update, Item Creation, Item Update, and Item Deletion) have a custom flag on them: `isAdvancement`. This allows a hook listener to react differently to advancement-created hook events vs normal ones.

```js
Hooks.on('updateActor', (actor, change, options) => {
  if ( options.isAdvancement ) {
    // do something special
  }
})
```

## Chat Messages

### `dnd5e.renderChatMessage`

Fires after dnd5e-specific chat message modifications have completed.

| Name    | Type          | Description                   |
| ------- | ------------- | ----------------------------- |
| message | ChatMessage5e | Chat message being rendered.  |
| html    | HTMLElement   | HTML contents of the message. |


## Compendium Browser

### `dnd5e.compendiumBrowserSelection`

Fires when a compendium browser is submitted with selected items.

| Name     | Type              | Description                                     |
| -------- | ----------------- | ----------------------------------------------- |
| browser  | CompendiumBrowser | Compendium Browser application being submitted. |
| selected | Set<string>       | Set of document UUIDs that are selected.        |


## Activities

### `dnd5e.preUseActivity`

Fires before an activity usage is configured. Returning `false` will prevent activity from being used.

| Name          | Type                         | Description                                      |
| ------------- | ---------------------------- | ------------------------------------------------ |
| activity      | Activity                     | Activity being used.                             |
| usageConfig   | ActivityUseConfiguration     | Configuration info for the activation.           |
| dialogConfig  | ActivityDialogConfiguration  | Configuration info for the usage dialog.         |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message. |

### `dnd5e.postUseActivity`

Fires when an activity is activated.

| Name          | Type                     | Description                            |
| ------------- | ------------------------ | -------------------------------------- |
| activity      | Activity                 | Activity being used.                   |
| usageConfig   | ActivityUseConfiguration | Configuration info for the activation. |
| results       | ActivityUsageResults     | Final details on the activation.       |

### `dnd5e.preUseLinkedSpell`

A hook event that fires before a linked spell is used by a Cast activity. Returning `false` will prevent activity from being used.

| Name          | Type                         | Description                                      |
| ------------- | ---------------------------- | ------------------------------------------------ |
| activity      | CastActivity                 | Activity being used.                             |
| usageConfig   | ActivityUseConfiguration     | Configuration info for the activation.           |
| dialogConfig  | ActivityDialogConfiguration  | Configuration info for the usage dialog.         |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message. |

### `dnd5e.postUseLinkedSpell`

A hook event that fires after a linked spell is used by a Cast activity.

| Name          | Type                     | Description                            |
| ------------- | ------------------------ | -------------------------------------- |
| activity      | CastActivity             | Activity being used.                   |
| usageConfig   | ActivityUseConfiguration | Configuration info for the activation. |
| results       | ActivityUsageResults     | Final details on the activation.       |

### `dnd5e.preActivityConsumption`

Fires before an item's resource consumption is calculated. Returning `false` will prevent activity from being used.

| Name          | Type                         | Description                                      |
| ------------- | ---------------------------- | ------------------------------------------------ |
| activity      | Activity                     | Activity being used.                             |
| usageConfig   | ActivityUseConfiguration     | Configuration info for the activation.           |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message. |

### `dnd5e.activityConsumption`

Fires after an item's resource consumption is calculated, but before any updates are performed. Returning `false` will prevent activity from being used.

| Name          | Type                         | Description                                        |
| ------------- | ---------------------------- | -------------------------------------------------- |
| activity      | Activity                     | Activity being used.                               |
| usageConfig   | ActivityUseConfiguration     | Configuration info for the activation.             |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message.   |
| updates       | ActivityUsageUpdates         | Updates to apply to the actor and other documents. |

### `dnd5e.postActivityConsumption`

Fires after an item's resource consumption is calculated and applied. Returning `false` will prevent activity from being used.

| Name          | Type                         | Description                                        |
| ------------- | ---------------------------- | -------------------------------------------------- |
| activity      | Activity                     | Activity being used.                               |
| usageConfig   | ActivityUseConfiguration     | Configuration info for the activation.             |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message.   |
| updates       | ActivityUsageUpdates         | Updates to apply to the actor and other documents. |

### `dnd5e.preCreateUsageMessage`

Fires before an activity usage card is created.

| Name          | Type                         | Description                                        |
| ------------- | ---------------------------- | -------------------------------------------------- |
| activity      | Activity                     | Activity being used.                               |
| messageConfig | ActivityMessageConfiguration | Configuration info for the created chat message.   |

### `dnd5e.postCreateUsageMessage`

Fires after an activity usage card is created.

| Name          | Type                | Description                                        |
| ------------- | ------------------- | -------------------------------------------------- |
| activity      | Activity            | Activity being used.                               |
| card          | ChatMessage\|object | The created ChatMessage instance or ChatMessageData depending on whether options.createMessage was set to `true`. |

### `dnd5e.preCreateActivityTemplate`

Fires before a template is created for an Activity. Returning `false` will prevent template from being created.

| Name         | Type     | Description                                      |
| ------------ | -------- | ------------------------------------------------ |
| activity     | Activity | Activity for which the template is being placed. |
| templateData | object   | Data used to create the new template.            |

### `dnd5e.createActivityTemplate`

Fires after a template are created for an Activity.

| Name      | Type              | Description                                      |
| --------- | ----------------- | ------------------------------------------------ |
| activity  | Activity          | Activity for which the template is being placed. |
| templates | AbilityTemplate[] | The templates being placed.                      |

### `dnd5e.preRollAttack`

See `dnd5e.preRoll` for more details. Passes `AttackRollProcessConfiguration` for the `config` parameter and `AttackRollDialogConfiguration` for the `dialog` parameter.

### `dnd5e.rollAttack`

Fires after an attack has been rolled but before any ammunition is consumed.

| Name            | Type                   | Description                                              |
| --------------- | ---------------------- | -------------------------------------------------------- |
| rolls           | D20Roll[]              | The resulting rolls.                                     |
| data            | object                 |                                                          |
| data.subject    | AttackActivity         | The activity that performed the attack.                  |
| data.ammoUpdate | AmmunitionUpdate\|null | Any updates related to ammo consumption for this attack. |

### `dnd5e.postRollAttack`

Fires after an attack has been rolled and ammunition has been consumed.

| Name         | Type                   | Description                             |
| ------------ | ---------------------- | --------------------------------------- |
| rolls        | D20Roll[]              | The resulting rolls.                    |
| data         | object                 |                                         |
| data.subject | AttackActivity         | The activity that performed the attack. |

### `dnd5e.preRollDamage`

See `dnd5e.preRoll` for more details. Passes `DamageRollProcessConfiguration` for the `config` parameter.

### `dnd5e.rollDamage`

Fires after damage has been rolled.

| Name         | Type         | Description                           |
| ------------ | ------------ | ------------------------------------- |
| rolls        | DamageRoll[] | The resulting rolls.                  |
| data         | object       |                                       |
| data.subject | Activity     | The activity that performed the roll. |

### `dnd5e.preRollFormula`

Fires before a formula is rolled for a Utility activity. Returning `false` will prevent the formula from being rolled.

| Name    | Type                          | Description                                |
| ------- | ----------------------------- | ------------------------------------------ |
| config  | BasicRollProcessConfiguration | Configuration data for the pending roll.   |
| dialog  | BasicRollDialogConfiguration  | Configuration for the roll dialog.         |
| message | BasicRollMessageConfiguration | Configuration data for the roll's message. |

### `dnd5e.rollFormula`

Fires after a formula has been rolled for a Utility activity.

| Name         | Type            | Description                           |
| ------------ | --------------- | ------------------------------------- |
| rolls        | BasicRoll[]     | The resulting rolls.                  |
| data         | object          |                                       |
| data.subject | UtilityActivity | The activity that performed the roll. |

### `dnd5e.preSummon`

Fires before summoning is performed. Returning `false` will prevent summoning from occurring.

| Name     | Type                   | Description                                    |
| -------- | ---------------------- | ---------------------------------------------- |
| activity | Activity               | The activity that is performing the summoning. |
| profile  | SummonsProfile         | Profile used for summoning.                    |
| options  | SummoningConfiguration | Configuration data for summoning behavior.     |

### `dnd5e.preSummonToken`

Fires before a specific token is summoned. After placement has been determined but before the final token data is constructed. Returning `false` will prevent this token from being summoned.

| Name     | Type                   | Description                                      |
| -------- | ---------------------- | ------------------------------------------------ |
| activity | Activity               | The activity that is performing the summoning.   |
| profile  | SummonsProfile         | Profile used for summoning.                      |
| config   | TokenUpdateData        | Configuration for creating a modified token.     |
| options  | SummoningConfiguration | Configuration data for summoning behavior.       |

### `dnd5e.summonToken`

Fires after token creation data is prepared, but before summoning occurs.

| Name      | Type                  | Description                                    |
| --------- | --------------------- | ---------------------------------------------- |
| activity  | Activity              | The activity that is performing the summoning. |
| profile   | SummonsProfile        | Profile used for summoning.                    |
| tokenData | object                | Data for creating a token.                     |
| options  | SummoningConfiguration | Configuration data for summoning behavior.     |

### `dnd5e.postSummon`

Fires when summoning is complete.

| Name     | Type                   | Description                                    |
| -------- | ---------------------- | ---------------------------------------------- |
| activity | Activity               | The activity that is performing the summoning. |
| profile  | SummonsProfile         | Profile used for summoning.                    |
| tokens   | Token5e[]              | Tokens that have been created.                 |
| options  | SummoningConfiguration | Configuration data for summoning behavior.     |


## Combat

### `dnd5e.preCombatRecovery`

Fires before combat-related recovery changes. Returning `false` will prevent combat recovery from being performed.

| Name      | Type                   | Description                        |
| --------- | ---------------------- | ---------------------------------- |
| combatant | Combatant5e            | Combatant that is being recovered. |
| periods   | string[]               | Periods to be recovered.           |

### `dnd5e.combatRecovery`

Fires after combat-related recovery changes have been prepared, but before they have been applied to the actor. Returning `false` will prevent combat recovery from being performed.

| Name      | Type                   | Description                                             |
| --------- | ---------------------- | ------------------------------------------------------- |
| combatant | Combatant5e            | Combatant that is being recovered.                      |
| periods   | string[]               | Periods that were recovered.                            |
| results   | CombatRecoveryResults  | Update that will be applied to the actor and its items. |

### `dnd5e.preCreateCombatMessage`

Fires before a combat state change chat message is created.

| Name                 | Type        | Description                                      |
| -------------------- | ----------- | ------------------------------------------------ |
| combatant            | Combatant5e | Combatant for which the message will be created. |
| messageConfig        | object      |                                                  |
| messageConfig.create | boolean     | Should the chat message be posted?               |
| messageConfig.data   | object      | Data for the created chat message.               |

### `dnd5e.postCombatRecovery`

Fires after combat-related recovery changes have been applied.

| Name      | Type                | Description                        |
| --------- | ------------------- | ---------------------------------- |
| combatant | Combatant5e         | Combatant that is being recovered. |
| periods   | string[]            | Periods that were recovered.       |
| message   | ChatMessage5e|void  | Chat message created, if any.      |


## Items

### `dnd5e.preDisplayCard`

Fires before an item chat card is created. Returning `false` will prevent chat card from being created.

| Name    | Type                         | Description                                      |
| ------- | ---------------------------- | ------------------------------------------------ |
| item    | Item5e                       | Item for which the chat card is being displayed. |
| message | ActivityMessageConfiguration | Data used to create the chat message.            |

### `dnd5e.displayCard`

Fires after an item chat card is created.

| Name | Type                | Description                                            |
| ---- | ------------------- | ------------------------------------------------------ |
| item | Item5e              | Item for which the chat card is being displayed.       |
| card | ChatMessage\|object | The created ChatMessage instance or ChatMessageData depending on whether options.createMessage was set to `true`. |

### `dnd5e.preRollRecharge`

Fires before recharge is rolled for an Item or Activity. Returning `false` will prevent the recharge from being rolled.

| Name    | Type                          | Description                                |
| ------- | ----------------------------- | ------------------------------------------ |
| config  | BasicRollProcessConfiguration | Configuration data for the pending roll.   |
| dialog  | BasicRollDialogConfiguration  | Configuration for the roll dialog.         |
| message | BasicRollMessageConfiguration | Configuration data for the roll's message. |

### `dnd5e.rollRecharge`

Fires after the Item has rolled to recharge, but before any changes have been performed. Returning `false` will prevent the changes from being performed.

| Name         | Type             | Description                                   |
| ------------ | ---------------- | --------------------------------------------- |
| rolls        | BasicRoll[]      | The resulting rolls.                          |
| data         | object           |                                               |
| data.subject | Item5e\|Activity | The item or activity that performed the roll. |
| data.updates | object           | Updates to be applied to the subject.         |

### `dnd5e.preCreateScrollFromSpell`

Fires before the item data for a scroll is created. Returning `false` will prevent the scroll from being created.

| Name | Type | Description |
| ---- | ---- | ----------- |
| itemData | object | The initial item data of the spell to convert to a scroll. |
| options | object | Additional options that determine how the scroll is created. |

### `dnd5e.createScrollFromSpell`

Fires after the item data for a scroll is created but before the item is returned.

| Name            | Type           | Description                                      |
| --------------- | -------------- | ------------------------------------------------ |
| item            | Item5e\|object | The spell or item data to be made into a scroll. |
| spellScrollData | object         | The final item data used to make the scroll.     |


## Item Sheet

### `dnd5e.dropItemSheetData`

Fires when some useful data is dropped onto an `ItemSheet5e`. Returning `false` will prevent the normal drop handling.

| Name  | Type       | Description                                    |
| ----- | ---------- | ---------------------------------------------- |
| item  | Item5e     | The Item5e.                                    |
| sheet | ItemShee5e | The ItemSheet5e application.                   |
| data  | object     | The data that has been dropped onto the sheet. |


## Journal Pages

### `dnd5e.build___SpellcastingTable` (`dnd5e.buildSpellSpellcastingTable` & `dnd5e.buildPactSpellcastingTable` by default)

Fires to generate the table for custom spellcasting types. A different version of the hook will be fired for each spellcasting method defined in `CONFIG.DND5E.spellcasting`.

| Name         | Type                    | Description                                            |
| ------------ | ----------------------- | ------------------------------------------------------ |
| table        | object                  | Table definition being built.                          |
| item         | Item5e                  | Class for which the spellcasting table is being built. |
| spellcasting | SpellcastingDescription | Spellcasting descriptive object.                       |

### `dnd5e.renderNPCStatBlock`

Fires after an embedded NPC stat block is rendered.

| Name     | Type                    | Description                               |
| -------- | ----------------------- | ----------------------------------------- |
| actor    | Actor5e                 | NPC being embedded.                       |
| template | HTMLTemplateElement     | Template whose children will be embedded. |
| config   | DocumentHTMLEmbedConfig | Configuration for embedding behavior.     |
| options  | EnrichmentOptions       | Original enrichment options.              |

## Movement Automation

### `dnd5e.determineOccupiedGridSpaceBlocking`

Fires when determining whether a grid space is occupied by a token which should block movement for a provided token.
| Name            | Type         | Description                                                            |
| --------------- | ------------ | ---------------------------------------------------------------------- |
| gridSpace       | GridOffset3D | The grid space being checked.                                          |
| token           | Token5e      | The token being moved.                                                 |
| options         | object       | Additional options.                                                    |
| options.preview | boolean      | Whether the movement in question is previewed.                         |
| found           | Set<Token5e> | The found set of tokens which would block movement. *Will be mutated.* |

### `dnd5e.determineOccupiedGridSpaceDifficult`

Fires when determining whether a grid space is occupied by a token which should cause difficult terrain for a provided token.
| Name            | Type         | Description                                                                     |
| --------------- | ------------ | ------------------------------------------------------------------------------- |
| gridSpace       | GridOffset3D | The grid space being checked.                                                   |
| token           | Token5e      | The token being moved.                                                          |
| options         | object       | Additional options.                                                             |
| options.preview | boolean      | Whether the movement in question is previewed.                                  |
| found           | Set<Token5e> | The found set of tokens which would cause difficult terrain. *Will be mutated.* |


