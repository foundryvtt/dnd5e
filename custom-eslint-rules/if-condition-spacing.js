module.exports = {
  meta: {
    type: "layout",
    docs: {
      description: "Enforce space before and after condition inside if statements",
      recommended: false
    },
    fixable: "whitespace"
  },
  create: function(context) {
    return {
      IfStatement(node) {
        // eslint v9.0.0 and above
        // const sourceCode = context.sourceCode;
        const test = node.test; // The condition inside the if statement

        // eslint v9.0.0 and above
        // const before = sourceCode.getTokenBefore(test);
        // const after = sourceCode.getTokenAfter(test);
        const before = context.getTokenBefore(test);
        const after = context.getTokenAfter(test);

        if ( !before || !after ) return;

        // eslint v9.0.0 and above
        // const beforeText = sourceCode.getText().slice(before.range[1], test.range[0]);
        // const afterText = sourceCode.getText().slice(test.range[1], after.range[0]);
        const beforeText = context.getSource().slice(before.range[1], test.range[0]);
        const afterText = context.getSource().slice(test.range[1], after.range[0]);

        if ( beforeText !== " " || afterText !== " " ) {
          context.report({
            node: test,
            message: "There must be a space before and after the condition inside if statement parentheses.",
            fix(fixer) {
              return [
                fixer.replaceTextRange([before.range[1], test.range[0]], " "),
                fixer.replaceTextRange([test.range[1], after.range[0]], " ")
              ];
            }
          });
        }
      }
    };
  }
};
