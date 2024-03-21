![Up to date as of 3.1.0](https://img.shields.io/static/v1?label=dnd5e&message=3.1.0&color=informational)

This advancement type is designed for any feature that gives the player a choice of options to add to their character at a certain level. This covers features with a limited set of options such as Fighting Style and more open ended features such as Magical Secrets.

## Level Up Interface
If a limited pool of options are provided, the interface will present the list with checkboxes so the player can select which options they would like. If any arbitrary items can be added, then the player is presented with a drop area where items can be dragged from the items sidebar or a compendium. Both a list of items and the drop area can be used at the same time.

It should be clear how many choices are available (Fighting Style only allows one, Magical Secrets lets you take two, etc.).

## Configuration

![Item Choice Config](https://user-images.githubusercontent.com/19979839/177053250-967aa309-14bc-4f37-a243-9993a6a02a14.png)

The `hint` text is a brief bit of text to assist players in what choices they can make. Typically this will be a portion of the feature's description and shouldn't be more than a single paragraph of one or two sentences.

The `Choices` List on the right-hand side indicates how many choices are available to the player and at which levels. A choice that can be taken only once such as a Fighter's Fighting Style would be simple as { 1: 1 }, indicating that player should be presented with choosing a single style at first level. Something like Bard's Magical Secrets which gives the option of choosing two options at levels 10, 14, and 18 is shown below.

The `Allow Drops` indicates whether the drop area should be shown to the player to allow arbitrary items to be added.

Item types can be restricted using the `Type` field, which is null if any item type is acceptable, or can be set to one of the top-level types (except things like class, subclass, and background).

Finally, the `pool` contains an array of objects with item UUIDs indicating a fixed list of options presented to the player. When creating or modifying the Item Grant Advancement, drag-and-drop the items to present to the player to this section.

## Player Experience

Choosing from a list of options at level-up  

https://user-images.githubusercontent.com/207433/240936902-4f5e3ce6-01e6-4634-9d8a-1aa27807192e.webm

Dropping choices onto the Advancement  

https://user-images.githubusercontent.com/207433/240936973-841f46e9-a842-44ce-9647-cc4a5fbcfccc.webm

Making additional choices on top of those from a previous level  

https://user-images.githubusercontent.com/207433/240937032-f18406e8-d8dd-46ab-b7b3-ff2d1aa97d87.webm
