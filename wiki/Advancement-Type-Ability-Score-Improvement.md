![Up to date as of 5.1.0](https://img.shields.io/static/v1?label=dnd5e&message=4.2.0&color=informational)

The Ability Score Improvement allows a player to improve one or more their their ability scores, either a fixed amount or using a certain number of points, or to optionally take a feat when used on a class.

## Configuration

![Ability Score Improvement - Config Class](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-configuration-class.jpg)

Creating an ability score improvement on a class is super easy, just create the advancement and set the appropriate level. The default settings for classes will set the points to 2 which will give the player 2 points to assign to any ability score that is below the maximum.

When the advancement is added to a class at level 19 or higher and the modern rules are used, it is automatically adjusted to support Epic Boons. The default name changes to "Epic Boon" and a new Recommendation field appears in the details section. This allows providing a single feat that will be shown in the flow in addition to the default options.

For the Epic Boon feats themselves, the Maximum field can be used to override the default maximum ability score when using that advancement. By default all abilities are capped at 20, but this allows upping that number to 30 for Epic Boons.

![Ability Score Improvement - Config Species](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-configuration-race.jpg)

A few more options might need to be configured when creating an ability score improvement on a species. The controls at the bottom will allow setting a fixed improvement for any one of the scores. Above that is the number of points that the player can assign. Locking an ability score prevents points being assigned to that score.

Some species might need to use the point cap, which limits how many points can be assigned to a single score. For example the legacy Half-Elf gets fixed 2 points to Charisma, and two more points that can be assigned, but only 1 per score. So they would have a Point Cap set to 1, Points set to 2, and Charisma set to 2. The variant Human on the other hand gets an increase of 1 for each score, so each ability is set to 1 and the Points are set to 0.

## Usage

![Ability Score Improvement - Species Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-race.jpg)

The Ability Score Improvement will present the player with a list of all of their ability scores. The large numbers indicate the value of the score after the improvement is complete, with a smaller number beneath it showing how the score has changed. If there is a fixed or locked improvement then a lock symbol will display next to the change and they player won't be able to modify it using the controls. At the top is a indicator of how many points are left to spend, and how many can be spent per-ability.

![Ability Score Improvement - Modern Class Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-modern.jpg)

![Ability Score Improvement - Epic Boon Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-epic-boon.jpg)

When not using the legacy rules, the Ability Score Improvement for classes will present a choice between selecting the Ability Score Improvement Feat or another feat of your choice. If the ASI feat is selected then the assignment interface show above will appear, otherwise a different feat can be chosen by dropping it onto the sheet. If the advancement is an Epic Boon and a recommendation is provided, then the recommended feat will also appear in the list for easy selection.

![Ability Score Improvement - Class Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-class.jpg)

When using the legacy rules, the player can drop a feat onto this section from a compendium to take it rather than improving their scores. When this happens the scores will be locked, though they can remove the feat to unlock them.

![Allow Feats Setting](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-allow-feats-setting.jpg)

Since feats replacing ability score improvements is an optional rule when using the legacy rules, it can be disabled by a GM in the system settings screen and none of those controls will appear to players.

## API

The [original proposal](https://github.com/foundryvtt/dnd5e/issues/1403) for the Ability Score Improvement advancement is available on GitHub, but may not reflect the current state of the advancement.

### Configuration Schema

The Hit Points advancement configuration contains a `cap` property, which is a number indicating the maximum number of points that can be allocated to a specific score.

The `fixed` object contains a mapping of ability scores and a number of points that will always be assigned to that ability.

The `locked` property is a set of abilities that cannot be modified by the ASI.

The `max` property indicates the maximum value an ability score can be improved to, if different than the default.

The `points` property is the number of points that can be assigned by the player.

The `recommendation` contains a UUID for the recommended Epic Boon feat.

```javascript
{
  cap: 2,
  fixed: { dex: 1 },
  locked: ["con"],
  max: null,
  points: 3,
  recommendation: null
}
```

### Value Schema

The Hit Points advancement tracks the `type` of change made, either `asi` or `feat`.

When the `asi` type is selected, then the `assignments` object will contain a mapping of the abilities and how many points were given to that ability. This includes any fixed abilities as well as player-assigned ones.

When the `feat` type is selected, then the `feat` object will contain the locally created feat document ID and the original compendium UUID for the added feat.

```javascript
{
  type: "asi",
  assignments: { dex: 1, str: 2, cha: 1 }
}

{
  type: "feat",
  assignments: {},
  feat: { "DPN2Gfk8yi1Z5wp7": "Compendium.dnd5e.classfeatures.3sYPftQKnbbVnHrh" }
}
```
