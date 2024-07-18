![Up to date as of 3.3.0](https://img.shields.io/static/v1?label=dnd5e&message=3.0.0&color=informational)

The award system can be used by DMs to grant their players currency and XP rewards. It can be accessed in three ways, the `/award` command in chat, `[[/award]]` enrichers in journal entries, and the `"Award"` button in group actors.


## Award Command

![Award Chat Command & Chat Messages](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/award-command-and-messages.jpg)

Awarding players from chat is as easy as typing `/award` followed by currency or XP values to award. Each award entry is formatted as a number followed immediately by a code, for example `5gp` for five gold or `10xp` for ten experience points. The numbers can also be formulas, so you can award `2d6sp` and the dice values will be automatically evaluated when the award occurs.

> <details>
> <summary>Award Codes</summary>
>
> | Award Type        | Code    |
> |-------------------|---------|
> | Platinum          | `pp`    |
> | Gold              | `gp`    |
> | Silver            | `sp`    |
> | Electrum          | `ep`    |
> | Copper            | `cp`    |
> | Experience Points | `xp`    |
>
> Custom currencies will use whatever key was used when defining them within `CONFIG.DND5E.currencies`.</details>

The `/award` command supports two additional options. By default when used it will open up the award dialog for the DM to complete the process, but if a primary party is set up then the `party` option can be used to send the award directly to that party group. So typing `/award party 500gp` will send 500 gold directly to the party actor.

By default the award command splits the amounts set among all destinations, but if the award is instead a per-player value you can use the `each` option. Typing `/award 100xp each` will grant each selected player in the award dialog 100 experience points, rather than dividing that amount between them.


## Award Enricher

![Award Enricher & Window](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/award-enricher-and-window.jpg)

Using the award enricher within a journal entry is as simple as wrapping any award chat command you would use in double square brackets (`[[` and `]]`). This will format the award to work inline with a sentence or separated into its own block if desired.

Enter `[[/award 50gp 50xp]]` in a journal entry will be formatted as `"50 (G), 50 XP [Award]"`, using the new currency icons for each currency type and providing the Award button which will bring up the application for DMs. Modifying the enricher with the `each` command (e.g. `[[/award 50gp each]]`) will display in the description like `"50 (G) each [Award]"`.

If the origin button text isn't desired, it can be customized using the enricher's label such as `[[/award 50000gp]]{Give 'em the Gold}` to produce `"50,000 (G) [Give 'em the Gold]"`.


## Awards in Groups

![Award within a Group](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/award-group.jpg)

Rather than awarding gold and experience points directly to players in the middle of combat, the DM may wish to grant them first to the group and dole them out at the end of a session. Any XP and gold sent to the primary party using the award command or enrichers will be tracked and can be granted to players using the `"Award"` button just below the experience points tracker.

Any awards sent from a group are capped by the amount available in that group, so if a group has 400 XP tracked and the DM grants each player in a five person party 100 XP, the amount each character will receive will only be 80 XP and the tracked XP in the group will be reduced to zero.

For encounter groups, the XP is calculated based on the combined XP of all NPCs within the encounter. This allows the use of the award button to easily grant players the XP for the entire encounter.
