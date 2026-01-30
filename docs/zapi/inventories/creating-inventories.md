---
description: >-
  Learn how to create custom inventory menus programmatically using the
  InventoryBuilder class with support for placeholders, mathematical expressions,
  and automatic command registration.
---

# Creating Custom Inventories

zAPI provides a powerful `InventoryBuilder` class that allows you to create custom inventories programmatically from YAML configuration files. This system supports dynamic placeholders, mathematical expressions, display conditions, and automatic command registration.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Constructor Options](#constructor-options)
- [Available Placeholders](#available-placeholders)
- [Creating Inventories from Config](#creating-inventories-from-config)
- [Inventory Properties](#inventory-properties)
- [Item Management](#item-management)
- [Advanced Features](#advanced-features)

## Basic Usage

### Creating a Simple Inventory

```java
import me.yleoft.zAPI.inventory.InventoryBuilder;
import net.kyori.adventure.text.Component;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;

public class Example {
    public void openSimpleMenu(Player player) {
        // Create an inventory with a title and 3 rows
        Component title = TextFormatter.transform("<gold><bold>My Custom Menu");
        InventoryBuilder builder = new InventoryBuilder(title, 3);
        
        // Add items (we'll cover this in detail later)
        ItemStack item = new ItemStack(Material.DIAMOND);
        builder.setItem(0, item);
        
        // Build and open the inventory
        Inventory inventory = builder.build();
        player.openInventory(inventory);
    }
}
```

### Creating from YAML Configuration

```java
import org.bukkit.configuration.file.YamlConfiguration;

public class Example {
    public void openConfigMenu(Player player, YamlConfiguration config) {
        // Create inventory from config
        InventoryBuilder builder = new InventoryBuilder(player, config);
        
        // Build and open
        player.openInventory(builder.build());
    }
}
```

## Constructor Options

The `InventoryBuilder` class offers several constructors:

### 1. Manual Constructor
```java
// Basic: title and rows
InventoryBuilder builder = new InventoryBuilder(title, rows);
```
- **title**: Component - The inventory title
- **rows**: int - Number of rows (1-6)

### 2. Config Constructor (Without Player)
```java
// Load from config without player context
InventoryBuilder builder = new InventoryBuilder(config);
```
- **config**: YamlConfiguration - The configuration file

### 3. Config Constructor (With Player)
```java
// Load from config with player context for placeholders
InventoryBuilder builder = new InventoryBuilder(player, config);
```
- **player**: OfflinePlayer - Player for placeholder resolution
- **config**: YamlConfiguration - The configuration file

### 4. Config Constructor (With Custom Placeholders)
```java
// Load from config with custom global placeholders
Map<String, String> placeholders = new HashMap<>();
placeholders.put("%targetplayer%", "Notch");
placeholders.put("%page%", "1");

InventoryBuilder builder = new InventoryBuilder(player, config, placeholders);
```
- **player**: OfflinePlayer - Player for placeholder resolution
- **config**: YamlConfiguration - The configuration file
- **globalPlaceholders**: Map<String, String> - Custom placeholders applied to ALL items

## Available Placeholders

### Inventory-Level Placeholders

These placeholders are automatically available to all items in the inventory:

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `%rows%` | Number of rows in the inventory | `3` |
| `%title%` | Raw title string from config | `My Menu` |
| `%command%` | Command to open this inventory | `openmenu` |

### Slot-Level Placeholders

These placeholders are automatically available when items are placed in slots:

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `%slot%` | The slot number (0-based) | `5` |
| `%currentitem%` | Item index for multi-slot items (1-based) | `1` |
| `%player%` | Player name | `Steve` |
| `%online%` | Number of online players | `42` |
| `%uuid%` | Player UUID | `069a79f4-44e9-4726-a5be-fca90e38aaf5` |
| `%world%` | Player's current world | `world` |

### PlaceholderAPI Support

All PlaceholderAPI placeholders are automatically supported when PlaceholderAPI is installed:

```yaml
Items:
  balance:
    name: "<gold>Balance: <yellow>$%vault_eco_balance%"
    material: GOLD_INGOT
    slot: 10
```

### Custom Placeholders

You can define custom placeholders in your config that will be parsed and applied to all relevant fields. See the [Inventory Configuration Guide](inventory-config-structure.md) for details.

## Creating Inventories from Config

### Automatic Command Registration

If your config includes a `command` field, zAPI will automatically register a command that opens the inventory:

```java
import me.yleoft.zAPI.inventory.InventoryBuilder;

public class Example {
    public void registerMenuCommands() {
        YamlConfiguration config = // load your config
        
        // This automatically registers the command from config
        InventoryBuilder.registerMenuCommand(config);
    }
}
```

The command is registered with:
- Name from the `command` field
- Permission handling if specified
- Player-only restriction
- Automatic inventory opening

### Example Config with Command
```yaml
command: homes

Inventory:
  title: "<gold><bold>My Homes"
  rows: 6

Items:
  # items here...
```

When a player types `/homes`, the inventory will open automatically.

## Inventory Properties

### Getting and Setting Title

```java
// Get current title
Component title = builder.getTitle();

// Set new title (Component)
builder.setTitle(Component.text("New Title"));

// Set new title (String with formatting)
builder.setTitle(player, "<gold>New Title");
```

### Getting Inventory Information

```java
// Get number of rows
int rows = builder.getRows();

// Get total slot count
int totalSlots = builder.getSize(); // Returns rows * 9

// Get item count
int itemCount = builder.getItemCount();

// Check if empty
boolean isEmpty = builder.isEmpty();

// Get all items as map
Map<Integer, ItemStack> items = builder.getItems();
```

## Item Management

### Adding Items

```java
// Set item in specific slot
builder.setItem(0, itemStack);

// Set item with custom placeholders
Map<String, String> placeholders = new HashMap<>();
placeholders.put("%custom%", "value");
builder.setItem(5, itemStack, placeholders);
```

### Removing Items

```java
// Remove item from slot
builder.removeItem(0);

// Clear all items
builder.clear();
```

### Checking Items

```java
// Check if slot has item
boolean hasItem = builder.hasItem(0);

// Get item from slot
ItemStack item = builder.getItem(0);
```

## Advanced Features

### Using Global Placeholders

Global placeholders are applied to the entire inventory, including title and all items:

```java
Map<String, String> globalPlaceholders = new HashMap<>();
globalPlaceholders.put("%targetplayer%", targetPlayer.getName());
globalPlaceholders.put("%page%", String.valueOf(currentPage));
globalPlaceholders.put("%maxpages%", String.valueOf(maxPages));

InventoryBuilder builder = new InventoryBuilder(
    player, 
    config, 
    globalPlaceholders
);
```

These placeholders are particularly useful for:
- Pagination systems
- Player profile viewers
- Dynamic content based on context

### Mathematical Expressions in Placeholders

You can use mathematical expressions in your placeholders using the `{math: ...}` syntax:

```java
Map<String, String> placeholders = new HashMap<>();
placeholders.put("%homes_limit%", "10");
placeholders.put("%multiplier%", "2");

// In config:
// name: "Limit: {math: %homes_limit%*%multiplier%}"
// Result: "Limit: 20"
```

Supported operations:
- Basic: `+`, `-`, `*`, `/`
- Functions: `sqrt()`, `round()`, `roundDown()`

### Copying an Inventory

```java
// Create a copy of the inventory builder
InventoryBuilder copy = builder.copy();

// Modifications to copy won't affect original
copy.setItem(0, newItem);
```

### Building the Final Inventory

```java
// Build and get Bukkit Inventory
Inventory inventory = builder.build();

// Legacy method (same as build())
Inventory inventory = builder.getInventory();
```

## Complete Example

Here's a complete example showing various features:

```java
import me.yleoft.zAPI.inventory.InventoryBuilder;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;

public class CustomMenuManager {
    
    private final YamlConfiguration config;
    
    public CustomMenuManager(YamlConfiguration config) {
        this.config = config;
    }
    
    public void openPlayerMenu(Player player, Player targetPlayer, int page) {
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("%targetplayer%", targetPlayer.getName());
        placeholders.put("%page%", String.valueOf(page));
        placeholders.put("%maxpages%", "5");
        
        // Create inventory with placeholders
        InventoryBuilder builder = new InventoryBuilder(
            player, 
            config, 
            placeholders
        );
        
        player.openInventory(builder.build());
    }
}
```

## Best Practices

1. **Use player context when available** - Always pass the player to constructors for proper placeholder resolution
2. **Validate row count** - Ensure rows are between 1 and 6
3. **Handle null items** - Always check if `getItem()` returns null
4. **Use global placeholders for shared data** - When multiple items need the same placeholder values
5. **Separate logic from presentation** - Keep config files focused on layout, handle dynamic content in code
6. **Cache built inventories when possible** - If the inventory doesn't change, build once and reuse

## See Also

- [Inventory Configuration Structure](inventory-config-structure.md) - Learn the YAML format for inventories
- [Creating Custom Items](creating-custom-items.md) - Learn about ItemBuilder
- [Command System](commands-and-subcommands.md) - Create commands that open inventories