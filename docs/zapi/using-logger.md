---
description: >-
  Complete guide to using the Logger class for plugin logging.
  Learn about all log levels, configuration options, multiline support,
  and best practices for logging in your plugins.
---

# Using the Logger Class

The zAPI `Logger` class provides a powerful and flexible logging system for your plugin with support for different log levels, multiline messages, debug mode, custom prefixes, and automatic formatting.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Log Levels](#log-levels)
- [Configuration](#configuration)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)

## Overview

The `Logger` class wraps Bukkit's component logger system with additional features:

- **Multiple log levels**: info, warn, error, debug, trace
- **Custom prefixes**: Brand your log messages
- **Debug mode**: Toggle detailed logging on/off
- **Multiline support**: Automatically handles text blocks and multiline strings
- **MiniMessage formatting**: Use colors and formatting in logs
- **Exception handling**: Proper throwable logging with stack traces

## Getting Started

### Using the Default zAPI Logger

zAPI provides a default logger that's already configured:

```java
import me.yleoft.zAPI.zAPI;

public class MyPlugin extends JavaPlugin {
    @Override
    public void onEnable() {
        // Use the default zAPI logger
        zAPI.getLogger().info("Plugin enabled!");
    }
}
```

### Creating a Custom Logger for Your Plugin

It's recommended to create your own logger with a custom prefix:

```java
import me.yleoft.zAPI.logging.Logger;
import me.yleoft.zAPI.zAPI;

public class MyPlugin extends JavaPlugin {
    
    @Override
    public void onEnable() {
        // Create logger with custom prefix
        Logger logger = new Logger("<gold>[MyPlugin]</gold>");
        
        // Set it as the plugin logger for zAPI
        zAPI.setPluginLogger(logger);
        
        // Now you can use it anywhere via zAPI.getPluginLogger()
        zAPI.getPluginLogger().info("Plugin starting up!");
    }
}
```

### Constructor Options

```java
// With string prefix (supports MiniMessage formatting)
Logger logger = new Logger("<gold>[MyPlugin]</gold>");

// With Component prefix
Component prefix = Component.text("[MyPlugin]").color(NamedTextColor.GOLD);
Logger logger = new Logger(prefix);

// Without prefix (useful for utilities)
Logger logger = new Logger();
```

## Log Levels

The Logger class provides five logging levels, each serving a specific purpose:

### info() - General Information

Use for normal operational messages that highlight the progress of the application.

```java
zAPI.getPluginLogger().info("Configuration loaded successfully");
zAPI.getPluginLogger().info("Registered 5 custom commands");
zAPI.getPluginLogger().info("Player Steve joined the server");
```

**When to use:**
- Plugin initialization/shutdown
- Feature activation
- Successful operations
- General status updates

**Output format:**
```
[timestamp] [INFO] [MyPlugin] Configuration loaded successfully
```

### warn() - Warning Messages

Use for potentially harmful situations that don't prevent the application from functioning.

```java
// Simple warning
zAPI.getPluginLogger().warn("Failed to load optional feature X");

// Warning with exception
try {
    loadOptionalConfig();
} catch (IOException e) {
    zAPI.getPluginLogger().warn("Could not load optional config", e);
}
```

**When to use:**
- Deprecated API usage
- Recoverable errors
- Configuration issues with fallbacks
- Missing optional dependencies
- Performance concerns

**Output format:**
```
[timestamp] [WARN] [MyPlugin] Failed to load optional feature X
```

### error() - Error Messages

Use for error events that might still allow the application to continue running.

```java
// Simple error
zAPI.getPluginLogger().error("Failed to initialize database connection");

// Error with exception
try {
    connectToDatabase();
} catch (SQLException e) {
    zAPI.getPluginLogger().error("Database connection failed", e);
}
```

**When to use:**
- Failed operations that affect functionality
- Database errors
- File I/O errors
- Critical feature failures
- API errors

**Output format:**
```
[timestamp] [ERROR] [MyPlugin] Failed to initialize database connection
```

**With exception:**
```
[timestamp] [ERROR] [MyPlugin] Database connection failed
java.sql.SQLException: Connection refused
    at com.example.Database.connect(Database.java:45)
    at com.example.MyPlugin.onEnable(MyPlugin.java:23)
    ...
```

### debug() - Debug Information

Use for detailed information useful during development and troubleshooting. Only displayed when debug mode is enabled.

```java
// Enable debug mode first
logger.setDebugMode(true);

// Debug messages
zAPI.getPluginLogger().debug("Processing player data for UUID: 069a79f4-...");
zAPI.getPluginLogger().debug("Cache hit: homes_data_steve");

// Debug with exception
try {
    processComplexOperation();
} catch (Exception e) {
    zAPI.getPluginLogger().debug("Operation failed, retrying...", e);
}
```

**When to use:**
- Variable values during execution
- Method entry/exit points
- Cache operations
- Algorithm steps
- Performance metrics
- Troubleshooting information

**Output format (only when debug mode is enabled):**
```
[timestamp] [INFO] [MyPlugin] Processing player data for UUID: 069a79f4-...
```

**Note:** Debug messages use INFO level internally but are only shown when `setDebugMode(true)` is called.

### trace() - Trace Information

Use for very detailed information, typically only interesting when diagnosing problems.

```java
zAPI.getPluginLogger().trace("Entering method: calculateHomesLimit()");
zAPI.getPluginLogger().trace("Variable state: homes=5, limit=10, multiplier=2.0");

// Trace with exception
try {
    deepInternalOperation();
} catch (Exception e) {
    zAPI.getPluginLogger().trace("Internal operation trace", e);
}
```

**When to use:**
- Method entry/exit in critical paths
- Detailed variable state
- Low-level system operations
- Rare troubleshooting scenarios

**Output format:**
```
[timestamp] [TRACE] [MyPlugin] Entering method: calculateHomesLimit()
```

## Configuration

### Setting a Custom Prefix

You can change the prefix at any time:

```java
// Set from string
logger.setPrefix("<gradient:#ff0000:#00ff00>[MyPlugin]</gradient>");

// Set from Component
Component prefix = Component.text("[MyPlugin]")
    .color(NamedTextColor.BLUE)
    .decorate(TextDecoration.BOLD);
logger.setPrefix(prefix);
```

### Getting the Current Prefix

```java
Component currentPrefix = logger.getPrefix();
```

{% hint style="success" %}
Custom prefixes with MiniMessage formatting help brand your plugin's log messages and make them easily identifiable in the console.
{% endhint %}

### Debug Mode

Debug mode controls whether `debug()` messages are displayed:

```java
// Enable debug mode
logger.setDebugMode(true);

// Check if debug is enabled
boolean isDebug = logger.isDebugMode();

// Disable debug mode
logger.setDebugMode(false);
```

**Example usage:**

```java
public class MyPlugin extends JavaPlugin {
    
    private Logger logger;
    
    @Override
    public void onEnable() {
        logger = new Logger("<gold>[MyPlugin]</gold>");
        zAPI.setPluginLogger(logger);
        
        // Enable debug if config says so
        boolean debugMode = getConfig().getBoolean("debug", false);
        logger.setDebugMode(debugMode);
        
        logger.info("Plugin enabled (Debug: " + debugMode + ")");
        logger.debug("This will only show if debug is true");
    }
}
```

## Advanced Features

### Multiline Messages

The Logger automatically handles multiline strings correctly:

```java
// Using text blocks (Java 17+)
String message = """
    Configuration validation results:
    - Database: OK
    - Cache: OK
    - API: OK
    """;
logger.info(message);
```

**Output:**
```
[INFO] [MyPlugin] Configuration validation results:
[INFO] [MyPlugin] - Database: OK
[INFO] [MyPlugin] - Cache: OK
[INFO] [MyPlugin] - API: OK
```

### Using MiniMessage Formatting

The logger supports MiniMessage formatting in messages:

```java
logger.info("<green>Successfully</green> loaded <yellow>25</yellow> items");
logger.warn("<red>Warning:</red> <gray>Low memory detected</gray>");
logger.error("<dark_red><bold>CRITICAL:</bold></dark_red> Database offline");
```

### Exception Logging with Debug Mode

When debug mode is **enabled**, exceptions include full stack traces:

```java
logger.setDebugMode(true);

try {
    riskyOperation();
} catch (Exception e) {
    // Full stack trace will be logged
    logger.error("Operation failed", e);
}
```

When debug mode is **disabled**, only the last line includes the exception:

```java
logger.setDebugMode(false);

try {
    riskyOperation();
} catch (Exception e) {
    // Last message line includes throwable
    logger.warn("Operation failed, using fallback", e);
}
```

### Conditional Logging

```java
public class MyPlugin extends JavaPlugin {
    
    public void performOperation(Player player) {
        Logger logger = zAPI.getPluginLogger();
        
        logger.debug("Starting operation for " + player.getName());
        
        long startTime = System.currentTimeMillis();
        
        // ... operation ...
        
        long duration = System.currentTimeMillis() - startTime;
        
        if (duration > 1000) {
            logger.warn("Operation took " + duration + "ms - performance issue detected");
        } else {
            logger.debug("Operation completed in " + duration + "ms");
        }
    }
}
```

## Best Practices

### 1. Use Appropriate Log Levels

```java
// ✅ Good
logger.info("Plugin enabled");
logger.warn("Config file not found, using defaults");
logger.error("Failed to connect to database");
logger.debug("Cache size: " + cache.size());

// ❌ Bad
logger.error("Plugin enabled");  // Not an error!
logger.info("Failed to connect to database");  // This IS an error!
```

### 2. Create a Logger Manager

```java
public class MyPlugin extends JavaPlugin {
    
    private static Logger logger;
    
    @Override
    public void onEnable() {
        // Initialize logger
        logger = new Logger("<gold>[MyPlugin]</gold>");
        logger.setDebugMode(getConfig().getBoolean("debug", false));
        zAPI.setPluginLogger(logger);
        
        logger.info("Plugin starting...");
    }
    
    // Convenient access method
    public static Logger getLog() {
        return logger;
    }
}

// Usage in other classes
public class SomeFeature {
    public void doSomething() {
        MyPlugin.getLog().info("Feature activated");
    }
}
```

### 3. Use Debug Mode Appropriately

```java
public class DataProcessor {
    
    private final Logger logger = zAPI.getPluginLogger();
    
    public void processData(List<String> data) {
        logger.debug("Processing " + data.size() + " items");
        
        for (int i = 0; i < data.size(); i++) {
            logger.debug("Processing item " + (i + 1) + ": " + data.get(i));
            // Process...
        }
        
        logger.info("Processed " + data.size() + " items successfully");
    }
}
```

### 4. Include Context in Messages

```java
// ✅ Good - Provides context
logger.error("Failed to load home data for player " + player.getName());
logger.warn("Invalid home name '" + homeName + "' for player " + player.getName());

// ❌ Bad - Lacks context
logger.error("Failed to load data");
logger.warn("Invalid name");
```

### 5. Don't Log Sensitive Information

```java
// ❌ Bad - Logs sensitive data
logger.info("User password: " + password);
logger.debug("API key: " + apiKey);

// ✅ Good - Logs safely
logger.info("User authenticated: " + username);
logger.debug("API request successful");
```

### 6. Use Exceptions Properly

```java
// ✅ Good - Includes exception for debugging
try {
    loadConfig();
} catch (IOException e) {
    logger.error("Failed to load config", e);
}

// ❌ Bad - Swallows exception
try {
    loadConfig();
} catch (IOException e) {
    logger.error("Failed to load config");
    // Exception lost!
}
```

### 7. Avoid Excessive Logging

```java
// ❌ Bad - Too verbose for normal operation
public void onPlayerMove(PlayerMoveEvent event) {
    logger.info(event.getPlayer().getName() + " moved");
}

// ✅ Good - Use debug for frequent events
public void onPlayerMove(PlayerMoveEvent event) {
    logger.debug(event.getPlayer().getName() + " moved to " + event.getTo());
}
```

### 8. Structure Messages Consistently

```java
// ✅ Good - Consistent structure
logger.info("Database connected: " + host + ":" + port);
logger.info("Cache initialized: " + cacheSize + " entries");
logger.info("API registered: " + apiVersion);

// ❌ Bad - Inconsistent structure
logger.info("Connected to database at " + host + ":" + port);
logger.info(cacheSize + " cache entries initialized");
logger.info("Registered API v" + apiVersion);
```

## Complete Examples

### Example 1: Plugin Initialization with Detailed Logging

```java
public class MyPlugin extends JavaPlugin {
    
    private Logger logger;
    
    @Override
    public void onEnable() {
        // Initialize logger
        logger = new Logger("<gold>[MyPlugin]</gold>");
        logger.setDebugMode(getConfig().getBoolean("debug", false));
        zAPI.setPluginLogger(logger);
        
        logger.info("==========================================");
        logger.info("  MyPlugin v" + getDescription().getVersion());
        logger.info("==========================================");
        
        // Load configuration
        try {
            loadConfiguration();
            logger.info("<green>✓</green> Configuration loaded");
        } catch (Exception e) {
            logger.error("Failed to load configuration", e);
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        
        // Initialize database
        try {
            initializeDatabase();
            logger.info("<green>✓</green> Database connected");
        } catch (Exception e) {
            logger.error("Failed to connect to database", e);
            logger.warn("Running in offline mode");
        }
        
        // Register commands
        int commandCount = registerCommands();
        logger.info("<green>✓</green> Registered " + commandCount + " commands");
        
        // Start background tasks
        startBackgroundTasks();
        logger.info("<green>✓</green> Background tasks started");
        
        logger.info("Plugin enabled successfully!");
        logger.debug("Debug mode is active");
    }
    
    private void loadConfiguration() throws IOException {
        logger.debug("Loading configuration file: config.yml");
        saveDefaultConfig();
        reloadConfig();
        logger.debug("Configuration keys loaded: " + getConfig().getKeys(false).size());
    }
    
    private void initializeDatabase() throws SQLException {
        String host = getConfig().getString("database.host");
        int port = getConfig().getInt("database.port");
        
        logger.debug("Connecting to database: " + host + ":" + port);
        // ... database connection logic ...
        logger.debug("Database connection pool initialized");
    }
    
    private int registerCommands() {
        logger.debug("Registering commands...");
        // ... command registration ...
        return 5;
    }
    
    private void startBackgroundTasks() {
        logger.debug("Starting autosave task (interval: 5 minutes)");
        logger.debug("Starting cleanup task (interval: 1 hour)");
        // ... task scheduling ...
    }
}
```

### Example 2: Feature Manager with Logging

```java
public class HomesManager {
    
    private final Logger logger = zAPI.getPluginLogger();
    private final Map<UUID, List<Home>> homes = new HashMap<>();
    
    public void loadPlayerHomes(Player player) {
        UUID uuid = player.getUniqueId();
        logger.debug("Loading homes for player: " + player.getName() + " (" + uuid + ")");
        
        try {
            List<Home> playerHomes = database.loadHomes(uuid);
            homes.put(uuid, playerHomes);
            
            logger.info("Loaded " + playerHomes.size() + " homes for " + player.getName());
            logger.debug("Home names: " + playerHomes.stream()
                    .map(Home::getName)
                    .collect(Collectors.joining(", ")));
            
        } catch (SQLException e) {
            logger.error("Failed to load homes for " + player.getName(), e);
            // Initialize with empty list to prevent further errors
            homes.put(uuid, new ArrayList<>());
        }
    }
    
    public void createHome(Player player, String name, Location location) {
        logger.debug("Creating home '" + name + "' for " + player.getName());
        
        // Validate name
        if (name.length() > 16) {
            logger.warn("Player " + player.getName() + " attempted to create home with too long name: " + name);
            player.sendMessage("Home name is too long!");
            return;
        }
        
        // Check limit
        int currentHomes = getHomes(player).size();
        int limit = getHomesLimit(player);
        
        if (currentHomes >= limit) {
            logger.debug("Home creation denied for " + player.getName() + 
                    " (limit reached: " + currentHomes + "/" + limit + ")");
            player.sendMessage("You've reached your homes limit!");
            return;
        }
        
        // Create home
        try {
            Home home = new Home(name, location);
            database.saveHome(player.getUniqueId(), home);
            getHomes(player).add(home);
            
            logger.info("Created home '" + name + "' for " + player.getName() + 
                    " (" + (currentHomes + 1) + "/" + limit + ")");
            player.sendMessage("Home created successfully!");
            
        } catch (SQLException e) {
            logger.error("Failed to create home '" + name + "' for " + player.getName(), e);
            player.sendMessage("An error occurred while creating your home.");
        }
    }
    
    private List<Home> getHomes(Player player) {
        return homes.computeIfAbsent(player.getUniqueId(), k -> new ArrayList<>());
    }
    
    private int getHomesLimit(Player player) {
        int limit = 3;  // Default
        logger.debug("Calculating homes limit for " + player.getName());
        
        // Check permissions for higher limits
        if (player.hasPermission("myplugin.homes.vip")) {
            limit = 10;
            logger.debug("VIP limit applied: " + limit);
        } else if (player.hasPermission("myplugin.homes.premium")) {
            limit = 5;
            logger.debug("Premium limit applied: " + limit);
        }
        
        return limit;
    }
}
```

### Example 3: Configuration Validator with Detailed Logging

```java
public class ConfigValidator {
    
    private final Logger logger = zAPI.getPluginLogger();
    private final FileConfiguration config;
    
    public ConfigValidator(FileConfiguration config) {
        this.config = config;
    }
    
    public boolean validate() {
        logger.info("Validating configuration...");
        boolean valid = true;
        
        // Validate database settings
        if (!validateDatabaseConfig()) {
            valid = false;
        }
        
        // Validate homes settings
        if (!validateHomesConfig()) {
            valid = false;
        }
        
        // Validate messages
        if (!validateMessagesConfig()) {
            valid = false;
        }
        
        if (valid) {
            logger.info("<green>✓</green> Configuration validation passed");
        } else {
            logger.warn("<yellow>⚠</yellow> Configuration validation found issues");
        }
        
        return valid;
    }
    
    private boolean validateDatabaseConfig() {
        logger.debug("Validating database configuration...");
        
        if (!config.contains("database.host")) {
            logger.error("Missing required config key: database.host");
            return false;
        }
        
        int port = config.getInt("database.port", -1);
        if (port < 1 || port > 65535) {
            logger.error("Invalid database port: " + port + " (must be 1-65535)");
            return false;
        }
        
        logger.debug("<green>✓</green> Database config valid");
        return true;
    }
    
    private boolean validateHomesConfig() {
        logger.debug("Validating homes configuration...");
        
        int defaultLimit = config.getInt("homes.default-limit", -1);
        if (defaultLimit < 1) {
            logger.warn("Invalid homes.default-limit: " + defaultLimit + ", using default of 3");
            config.set("homes.default-limit", 3);
        }
        
        logger.debug("<green>✓</green> Homes config valid");
        return true;
    }
    
    private boolean validateMessagesConfig() {
        logger.debug("Validating messages configuration...");
        
        String[] requiredMessages = {
            "messages.prefix",
            "messages.no-permission",
            "messages.player-only"
        };
        
        boolean allPresent = true;
        for (String key : requiredMessages) {
            if (!config.contains(key)) {
                logger.warn("Missing message key: " + key);
                allPresent = false;
            }
        }
        
        if (allPresent) {
            logger.debug("<green>✓</green> Messages config valid");
        }
        
        return allPresent;
    }
}
```

## Common Patterns

### Pattern 1: Startup Sequence

```java
logger.info("Starting plugin...");
logger.debug("Java version: " + System.getProperty("java.version"));
logger.debug("Server version: " + Bukkit.getVersion());
// ... initialization ...
logger.info("Plugin started successfully!");
```

### Pattern 2: Error Recovery

```java
try {
    loadFromDatabase();
} catch (SQLException e) {
    logger.error("Failed to load from database, trying backup", e);
    try {
        loadFromBackup();
        logger.warn("Loaded from backup successfully");
    } catch (IOException ex) {
        logger.error("Failed to load from backup", ex);
        logger.error("Starting with empty data");
    }
}
```

### Pattern 3: Performance Monitoring

```java
long start = System.currentTimeMillis();
performExpensiveOperation();
long duration = System.currentTimeMillis() - start;

if (duration > 1000) {
    logger.warn("Slow operation: " + duration + "ms");
} else {
    logger.debug("Operation completed in " + duration + "ms");
}
```

## See Also

- [File Logging](file-logging.md) - Log to files with FileLogger
- [Creating Custom Commands](commands-and-subcommands.md) - Use logging in commands
- [Best Practices](best-practices.md) - Plugin development guidelines