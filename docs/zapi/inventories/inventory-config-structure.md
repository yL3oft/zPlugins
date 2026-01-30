---
description: >-
  Complete YAML configuration guide for creating custom inventory menus.
  Learn all available options, placeholders, mathematical expressions,
  and display conditions without any Java code.
---

# Inventory Configuration Structure

This guide explains how to create custom inventory menus using YAML configuration files. This is a user-friendly guide focused on the configuration format - no Java code required!

## Table of Contents

- [Basic Structure](#basic-structure)
- [Inventory Section](#inventory-section)
- [Items Section](#items-section)
- [Item Properties](#item-properties)
- [Slot Configuration](#slot-configuration)
- [Placeholders](#placeholders)
- [Mathematical Expressions](#mathematical-expressions)
- [Display Conditions](#display-conditions)
- [Complete Examples](#complete-examples)

## Basic Structure

Every inventory configuration file has two main sections:

```yaml
# Optional: Command to open this inventory
command: mymenu

Inventory:
  title: "<gold><bold>My Menu"
  rows: 3
  placeholders:
    # Custom inventory-level placeholders (optional)

Items:
  item_name:
    # Item configuration
  another_item:
    # Another item configuration
```

## Inventory Section

The `Inventory` section defines the basic properties of your menu.

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | String | The inventory title (supports MiniMessage formatting) | `"<gold>My Menu"` |
| `rows` | Integer | Number of rows (1-6) | `3` |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `placeholders` | Section | Custom placeholders for this inventory | See [Custom Placeholders](#custom-placeholders) |

{% hint style="info" %}
Custom placeholders defined at the inventory level are available to all items in that inventory, making them perfect for shared values like page numbers or player-specific data.
{% endhint %}

### Example

```yaml
Inventory:
  title: "<gradient:#ff0000:#00ff00>Rainbow Menu</gradient>"
  rows: 6
  placeholders:
    custom_value: "Hello World"
    computed: "{math: 10*5}"
```

## Items Section

The `Items` section contains all the items that will appear in your inventory. Each item has a unique identifier.

### Basic Item Structure

```yaml
Items:
  my_item:
    material: DIAMOND
    amount: 1
    slot: 0
    name: "<gold>My Diamond"
    lore:
      - "<gray>This is a diamond"
      - "<gray>Pretty cool, right?"
```

## Item Properties

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `material` | String or List | Item material (see [Material Options](#material-options)) | `DIAMOND` |
| `slot` | String/Int/List | Slot position(s) (see [Slot Configuration](#slot-configuration)) | `5` or `"4-12"` |

### Optional Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `amount` | Integer | Stack size (1-64) | `16` |
| `name` | String | Display name (supports MiniMessage) | `"<gold>Diamond"` |
| `lore` | List | Lore lines (supports MiniMessage) | See below |
| `enchantments` | List | Enchantments | `["SHARPNESS:5"]` |
| `unbreakable` | Boolean | Make item unbreakable | `true` |
| `itemflags` | List | Item flags | `["HIDE_ENCHANTS"]` |
| `pickable` | Boolean | Whether players can pick up the item | `false` |
| `commands` | List | Commands to execute when clicked | See [Commands](#commands) |
| `display-condition` | String | Condition to show item | See [Display Conditions](#display-conditions) |
| `placeholders` | Section | Custom placeholders for this item | See [Custom Placeholders](#custom-placeholders) |

### Material Options

#### Single Material
```yaml
material: DIAMOND
```

#### Random Material (picks one randomly)
```yaml
material:
  - DIAMOND
  - EMERALD
  - GOLD_INGOT
```

#### Player Head Types

**By Player Name:**
```yaml
material: head-Steve
```

**By Base64 Texture:**
```yaml
material: base64head-eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYjE2..."
```

**By Texture URL:**
```yaml
material: urlhead-http://textures.minecraft.net/texture/abc123...
```

### Lore Configuration

```yaml
lore:
  - "<gray>First line"
  - "<yellow>Second line"
  - ""  # Empty line
  - "<red>Fourth line"
```

### Enchantments

Format: `ENCHANTMENT_NAME:LEVEL`

```yaml
enchantments:
  - "SHARPNESS:5"
  - "UNBREAKING:3"
  - "FIRE_ASPECT:2"
```

### Item Flags

Available flags:
- `HIDE_ENCHANTS` - Hide enchantments
- `HIDE_ATTRIBUTES` - Hide attribute modifiers
- `HIDE_UNBREAKABLE` - Hide unbreakable status
- `HIDE_DESTROYS` - Hide "can destroy" info
- `HIDE_PLACED_ON` - Hide "can be placed on" info
- `HIDE_POTION_EFFECTS` - Hide potion effects
- `HIDE_DYE` - Hide dye color

```yaml
itemflags:
  - HIDE_ENCHANTS
  - HIDE_ATTRIBUTES
```

### Commands

Commands are executed when a player clicks the item. Prefix options:

| Prefix | Description | Example                              |
|--------|-------------|--------------------------------------|
| (none) | Player command | `warp spawn`                         |
| `[CON]` | Console command | `[CON] give %player% diamond 1`      |
| `[INV]` | Inventory action | `[INV] close`                        |
| `[ITEM]` | Item action | `[ITEM] give`                        |
| `[50]` | 50% chance to execute | `[50] [CON] give %player% diamond 1` |

```yaml
commands:
  - "warp lobby"
  - "[CON] say %player% clicked an item!"
  - "[INV] close"
  - "[50] [CON] give %player% diamond 1"  # 50% chance
```

## Slot Configuration

Slots can be specified in multiple ways:

### Single Slot
```yaml
slot: 5  # Just slot 5
```

### Range
```yaml
slot: "4-12"  # Slots 4 through 12 (inclusive)
```

### List of Slots and Ranges
```yaml
slot:
  - 0
  - 5
  - "9-17"  # Range
  - 26
```

### Using Placeholders and Math

Slots support placeholders and mathematical expressions:

```yaml
slot: "{math: %rows%*9 - 1}"  # Last slot in inventory
slot: "%custom_slot%"  # From a placeholder
```

**Slot Grid (for reference):**
```
Row 1:  0  1  2  3  4  5  6  7  8
Row 2:  9 10 11 12 13 14 15 16 17
Row 3: 18 19 20 21 22 23 24 25 26
Row 4: 27 28 29 30 31 32 33 34 35
Row 5: 36 37 38 39 40 41 42 43 44
Row 6: 45 46 47 48 49 50 51 52 53
```

## Placeholders

### Built-in Placeholders

#### Inventory-Level (available everywhere)

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `%rows%` | Number of rows | `3` |
| `%title%` | Inventory title | `My Menu` |
| `%command%` | Command name | `homes` |

#### Item-Level (available in items)

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `%slot%` | Current slot number (0-based) | `5` |
| `%currentitem%` | Item index for multi-slot items | `1` |
| `%player%` | Player name | `Steve` |
| `%online%` | Online player count | `42` |
| `%uuid%` | Player UUID | `069a79f4...` |
| `%world%` | Player's world | `world` |

#### PlaceholderAPI

All PlaceholderAPI placeholders work automatically:

```yaml
name: "<gold>Balance: <yellow>$%vault_eco_balance%"
lore:
  - "<gray>Level: <white>%player_level%"
  - "<gray>Health: <red>%player_health%"
```

### Custom Placeholders

You can define custom placeholders that are parsed once and reused throughout the config.

#### Inventory-Level Custom Placeholders

These are available to ALL items:

```yaml
Inventory:
  title: "%custom_title%"
  rows: 3
  placeholders:
    custom_title: "<gold>Hello %player%"
    custom_value: "{math: 10*5}"
    formatted_balance: "$%vault_eco_balance_formatted%"
```

#### Item-Level Custom Placeholders

These are only available within that specific item:

```yaml
Items:
  my_item:
    name: "%item_title%"
    lore:
      - "%item_description%"
    placeholders:
      item_title: "<gold>Home #%currentitem%"
      item_description: "<gray>Owned by %player%"
```

### Placeholder Processing Order

Placeholders are processed in this order:

1. **Custom placeholders** (from `placeholders:` section)
2. **Math expressions** (wrapped in `{math: ...}`)
3. **Plugin or/and PlaceholderAPI placeholders** (if installed)

This means you can use earlier placeholders in later ones:

```yaml
placeholders:
  base_value: "10"
  doubled: "{math: %base_value%*2}"  # Uses base_value
  formatted: "Value is: %doubled%"    # Uses doubled
```

## Mathematical Expressions

You can use mathematical expressions anywhere by wrapping them in `{math: ...}`:

### Basic Operations

```yaml
name: "Total: {math: 10+5}"        # Result: 15
name: "Half: {math: 100/2}"        # Result: 50
name: "Product: {math: 7*8}"       # Result: 56
```

### With Placeholders

```yaml
name: "Limit: {math: %homes_limit%*2}"
name: "Cost: {math: %base_price%+%tax%}"
```

### Functions

| Function | Description | Example |
|----------|-------------|---------|
| `sqrt(x)` | Square root | `{math: sqrt(16)}` → `4` |
| `round(x)` | Round to nearest | `{math: round(3.7)}` → `4` |
| `roundDown(x)` | Round down (floor) | `{math: roundDown(3.7)}` → `3` |

```yaml
name: "Level: {math: sqrt(%experience%)}"
name: "Avg: {math: round(%total%/%count%)}"
```

### Complex Expressions

```yaml
# Multiple operations
name: "{math: (100+50)/2}"  # Result: 75

# With functions
name: "{math: round(sqrt(%value%)*10)}"

# With placeholders
slot: "{math: %rows%*9-1}"  # Last slot
```

## Display Conditions

Display conditions let you show/hide items based on conditions. The condition must evaluate to `true` for the item to appear.

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal to | `%level%==10` |
| `!=` | Not equal to | `%world%!=world_nether` |
| `>` | Greater than | `%balance%>1000` |
| `<` | Less than | `%homes_count%<5` |
| `>=` | Greater or equal | `%level%>=20` |
| `<=` | Less or equal | `%health%<=10` |

### Basic Examples

```yaml
display-condition: "%homes_count%>0"  # Has at least one home
display-condition: "%player_gamemode%==SURVIVAL"  # In survival
display-condition: "%vault_eco_balance%>=100"  # Has $100+
```

### With Math Expressions

```yaml
# Show if limit * multiplier >= 30
display-condition: "{math: %homes_limit%*%multiplier%}>=30"

# Show if half the value is greater than 50
display-condition: "{math: %value%/2}>50"

# Complex condition
display-condition: "{math: sqrt(%level%)+5}>10"
```

### String Comparisons

```yaml
display-condition: "%player_world%==world"
display-condition: "%player_name%!=Herobrine"
```

## Complete Examples

### Example 1: Simple Navigation Menu

```yaml
command: menu

Inventory:
  title: "<gradient:#00ff00:#0000ff>Server Menu</gradient>"
  rows: 3

Items:
  spawn:
    material: ENDER_PEARL
    slot: 11
    name: "<green><bold>Spawn"
    lore:
      - "<gray>Teleport to spawn"
      - ""
      - "<yellow>Click to teleport!"
    commands:
      - "spawn"
      - "[INV] close"
  
  shop:
    material: EMERALD
    slot: 13
    name: "<gold><bold>Shop"
    lore:
      - "<gray>Open the server shop"
    commands:
      - "shop"
      - "[INV] close"
  
  warps:
    material: COMPASS
    slot: 15
    name: "<aqua><bold>Warps"
    lore:
      - "<gray>View all warps"
    commands:
      - "warps"
      - "[INV] close"
```

### Example 2: Player Homes Menu with Placeholders

```yaml
command: homes

Inventory:
  title: "<gold>%player%'s Homes"
  rows: 6
  placeholders:
    max_homes: "%zhomes_limit%"
    current_homes: "%zhomes_count%"

Items:
  # Header item
  info:
    material: BOOK
    slot: 4
    name: "<gold><bold>Homes Info"
    lore:
      - "<gray>Homes: <white>%current_homes%<gray>/<white>%max_homes%"
      - ""
      - "<yellow>Click a home to teleport!"
    pickable: false
  
  # Home slots (appears for each home)
  home:
    material: head-%player%
    slot:
      - "10-16"
      - "19-25"
      - "28-34"
    name: "<green>Home #%currentitem%"
    lore:
      - "<gray>Location: <white>%zhomes_home_{math: %currentitem%-1}_location%"
      - "<gray>World: <white>%zhomes_home_{math: %currentitem%-1}_world%"
      - ""
      - "<yellow>Left-click to teleport"
      - "<red>Right-click to delete"
    display-condition: "%currentitem%<=%current_homes%"
    commands:
      - "home {math: %currentitem%-1}"
      - "[INV] close"
  
  # Add home button
  add_home:
    material: LIME_STAINED_GLASS_PANE
    slot: 49
    name: "<green><bold>Set New Home"
    lore:
      - "<gray>Click to set a home here"
    display-condition: "%current_homes%<%max_homes%"
    commands:
      - "sethome"
      - "[INV] close"
  
  # Close button
  close:
    material: RED_STAINED_GLASS_PANE
    slot: 53
    name: "<red><bold>Close"
    commands:
      - "[INV] close"
```

### Example 3: Shop with Conditional Items

```yaml
command: shop

Inventory:
  title: "<gold><bold>Server Shop"
  rows: 3
  placeholders:
    player_balance: "%vault_eco_balance%"

Items:
  diamonds:
    material: DIAMOND
    slot: 10
    amount: 16
    name: "<aqua>16 Diamonds"
    lore:
      - "<gray>Price: <gold>$500"
      - ""
      - "<gray>Your balance: <gold>$%player_balance%"
      - ""
      - "<yellow>Click to purchase!"
    display-condition: "%player_balance%>=500"
    enchantments:
      - "LUCK:1"
    itemflags:
      - HIDE_ENCHANTS
    commands:
      - "[50] [CON] eco take %player% 500"
      - "[50] [CON] give %player% diamond 16"
      - "[50] [CON] tellraw %player% {\"text\":\"Purchase successful!\",\"color\":\"green\"}"
      - "[INV] close"
  
  insufficient_funds:
    material: BARRIER
    slot: 10
    name: "<red>Insufficient Funds"
    lore:
      - "<gray>You need <gold>$500"
      - "<gray>Your balance: <gold>$%player_balance%"
    display-condition: "%player_balance%<500"
    pickable: false
```

### Example 4: Pagination System

```yaml
Inventory:
  title: "<red>> Homes"
  rows: 6
  placeholders:
    slots: "{math: 9*%rows%}"
    home-slots: "{math: 9*(%rows%-1)}"

Items:
  filler:
    material: "GRAY_STAINED_GLASS_PANE"
    slot: "0-%slots%"
    name: ""
  close:
    material: "BARRIER"
    slot: "{math: %slots%-5}"
    name: "<red>Close"
    commands: "[INV] close"
    enchantments: "FIRE_ASPECT;1"
    itemflags: "HIDE_ENCHANTS"
  homes:
    material:
      - "WHITE_BED"
      - "LIGHT_GRAY_BED"
      - "GRAY_BED"
      - "BLACK_BED"
      - "BROWN_BED"
      - "RED_BED"
      - "ORANGE_BED"
      - "YELLOW_BED"
      - "LIME_BED"
      - "GREEN_BED"
      - "CYAN_BED"
      - "LIGHT_BLUE_BED"
      - "BLUE_BED"
      - "PURPLE_BED"
      - "MAGENTA_BED"
      - "PINK_BED"
    slot: "0-{math: %home-slots%-1}"
    name: "<green>Home: <yellow>%currenthome%"
    lore:
      - "<aqua>Click to teleport!"
    commands:
      - "home %currenthome%"
      - "[INV] close"
    display-condition: "%currenthome%!="
    placeholders:
      currenthome: "%zhomes_%target%_home_{math: %currentitem%+(%page%-1)*%home-slots%}%"
  previous-page:
    material: "ARROW"
    slot: "{math: %slots%-7}"
    name: "<red>Previous Page"
    commands: "homes {math: %page%-1}"
    enchantments: "FIRE_ASPECT;1"
    itemflags: "HIDE_ENCHANTS"
    display-condition: "%page%>1"
  next-page:
    material: "ARROW"
    slot: "{math: %slots%-3}"
    name: "<green>Next Page"
    commands: "homes {math: %page%+1}"
    enchantments: "FIRE_ASPECT;1"
    itemflags: "HIDE_ENCHANTS"
    display-condition: "%zhomes_%target%_set%-(%page%-1)*%home-slots%>%home-slots%"
```

## Best Practices

1. **Always set `pickable: false`** for decorative items you don't want players to pick up
2. **Use display conditions** to show/hide items dynamically
3. **Leverage custom placeholders** to avoid repeating complex expressions
4. **Test mathematical expressions** before deploying
5. **Use meaningful item identifiers** in the Items section for easy maintenance
6. **Add empty lines in lore** for better visual separation
7. **Use `[INV] close`** at the end of command lists when you want to close the inventory
8. **Validate slot ranges** - remember slots are 0-based (0-53 for 6 rows)

## Troubleshooting

### Item doesn't appear
- Check `display-condition` - it may be evaluating to false
- Verify slot number is within valid range (0 to rows*9-1)
- Make sure material name is valid

### Placeholders not working
- Ensure PlaceholderAPI is installed for PAPI placeholders
- Check placeholder spelling and syntax
- Remember custom placeholders need to be defined in `placeholders:` section

### Math expressions not calculating
- Verify expression is wrapped in `{math: ...}`
- Check for syntax errors in the expression
- Ensure all placeholders used in math exist and return numbers

### Commands not executing
- Check command prefix (`[CON]`, `[INV]`, etc.)
- Verify player has permission for the command
- Test the command manually first