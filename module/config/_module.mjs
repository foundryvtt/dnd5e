import * as actor from "./actor.mjs";
import * as general from "./general.mjs";
import * as item from "./item.mjs";
import * as spellcasting from "./spellcasting.mjs";
import * as utils from "./utils.mjs";

const DND5E = {
  ...actor,
  ...general,
  ...item,
  ...spellcasting,
  utils
};

DND5E.ASCII =
`_______________________________
______      ______ _____ _____
|  _  \\___  |  _  \\  ___|  ___|
| | | ( _ ) | | | |___ \\| |__
| | | / _ \\/\\ | | |   \\ \\  __|
| |/ / (_>  < |/ //\\__/ / |___
|___/ \\___/\\/___/ \\____/\\____/
_______________________________`;

export default DND5E;
