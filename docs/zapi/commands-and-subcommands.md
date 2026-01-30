---
description: >-
  Complete guide to creating custom commands with zAPI's command framework.
  Learn how to create commands, subcommands, and parameters without plugin.yml
  with automatic tab completion and cooldown support.
---

# Creating Custom Commands

zAPI provides a powerful command framework that eliminates the need for `plugin.yml` registration while offering advanced features like subcommands, parameters, cooldowns, and automatic tab completion.

## Table of Contents

- [Overview](#overview)
- [Basic Commands](#basic-commands)
- [Command Properties](#command-properties)
- [SubCommands](#subcommands)
- [Parameters](#parameters)
- [Tab Completion](#tab-completion)
- [Cooldown System](#cooldown-system)
- [Complete Examples](#complete-examples)

## Overview

The zAPI command system consists of three main interfaces:

- **Command**: Main commands with optional cooldowns
- **SubCommand**: Sub-commands under main commands
- **Parameter**: Optional flags/parameters (e.g., `-force`, `-silent`)

### Key Features

- ✅ **No plugin.yml needed** - Commands are registered dynamically
- ✅ **Automatic permission handling** - Built-in permission checks
- ✅ **Cooldown support** - Per-command cooldowns with bypass permissions
- ✅ **Parameter system** - Unix-style parameters (e.g., `-flag value`)
- ✅ **Tab completion** - Automatic subcommand completion
- ✅ **Message customization** - Override default messages
- ✅ **Argument validation** - Min/max argument counts

## Basic Commands

### Creating a Simple Command

```java
import me.yleoft.zAPI.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

public class HelloCommand implements Command {
    
    @Override
    public @NotNull String name() {
        return "hello";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        if (sender instanceof Player player) {
            message(sender, "<green>Hello, " + player.getName() + "!");
        } else {
            message(sender, "<green>Hello, Console!");
        }
    }
    
    @Override
    public String description() {
        return "Sends a hello message";
    }
}
```

### Registering the Command

```java
import me.yleoft.zAPI.utility.PluginYAML;

public class MyPlugin extends JavaPlugin {
    
    @Override
    public void onEnable() {
        // Register the command
        PluginYAML.registerCommand(new HelloCommand());
    }
}
```

That's it! No `plugin.yml` entry needed. The command is now available as `/hello`.

{% hint style="warning" %}
Remember to add empty `commands: {}` and `permissions: {}` sections in your plugin.yml for zAPI commands to work properly. This is a requirement for dynamic command registration.
{% endhint %}

## Command Properties

### Required Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `name()` | String | The command name |
| `execute()` | void | Main execution logic |

### Optional Methods

| Method | Return Type | Default | Description |
|--------|-------------|---------|-------------|
| `description()` | String | `""` | Command description |
| `aliases()` | List<String> | `[]` | Command aliases |
| `permission()` | String | `null` | Required permission |
| `playerOnly()` | boolean | `false` | Can only be used by players |
| `minArgs()` | int | `0` | Minimum arguments required |
| `maxArgs()` | int | `Integer.MAX_VALUE` | Maximum arguments allowed |
| `usage()` | String | `""` | Usage message |
| `permissionMessage()` | String | Default | No permission message |
| `playerOnlyMessage()` | String | Default | Player-only message |
| `cooldownTime()` | double | `0D` | Cooldown in seconds |
| `bypassCooldownPermission()` | String | `null` | Permission to bypass cooldown |

### Complete Command Example

```java
public class WarpCommand implements Command {
    
    @Override
    public @NotNull String name() {
        return "warp";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("tp", "teleport");
    }
    
    @Override
    public String description() {
        return "Teleport to a warp point";
    }
    
    @Override
    public String permission() {
        return "myplugin.warp";
    }
    
    @Override
    public boolean playerOnly() {
        return true;
    }
    
    @Override
    public int minArgs() {
        return 1;  // Requires at least 1 argument (warp name)
    }
    
    @Override
    public String usage(CommandSender sender, String[] fullArgs, String[] args) {
        return "<red>Usage: /warp <name>";
    }
    
    @Override
    public double cooldownTime() {
        return 5.0;  // 5 second cooldown
    }
    
    @Override
    public String bypassCooldownPermission() {
        return "myplugin.warp.bypass";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        Player player = (Player) sender;
        String warpName = args[0];
        
        // Teleport logic here...
        message(sender, "<green>Teleported to " + warpName + "!");
    }
}
```

## SubCommands

SubCommands allow you to create nested command structures like `/homes set <name>` or `/homes delete <name>`.

### Creating a SubCommand

```java
import me.yleoft.zAPI.command.SubCommand;

public class HomesSetSubCommand implements SubCommand {
    
    @Override
    public @NotNull String name() {
        return "set";
    }
    
    @Override
    public String description() {
        return "Set a home at your location";
    }
    
    @Override
    public int minArgs() {
        return 1;  // Requires home name
    }
    
    @Override
    public String usage(CommandSender sender, String[] fullArgs, String[] args) {
        return "<red>Usage: /homes set <name>";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        Player player = (Player) sender;
        String homeName = args[0];
        
        // Set home logic...
        message(sender, "<green>Home '" + homeName + "' set!");
    }
}
```

### Registering SubCommands

SubCommands are registered to their parent command:

```java
public class HomesCommand implements Command {
    
    public HomesCommand() {
        // Register subcommands
        addSubCommand(new HomesSetSubCommand());
        addSubCommand(new HomesDeleteSubCommand());
        addSubCommand(new HomesListSubCommand());
    }
    
    @Override
    public @NotNull String name() {
        return "homes";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        // If no subcommand, show list of homes
        message(sender, "<gold>Your homes:");
        // ... list homes ...
    }
}
```

### SubCommand Structure

```
/homes              → HomesCommand.execute()
/homes set home1    → HomesSetSubCommand.execute()
/homes delete home1 → HomesDeleteSubCommand.execute()
/homes list         → HomesListSubCommand.execute()
```

### Nested SubCommands

SubCommands can have their own SubCommands:

```java
public class AdminCommand implements Command {
    
    public AdminCommand() {
        // Level 1 subcommand
        SubCommand userSubCmd = new AdminUserSubCommand();
        
        // Level 2 subcommands
        userSubCmd.addSubCommand(new AdminUserBanSubCommand());
        userSubCmd.addSubCommand(new AdminUserUnbanSubCommand());
        
        addSubCommand(userSubCmd);
    }
    
    // ...
}
```

Structure:
```
/admin                  → AdminCommand
/admin user             → AdminUserSubCommand
/admin user ban Steve   → AdminUserBanSubCommand
/admin user unban Steve → AdminUserUnbanSubCommand
```

## Parameters

Parameters are optional flags that modify command behavior (e.g., `-force`, `-silent`, `-amount 5`).

### Creating a Parameter

```java
import me.yleoft.zAPI.command.Parameter;
import org.bukkit.command.CommandSender;
import org.jetbrains.annotations.NotNull;

public class ForceParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "force";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("f");
    }
    
    @Override
    public String permission() {
        return "myplugin.delete.force";
    }
    
    @Override
    public int minArgs() {
        return 0;  // No arguments needed (boolean flag)
    }
    
    @Override
    public int maxArgs() {
        return 0;  // No arguments needed (boolean flag)
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] parameterArgs) {
        // Parameter execution (optional, can be empty)
        message(sender, "<yellow>Force mode enabled");
    }
}
```

### Registering Parameters

```java
public class DeleteCommand implements Command {
    
    public DeleteCommand() {
        // Register parameters
        addParameter(new ForceParameter());
        addParameter(new SilentParameter());
    }
    
    @Override
    public @NotNull String name() {
        return "delete";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        // Check if force parameter was used
        String[] forceArgs = getParameter(sender, new ForceParameter());
        boolean isForce = forceArgs != null;
        
        if (isForce) {
            message(sender, "<red>Force deleting...");
        } else {
            message(sender, "<yellow>Normal delete...");
        }
        
        // Delete logic...
    }
}
```

### Using Parameters

```bash
/delete home1              # Normal delete
/delete home1 -force       # Force delete
/delete home1 -f           # Force delete (using alias)
/delete home1 -force -silent  # Multiple parameters
```

### Parameters with Arguments

```java
public class AmountParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "amount";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("a", "count");
    }
    
    @Override
    public int minArgs() {
        return 1;  // Requires 1 argument
    }
    
    @Override
    public int maxArgs() {
        return 1;  // Accepts maximum 1 argument
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] parameterArgs) {
        // parameterArgs[0] contains the amount value
        message(sender, "<green>Amount set to: " + parameterArgs[0]);
    }
}
```

Usage:
```bash
/give diamond -amount 64
/give diamond -a 32
/give diamond -count 16
```

### Accessing Parameter Values

```java
@Override
public void execute(@NotNull CommandSender sender, 
                   @NotNull String[] fullArgs, 
                   @NotNull String[] args) {
    // Check if parameter was provided
    String[] amountArgs = getParameter(sender, new AmountParameter());
    
    int amount = 1;  // Default
    if (amountArgs != null && amountArgs.length > 0) {
        try {
            amount = Integer.parseInt(amountArgs[0]);
        } catch (NumberFormatException e) {
            message(sender, "<red>Invalid amount!");
            return;
        }
    }
    
    message(sender, "<green>Giving " + amount + " items");
}
```

### Parameter Properties

| Method | Return Type | Default | Description |
|--------|-------------|---------|-------------|
| `name()` | String | Required | Parameter name |
| `aliases()` | List<String> | `[]` | Alternative names |
| `permission()` | String | `null` | Required permission |
| `minArgs()` | int | `0` | Minimum arguments |
| `maxArgs()` | int | `Integer.MAX_VALUE` | Maximum arguments |
| `stopSubCommands()` | boolean | `false` | Prevent subcommand execution |
| `execute()` | void | Empty | Parameter logic |

### Parameter Features

#### Stop SubCommand Execution

```java
@Override
public boolean stopSubCommands() {
    return true;  // Command execution stops after this parameter
}
```

Useful for parameters like `-help` that should show help instead of executing the command.

#### Permission-Based Parameters

```java
@Override
public String permission() {
    return "myplugin.admin.force";
}
```

Players without permission won't see the parameter in tab completion and can't use it.

## Tab Completion

### Automatic Tab Completion

Tab completion is automatically provided for:
- Main commands
- SubCommands
- Parameters (when typing `-`)

### Custom Tab Completion

Override the `tabComplete()` method:

```java
@Override
public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                         @NotNull String[] fullArgs, 
                                         @NotNull String[] args) {
    if (args.length == 1) {
        // Tab complete first argument with warp names
        return List.of("spawn", "pvp", "shop", "end");
    }
    
    return List.of();
}
```

### Tab Completion for SubCommands

SubCommands automatically appear in tab completion:

```
/homes <TAB>     → set, delete, list, teleport
/homes set <TAB> → [home name suggestions]
```

### Tab Completion for Parameters

Parameters automatically appear when typing `-`:

```
/delete home1 -<TAB>  → force, silent, backup
```

### Parameter Tab Completion

Parameters can provide custom tab completion for their arguments:

```java
public class WorldParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "world";
    }
    
    @Override
    public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                             @NotNull String[] fullArgs, 
                                             @NotNull String[] parameterArgs) {
        // Suggest world names
        return Bukkit.getWorlds().stream()
                .map(World::getName)
                .toList();
    }
}
```

Usage:
```
/tp Steve -world <TAB>  → world, world_nether, world_the_end
```

## Cooldown System

Commands can have cooldowns to prevent spam.

### Basic Cooldown

```java
@Override
public double cooldownTime() {
    return 10.0;  // 10 seconds
}
```

### Bypass Permission

```java
@Override
public String bypassCooldownPermission() {
    return "myplugin.command.bypass";
}
```

Players with this permission skip the cooldown.

### Cooldown Message

The default cooldown message is:
```
You must wait X seconds before using this command again.
```

Customize it globally:
```java
Messages.setCooldownMessage("<red>Wait %time% seconds!");
```

### How Cooldowns Work

1. Player executes command
2. If cooldown is active, command is blocked
3. Player sees cooldown message
4. After cooldown expires, command can be used again

### Cooldown Storage

Cooldowns are stored in memory and reset on server restart.

## Complete Examples

### Example 1: Homes Plugin Command Structure

```java
// Main command
public class HomesCommand implements Command {
    
    public HomesCommand() {
        addSubCommand(new HomesSetSubCommand());
        addSubCommand(new HomesDeleteSubCommand());
        addSubCommand(new HomesTeleportSubCommand());
        addSubCommand(new HomesListSubCommand());
        
        addParameter(new PageParameter());
    }
    
    @Override
    public @NotNull String name() {
        return "homes";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("home");
    }
    
    @Override
    public String description() {
        return "Manage your homes";
    }
    
    @Override
    public boolean playerOnly() {
        return true;
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        Player player = (Player) sender;
        
        // Get page parameter if provided
        String[] pageArgs = getParameter(sender, new PageParameter());
        int page = 1;
        if (pageArgs != null && pageArgs.length > 0) {
            try {
                page = Integer.parseInt(pageArgs[0]);
            } catch (NumberFormatException ignored) {}
        }
        
        // Show homes list
        showHomesList(player, page);
    }
    
    @Override
    public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                             @NotNull String[] fullArgs, 
                                             @NotNull String[] args) {
        if (args.length == 1 && sender instanceof Player player) {
            // Tab complete with home names
            return getPlayerHomes(player);
        }
        return List.of();
    }
    
    private void showHomesList(Player player, int page) {
        message(player, "<gold><bold>Your Homes (Page " + page + ")");
        // ... list homes ...
    }
    
    private List<String> getPlayerHomes(Player player) {
        // Return list of home names
        return List.of("home1", "home2", "spawn");
    }
}

// Set subcommand
public class HomesSetSubCommand implements SubCommand {
    
    @Override
    public @NotNull String name() {
        return "set";
    }
    
    @Override
    public String description() {
        return "Set a home at your location";
    }
    
    @Override
    public int minArgs() {
        return 1;
    }
    
    @Override
    public String usage(CommandSender sender, String[] fullArgs, String[] args) {
        return "<red>Usage: /homes set <name>";
    }
    
    @Override
    public double cooldownTime() {
        return 5.0;
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        Player player = (Player) sender;
        String homeName = args[0];
        
        // Validate name
        if (homeName.length() > 16) {
            message(sender, "<red>Home name is too long!");
            return;
        }
        
        // Set home
        setHome(player, homeName, player.getLocation());
        message(sender, "<green>Home '" + homeName + "' set!");
    }
    
    private void setHome(Player player, String name, Location location) {
        // Implementation...
    }
}

// Delete subcommand with force parameter
public class HomesDeleteSubCommand implements SubCommand {
    
    public HomesDeleteSubCommand() {
        addParameter(new ForceParameter());
    }
    
    @Override
    public @NotNull String name() {
        return "delete";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("remove", "del");
    }
    
    @Override
    public int minArgs() {
        return 1;
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        Player player = (Player) sender;
        String homeName = args[0];
        
        boolean force = getParameter(sender, new ForceParameter()) != null;
        
        if (!force) {
            message(sender, "<yellow>Deleting home '" + homeName + "'...");
        } else {
            message(sender, "<red>Force deleting home '" + homeName + "'...");
        }
        
        deleteHome(player, homeName, force);
        message(sender, "<green>Home deleted!");
    }
    
    @Override
    public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                             @NotNull String[] fullArgs, 
                                             @NotNull String[] args) {
        if (args.length == 1 && sender instanceof Player player) {
            return getPlayerHomes(player);
        }
        return List.of();
    }
    
    private void deleteHome(Player player, String name, boolean force) {
        // Implementation...
    }
    
    private List<String> getPlayerHomes(Player player) {
        return List.of("home1", "home2", "spawn");
    }
}

// Page parameter
public class PageParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "page";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("p");
    }
    
    @Override
    public int minArgs() {
        return 1;
    }
    
    @Override
    public int maxArgs() {
        return 1;
    }
    
    @Override
    public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                             @NotNull String[] fullArgs, 
                                             @NotNull String[] parameterArgs) {
        return List.of("1", "2", "3", "4", "5");
    }
}

// Force parameter
public class ForceParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "force";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("f");
    }
    
    @Override
    public String permission() {
        return "myplugin.homes.force";
    }
}
```

### Example 2: Admin Command with Nested Structure

```java
public class AdminCommand implements Command {
    
    public AdminCommand() {
        // User management subcommand
        SubCommand userCmd = new AdminUserSubCommand();
        userCmd.addSubCommand(new AdminUserBanSubCommand());
        userCmd.addSubCommand(new AdminUserUnbanSubCommand());
        userCmd.addSubCommand(new AdminUserInfoSubCommand());
        
        // Server management subcommand
        SubCommand serverCmd = new AdminServerSubCommand();
        serverCmd.addSubCommand(new AdminServerReloadSubCommand());
        serverCmd.addSubCommand(new AdminServerStopSubCommand());
        
        addSubCommand(userCmd);
        addSubCommand(serverCmd);
    }
    
    @Override
    public @NotNull String name() {
        return "admin";
    }
    
    @Override
    public String permission() {
        return "myplugin.admin";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        message(sender, "<gold><bold>Admin Panel");
        message(sender, "<gray>Use /admin <user|server> for more options");
    }
}
```

Usage:
```
/admin                      → Shows admin panel
/admin user                 → User management menu
/admin user ban Steve       → Bans Steve
/admin user unban Steve     → Unbans Steve
/admin user info Steve      → Shows Steve's info
/admin server               → Server management menu
/admin server reload        → Reloads plugin
/admin server stop          → Stops server
```

### Example 3: Economy Command with Parameters

```java
public class EconomyCommand implements Command {
    
    public EconomyCommand() {
        addSubCommand(new EcoGiveSubCommand());
        addSubCommand(new EcoTakeSubCommand());
        addSubCommand(new EcoSetSubCommand());
        addSubCommand(new EcoBalanceSubCommand());
        
        // Global parameters
        addParameter(new SilentParameter());
    }
    
    @Override
    public @NotNull String name() {
        return "economy";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("eco", "money");
    }
    
    @Override
    public String permission() {
        return "myplugin.economy";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        message(sender, "<gold>Economy Management");
        message(sender, "<gray>/eco give <player> <amount>");
        message(sender, "<gray>/eco take <player> <amount>");
        message(sender, "<gray>/eco set <player> <amount>");
        message(sender, "<gray>/eco balance <player>");
    }
}

public class EcoGiveSubCommand implements SubCommand {
    
    @Override
    public @NotNull String name() {
        return "give";
    }
    
    @Override
    public int minArgs() {
        return 2;
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        String playerName = args[0];
        double amount;
        
        try {
            amount = Double.parseDouble(args[1]);
        } catch (NumberFormatException e) {
            message(sender, "<red>Invalid amount!");
            return;
        }
        
        Player target = Bukkit.getPlayer(playerName);
        if (target == null) {
            message(sender, "<red>Player not found!");
            return;
        }
        
        // Check silent parameter
        boolean silent = getParameter(sender, new SilentParameter()) != null;
        
        giveMoneyTo(target, amount);
        message(sender, "<green>Gave $" + amount + " to " + target.getName());
        
        if (!silent) {
            message(target, "<green>You received $" + amount + "!");
        }
    }
    
    @Override
    public @NotNull List<String> tabComplete(@NotNull CommandSender sender, 
                                             @NotNull String[] fullArgs, 
                                             @NotNull String[] args) {
        if (args.length == 1) {
            return Bukkit.getOnlinePlayers().stream()
                    .map(Player::getName)
                    .toList();
        }
        if (args.length == 2) {
            return List.of("100", "500", "1000");
        }
        return List.of();
    }
    
    private void giveMoneyTo(Player player, double amount) {
        // Implementation...
    }
}

public class SilentParameter implements Parameter {
    
    @Override
    public @NotNull String name() {
        return "silent";
    }
    
    @Override
    public List<String> aliases() {
        return List.of("s", "quiet");
    }
    
    @Override
    public String permission() {
        return "myplugin.economy.silent";
    }
}
```

Usage:
```
/eco give Steve 100           → Gives $100 to Steve (he sees message)
/eco give Steve 100 -silent   → Gives $100 to Steve (no message)
/eco give Steve 100 -s        → Same (using alias)
```

## Best Practices

1. **Use meaningful names** - Clear command and subcommand names
2. **Provide descriptions** - Help users understand commands
3. **Validate arguments** - Check argument count and types
4. **Use parameters wisely** - For optional flags and modifiers
5. **Implement tab completion** - Improve user experience
6. **Set appropriate cooldowns** - Prevent spam
7. **Use permissions** - Control access to commands
8. **Provide clear usage messages** - Help users when they make mistakes
9. **Handle errors gracefully** - Don't crash on invalid input
10. **Keep commands focused** - One command, one purpose

## Common Patterns

### Pattern 1: Confirmation Commands

```java
public class DeleteAllCommand implements Command {
    
    public DeleteAllCommand() {
        addParameter(new ConfirmParameter());
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        boolean confirmed = getParameter(sender, new ConfirmParameter()) != null;
        
        if (!confirmed) {
            message(sender, "<yellow>This will delete ALL data!");
            message(sender, "<yellow>Use -confirm to proceed");
            return;
        }
        
        // Delete everything...
        message(sender, "<red>All data deleted!");
    }
}
```

### Pattern 2: Player Target Commands

```java
@Override
public void execute(@NotNull CommandSender sender, 
                   @NotNull String[] fullArgs, 
                   @NotNull String[] args) {
    Player target;
    
    if (args.length > 0) {
        target = Bukkit.getPlayer(args[0]);
        if (target == null) {
            message(sender, "<red>Player not found!");
            return;
        }
    } else if (sender instanceof Player) {
        target = (Player) sender;
    } else {
        message(sender, "<red>You must specify a player!");
        return;
    }
    
    // Use target...
}
```

### Pattern 3: Help Subcommand

```java
public class HelpSubCommand implements SubCommand {
    
    @Override
    public @NotNull String name() {
        return "help";
    }
    
    @Override
    public void execute(@NotNull CommandSender sender, 
                       @NotNull String[] fullArgs, 
                       @NotNull String[] args) {
        message(sender, "<gold><bold>Plugin Commands:");
        message(sender, "<yellow>/command <gray>- Description");
        message(sender, "<yellow>/command sub <gray>- Sub description");
        // ... more help ...
    }
}
```

## See Also

- [Using the Logger](using-logger.md) - Logging in commands
- [Creating Custom Inventories](creating-inventories.md) - Opening GUIs from commands
- [Best Practices](best-practices.md) - Command development guidelines