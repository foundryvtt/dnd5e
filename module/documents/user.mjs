import UserSystemFlags from "../data/user/user-system-flags.mjs";
import SystemFlagsMixin from "./mixins/flags.mjs";

/**
 * Extend the base User class to implement system-specific logic.
 */
export default class User5e extends SystemFlagsMixin(foundry.documents.User) {
  /** @inheritDoc */
  get _systemFlagsDataModel() {
    return UserSystemFlags;
  }
}
