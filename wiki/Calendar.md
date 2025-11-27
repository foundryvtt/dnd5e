![Up to date as of 5.2.0](https://img.shields.io/static/v1?label=dnd5e&message=5.2.0&color=informational)

The DnD5e system extends Foundry's calendar system with a new HUD to display the date & time, various configuration options to customize how the calendar is presented, an application for jumping to a specific date, several built-in calendars for prominent 5e game settings, and an API to allow module authors to contribute their own calendars.

![Calendar HUD, Settings, and Set Date Dialog](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-summary.jpg)


## Calendar Setup

Because not all games need a visible calendar, the calendar interface is disabled by default. To enable it, a GM user must navigate to the calendar configuration in settings. Within the Dungeons & Dragons Fifth Edition area of Game Settings the "Calendar Configuration" button can be used to open these settings. Here the GM can enable the calendar system and select which calendar they would like to use. The same window can also be used by all users to select whether they would like to view the calendar and how the date and time are shown.

![Calendar Settings Player Interface](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-settings-player.jpg)

When players view the calendar interface they will only see the "Calendar Preferences" section. These options only apply to the current player.
- *Display Calendar HUD*: Controls whether the calendar interface is visible.
- *Date Format* & *Time Format*: Select what is displayed to the left and right side of the calendar interface. More details on the different default formatters can be found below.

![Calendar Settings GM Interface](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-settings-gm.jpg)

The GM's calendar settings has an additional "Configuration" section that isn't available for players. These options will apply globally to all users.

- *Enabled*: Controls whether the calendar interface as a whole is enabled. If this is unchecked, no user will be able to view the calendar interface or change any of the options under "Calendar Preferences".
- *Calendar*: Select a specific Calendar that will be used to measure time. The system provides support for the default simplified Gregorian calendar, the Calendar of Greyhawk, the Calendar of Harptos (from the Forgotten Realms), and the Calendar of Khorvaire (from Eberron). **Note:** Changing the calendar requires a restart.


## Calendar HUD

When enabled and displayed, the calendar HUD will appear at the top of the main game interface. It includes a small visualization of the current time of day in the center, surrounded by the date & time, with several buttons on the outside.

![Calendar HUD](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-interface.jpg)

### Formatters

Surrounding the visualization are two formatter positions. While these positions are labeled Date and Time, each can take formatters of either type allowing for their positions to be swapped or for two different date or time formatters to be selected at the same time. There are three different formatters provided by default of each type:

#### Default Formatters

The default date formatter provides the month and day while the default time formatter provides the current hours and minutes.

![Calendar Formatters - Default](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-formatters-default.jpg)

#### Full Formatters

The full date formatter adds the year to the month and day while the full time formatter includes the current seconds.

![Calendar Formatters - Full](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-formatters-full.jpg)

#### Approximate Formatters

The final set of formatters are the Approximate Date and Approximate Time. Rather than providing exact date and time values these formatters provide rough values that may be more useful in settings without exact timekeeping. The date formatter will indicate the progress of the current season (e.g. Mid-Winter or Early Summer). The time formatter provides a number of values for the rough time of day (e.g. Sunrise, Morning, Noon, Evening, or Night).

![Calendar Formatters - Approximate](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-formatters-approximate.jpg)

### Buttons

Outside of the main part of the HUD are a series of buttons. The exact buttons that appear here will vary depending on the current user.

- *Set Date*: Opens a dialog for jumping to a specific date. **Note:** This button is only available for GM users.
- *Open Character Sheet*: If a player has an assigned character their interface will contain a button for opening that character's sheet.
- *Reverse Time* and *Advance Time*: These buttons allow for moving time forward and backwards by one hour. They also include a dropdown menu that includes more time periods for more specific control. **Note:** These buttons are available for GMs only.
- *Open Party Sheet*: If there is a primary assigned in the world, this will open its sheet.

![Calendar Time Control Buttons](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-time-control-buttons.jpg)


## Set Date Dialog

The set date dialog allows for jumping to a specific year, month, and day in the selected Calendar.

![Set Date Dialog](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/set-date-dialog.jpg)


## Calendar API

While Foundry provides the basic implementation for the calendar system, DnD5e extends it with some additional tools and APIs to make it work better with the calendar interface and selection.

### Calendar Configuration

The core of the calendar configuration options can be found in `CONFIG.DND5E.calendar`. Within this is `application`, which defines the application class that will be created to display the HUD, `calendars` where additional Calendars are defined, and `formatters` where new formatters are defined.

### Calendar HUD Application

To create a new calendar HUD, simply replace `CONFIG.DND5E.calendar.application` with an ApplicationV2 class. To ensure the calendar is displayed and hidden when the visibility settings are changed a custom application should implement a `onUpdateSettings` method. This will be called whenever the calendar configuration or preferences are changed to allow the interface a chance to adjust to any changes.

To avoid having to implement the settings updating manually, the system provides `dnd5e.applications.calendar.BaseCalendarHUD` that provides the most basic components of the calendar HUD. For smaller changes, the default application at `dnd5e.applications.calendar.CalendarHUD` can be extended.

### Calendar Configuration

`CONFIG.DND5E.calendar.calendars` contains a list of the different Calendars available to be used. These configuration entries require several options:

- `value`: A unique ID of the calendar.
- `label`: The displayed name for the calendar. Can be a localization key that will be localized by the system.
- `config`: An object containing the default options for the calendar data. This data will be used to initialize the `CalendarData5e` data model.
- `class` (optional): An extension of [`CalendarData`](https://foundryvtt.com/api/classes/foundry.data.CalendarData.html) or `CalendarData5e` that will be used rather than the default to allow for additional behavior or data.

When creating a new calendar data model it is best to extend the system's version at `dnd5e.dataModels.calendar.CalendarData5e` because it provides a number of new methods to aid with rendering the HUD. If for some reason you cannot extend the system's model, then a few methods should be provided in your custom model:

```typescript
class MyCustomModel extends foundry.data.CalendarData {
  sunrise(time: number|TimeComponents): number {}
  sunset(time: number|TimeComponents): number {}
}
```

The formatters configuration should also be modified to remove any formatters that aren't supported by your custom calendar data model.

### Formatter Configuration

Custom formatters can be added to `CONFIG.DND5E.calendar.formatters` using several options:

- `value`: A unique ID of the formatter.
- `label`: The display name for the formatter. Can be a localization key that will be localized by the system.
- `formatter`: Either a complete formatting method (see [`TimeFormatter`](https://foundryvtt.com/api/types/foundry.data.types.TimeFormatter.html) in core) or a string referencing a specific method on the current `CalendarData` instance.
- `group` (optional): Which section the formatter will appear within, usually should be one of the system's localization keys of `DND5E.CALENDAR.Formatters.Date` or `DND5E.CALENDAR.Formatters.Time`.

### Relevant Hooks

There are two useful hooks when dealing with the system's calendar implementation:

#### `dnd5e.setupCalendar`

This hook is called during the `init` stage to give modules a chance to modify the calendar configuration before the system finishes initializing the calendar. Any changes to `CONFIG.DND5E.calendar.calendars` should be done in this hook otherwise the system won't have a chance to respond to them.

Returning `false` from this hook will prevent the system from initializing the calendar data model itself.

#### `updateWorldTime`

The system enhances core's [`updateWorldTime`](https://foundryvtt.com/api/functions/hookEvents.updateWorldTime.html) hook with some additional information. Inside the `options` object passed to this hook the system adds a new `dnd5e.deltas` object that contains information on how many of certain time periods were passed during the world time update. These periods includes `midnights`, `middays`, `sunrises`, and `sunsets`.

These options are added regardless of whether the calendar system is enabled or a system-specific calendar data model is provided, though the `sunrises` and `sunsets` values are only available if the current calendar data model provides `sunrise` and `sunset` methods.

### Disabling the System's Calendar Completely

For a module that provides its own calendar and wants to disable the system's implementation, there are a few places that this should be handled. The easiest way to disable everything entirely is with a single `dnd5e.setupCalendar` hook:

```javascript
Hooks.on("dnd5e.setupCalendar", () => {
  CONFIG.DND5E.calendar.application = null;
  CONFIG.DND5E.calendar.calendars = [];
  return false;
});
```

When the calendar system is disabled by a module a message will be displayed in the settings dialog to indicate that and any settings that aren't usable will be disabled.

![Calendar Settings Disabled](https://raw.githubusercontent.com/foundryvtt/dnd5e/publish-wiki/wiki/images/calendar/calendar-settings-disabled.jpg)
