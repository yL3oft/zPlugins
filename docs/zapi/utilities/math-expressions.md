---
description: >-
  Complete guide to the mathematical expression evaluator in zAPI.
  Learn how to use mathematical operations, functions, and expressions
  with placeholders in your configurations.
---

# Mathematical Expression Evaluator

zAPI includes a powerful mathematical expression evaluator that can parse and compute mathematical expressions with support for basic arithmetic, functions, and placeholder integration.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Supported Operations](#supported-operations)
- [Functions](#functions)
- [Using with Placeholders](#using-with-placeholders)
- [Integration with Items and Inventories](#integration-with-items-and-inventories)
- [Advanced Examples](#advanced-examples)
- [Error Handling](#error-handling)

## Overview

The `MathExpressionEvaluator` class provides a static `evaluate()` method that can parse and compute mathematical expressions as strings. This is particularly useful for:

- Dynamic calculations in configurations
- Conditional logic in display conditions
- Computing values based on placeholders
- Creating flexible, data-driven systems

## Basic Usage

### Direct Evaluation

```java
import me.yleoft.zAPI.utility.MathExpressionEvaluator;

public class Example {
    public void basicCalculations() {
        // Simple arithmetic
        double result1 = MathExpressionEvaluator.evaluate("10 + 5");
        // result1 = 15.0
        
        double result2 = MathExpressionEvaluator.evaluate("100 / 4");
        // result2 = 25.0
        
        double result3 = MathExpressionEvaluator.evaluate("3 * 7");
        // result3 = 21.0
        
        // Complex expressions
        double result4 = MathExpressionEvaluator.evaluate("(10 + 5) * 2");
        // result4 = 30.0
    }
}
```

### In Configuration Files

Mathematical expressions in configs are wrapped in `{math: ...}`:

```yaml
# In YAML configuration
name: "Total: {math: 10+5}"
lore:
  - "Value: {math: 100/2}"
  - "Product: {math: 7*8}"
slot: "{math: %rows%*9-1}"
```

The evaluator is automatically called when processing placeholders in ItemBuilder and InventoryBuilder.

## Supported Operations

### Basic Arithmetic

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `10 + 5` | `15` |
| `-` | Subtraction | `20 - 8` | `12` |
| `*` | Multiplication | `6 * 7` | `42` |
| `/` | Division | `100 / 4` | `25` |

### Operator Precedence

Operations follow standard mathematical precedence:

1. **Parentheses** `()`
2. **Multiplication and Division** `*` `/`
3. **Addition and Subtraction** `+` `-`

```java
// Examples demonstrating precedence
double r1 = MathExpressionEvaluator.evaluate("2 + 3 * 4");
// r1 = 14 (not 20, because 3*4 is evaluated first)

double r2 = MathExpressionEvaluator.evaluate("(2 + 3) * 4");
// r2 = 20 (parentheses force 2+3 to be evaluated first)

double r3 = MathExpressionEvaluator.evaluate("10 - 5 - 2");
// r3 = 3 (left-to-right evaluation: (10-5)-2)
```

### Negative Numbers

Negative numbers are fully supported:

```java
double r1 = MathExpressionEvaluator.evaluate("-5 + 10");
// r1 = 5

double r2 = MathExpressionEvaluator.evaluate("10 * -2");
// r2 = -20

double r3 = MathExpressionEvaluator.evaluate("(-5 + 3) * 2");
// r3 = -4
```

### Decimal Numbers

All calculations support decimal values:

```java
double r1 = MathExpressionEvaluator.evaluate("10.5 + 2.3");
// r1 = 12.8

double r2 = MathExpressionEvaluator.evaluate("100 / 3");
// r2 = 33.333333...

double r3 = MathExpressionEvaluator.evaluate("3.14 * 2");
// r3 = 6.28
```

## Functions

The evaluator supports several mathematical functions:

### sqrt() - Square Root

Calculates the square root of a number.

```java
double r1 = MathExpressionEvaluator.evaluate("sqrt(16)");
// r1 = 4

double r2 = MathExpressionEvaluator.evaluate("sqrt(2)");
// r2 = 1.414...

double r3 = MathExpressionEvaluator.evaluate("sqrt(9) * 3");
// r3 = 9 (3 * 3)
```

**In config:**
```yaml
name: "Distance: {math: sqrt(100)}"  # Result: 10
lore:
  - "Radius: {math: sqrt(%area%/3.14)}"
```

### round() - Round to Nearest Integer

Rounds a number to the nearest integer using standard rounding rules (0.5 rounds up).

```java
double r1 = MathExpressionEvaluator.evaluate("round(3.7)");
// r1 = 4

double r2 = MathExpressionEvaluator.evaluate("round(3.4)");
// r2 = 3

double r3 = MathExpressionEvaluator.evaluate("round(3.5)");
// r3 = 4

double r4 = MathExpressionEvaluator.evaluate("round(10 / 3)");
// r4 = 3
```

**In config:**
```yaml
name: "Average: {math: round((%a%+%b%+%c%)/3)}"
lore:
  - "Rounded price: ${math: round(%price%*1.15)}"
```

### roundDown() - Floor Function

Always rounds down to the nearest integer.

```java
double r1 = MathExpressionEvaluator.evaluate("roundDown(3.9)");
// r1 = 3

double r2 = MathExpressionEvaluator.evaluate("roundDown(3.1)");
// r2 = 3

double r3 = MathExpressionEvaluator.evaluate("roundDown(-2.5)");
// r3 = -3
```

**In config:**
```yaml
name: "Complete stacks: {math: roundDown(%items%/64)}"
lore:
  - "Level: {math: roundDown(sqrt(%xp%/100))}"
```

### Nested Functions

Functions can be nested within each other:

```java
double r1 = MathExpressionEvaluator.evaluate("round(sqrt(16))");
// r1 = 4

double r2 = MathExpressionEvaluator.evaluate("sqrt(round(15.7))");
// r2 = 4 (sqrt(16))

double r3 = MathExpressionEvaluator.evaluate("roundDown(sqrt(50) * 2)");
// r3 = 14
```

**In config:**
```yaml
name: "{math: round(sqrt(%value%)*10)}"
lore:
  - "{math: roundDown(sqrt(%a%*%a% + %b%*%b%))}"
```

## Using with Placeholders

### Placeholder Replacement Order

When using math expressions with placeholders, processing happens in this order:

1. **Custom placeholders** are replaced first
2. **Math expressions** are evaluated
3. **PlaceholderAPI placeholders** are processed last

This allows you to use PlaceholderAPI values in math:

```yaml
# PlaceholderAPI placeholders work in math
name: "Double limit: {math: %zhomes_limit%*2}"
lore:
  - "Half price: ${math: %vault_eco_balance%/2}"
```

### In Item Configurations

```yaml
items:
  my_item:
    name: "<gold>Level {math: sqrt(%player_exp%)}"
    lore:
      - "<gray>Attack: <red>{math: %base_attack%*%multiplier%}"
      - "<gray>Defense: <blue>{math: round(%defense%*1.5)}"
      - ""
      - "<yellow>Next level: {math: (%current_level%+1)*100} XP"
    placeholders:
      base_attack: "10"
      multiplier: "1.5"
      defense: "%player_defense%"
      current_level: "%player_level%"
```

### In Display Conditions

Math expressions can be used in display conditions for dynamic logic:

```yaml
items:
  premium_item:
    material: DIAMOND
    name: "<gold>Premium Feature"
    # Show if doubled limit is >= 30
    display-condition: "{math: %homes_limit%*2}>=30"
```

```yaml
items:
  upgrade:
    material: EMERALD
    name: "<green>Upgrade Available"
    # Show if player level squared > 100
    display-condition: "{math: %player_level%*%player_level%}>100"
```

### In Slot Calculations

```yaml
Items:
  last_slot_item:
    material: BARRIER
    name: "<red>Close"
    # Calculate last slot: rows * 9 - 1
    slot: "{math: %rows%*9-1}"
```

```yaml
Items:
  centered_item:
    material: DIAMOND
    name: "<aqua>Center Item"
    # Calculate center slot of middle row
    slot: "{math: roundDown(%rows%/2)*9+4}"
```

## Integration with Items and Inventories

### Automatic Processing in ItemBuilder

The ItemBuilder automatically processes math expressions in:
- Item names
- Lore lines
- Enchantment levels
- Custom commands
- Display conditions

No manual evaluation needed:

```java
// Math is automatically evaluated
ItemStack item = ItemBuilder.createItem(player, config, "items.my_item");
```

### Automatic Processing in InventoryBuilder

The InventoryBuilder automatically processes math expressions in:
- Inventory titles
- Slot positions
- All item properties
- Custom placeholders

```java
// Math is automatically evaluated in all fields
InventoryBuilder builder = new InventoryBuilder(player, config);
```

### Manual Evaluation

For custom use cases, you can manually evaluate expressions:

```java
import me.yleoft.zAPI.utility.MathExpressionEvaluator;

public class Example {
    public void customCalculations(Player player) {
        String homesLimit = PlaceholderAPI.setPlaceholders(player, "%zhomes_limit%");
        
        // Evaluate a dynamic expression
        double doubledLimit = MathExpressionEvaluator.evaluate(homesLimit + "*2");
        
        // Use the result
        player.sendMessage("Your doubled limit is: " + doubledLimit);
    }
}
```

## Advanced Examples

### Example 1: Experience-Based Leveling

```yaml
items:
  player_stats:
    material: EXPERIENCE_BOTTLE
    name: "<gold>Player Stats"
    lore:
      - "<gray>Level: <yellow>{math: roundDown(sqrt(%player_exp%/100))}"
      - "<gray>XP: <green>%player_exp%"
      - "<gray>Next level: <aqua>{math: (roundDown(sqrt(%player_exp%/100))+1)*100} XP"
      - ""
      - "<gray>Progress: {math: round((%player_exp%/(roundDown(sqrt(%player_exp%/100))+1)*100)*100)}%"
```

### Example 2: Dynamic Pricing

```yaml
items:
  shop_item:
    material: DIAMOND
    amount: "{math: %quantity%}"
    name: "<aqua>Diamonds x%quantity%"
    lore:
      - "<gray>Base price: <gold>$%base_price%"
      - "<gray>Quantity: <white>%quantity%"
      - "<gray>Discount: <green>%discount%%"
      - ""
      - "<yellow>Total: <gold>${math: round(%base_price%*%quantity%*(1-%discount%/100))}"
    placeholders:
      base_price: "100"
      quantity: "16"
      discount: "10"
```

### Example 3: Grid Position Calculator

```yaml
items:
  grid_item:
    material: STAINED_GLASS_PANE
    name: "<gray>Grid Position %currentitem%"
    # Convert item number to grid position
    slot: "{math: roundDown((%currentitem%-1)/7)*9 + (%currentitem%-1)%7 + 1}"
    lore:
      - "<gray>Row: {math: roundDown((%currentitem%-1)/7)+1}"
      - "<gray>Column: {math: (%currentitem%-1)%7+1}"
```

### Example 4: Skill Point Requirements

```yaml
items:
  skill:
    material: ENCHANTED_BOOK
    name: "%skill_name%"
    lore:
      - "<gray>Current Level: <white>%current_level%"
      - "<gray>Max Level: <white>%max_level%"
      - ""
      - "<yellow>Upgrade Cost:"
      - "<gray>  Points: <gold>{math: %current_level%*10+50}"
      - "<gray>  Gold: <yellow>${math: round(%current_level%*%current_level%*1.5)}"
    # Can upgrade if has enough points and not maxed
    display-condition: "{math: %available_points%>=(%current_level%*10+50)} && %current_level%<%max_level%"
```

### Example 5: Compound Interest Calculator

```yaml
items:
  investment:
    material: GOLD_INGOT
    name: "<gold>Investment Calculator"
    lore:
      - "<gray>Initial: <yellow>$%initial%"
      - "<gray>Rate: <green>%rate%%"
      - "<gray>Years: <white>%years%"
      - ""
      - "<yellow>Future Value:"
      - "<gold>${math: round(%initial% * (1 + %rate%/100) * (1 + %rate%/100) * (1 + %rate%/100))}"
    placeholders:
      initial: "1000"
      rate: "5"
      years: "3"
```

## Error Handling

### Try-Catch Block

```java
try {
    double result = MathExpressionEvaluator.evaluate("10 / 0");
} catch (IllegalArgumentException e) {
    // Handle invalid expression
    System.out.println("Invalid expression: " + e.getMessage());
} catch (ArithmeticException e) {
    // Handle division by zero
    System.out.println("Math error: " + e.getMessage());
}
```

### Common Errors

#### Division by Zero

```java
// Throws ArithmeticException
MathExpressionEvaluator.evaluate("100 / 0");
```

#### Invalid Syntax

```java
// Throws IllegalArgumentException
MathExpressionEvaluator.evaluate("10 + + 5");
MathExpressionEvaluator.evaluate("sqrt(");
MathExpressionEvaluator.evaluate("10 * )");
```

#### Invalid Function Names

```java
// Throws IllegalArgumentException
MathExpressionEvaluator.evaluate("cos(45)");  // Function not supported
```

### Safe Evaluation

```java
public double safeEvaluate(String expression, double defaultValue) {
    try {
        return MathExpressionEvaluator.evaluate(expression);
    } catch (Exception e) {
        zAPI.getLogger().warn("Failed to evaluate: " + expression, e);
        return defaultValue;
    }
}
```

## Result Formatting

Results are automatically formatted:

### Whole Numbers

```java
double result = MathExpressionEvaluator.evaluate("10 / 2");
// Result: 5.0
// When converted to string in configs: "5" (no decimal)
```

### Decimals

```java
double result = MathExpressionEvaluator.evaluate("10 / 3");
// Result: 3.3333333...
// When converted to string in configs: "3.33" (max 2 decimals, trailing zeros removed)
```

This automatic formatting ensures clean display in item names and lore.

## Performance Considerations

1. **Cache results** when possible - if the expression doesn't change, evaluate once
2. **Avoid complex nested functions** in loops
3. **Validate expressions** before production use
4. **Pre-process static expressions** at plugin startup
5. **Use simple arithmetic** when possible instead of functions

## Best Practices

1. **Always use `{math: ...}` wrapper** in config files
2. **Validate expressions** during testing
3. **Use parentheses** to make order of operations explicit
4. **Handle errors gracefully** with try-catch
5. **Test edge cases** (division by zero, negative numbers, very large numbers)
6. **Document complex expressions** with comments in configs
7. **Use meaningful placeholder names** in math expressions
8. **Round appropriately** when displaying to users
9. **Avoid extremely long expressions** - split into multiple placeholders
10. **Test with actual placeholder values** before deployment

## Troubleshooting

### Expression Not Evaluating

**Problem:** Math expression appears as literal text
```yaml
name: "{math: 10+5}"  # Shows as "{math: 10+5}" instead of "15"
```

**Solution:** Ensure you're using ItemBuilder or InventoryBuilder, which automatically process math expressions.

### Wrong Result

**Problem:** Expression gives unexpected result
```yaml
# Expected: 20, Got: 14
value: "{math: 2+3*4}"
```

**Solution:** Use parentheses to control order: `{math: (2+3)*4}`

### Placeholder Not Replaced

**Problem:** Placeholder in math not replaced
```yaml
value: "{math: %unknown%*2}"
```

**Solution:** Ensure the placeholder exists and is defined before the math expression is evaluated.

### Decimal Precision Issues

**Problem:** Unexpected decimal values
```yaml
value: "{math: 10/3}"  # Shows as "3.33" but need "3.333"
```

**Solution:** Formatting is automatic and limited to 2 decimals. Use `round()` or `roundDown()` for integer results.

## See Also

- [Creating Custom Items](creating-custom-items.md) - Using math in item configs
- [Inventory Configuration Structure](inventory-config-structure.md) - Using math in inventory configs
- [Creating Custom Inventories](creating-inventories.md) - InventoryBuilder with math support