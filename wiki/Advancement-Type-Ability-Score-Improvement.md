![Up to date as of 2.4.0](https://img.shields.io/static/v1?label=dnd5e&message=2.4.0&color=informational)

The Ability Score Improvement allows a player to improve one or more their their ability scores, either a fixed amount or using a certain number of points, or to optionally take a feat when used on a class.

## Configuration

![Ability Score Improvement - Config Class](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-configuration-class.jpg)

Creating an ability score improvement on a class is super easy, just create the advancement and set the appropriate level. The default settings for classes will set the points to 2 which will give the player 2 points to assign to any ability score that is below the maximum.

![Ability Score Improvement - Config Race](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-configuration-race.jpg)

A few more options might need to be configured when creating an ability score improvement on a race. The controls at the bottom will allow setting a fixed improvement for any one of the scores. If these are set, the player will not be able to add any points to those values. Above that is the number of points that the player can assign, which is frequently 0 for many old-school races or 3 with no fixed improvement for newer races.

Some race might need to use the point cap, which limits how many points can be assigned to a single score. For example the classic Half-Elf gets fixed 2 points to Charisma, and two more points that can be assigned, but only 1 per score. So they would have a Point Cap set to 1, Points set to 2, and Charisma set to 2.

## Usage

![Ability Score Improvement - Race Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-race.jpg)

The Ability Score Improvement will present the player with a list of all of their ability scores. The large numbers indicate the value of the score after the improvement is complete, with a smaller number beneath it showing how the score has changed. If there is a fixed improvement then a lock symbol will display next to the change and they player won't be able to modify it using the controls. At the top is a indicator of how many points are left to spend, and how many can be spent per-ability.

![Ability Score Improvement - Class Flow](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-flow-class.jpg)

For classes the Ability Score Improvement has an extra section for taking a feat. The player can drop a feat onto this section from a compendium to take it rather than improving their scores. When this happens the scores will be locked, though they can remove the feat to unlock them.

![Allow Feats Setting](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/advancement/asi-allow-feats-setting.jpg)

Since feats replacing ability score improvements is an optional rule, it can be disabled by a GM in the system settings screen and none of those controls will appear to players.

## API

The original proposal for the Ability Score Improvement advancement can be [found here](https://github.com/foundryvtt/dnd5e/issues/1403).

### Configuration Schema

// TODO

### Value Schema

// TODO
