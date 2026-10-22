import { CustomRule } from "./custom.mjs";

/**
 * @import { AST, Rule } from "eslint";
 */

/**
 * Enforce spaces inside the parentheses of control-flow statements.
 */
class SpaceInControlFlowParens extends CustomRule {

  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  /** @override */
  static meta = {
    fixable: "whitespace",
    messages: {
      missingCloseSpace: "Expected a space before ')'.",
      missingOpenSpace: "Expected a space after '('."
    },
    schema: [],
    type: "layout"
  };

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  _listeners() {
    return {
      CatchClause: this.#onCatchClause.bind(this),
      DoWhileStatement: this.#onDoWhileStatement.bind(this),
      ForInStatement: this.#checkAfterKeyword.bind(this),
      ForOfStatement: this.#checkAfterKeyword.bind(this),
      ForStatement: this.#checkAfterKeyword.bind(this),
      IfStatement: this.#onIfStatement.bind(this),
      SwitchStatement: this.#onSwitchStatement.bind(this),
      WhileStatement: this.#onWhileStatement.bind(this)
    };
  }

  /* -------------------------------------------- */

  /**
   * Check parens following the first keyword token of a node.
   * @param {object} node
   */
  #checkAfterKeyword(node) {
    const open = this.#openAfterKeyword(this.src.getFirstToken(node));
    if ( !open ) return;
    const close = this.#matchingClose(open);
    if ( close ) this.#checkParens(open, close);
  }

  /* -------------------------------------------- */

  /**
   * Check parens immediately surrounding an expression node.
   * @param {object} expr
   */
  #checkAroundExpr(expr) {
    const { isCloseParen, isOpenParen } = this.constructor;
    const open = this.src.getTokenBefore(expr);
    const close = this.src.getTokenAfter(expr);
    if ( isOpenParen(open) && isCloseParen(close) ) this.#checkParens(open, close);
  }

  /* -------------------------------------------- */

  /**
   * Check that the open paren has a trailing space, and that the close paren has a leading space.
   * @param {AST.Token} open
   * @param {AST.Token} close
   */
  #checkParens(open, close) {
    const first = this.src.getTokenAfter(open);
    const last = this.src.getTokenBefore(close);
    if ( first && (first !== close) ) this.#checkSpace(open, first, "missingOpenSpace");
    if ( last && (last !== open) ) this.#checkSpace(last, close, "missingCloseSpace");
  }

  /* -------------------------------------------- */

  /**
   * Report and fix a missing space between two adjacent tokens.
   * @param {AST.Token} before
   * @param {AST.Token} after
   * @param {string} messageId
   */
  #checkSpace(before, after, messageId) {
    if ( after.range[0] !== before.range[1] ) return;
    this.context.report({
      messageId,
      fix: fixer => fixer.insertTextAfter(before, " "),
      loc: before.loc
    });
  }

  /* -------------------------------------------- */

  /**
   * Find the opening paren immediately following a keyword token.
   * @param {AST.Token|null} keyword
   * @returns {AST.Token|null}
   */
  #openAfterKeyword(keyword) {
    if ( !keyword ) return null;
    const t = this.src.getTokenAfter(keyword);
    return this.constructor.isOpenParen(t) ? t : null;
  }

  /* -------------------------------------------- */

  /**
   * Find the matching closing paren for a given opening paren token.
   * @param {AST.Token} open
   * @returns {AST.Token|null}
   */
  #matchingClose(open) {
    const { isCloseParen, isOpenParen } = this.constructor;
    let depth = 1;
    let t = open;
    while ( depth ) {
      t = this.src.getTokenAfter(t);
      if ( !t ) return null;
      if ( isOpenParen(t) ) depth++;
      else if ( isCloseParen(t) ) depth--;
    }
    return t;
  }

  /* -------------------------------------------- */
  /*  Events                                      */
  /* -------------------------------------------- */

  /**
   * Handle catch clause.
   * @param {object} node
   */
  #onCatchClause(node) {
    if ( node.param ) this.#checkAfterKeyword(node);
  }

  /* -------------------------------------------- */

  /**
   * Handle do-while statement.
   * @param {object} node
   */
  #onDoWhileStatement(node) {
    this.#checkAroundExpr(node.test);
  }

  /* -------------------------------------------- */

  /**
   * Handle if-statement.
   * @param {object} node
   */
  #onIfStatement(node) {
    this.#checkAroundExpr(node.test);
  }

  /* -------------------------------------------- */

  /**
   * Handle switch statement.
   * @param {object} node
   */
  #onSwitchStatement(node) {
    this.#checkAroundExpr(node.discriminant);
  }

  /* -------------------------------------------- */

  /**
   * Handle while statement.
   * @param {object} node
   */
  #onWhileStatement(node) {
    this.#checkAroundExpr(node.test);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Whether a given token is a closing parenthesis.
   * @param {AST.Token|null} [token]
   * @returns {boolean}
   */
  static isCloseParen(token) {
    return token?.value === ")";
  }

  /* -------------------------------------------- */

  /**
   * Whether a given token is an opening parenthesis.
   * @param {AST.Token} token
   * @returns {boolean}
   */
  static isOpenParen(token) {
    return token?.value === "(";
  }
}

/* -------------------------------------------- */

export default SpaceInControlFlowParens.rule();
