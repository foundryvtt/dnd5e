![Up to date as of 4.0.0](https://img.shields.io/static/v1?label=dnd5e&message=4.0.0&color=informational)

## Actor

### `dnd5e.preRollAbilityTest`

Fires before an ability test is rolled. Returning `false` will prevent the normal rolling process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the ability test is being rolled. |
| config | D20RollConfiguration | Configuration data for the pending roll. |
| abilityId | string | ID of the ability being rolled as defined in `DND5E.abilities`. |

### `dnd5e.rollAbilityTest`

Fires after an ability test has been rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the ability test has been rolled. |
| roll | D20Roll | The resulting roll. |
| abilityId | string | ID of the ability being rolled as defined in `DND5E.abilities`. |

### `dnd5e.preRollAbilitySave`

Fires before an ability save is rolled. Returning `false` will prevent the normal rolling process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the ability save is being rolled. |
| config | D20RollConfiguration | Configuration data for the pending roll. |
| abilityId | string | ID of the ability being rolled as defined in `DND5E.abilities`. |

### `dnd5e.rollAbilitySave`

Fires after an ability save has been rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the ability save has been rolled. |
| roll | D20Roll | The resulting roll. |
| abilityId | string | ID of the ability that was rolled as defined in `DND5E.abilities`. |

### `dnd5e.preBeginConcentrating`

Fires before a concentration effect is created. Returning `false` will prevent concentration effect from being created.

| Name       | Type    | Description                            |
| ---------- | ------- | -------------------------------------- |
| actor      | Actor5e | The actor initiating concentration.    |
| item       | Item5e  | The item that will be concentrated on. |
| effectData | object  | Data used to create the ActiveEffect.  |

### `dnd5e.beginConcentrating`

Fires after a concentration effect is created.

| Name   | Type           | Description                             |
| ------ | -------------- | --------------------------------------- |
| actor  | Actor5e        | The actor initiating concentration.     |
| item   | Item5e         | The item that is being concentrated on. |
| effect | ActiveEffect5e | The created ActiveEffect instance.      |

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

Fires before a saving throw to maintain concentration is rolled. Returning `false` will prevent the normal rolling process.

| Name    | Type                 | Description                                       |
| ------- | -------------------- | ------------------------------------------------- |
| actor   | Actor5e              | Actor for which the saving throw is being rolled. |
| options | D20RollConfiguration | Configuration data for the pending roll.          |

### `dnd5e.rollConcentration`

Fires after a saving throw to maintain concentration is rolled.

| Name  | Type    | Description                                       |
| ----- | ------- | ------------------------------------------------- |
| actor | Actor5e | Actor for which the saving throw has been rolled. |
| roll  | D20Roll | The resulting roll.                               |

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

### `dnd5e.preRollDeathSave`

Fires before a death saving throw is rolled. Returning `false` will prevent the normal rolling process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the death saving throw is being rolled. |
| config | D20RollConfiguration | Configuration data for the pending roll. |

### `dnd5e.rollDeathSave`

Fires after a death saving throw has been rolled, but before updates have been performed.  Returning `false` will prevent updates from being performed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the death saving throw has been rolled. |
| roll | D20Roll | The resulting roll. |
| details | object |  |
| details.updates | object | Updates that will be applied to the actor as a result of this save. |
| details.chatString | string | Localizable string displayed in the create chat message. If not set, then no chat message will be displayed. |

### `dnd5e.preRollSkill`

Fires before a skill check is rolled. Returning `false` will prevent the normal rolling process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the skill check is being rolled. |
| config | D20RollConfiguration | Configuration data for the pending roll. |
| skillId | string | ID of the skill being rolled as defined in `DND5E.skills`. |

### `dnd5e.rollSkill`

Fires after a skill check has been rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the skill check has been rolled. |
| roll | D20Roll | The resulting roll. |
| skillId | string | ID of the skill that was rolled as defined in `DND5E.skills`. |

### `dnd5e.preRollToolCheck`

Fires before a tool check is rolled for an Actor. Returning `false` will prevent the tool check from being rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the tool check is being rolled. |
| config | D20RollConfiguration | Configuration data for the pending roll. |
| toolId | string | ID of the tool being rolled as defined in `DND5E.toolIds`. |

### `dnd5e.rollToolCheck`

Fires after a tool check has been rolled for an Actor.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the tool check has been rolled. |
| roll | D20Roll | The resulting roll. |
| toolId | string | ID of the tool that was rolled as defined in `DND5E.toolIds`. |

### `dnd5e.preRollHitDieV2`

Fires before a hit die is rolled. Returning `false` will prevent the normal rolling process.

| Name    | Type                           | Description                             |
| ------- | ------------------------------ | --------------------------------------- |
| config  | HitDieRollProcessConfiguration | Configuration information for the roll. |
| dialog  | BasicRollDialogConfiguration   | Configuration for the roll dialog.      |
| message | BasicRollMessageConfiguration  | Configuration for the roll message.     |

### `dnd5e.preRollHitDie` ***Deprecated***

Fires before a hit die is rolled. Returning `false` will prevent the normal rolling process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit die is to be rolled. |
| config | DamageRollConfiguration | Configuration data for the pending roll. |
| denomination | string | Size of hit die to be rolled. |

### `dnd5e.rollHitDieV2`

Fires after a hit die has been rolled, but before updates have been applied. Returning `false` will prevent updates from being performed.

| Name               | Type        | Description                                  |
| ------------------ | ----------- | -------------------------------------------- |
| rolls              | BasicRoll[] | The resulting rolls.                         |
| data               | object      |                                              |
| data.subject       | Actor5e     | Actor for which the hit die has been rolled. |
| data.updates       | object      |                                              |
| data.updates.actor | object      | Updates that will be applied to the actor.   |
| data.updates.class | object      | Updates that will be applied to the class.   |

### `dnd5e.rollHitDie` ***Deprecated***

Fires after a hit die has been rolled, but before updates have been applied. Returning `false` will prevent updates from being performed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit die has been rolled. |
| roll | DamageRoll | The resulting roll. |
| updates | object |  |
| updates.actor | object | Updates that will be applied to the actor. |
| updates.class | object | Updates that will be applied to the class. |

### `dnd5e.preRollClassHitPoints`

Fires before hit points are rolled for a character's class.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit points are being rolled. |
| item | Item5e | The class item whose hit dice will be rolled. |
| rollData | object |  |
| rollData.formula | string | The string formula to parse. |
| rollData.data | object | The data object against which to parse attributes within the formula. |
| messageData | object | The data object to use when creating the message. |

### `dnd5e.rollClassHitPoints`

Fires after hit points haven been rolled for a character's class.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit points have been rolled. |
| roll | Roll | The resulting roll. |

### `dnd5e.preRollNPCHitPoints`

Fires before hit points are rolled for an NPC.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit points are being rolled. |
| rollData | object |  |
| rollData.formula | string | The string formula to parse. |
| rollData.data | object | The data object against which to parse attributes within the formula. |
| messageData | object | The data object to use when creating the message. |

### `dnd5e.rollNPChitPoints`

Fires after hit points are rolled for an NPC.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | Actor for which the hit points have been rolled. |
| roll | Roll | The resulting roll. |

### `dnd5e.preRollInitiative`

Fires before initiative is rolled for an Actor.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | The Actor that is rolling initiative. |
| roll | D20Roll | The pre-evaluated roll. |

### `dnd5e.rollInitiative`

Fires after an Actor has rolled for initiative.

| Name | Type | Description |
| ---- | ---- | ----------- |
| actor | Actor5e | The Actor that rolled initiative. |
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

### `dnd5e.transformActor`

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

## Advancement

### `dnd5e.preAdvancementManagerRender`

Fires when an `AdvancementManager` is about to be processed. Returning `false` will prevent the normal rendering process.

| Name | Type | Description |
| ---- | ---- | ----------- |
| advancementManager | AdvancementManager | The advancement manager about to be rendered. |

### `dnd5e.preAdvancementManagerComplete`

| Name | Type | Description |
| ---- | ---- | ----------- |
| advancementManager | AdvancementManager | The advancement manager. |
| actorUpdates | object | Updates to the actor. |
| toCreate | object[] | Items that will be created on the actor. |
| toUpdate | object[] | Items that will be updated on the actor. |
| toDelete | string[] | IDs of items that will be deleted on the actor. |

### `dnd5e.advancementManagerComplete`

Fires when an `AdvancementManager` is done modifying an actor.

| Name | Type | Description |
| ---- | ---- | ----------- |
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

### `dnd5e.preRollAttackV2`

Fires before an attack is rolled for an Item. Returning `false` will prevent the attack from being rolled.

| Name    | Type                           | Description                                          |
| ------- | ------------------------------ | ---------------------------------------------------- |
| config  | AttackRollProcessConfiguration | Configuration data for the pending roll.             |
| dialog  | AttackRollDialogConfiguration  | Presentation data for the roll configuration dialog. |
| message | BasicRollMessageConfiguration  | Configuration data for the roll's message.           |

### `dnd5e.rollAttackV2`

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

### `dnd5e.preRollDamageV2`

Fires before damage is rolled.  Returning `false` will prevent the damage from being rolled.

| Name    | Type                           | Description                                          |
| ------- | ------------------------------ | ---------------------------------------------------- |
| config  | DamageRollProcessConfiguration | Configuration data for the pending roll.             |
| dialog  | BasicRollDialogConfiguration   | Presentation data for the roll configuration dialog. |
| message | BasicRollMessageConfiguration  | Configuration data for the roll's message.           |

### `dnd5e.rollDamageV2`

Fires after damage has been rolled.

| Name         | Type         | Description                           |
| ------------ | ------------ | ------------------------------------- |
| rolls        | DamageRoll[] | The resulting rolls.                  |
| data         | object       |                                       |
| data.subject | Activity     | The activity that performed the roll. |

### `dnd5e.preRollFormulaV2`

Fires before a formula is rolled for a Utility activity. Returning `false` will prevent the formula from being rolled.

| Name    | Type                          | Description                                |
| ------- | ----------------------------- | ------------------------------------------ |
| config  | BasicRollProcessConfiguration | Configuration data for the pending roll.   |
| dialog  | BasicRollDialogConfiguration  | Configuration for the roll dialog.         |
| message | BasicRollMessageConfiguration | Configuration data for the roll's message. |

### `dnd5e.rollFormulaV2`

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


## Items

### `dnd5e.preUseItem` ***Deprecated***

Fires before an item usage is configured. Returning `false` will prevent item from being used.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item being used. |
| config | ItemUseConfiguration | Configuration data for the item usage being prepared. |
| options | ItemUseOptions | Additional options used for configuring item usage. |

### `dnd5e.preCreateItemTemplate` ***Deprecated***

Fires before a template is created for an Item. Returning `false` will prevent template from being created.

| Name         | Type   | Description                                  |
| ------------ | ------ | -------------------------------------------- |
| item         | Item5e | Item for which the template is being placed. |
| templateData | object | Data used to create the new template.        |

### `dnd5e.createItemTemplate` ***Deprecated***

Fires after a template is created for an Item.

| Name     | Type            | Description                                  |
| -------- | --------------- | -------------------------------------------- |
| item     | Item5e          | Item for which the template is being placed. |
| template | AbilityTemplate | The template being placed.                   |

### `dnd5e.preItemUsageConsumption` ***Deprecated***

Fires before an item's resource consumption has been calculated. Returning `false` will prevent item from being used.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item being used. |
| config | ItemUseConfiguration | Configuration data for the item usage being prepared. |
| options | ItemUseOptions | Additional options used for configuring item usage. |

### `dnd5e.itemUsageConsumption` ***Deprecated***

Fires after an item's resource consumption has been calculated but before any changes have been made. Returning `false` will prevent item from being used.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item being used. |
| config | ItemUseConfiguration | Configuration data for the item usage being prepared. |
| options | ItemUseOptions | Additional options used for configuring item usage. |
| usage | object |  |
| usage.actorUpdates | object | Updates that will be applied to the actor. |
| usage.itemUpdates | object | Updates that will be applied to the item being used. |
| usage.resourceUpdates | object[] | Updates that will be applied to other items on the actor. |

### `dnd5e.preDisplayCardV2`

Fires before an item chat card is created. Returning `false` will prevent chat card from being created.

| Name    | Type                         | Description                                      |
| ------- | ---------------------------- | ------------------------------------------------ |
| item    | Item5e                       | Item for which the chat card is being displayed. |
| message | ActivityMessageConfiguration | Data used to create the chat message.            |

### `dnd5e.preDisplayCard` ***Deprecated***

Fires before an item chat card is created.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the chat card is being displayed. |
| chatData | object | Data used to create the chat message. |
| options | ItemUseOptions | Options which configure the display of the item chat card. |

### `dnd5e.displayCard`

Fires after an item chat card is created.

| Name | Type                | Description                                            |
| ---- | ------------------- | ------------------------------------------------------ |
| item | Item5e              | Item for which the chat card is being displayed.       |
| card | ChatMessage\|object | The created ChatMessage instance or ChatMessageData depending on whether options.createMessage was set to `true`. |

### `dnd5e.useItem` ***Deprecated***

Fires when an item is used, after the measured template has been created if one is needed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item being used. |
| config | ItemUseConfiguration | Configuration data for the roll. |
| options | ItemUseOptions | Additional options for configuring item usage. |

### `dnd5e.preRollAttack` ***Deprecated***

Fires before an attack is rolled for an Item. Returning `false` will prevent the attack from being rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll is being performed. |
| config | D20RollConfiguration | Configuration data for the pending roll. |

### `dnd5e.rollAttack` ***Deprecated***

Fires after an attack has been rolled for an Item.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll was performed. |
| roll | D20Roll | The resulting roll. |

### `dnd5e.preRollDamage` ***Deprecated***

Fires before a damage is rolled for an Item.  Returning `false` will prevent the damage from being rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll is being performed. |
| config | DamageRollConfiguration | Configuration data for the pending roll. |

### `dnd5e.rollDamage` ***Deprecated***

Fires after a damage has been rolled for an Item.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll was performed. |
| roll | DamageRoll | The resulting roll. |

### `dnd5e.preRollFormula` ***Deprecated***

Fires before the other formula is rolled for an Item. Returning `false` will prevent the formula from being rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll is being performed. |
| config | object | Configuration data for the pending roll. |
| config.formula | string | Formula that will be rolled. |
| config.data | object | Data used when evaluating the roll. |
| config.chatMessage | boolean | Should a chat message be created for this roll? |

### `dnd5e.rollFormula` ***Deprecated***

Fires after the other formula has been rolled for an Item.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll was performed. |
| roll | Roll | The resulting roll. |

### `dnd5e.preRollRechargeV2`

Fires before recharge is rolled for an Item or Activity. Returning `false` will prevent the recharge from being rolled.

| Name    | Type                          | Description                                |
| ------- | ----------------------------- | ------------------------------------------ |
| config  | BasicRollProcessConfiguration | Configuration data for the pending roll.   |
| dialog  | BasicRollDialogConfiguration  | Configuration for the roll dialog.         |
| message | BasicRollMessageConfiguration | Configuration data for the roll's message. |

### `dnd5e.preRollRecharge` ***Deprecated***

Fires before the Item is rolled to recharge. Returning `false` will prevent the recharge from being rolled.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll is being performed. |
| config | object | Configuration data for the pending roll. |
| config.formula | string | Formula that will be used to roll the recharge. |
| config.data | object | Data used when evaluating the roll.|
| config.target | number | Total required to be considered recharged. |
| config.chatMessage | boolean | Should a chat message be created for this roll? |

### `dnd5e.rollRechargeV2`

Fires after the Item has rolled to recharge, but before any changes have been performed. Returning `false` will prevent the changes from being performed.

| Name         | Type             | Description                                   |
| ------------ | ---------------- | --------------------------------------------- |
| rolls        | BasicRoll[]      | The resulting rolls.                          |
| data         | object           |                                               |
| data.subject | Item5e\|Activity | The item or activity that performed the roll. |
| data.updates | object           | Updates to be applied to the subject.         |

### `dnd5e.rollRecharge` ***Deprecated***

Fires after the Item has rolled to recharge, but before any changes have been performed. Returning `false` will prevent the changes from being performed.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e | Item for which the roll was performed. |
| roll | Roll | The resulting roll. |

### `dnd5e.preCreateScrollFromSpell`

Fires before the item data for a scroll is created. Returning `false` will prevent the scroll from being created.

| Name | Type | Description |
| ---- | ---- | ----------- |
| itemData | object | The initial item data of the spell to convert to a scroll. |
| options | object | Additional options that determine how the scroll is created. |

### `dnd5e.createScrollFromSpell`

Fires after the item data for a scroll is created but before the item is returned.

| Name | Type | Description |
| ---- | ---- | ----------- |
| item | Item5e\|object | The spell or item data to be made into a scroll. |
| spellScrollData | object | The final item data used to make the scroll. |

## Item Sheet

### `dnd5e.dropItemSheetData`

Fires when some useful data is dropped onto an `ItemSheet5e`. Returning `false` will prevent the normal drop handling.

| Name  | Type       | Description                                    |
| ----- | ---------- | ---------------------------------------------- |
| item  | Item5e     | The Item5e.                                    |
| sheet | ItemShee5e | The ItemSheet5e application.                   |
| data  | object     | The data that has been dropped onto the sheet. |

## Journal Pages

### `dnd5e.build___SpellcastingTable` (`dnd5e.buildLeveledSpellcastingTable` & `dnd5e.buildPactSpellcastingTable` by default)

Fires to generate the table for custom spellcasting types. A different version of the hook will be fired for each spellcasting type defined in `CONFIG.DND5E.spellcastingTypes`.

| Name         | Type                    | Description                                            |
| ------------ | ----------------------- | ------------------------------------------------------ |
| table        | object                  | Table definition being built.                          |
| item         | Item5e                  | Class for which the spellcasting table is being built. |
| spellcasting | SpellcastingDescription | Spellcasting descriptive object.                       |

