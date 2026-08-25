![Up to date as of 6.0.0](https://img.shields.io/static/v1?label=dnd5e&message=6.0.0&color=informational)

The Filters system is used in several places throughout the system to allow for defining a condition that is evaluated base on provided data. Most prominently it is used for [active effect conditions](Active-Effects.md#conditions). It is also used internally when performing filtering in the [compendium browser](Compendium-Browser.md).

```json
{
  "o": "OR",
  "v": [
    {
      "k": "item.type.value",
      "v": "ranged"
    },
    {
      "k": "item.properties",
      "o": "has",
      "v": "thr"
    }
  ]
}
```

## Operators & Comparisons

The `o` property in a filter control how an individual filter is evaluated. They come in two varieties: comparisons and operators. If not operator is provided for a filter, then the `exact` comparison operator is used.

### Comparison Functions

Comparison functions determine how the data found at the provided key path (determined by `k`) and the value data (determined by `v`) are compared to determine whether they match. These can be identified because they are written in all lowercase.

The most common operator is `exact`, which is only valid if both values are exactly the same (including uppercase and lowercase letters). This comparison is used if no other is provided.

Another useful comparison is `in`, which behaves like `exact` but accepts an array of values. This allows easily checking against multiple values (e.g. providing `"v": ["simpleM", "simpleR"]` when checking `"k": "item.type.value"` would be able to identify both melee and ranged simple weapons).

If the base value to check against happens to have multiple values, the `has` comparison can be used to see if any of the data matches the provided value (e.g. checking `"k": "item.properties"` with `"v": "mgc"` would identify whether the item has the magical property). The `hasany` and `hasall` comparisons act the same way, but accept multiple values similar to `in` (e.g. checking `"k": "item.properties"` with `"v": ["fin", "lgt"]` would be valid using `hasany` if the weapon was finesse or light, but only be valid using `hasall` if the weapon was *both* finesse and light).

| Function    | Accepted Value  | Description                                                |
| ----------- | --------------- | ---------------------------------------------------------- |
| exact       | Any             | Both values exactly match.                                 |
| contains    | Text            | Base value contains exact provided value.                  |
| icontains   | Text            | Base value contains provided value, ignoring case.         |
| startswith  | Text            | Base value starts with exact provided value.               |
| istartswith | Text            | Base value starts with provided value, ignoring case.      |
| endswith    | Text            | Base value ends with exact provided value.                 |
| iendswith   | Text            | Base value ends with provided value, ignoring case.        |
| has         | Any or Filter   | One entry within base value exactly matches provided value. If provided value is a Filter, then it is evaluated against each entry. |
| hasany      | Array or Filter | Entries within base value match any provided value.        |
| hasall      | Array or Filter | Entries within base value match all provided values.       |
| in          | Array           | Base value exactly matches one of the provided values.     |
| gt          | Number          | Base value is greater than the provided value.             |
| gte         | Number          | Base value if greater than or equal to the provided value. |
| lt          | Number          | Base value is less than the provided value.                |
| lte         | Number          | Base value is less than or equal to the provided value.    |

### Operator Functions

Operator functions combine the results of one or more filters or modify a the result of a single filter. These filters don't take a key path (no `k`) and the value (determined by `v`) can be either a single filter (for the `NOT` operator) or an array of filters (for all other operators).

The two most common operators are `AND` which is valid when all provided filters are valid, and `OR` which is valid so long a single one of its provided filters is valid.

The `NOT` operator is also useful to invert the result of the provided filter.

| Function | Accepted Value    | Description                                      |
| -------- | ----------------- | ------------------------------------------------ |
| AND      | Array of filters  | Valid if all provided filters are valid.         |
| NAND     | Array of filters  | Valid if any provided filters are invalid.       |
| OR       | Array of filters  | Valid if any provided filters are valid.         |
| NOR      | Array of filters  | Valid if all provided filters are invalid.       |
| XOR      | Array of filters  | Valid if only a single provided filter is valid. |
| NOT      | Single filter     | Valid if the provided filter is invalid.         |

## Key Paths

The `k` property in a filter is used to point to a specific piece of data for comparison. Since the base data provided when evaluated is most likely to be roll data, the [roll formulas page](Roll-Formulas.md) can be used as a reference for the accepted values of this property.

## Value

The `v` property is the value used in comparisons. What should be provided here depends on the function being used (see the "Operators & Comparisons" section above).

| Type   | Example                       |
| ------ | ----------------------------- |
| Text   | `"v": "str"`                  |
| Number | `"v": 15`                     |
| Array  | `"v": ["simpleM", "simpleR"]` |
| Filter | `"v": { "k": "…", "v": "…" }` |

## Examples

### Only when Bloodied

Effect only applies when the actor is bloodied:

```json
{
  "k": "statuses.bloodied",
  "v": 1
}
```

### Only Ranged or Thrown Weapons

When used in an enchantment, this applies to any weapon that is ranged or has the thrown property:

```json
{
  "o": "OR",
  "v": [
    {
      "k": "item.type.value",
      "v": "ranged"
    },
    {
      "k": "item.properties",
      "o": "has",
      "v": "thr"
    }
  ]
}
```
