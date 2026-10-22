/**
 * @import { Rule } from "eslint";
 */

/**
 * Base class for custom ESLint rules.
 */
export class CustomRule {

  /**
   * @param {Rule.RuleContext} context  The current linting context.
   */
  constructor(context) {
    this.#context = context;
    this.#src = context.sourceCode;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Rule metadata.
   * @type {Rule.RuleMetaData}
   * @abstract
   */
  static meta = {};

  /* -------------------------------------------- */

  /**
   * The current linting context.
   * @type {Rule.RuleContext}
   */
  get context() {
    return this.#context;
  }

  #context;

  /* -------------------------------------------- */

  /**
   * The source code object for the file being linted.
   * @type {Rule.RuleContext["sourceCode"]}
   */
  get src() {
    return this.#src;
  }

  #src;

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Build and return the AST visitor map.
   * @returns {Rule.RuleListener}
   * @abstract
   * @protected
   */
  _listeners() {
    throw new Error(`${this.constructor.name} must implement _listeners().`);
  }

  /* -------------------------------------------- */
  /*  Factories                                   */
  /* -------------------------------------------- */

  /**
   * Return the ESLint rule descriptor for this rule class.
   * @returns {{ create: (context: Rule.RuleContext) => Rule.RuleListener, meta: Rule.RuleMetaData }}
   */
  static rule() {
    return { create: context => new this(context)._listeners(), meta: this.meta };
  }
}
