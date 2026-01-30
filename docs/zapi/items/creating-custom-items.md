---
description: >-
  Learn how to create custom items from YAML configuration using the ItemBuilder
  class with support for placeholders, mathematical expressions, display conditions,
  custom commands, and NBT data.
---

# Creating Custom Items

The `ItemBuilder` class provides powerful methods for creating custom items from YAML configuration files with support for placeholders, mathematical expressions, display conditions, custom commands, and more.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Creating Items from Config](#creating-items-from-config)
- [Item Properties](#item-properties)
- [Placeholder System](#placeholder-system)
- [Mathematical Expressions](#mathematical-expressions)
- [Display Conditions](#display-conditions)
- [Advanced Features](#advanced-features)
- [Complete Examples](#complete-examples)

## Basic Usage

### Creating a Simple Item

```java
import me.yleoft.zAPI.item.ItemBuilder;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

public class Example {
    public ItemStack createCustomItem(Player player, YamlConfiguration config) {
        // Create item from config at path "items.my_item"
        return ItemBuilder.createItem(player, config, "items.my_item");
    }
}
```

### With Custom Placeholders

```java
public ItemStack createItemWithPlaceholders(Player player, YamlConfiguration config) {
    Map<String, String> placeholders = new HashMap<>();
    placeholders.put("%custom%", "value");
    placeholders.put("%slot%", "5");
    
    return ItemBuilder.createItem(player, config, "items.my_item", placeholders);
}
```

## Creating Items from Config

### Method Signatures

```java
// Basic creation
ItemStack createItem(Player player, YamlConfiguration config, String path)

// With placeholders
ItemStack createItem(OfflinePlayer player, YamlConfiguration config, String path, Map<String, String> placeholders)
```

### Configuration Path

The path parameter points to the item's location in the config:

```yaml
items:
  my_item:
    material: DIAMOND
    name: "<gold>My Item"
```

```java
// Path would be "items.my_item"
ItemStack item = ItemBuilder.createItem(player, config, "items.my_item");
```

## Item Properties

### Configuration Keys

All item properties are defined using standard keys:

| Key | Type | Description |
|-----|------|-------------|
| `material` | String/List | Item material |
| `amount` | Integer | Stack size |
| `name` | String | Display name |
| `lore` | List | Lore lines |
| `enchantments` | List | Enchantments |
| `unbreakable` | Boolean | Unbreakable flag |
| `itemflags` | List | Item flags |
| `pickable` | Boolean | Can be picked up |
| `commands` | List | Click commands |
| `display-condition` | String | Show condition |
| `placeholders` | Section | Custom placeholders |

### Material Types

#### Standard Materials

```yaml
material: DIAMOND_SWORD
```

#### Random Selection

```yaml
material:
  - DIAMOND
  - EMERALD
  - GOLD_INGOT
```

#### Player Heads

**By Player Name:**
```yaml
material: head-Steve
```

**By Base64 Texture:**
```yaml
material: base64head-eyJ0ZXh0dXJlcyI6...
```

**By URL:**
```yaml
material: urlhead-http://textures.minecraft.net/texture/...
```

**Auto-detect:**
```yaml
material: head-Steve  # Name
material: head-eyJ0ZXh0...  # Base64
material: head-http://...  # URL
```

### Display Name and Lore

Names and lore support MiniMessage formatting and placeholders:

```yaml
name: "<gradient:#ff0000:#00ff00>Rainbow Sword</gradient>"
lore:
  - "<gray>Damage: <red>%damage%"
  - "<gray>Durability: <yellow>%durability%"
  - ""
  - "<yellow>Click to use!"
```

### Enchantments

Format: `ENCHANTMENT_NAME:LEVEL`

```yaml
enchantments:
  - "SHARPNESS:5"
  - "UNBREAKING:3"
  - "MENDING:1"
```

Placeholders work in enchantment levels:

```yaml
enchantments:
  - "SHARPNESS:%enchant_level%"
```

### Item Flags

```yaml
itemflags:
  - HIDE_ENCHANTS
  - HIDE_ATTRIBUTES
  - HIDE_UNBREAKABLE
```

### Commands

Commands execute when the item is clicked in an inventory:

```yaml
commands:
  - "warp spawn"  # Player command
  - "[CON]say Hello!"  # Console command
  - "[INV]close"  # Close inventory
  - "[ITEM]give"  # Give item copy
  - "[50]heal %player%"  # 50% chance
```

Command prefixes:
- `[CON]` - Execute as console
- `[INV]` - Inventory action (close)
- `[ITEM]` - Item action (give)
- `[chance]` - Random execution (e.g., `[75]` for 75%)

### Pickable Property

Controls whether players can pick up the item from inventories:

```yaml
pickable: false  # Item is locked in place
```

When `false`, the item is marked with NBT data preventing pickup.

## Placeholder System

### Built-in Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `%player%` | Player name | `Steve` |
| `%online%` | Online players | `42` |
| `%uuid%` | Player UUID | `069a79f4...` |
| `%world%` | Current world | `world` |
| `%slot%` | Slot number | `5` |
| `%currentitem%` | Item index | `1` |

### Creating Slot Placeholders

```java
// For slot-based items (like in inventories)
Map<String, String> placeholders = ItemBuilder.createSlotPlaceholders(
    player,  // Player context
    5,       // Slot number (0-based)
    1        // Item index (1-based, for multi-slot items)
);

ItemStack item = ItemBuilder.createItem(player, config, path, placeholders);
```

### Custom Placeholders in Config

Define custom placeholders that are parsed once and reused:

```yaml
items:
  my_item:
    name: "%custom_title%"
    lore:
      - "%custom_description%"
    placeholders:
      custom_title: "<gold>Item #%currentitem%"
      custom_description: "<gray>Owned by %player%"
      computed_value: "{math: %base_value%*2}"
```

### Placeholder Processing Order

Placeholders are processed in this specific order:

1. **Custom placeholders** (from `placeholders:` section)
2. **Mathematical expressions** (`{math: ...}`)
3. **PlaceholderAPI placeholders**

This allows you to build on previous placeholders:

```yaml
placeholders:
  base: "10"
  doubled: "{math: %base%*2}"  # Uses base
  formatted: "Value: %doubled%"  # Uses doubled
```

### Merging Placeholder Maps

```java
Map<String, String> base = new HashMap<>();
base.put("%base%", "value");

Map<String, String> additional = new HashMap<>();
additional.put("%extra%", "more");

// Merge multiple maps
Map<String, String> merged = ItemBuilder.mergePlaceholders(base, additional);
```

## Mathematical Expressions

Mathematical expressions are wrapped in `{math: ...}` tags and evaluated during placeholder processing.

### Basic Operations

```yaml
name: "Total: {math: 10+5}"  # 15
name: "Half: {math: 100/2}"  # 50
name: "Product: {math: 7*8}"  # 56
name: "Complex: {math: (10+5)*2}"  # 30
```

### With Placeholders

```yaml
name: "Limit: {math: %homes_limit%*2}"
name: "Cost: {math: %base_price%+%tax%}"
lore:
  - "<gray>Total: {math: %amount%*%price%}"
```

### Supported Functions

| Function | Description | Example |
|----------|-------------|---------|
| `sqrt(x)` | Square root | `{math: sqrt(16)}` → 4 |
| `round(x)` | Round to nearest | `{math: round(3.7)}` → 4 |
| `roundDown(x)` | Floor function | `{math: roundDown(3.7)}` → 3 |

```yaml
name: "Level: {math: sqrt(%experience%)}"
lore:
  - "Average: {math: round(%total%/%count%)}"
```

### Complex Expressions

```yaml
# Multiple operations
lore:
  - "Value: {math: (%base%+%bonus%)*%multiplier%}"

# With functions
name: "{math: round(sqrt(%value%)*10)}"

# Nested calculations
lore:
  - "Result: {math: sqrt(%a%*%a% + %b%*%b%)}"
```

### Format of Results

- Whole numbers: No decimal point (e.g., `5` not `5.0`)
- Decimals: Up to 2 decimal places, trailing zeros removed (e.g., `3.14` not `3.1400`)

## Display Conditions

Display conditions determine whether an item should be created/shown based on a boolean expression.

### Evaluating Conditions

```java
// Check if condition is met
boolean shouldShow = ItemBuilder.evaluateDisplayCondition(
    player,
    "%homes_count%>0",
    placeholders
);

if (shouldShow) {
    ItemStack item = ItemBuilder.createItem(player, config, path, placeholders);
    // Use the item...
}
```

### Condition Syntax

#### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal to | `%level%==10` |
| `!=` | Not equal | `%world%!=nether` |
| `>` | Greater than | `%balance%>1000` |
| `<` | Less than | `%homes%<5` |
| `>=` | Greater or equal | `%level%>=20` |
| `<=` | Less or equal | `%health%<=10` |

#### Basic Conditions

```yaml
# Numeric comparisons
display-condition: "%homes_count%>0"
display-condition: "%level%>=10"
display-condition: "%balance%<=5000"

# String comparisons
display-condition: "%player_world%==world"
display-condition: "%gamemode%!=CREATIVE"
```

#### With Math Expressions

```yaml
# Show if doubled value is >= 30
display-condition: "{math: %homes_limit%*2}>=30"

# Show if average is > 50
display-condition: "{math: (%a%+%b%)/2}>50"

# Complex condition
display-condition: "{math: sqrt(%level%)+5}==10"
```

#### In Configuration

```yaml
items:
  premium_item:
    material: DIAMOND
    name: "<gold>Premium Item"
    display-condition: "%vault_eco_balance%>=1000"
    # Only shows if player has $1000+
```

## Advanced Features

### Parsing Placeholder Definitions

Parse custom placeholders from a config section:

```java
Map<String, String> basePlaceholders = new HashMap<>();
basePlaceholders.put("%slot%", "5");

// Parse placeholders from config
Map<String, String> parsed = ItemBuilder.parsePlaceholderDefinitions(
    player,
    config,
    "items.my_item.placeholders",  // Path to placeholders section
    basePlaceholders  // Base placeholders to use while parsing
);

// Now 'parsed' contains all evaluated placeholders
```

### Replacing Placeholders in Existing Items

Modify an existing ItemStack's name and lore:

```java
ItemStack item = new ItemStack(Material.DIAMOND);

Map<String, String> replacements = new HashMap<>();
replacements.put("%player%", player.getName());
replacements.put("%value%", "100");

// Replace placeholders in item's name and lore
ItemBuilder.replacePlaceholders(item, replacements);
```

### Creating Items from Material Strings

Directly create items from material strings (including heads):

```java
// Regular material
ItemStack diamond = ItemBuilder.createItemFromMaterial(player, "DIAMOND", 1);

// Player head by name
ItemStack head = ItemBuilder.createItemFromMaterial(player, "head-Notch", 1);

// Player head by base64
ItemStack customHead = ItemBuilder.createItemFromMaterial(
    player,
    "base64head-eyJ0ZXh0dXJlcyI6...",
    1
);
```

### Parsing Material Names

Parse material names to Material enum:

```java
// Standard material
Material mat1 = ItemBuilder.parseMaterial("DIAMOND_SWORD");

// Player heads return PLAYER_HEAD
Material mat2 = ItemBuilder.parseMaterial("head-Steve");  // PLAYER_HEAD
```

## Complete Examples

### Example 1: Dynamic Weapon

```yaml
items:
  legendary_sword:
    material: DIAMOND_SWORD
    amount: 1
    name: "<gradient:#ff0000:#ffff00>Legendary Sword</gradient>"
    lore:
      - "<gray>Damage: <red>%damage%"
      - "<gray>Attack Speed: <yellow>%attack_speed%"
      - ""
      - "<gold>Level Requirement: %required_level%"
      - "<gray>Your Level: <white>%player_level%"
      - ""
      - "<yellow>Special Ability:"
      - "<gray>  Critical Strike: {math: round(%damage%*1.5)} damage"
    enchantments:
      - "SHARPNESS:5"
      - "UNBREAKABLE:3"
    itemflags:
      - HIDE_ATTRIBUTES
    unbreakable: true
    display-condition: "%player_level%>=%required_level%"
    placeholders:
      damage: "25"
      attack_speed: "1.6"
      required_level: "30"
```

```java
public ItemStack createWeapon(Player player, YamlConfiguration config) {
    return ItemBuilder.createItem(player, config, "items.legendary_sword");
}
```

### Example 2: Multi-Slot Home Items

```yaml
items:
  home_item:
    material: head-%player%"
    name: "<green>Home #%currentitem%"
    lore:
      - "<gray>Location: %home_location%"
      - "<gray>Set: %home_date%"
      - ""
      - "<yellow>Left-click to teleport"
      - "<red>Right-click to delete"
    display-condition: "%currentitem%<=%homes_count%"
    commands:
      - "home %currentitem%"
      - "[INV]close"
    placeholders:
      home_location: "%zhomes_home_{math: %currentitem%-1}_location%"
      home_date: "%zhomes_home_{math: %currentitem%-1}_date%"
```

```java
public void addHomeItems(InventoryBuilder builder, Player player, YamlConfiguration config) {
    int[] slots = {10, 11, 12, 13, 14, 15, 16};
    int homesCount = 5; // Get actual count
    
    for (int i = 0; i < slots.length && i < homesCount; i++) {
        Map<String, String> placeholders = ItemBuilder.createSlotPlaceholders(
            player,
            slots[i],
            i + 1  // currentitem is 1-based
        );
        
        placeholders.put("%homes_count%", String.valueOf(homesCount));
        
        ItemStack item = ItemBuilder.createItem(
            player,
            config,
            "items.home_item",
            placeholders
        );
        
        if (item != null) {
            builder.setItem(slots[i], item);
        }
    }
}
```

### Example 3: Conditional Shop Item

```yaml
items:
  shop_item:
    material: DIAMOND
    amount: 16
    name: "<aqua>16 Diamonds"
    lore:
      - "<gray>Price: <gold>$%price%"
      - ""
      - "<gray>Your balance: <gold>$%player_balance%"
      - ""
      - "%purchase_status%"
    enchantments:
      - "LUCK:1"
    itemflags:
      - HIDE_ENCHANTS
    display-condition: "%can_afford%==true"
    commands:
      - "[CON]eco take %player% %price%"
      - "[CON]give %player% diamond 16"
      - "[CON]tellraw %player% {\"text\":\"Purchase successful!\",\"color\":\"green\"}"
      - "[INV]close"
    placeholders:
      price: "500"
      player_balance: "%vault_eco_balance%"
      can_afford: "{math: %vault_eco_balance%>=%price%}"
      purchase_status: "<yellow>Click to purchase!"
```

```java
public ItemStack createShopItem(Player player, YamlConfiguration config) {
    Map<String, String> placeholders = new HashMap<>();
    // Additional placeholders can be added here if needed
    
    return ItemBuilder.createItem(player, config, "items.shop_item", placeholders);
}
```

### Example 4: Skill Tree Item

```yaml
items:
  skill:
    material: ENCHANTED_BOOK
    name: "%skill_name%"
    lore:
      - "<gray>Level: <white>%current_level%<gray>/<white>%max_level%"
      - ""
      - "<yellow>Next Level Benefits:"
      - "<gray>  • %benefit_1%"
      - "<gray>  • %benefit_2%"
      - ""
      - "<gold>Cost: %upgrade_cost% points"
      - "<gray>Available: <white>%available_points%"
      - ""
      - "%action_text%"
    display-condition: "%unlocked%==true"
    enchantments:
      - "LUCK:%glow_level%"
    itemflags:
      - HIDE_ENCHANTS
    commands:
      - "[CON]skills upgrade %player% %skill_id%"
      - "[CON]tellraw %player% {\"text\":\"Skill upgraded!\",\"color\":\"green\"}"
    placeholders:
      current_level: "%skills_%skill_id%_level%"
      max_level: "10"
      upgrade_cost: "{math: %current_level%*100}"
      can_upgrade: "{math: %available_points%>=%upgrade_cost%}"
      action_text: "<yellow>Click to upgrade!"
      glow_level: "{math: %current_level%>0}"
```

```java
public ItemStack createSkillItem(Player player, String skillId, YamlConfiguration config) {
    Map<String, String> placeholders = new HashMap<>();
    placeholders.put("%skill_id%", skillId);
    placeholders.put("%skill_name%", getSkillName(skillId));
    placeholders.put("%unlocked%", String.valueOf(isSkillUnlocked(player, skillId)));
    placeholders.put("%available_points%", String.valueOf(getAvailablePoints(player)));
    placeholders.put("%benefit_1%", getNextLevelBenefit(skillId, 0));
    placeholders.put("%benefit_2%", getNextLevelBenefit(skillId, 1));
    
    return ItemBuilder.createItem(player, config, "items.skill", placeholders);
}
```

## Best Practices

1. **Always provide player context** when possible for proper placeholder resolution
2. **Use display conditions** to hide items that shouldn't be shown
3. **Set `pickable: false`** for GUI items you don't want players to take
4. **Validate math expressions** before using in production
5. **Cache computed values** when creating multiple similar items
6. **Use custom placeholders** to avoid repeating complex expressions
7. **Test with null players** if items need to work without player context
8. **Leverage PlaceholderAPI** for dynamic external data
9. **Format numbers appropriately** using math functions like `round()`
10. **Use meaningful placeholder names** for maintainability

## Performance Tips

1. **Parse placeholders once** and reuse for multiple items
2. **Avoid redundant item creation** - cache when possible
3. **Use batch operations** when creating many items
4. **Pre-compute static values** before loops
5. **Minimize PlaceholderAPI calls** by caching results

## Troubleshooting

### Item Not Created

- Check if display condition evaluates to false
- Verify material name is valid
- Ensure config path exists

### Placeholders Not Replacing

- Verify placeholder spelling
- Check if PlaceholderAPI is installed (for PAPI placeholders)
- Ensure custom placeholders are defined in config

### Math Not Evaluating

- Confirm expression is wrapped in `{math: ...}`
- Check for syntax errors
- Verify all placeholders return valid numbers

### Commands Not Executing

- Test command manually first
- Check command prefix syntax
- Verify player permissions

## See Also

- [Creating Custom Inventories](creating-inventories.md)
- [Inventory Configuration Structure](inventory-config-structure.md)
- [Mathematical Expression Evaluator](math-expressions.md)